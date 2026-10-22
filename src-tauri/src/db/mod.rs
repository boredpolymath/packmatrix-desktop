#[cfg(test)]
pub mod benchmark_tests;
#[cfg(test)]
pub mod chaos_tests;
pub mod crud;
#[cfg(test)]
pub mod crud_tests;
pub mod encryption;
pub mod migrations;
pub mod models;
pub mod operations;
#[cfg(test)]
pub mod operations_tests;
pub mod pool;
pub mod seeding;

pub use crud::*;
pub use encryption::*;
pub use migrations::*;
pub use models::*;
pub use operations::*;
pub use pool::*;
pub use seeding::*;

use std::path::Path;
use std::sync::Arc;

pub struct DatabaseState {
    pub pool: Arc<DbPool>,
}

impl DatabaseState {
    /// Initializes an in-memory SQLite database state with initial migrations and seeding
    pub fn new_in_memory() -> Result<Self, StorageError> {
        let pool = Arc::new(DbPool::open_in_memory()?);
        pool.write(|conn| {
            run_migrations(conn)?;
            execute_quick_check(conn)?;
            seed_database_if_empty(conn)?;
            Ok(())
        })?;
        Ok(Self { pool })
    }

    /// Initializes a disk-backed SQLite database state at the specified path with migrations,
    /// pre-migration snapshots, fast startup integrity watchdog, and auto-seeding daemon.
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, StorageError> {
        let path = path.as_ref();

        // If database file already exists, run startup watchdog and snapshot
        if path.exists() {
            let parent_dir = path.parent().unwrap_or_else(|| Path::new("."));
            let backups_dir = parent_dir.join("backups");
            let quarantine_dir = parent_dir.join("quarantine");

            // SDLC 8.1 & 8.2: Startup integrity check & automated quarantine fallback
            let fallback_report = handle_corruption_fallback(path, &backups_dir, &quarantine_dir)?;
            if fallback_report.corrupted_detected && !fallback_report.success {
                return Err(StorageError::Io(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    fallback_report.message,
                )));
            }

            // SDLC 8.1: Pre-migration snapshot daemon
            let version = env!("CARGO_PKG_VERSION");
            let _ = create_pre_migration_snapshot(path, version, &backups_dir);
        }

        let pool = Arc::new(DbPool::open(path)?);
        pool.write(|conn| {
            run_migrations(conn)?;
            // Execute fast quick_check on startup
            let check = execute_quick_check(conn)?;
            if check.to_lowercase() != "ok" {
                return Err(rusqlite::Error::SqliteFailure(
                    rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CORRUPT),
                    Some(format!("Database quick_check failed: {}", check)),
                ));
            }
            // Seed database if empty on first launch
            seed_database_if_empty(conn)?;
            Ok(())
        })?;
        Ok(Self { pool })
    }
}
