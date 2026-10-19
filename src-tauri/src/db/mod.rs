pub mod migrations;
pub mod models;
pub mod pool;

pub use migrations::*;
pub use models::*;
pub use pool::*;

use std::path::Path;
use std::sync::Arc;

pub struct DatabaseState {
    pub pool: Arc<DbPool>,
}

impl DatabaseState {
    /// Initializes an in-memory SQLite database state with initial migrations
    pub fn new_in_memory() -> Result<Self, StorageError> {
        let pool = Arc::new(DbPool::open_in_memory()?);
        pool.write(|conn| run_migrations(conn))?;
        Ok(Self { pool })
    }

    /// Initializes a disk-backed SQLite database state at the specified path with migrations
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, StorageError> {
        let pool = Arc::new(DbPool::open(path)?);
        pool.write(|conn| run_migrations(conn))?;
        Ok(Self { pool })
    }
}
