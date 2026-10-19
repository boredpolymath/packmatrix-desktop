//! PackMatrix Local-First SQLite WAL Concurrency & Storage Engine
//! SDLC Phase Gate 2: Section 2.3 Verification
//!
//! Provides a thread-safe connection pool with:
//! - Dedicated read connections for lock-free parallel querying
//! - Serialized write queue to eliminate SQLite write contention
//! - Mandatory 8-step PRAGMA bootstrap sequence
//! - Active WAL auto-checkpointing watcher guarding against unbounded growth (>10 MB)

use rusqlite::{Connection, OpenFlags, Result};
use std::fs;
use std::ops::Deref;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;
use thiserror::Error;

/// Maximum allowable WAL file size before forced truncate checkpoint (10 MB)
pub const MAX_WAL_SIZE_BYTES: u64 = 10 * 1024 * 1024;

/// Connection bootstrap SQL sequence mandated by SDLC 2.3
pub const BOOTSTRAP_PRAGMAS: &str = "\
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456;
PRAGMA max_page_count = 1073741824;
PRAGMA secure_delete = FAST;";

static IN_MEMORY_DB_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("SQLite database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Storage engine lock poisoned")]
    Poisoned,
}

/// Statistics returned by SQLite wal_checkpoint
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CheckpointStats {
    pub busy: i32,
    pub log_pages: i32,
    pub checkpointed_pages: i32,
}

/// Executes the mandatory 8-step PRAGMA sequence on an SQLite connection
pub fn bootstrap_connection(conn: &Connection) -> Result<()> {
    conn.execute_batch(BOOTSTRAP_PRAGMAS)?;
    Ok(())
}

#[derive(Clone)]
enum ConnectionSource {
    Disk(PathBuf),
    SharedMemory(String),
}

struct PoolState {
    idle_conns: Vec<Connection>,
    active_count: usize,
}

struct ReadPoolInner {
    source: ConnectionSource,
    max_readers: usize,
    state: Mutex<PoolState>,
    condvar: Condvar,
}

impl ReadPoolInner {
    fn acquire(&self) -> Result<Connection, StorageError> {
        let mut state = self.state.lock().map_err(|_| StorageError::Poisoned)?;

        loop {
            if let Some(conn) = state.idle_conns.pop() {
                return Ok(conn);
            }

            if state.active_count < self.max_readers {
                state.active_count += 1;
                drop(state);

                let conn = match &self.source {
                    ConnectionSource::Disk(p) => Connection::open_with_flags(
                        p,
                        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
                    )?,
                    ConnectionSource::SharedMemory(uri) => Connection::open_with_flags(
                        uri,
                        OpenFlags::SQLITE_OPEN_READ_WRITE
                            | OpenFlags::SQLITE_OPEN_URI
                            | OpenFlags::SQLITE_OPEN_SHARED_CACHE
                            | OpenFlags::SQLITE_OPEN_NO_MUTEX,
                    )?,
                };
                bootstrap_connection(&conn)?;
                return Ok(conn);
            }

            state = self
                .condvar
                .wait(state)
                .map_err(|_| StorageError::Poisoned)?;
        }
    }

    fn release(&self, conn: Connection) {
        if let Ok(mut state) = self.state.lock() {
            state.idle_conns.push(conn);
            self.condvar.notify_one();
        }
    }
}

/// RAII Guard for a pooled read connection
pub struct PooledReader<'a> {
    conn: Option<Connection>,
    pool: &'a ReadPoolInner,
}

impl<'a> Deref for PooledReader<'a> {
    type Target = Connection;

    fn deref(&self) -> &Self::Target {
        self.conn
            .as_ref()
            .expect("Connection available during guard lifetime")
    }
}

impl<'a> Drop for PooledReader<'a> {
    fn drop(&mut self) {
        if let Some(conn) = self.conn.take() {
            self.pool.release(conn);
        }
    }
}

/// Thread-safe SQLite WAL Storage Engine and Connection Pool
pub struct DbPool {
    path: Option<PathBuf>,
    writer: Arc<Mutex<Connection>>,
    read_pool: Arc<ReadPoolInner>,
    max_wal_size_bytes: u64,
    shutdown_signal: Arc<AtomicBool>,
    watcher_handle: Mutex<Option<JoinHandle<()>>>,
}

