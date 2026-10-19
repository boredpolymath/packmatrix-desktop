use rusqlite::{Connection, Result};

pub fn run_migrations(conn: &Connection) -> Result<()> {
    // Apply full 8-step PRAGMA bootstrap sequence for WAL, caching, and integrity
    crate::db::pool::bootstrap_connection(conn)?;

    // Execute schema creation
    let schema_sql = include_str!("../../migrations/001_initial_schema.sql");
    conn.execute_batch(schema_sql)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_migration_and_foreign_keys() {
        let conn = Connection::open_in_memory().expect("open memory db");
        run_migrations(&conn).expect("migrations run");

        // Test inserting a luggage shell and subcontainer
        conn.execute(
            "INSERT INTO luggage_shells (id, name, length_cm, width_cm, depth_cm, tare_weight_g, nominal_volume_l)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params!["bag-1", "Peak Design 45L", 53.5, 33.0, 24.1, 2050.0, 45.0],
        ).expect("insert bag");

        conn.execute(
            "INSERT INTO sub_containers (id, luggage_shell_id, name, container_type, length_cm, width_cm, depth_cm, max_volume_l)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params!["cube-1", "bag-1", "Clothing Cube L", "cube", 32.0, 32.0, 11.2, 4.2],
        ).expect("insert cube");

        let count: i64 = conn
            .query_row(
                "SELECT count(*) FROM sub_containers WHERE luggage_shell_id = 'bag-1'",
                [],
                |r| r.get(0),
            )
            .expect("query count");

        assert_eq!(count, 1);
    }
}
