pub mod models;
pub mod migrations;

pub use models::*;
pub use migrations::*;

use rusqlite::Connection;
use std::sync::Mutex;

pub struct DatabaseState {
    pub conn: Mutex<Connection>,
}

impl DatabaseState {
    pub fn new_in_memory() -> Result<Self, rusqlite::Error> {
        let conn = Connection::open_in_memory()?;
        run_migrations(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}
