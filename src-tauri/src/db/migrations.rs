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

    #[test]
    fn test_migration_runner_idempotency() {
        let conn = Connection::open_in_memory().expect("open memory db");

        // Run migrations 3 consecutive times to guarantee absolute idempotency
        for i in 1..=3 {
            run_migrations(&conn)
                .unwrap_or_else(|e| panic!("Migration iteration {} failed: {}", i, e));
        }

        // Verify master tables and virtual table are functional after multiple executions
        let table_count: i64 = conn
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE type='table' AND name IN ('luggage_shells', 'sub_containers', 'inventory_items', 'inventory_fts')",
                [],
                |r| r.get(0),
            )
            .expect("query sqlite_master table count");

        assert!(
            table_count >= 4,
            "Expected all core tables and FTS5 to exist"
        );
    }

    #[test]
    fn test_foreign_key_cascade_delete_chain() {
        let conn = Connection::open_in_memory().expect("open memory db");
        run_migrations(&conn).expect("migrations run");

        // 1. Insert luggage shell
        conn.execute(
            "INSERT INTO luggage_shells (id, name, length_cm, width_cm, depth_cm, tare_weight_g, nominal_volume_l)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params!["shell-cascade-1", "Cascade Luggage", 55.0, 40.0, 23.0, 2000.0, 40.0],
        ).expect("insert luggage");

        // 2. Insert sub_container referencing luggage_shell
        conn.execute(
            "INSERT INTO sub_containers (id, luggage_shell_id, name, container_type, length_cm, width_cm, depth_cm, max_volume_l)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params!["cube-cascade-1", "shell-cascade-1", "Inner Cube", "cube", 20.0, 20.0, 10.0, 4.0],
        ).expect("insert sub_container");

        // 3. Insert trip plan & inventory item
        conn.execute(
            "INSERT INTO trip_plans (id, title) VALUES (?1, ?2)",
            rusqlite::params!["trip-1", "Tokyo Expedition"],
        )
        .expect("insert trip_plan");

        conn.execute(
            "INSERT INTO inventory_items (id, name, category, weight_g)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["item-cascade-1", "Down Jacket", "Clothing", 450.0],
        )
        .expect("insert inventory item");

        // 4. Insert allocation referencing luggage_shell AND sub_container
        conn.execute(
            "INSERT INTO allocations (id, trip_plan_id, inventory_item_id, luggage_shell_id, sub_container_id)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params!["alloc-1", "trip-1", "item-cascade-1", "shell-cascade-1", "cube-cascade-1"],
        ).expect("insert allocation");

        // Pre-condition verification: 1 sub_container, 1 allocation
        let pre_sub: i64 = conn
            .query_row(
                "SELECT count(*) FROM sub_containers WHERE luggage_shell_id = 'shell-cascade-1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        let pre_alloc: i64 = conn
            .query_row(
                "SELECT count(*) FROM allocations WHERE luggage_shell_id = 'shell-cascade-1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(pre_sub, 1);
        assert_eq!(pre_alloc, 1);

        // Act: Delete root luggage shell
        conn.execute(
            "DELETE FROM luggage_shells WHERE id = 'shell-cascade-1'",
            [],
        )
        .expect("delete luggage shell");

        // Assert: foreign key cascade deletes sub_containers AND allocations
        let post_sub: i64 = conn
            .query_row(
                "SELECT count(*) FROM sub_containers WHERE id = 'cube-cascade-1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        let post_alloc: i64 = conn
            .query_row(
                "SELECT count(*) FROM allocations WHERE id = 'alloc-1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            post_sub, 0,
            "Sub-containers must cascade delete when parent shell is deleted"
        );
        assert_eq!(
            post_alloc, 0,
            "Allocations must cascade delete when parent shell is deleted"
        );
    }

    #[test]
    fn test_fts5_virtual_table_sync_triggers() {
        let conn = Connection::open_in_memory().expect("open memory db");
        run_migrations(&conn).expect("migrations run");

        // 1. INSERT trigger test
        conn.execute(
            "INSERT INTO inventory_items (id, name, brand, category, weight_g, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                "item-fts-1",
                "Alpha SV Jacket",
                "Arc'teryx",
                "Clothing",
                490.0,
                "waterproof,goretex,alpine"
            ],
        )
        .expect("insert item");

        let match_count: i64 = conn
            .query_row(
                "SELECT count(*) FROM inventory_fts WHERE inventory_fts MATCH 'goretex'",
                [],
                |r| r.get(0),
            )
            .expect("query fts insert match");
        assert_eq!(
            match_count, 1,
            "FTS5 index must immediately reflect newly inserted items"
        );

        let brand_match: i64 = conn
            .query_row(
                "SELECT count(*) FROM inventory_fts WHERE inventory_fts MATCH ?1",
                rusqlite::params!["\"Arc'teryx\""],
                |r| r.get(0),
            )
            .expect("query brand match");
        assert_eq!(brand_match, 1, "FTS5 must match brand name");

        // 2. UPDATE trigger test
        conn.execute(
            "UPDATE inventory_items SET name = 'Merino Wool Hoodie', tags = 'breathable,wool' WHERE id = 'item-fts-1'",
            [],
        ).expect("update item");

        let old_match: i64 = conn
            .query_row(
                "SELECT count(*) FROM inventory_fts WHERE inventory_fts MATCH 'goretex'",
                [],
                |r| r.get(0),
            )
            .expect("query old term");
        assert_eq!(
            old_match, 0,
            "FTS5 index must remove outdated terms after UPDATE"
        );

        let new_match: i64 = conn
            .query_row(
                "SELECT count(*) FROM inventory_fts WHERE inventory_fts MATCH 'wool'",
                [],
                |r| r.get(0),
            )
            .expect("query new term");
        assert_eq!(new_match, 1, "FTS5 index must reflect updated terms");

        // 3. DELETE trigger test
        conn.execute("DELETE FROM inventory_items WHERE id = 'item-fts-1'", [])
            .expect("delete item");

        let post_delete_match: i64 = conn
            .query_row(
                "SELECT count(*) FROM inventory_fts WHERE inventory_fts MATCH 'wool'",
                [],
                |r| r.get(0),
            )
            .expect("query post delete");
        assert_eq!(
            post_delete_match, 0,
            "FTS5 index must completely remove deleted items"
        );
    }
}