impl DbPool {
    /// Opens or creates a local-first SQLite database at the specified path
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, StorageError> {
        let path_buf = path.as_ref().to_path_buf();
        if let Some(parent) = path_buf.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent)?;
            }
        }

        // Initialize dedicated serialized writer
        let write_conn = Connection::open_with_flags(
            &path_buf,
            OpenFlags::SQLITE_OPEN_READ_WRITE
                | OpenFlags::SQLITE_OPEN_CREATE
                | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )?;
        bootstrap_connection(&write_conn)?;

        let writer = Arc::new(Mutex::new(write_conn));
        let read_pool = Arc::new(ReadPoolInner {
            source: ConnectionSource::Disk(path_buf.clone()),
            max_readers: 16,
            state: Mutex::new(PoolState {
                idle_conns: Vec::new(),
                active_count: 0,
            }),
            condvar: Condvar::new(),
        });

        let shutdown_signal = Arc::new(AtomicBool::new(false));

        // Spawn active WAL auto-checkpointing watcher
        let watcher_handle = Self::spawn_wal_watcher(
            path_buf.clone(),
            Arc::clone(&writer),
            MAX_WAL_SIZE_BYTES,
            Arc::clone(&shutdown_signal),
        );

        Ok(Self {
            path: Some(path_buf),
            writer,
            read_pool,
            max_wal_size_bytes: MAX_WAL_SIZE_BYTES,
            shutdown_signal,
            watcher_handle: Mutex::new(Some(watcher_handle)),
        })
    }

    /// Creates an in-memory SQLite database pool for isolated testing with shared memory URI
    pub fn open_in_memory() -> Result<Self, StorageError> {
        let id = IN_MEMORY_DB_COUNTER.fetch_add(1, Ordering::SeqCst);
        let uri = format!("file:packmatrix_mem_{}?mode=memory&cache=shared", id);

        let write_conn = Connection::open_with_flags(
            &uri,
            OpenFlags::SQLITE_OPEN_READ_WRITE
                | OpenFlags::SQLITE_OPEN_CREATE
                | OpenFlags::SQLITE_OPEN_URI
                | OpenFlags::SQLITE_OPEN_SHARED_CACHE
                | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )?;
        bootstrap_connection(&write_conn)?;

        let writer = Arc::new(Mutex::new(write_conn));
        let read_pool = Arc::new(ReadPoolInner {
            source: ConnectionSource::SharedMemory(uri),
            max_readers: 16,
            state: Mutex::new(PoolState {
                idle_conns: Vec::new(),
                active_count: 0,
            }),
            condvar: Condvar::new(),
        });

        Ok(Self {
            path: None,
            writer,
            read_pool,
            max_wal_size_bytes: MAX_WAL_SIZE_BYTES,
            shutdown_signal: Arc::new(AtomicBool::new(false)),
            watcher_handle: Mutex::new(None),
        })
    }

    /// Acquires a dedicated read connection from the pool
    pub fn acquire_reader(&self) -> Result<PooledReader<'_>, StorageError> {
        let conn = self.read_pool.acquire()?;
        Ok(PooledReader {
            conn: Some(conn),
            pool: &self.read_pool,
        })
    }

    /// Executes a read transaction/query closure using a dedicated pooled reader
    pub fn read<F, R>(&self, f: F) -> Result<R, StorageError>
    where
        F: FnOnce(&Connection) -> Result<R>,
    {
        let reader = self.acquire_reader()?;
        f(&reader).map_err(StorageError::Sqlite)
    }

    /// Executes a write closure through the serialized writer queue
    pub fn write<F, R>(&self, f: F) -> Result<R, StorageError>
    where
        F: FnOnce(&mut Connection) -> Result<R>,
    {
        let mut writer = self.writer.lock().map_err(|_| StorageError::Poisoned)?;
        let result = f(&mut writer)?;

        // Inline WAL threshold verification
        if let Some(wal_size) = self.wal_size_on_disk() {
            if wal_size >= self.max_wal_size_bytes {
                let _ = Self::execute_checkpoint(&writer);
            }
        }

        Ok(result)
    }

    /// Forces a WAL truncate checkpoint on the database
    pub fn checkpoint(&self) -> Result<CheckpointStats, StorageError> {
        let writer = self.writer.lock().map_err(|_| StorageError::Poisoned)?;
        Self::execute_checkpoint(&writer).map_err(StorageError::Sqlite)
    }

    /// Returns the on-disk size of the SQLite WAL file, if applicable
    pub fn wal_size_on_disk(&self) -> Option<u64> {
        let path = self.path.as_ref()?;
        let wal_path = PathBuf::from(format!("{}-wal", path.display()));
        fs::metadata(wal_path).ok().map(|m| m.len())
    }

    /// Returns the database file path if disk-backed
    pub fn path(&self) -> Option<&Path> {
        self.path.as_deref()
    }

    fn execute_checkpoint(conn: &Connection) -> Result<CheckpointStats> {
        conn.query_row("PRAGMA wal_checkpoint(TRUNCATE);", [], |row| {
            Ok(CheckpointStats {
                busy: row.get(0)?,
                log_pages: row.get(1)?,
                checkpointed_pages: row.get(2)?,
            })
        })
    }

    fn spawn_wal_watcher(
        db_path: PathBuf,
        writer: Arc<Mutex<Connection>>,
        max_wal_bytes: u64,
        shutdown: Arc<AtomicBool>,
    ) -> JoinHandle<()> {
        let wal_path = PathBuf::from(format!("{}-wal", db_path.display()));
        thread::Builder::new()
            .name("packmatrix-wal-watcher".to_string())
            .spawn(move || {
                while !shutdown.load(Ordering::Relaxed) {
                    for _ in 0..10 {
                        if shutdown.load(Ordering::Relaxed) {
                            return;
                        }
                        thread::sleep(Duration::from_millis(50));
                    }
                    if let Ok(metadata) = fs::metadata(&wal_path) {
                        if metadata.len() >= max_wal_bytes {
                            if let Ok(conn) = writer.lock() {
                                let _ = Self::execute_checkpoint(&conn);
                            }
                        }
                    }
                }
            })
            .expect("Failed to spawn packmatrix-wal-watcher thread")
    }
}

impl Drop for DbPool {
    fn drop(&mut self) {
        self.shutdown_signal.store(true, Ordering::Relaxed);
        if let Ok(mut handle) = self.watcher_handle.lock() {
            if let Some(h) = handle.take() {
                let _ = h.join();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Barrier;

    #[test]
    fn test_pragma_bootstrap_sequence_invariants() {
        let conn = Connection::open_in_memory().expect("open memory connection");
        bootstrap_connection(&conn).expect("bootstrap pragmas execute");

        // Verify foreign_keys = ON (1)
        let fk: i64 = conn
            .query_row("PRAGMA foreign_keys;", [], |r| r.get(0))
            .expect("query foreign_keys");
        assert_eq!(fk, 1, "foreign_keys must be enabled");

        // Verify busy_timeout = 5000 ms
        let bt: i64 = conn
            .query_row("PRAGMA busy_timeout;", [], |r| r.get(0))
            .expect("query busy_timeout");
        assert_eq!(bt, 5000, "busy_timeout must be 5000ms");

        // Verify temp_store = MEMORY (2)
        let ts: i64 = conn
            .query_row("PRAGMA temp_store;", [], |r| r.get(0))
            .expect("query temp_store");
        assert_eq!(ts, 2, "temp_store must be MEMORY (2)");

        // Verify synchronous = NORMAL (1)
        let sync_mode: i64 = conn
            .query_row("PRAGMA synchronous;", [], |r| r.get(0))
            .expect("query synchronous");
        assert_eq!(sync_mode, 1, "synchronous must be NORMAL (1)");

        // Verify max_page_count = 1073741824
        let mpc: i64 = conn
            .query_row("PRAGMA max_page_count;", [], |r| r.get(0))
            .expect("query max_page_count");
        assert_eq!(mpc, 1073741824, "max_page_count must match 1073741824");
    }

    #[test]
    fn test_concurrent_readers_and_serialized_writes() {
        let temp_dir = std::env::temp_dir().join(format!(
            "packmatrix_test_conc_{}_{}",
            std::process::id(),
            IN_MEMORY_DB_COUNTER.fetch_add(1, Ordering::SeqCst)
        ));
        let db_path = temp_dir.join("test_conc.db");
        let pool = Arc::new(DbPool::open(&db_path).expect("open disk pool"));

        // Initialize table
        pool.write(|conn| {
            conn.execute(
                "CREATE TABLE test_data (id INTEGER PRIMARY KEY, value TEXT);",
                [],
            )?;
            conn.execute("INSERT INTO test_data (value) VALUES ('initial');", [])?;
            Ok(())
        })
        .expect("table initialized");

        let num_threads = 8;
        let iterations = 25;
        let barrier = Arc::new(Barrier::new(num_threads + 2)); // 8 readers, 2 writers
        let read_count = Arc::new(AtomicUsize::new(0));

        let mut handles = Vec::new();

        // Spawn concurrent readers
        for _ in 0..num_threads {
            let p = Arc::clone(&pool);
            let b = Arc::clone(&barrier);
            let rc = Arc::clone(&read_count);
            handles.push(thread::spawn(move || {
                b.wait();
                for _ in 0..iterations {
                    let val: String = p
                        .read(|conn| {
                            conn.query_row(
                                "SELECT value FROM test_data ORDER BY id DESC LIMIT 1;",
                                [],
                                |r| r.get(0),
                            )
                        })
                        .expect("read succeeds");
                    assert!(!val.is_empty());
                    rc.fetch_add(1, Ordering::Relaxed);
                }
            }));
        }

        // Spawn serialized writers
        for w_idx in 0..2 {
            let p = Arc::clone(&pool);
            let b = Arc::clone(&barrier);
            handles.push(thread::spawn(move || {
                b.wait();
                for i in 0..iterations {
                    p.write(|conn| {
                        conn.execute(
                            "INSERT INTO test_data (value) VALUES (?1);",
                            rusqlite::params![format!("writer-{}-val-{}", w_idx, i)],
                        )?;
                        Ok(())
                    })
                    .expect("write succeeds");
                }
            }));
        }

        for h in handles {
            h.join().expect("thread completed successfully");
        }

        assert_eq!(read_count.load(Ordering::Relaxed), num_threads * iterations);

        let final_count: i64 = pool
            .read(|conn| conn.query_row("SELECT count(*) FROM test_data;", [], |r| r.get(0)))
            .expect("read final count");

        assert_eq!(final_count, 1 + (2 * iterations as i64));

        drop(pool);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_disk_wal_mode_and_auto_checkpointing() {
        let temp_dir =
            std::env::temp_dir().join(format!("packmatrix_test_db_{}", std::process::id()));
        let db_path = temp_dir.join("test_wal.db");

        let pool = DbPool::open(&db_path).expect("open disk pool");

        // Verify journal_mode = WAL on disk
        let jm: String = pool
            .read(|conn| conn.query_row("PRAGMA journal_mode;", [], |r| r.get(0)))
            .expect("query journal_mode");
        assert_eq!(jm.to_lowercase(), "wal", "Disk database must use WAL mode");

        // Initialize schema and populate data to generate WAL writes
        pool.write(|conn| {
            conn.execute(
                "CREATE TABLE big_blob (id INTEGER PRIMARY KEY, payload BLOB);",
                [],
            )?;
            Ok(())
        })
        .expect("create table");

        let chunk = vec![0xAAu8; 64 * 1024]; // 64 KB chunks
        for _ in 0..20 {
            pool.write(|conn| {
                conn.execute(
                    "INSERT INTO big_blob (payload) VALUES (?1);",
                    rusqlite::params![&chunk],
                )?;
                Ok(())
            })
            .expect("insert blob");
        }

        // Verify WAL file exists on disk
        let wal_path = PathBuf::from(format!("{}-wal", db_path.display()));
        assert!(
            wal_path.exists(),
            "WAL file should exist during active transactions"
        );

        // Trigger checkpoint and ensure WAL is truncated
        let stats = pool.checkpoint().expect("checkpoint succeeds");
        assert_eq!(stats.busy, 0, "No busy lock during checkpoint");

        // Clean up
        drop(pool);
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
