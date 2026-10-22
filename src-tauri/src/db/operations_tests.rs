#[cfg(test)]
mod tests {
    use crate::db::migrations::run_migrations;
    use crate::db::operations::*;
    use chrono::Utc;
    use rusqlite::Connection;
    use std::fs;
    use std::io::Write;
    use std::path::PathBuf;

    struct TestDir {
        path: PathBuf,
    }

    impl TestDir {
        fn new(name: &str) -> Self {
            let unique = format!(
                "pm_test_{}_{}_{}",
                name,
                std::process::id(),
                Utc::now().timestamp_nanos_opt().unwrap_or(0)
            );
            let path = std::env::temp_dir().join(unique);
            fs::create_dir_all(&path).expect("create test temp dir");
            Self { path }
        }

        fn path(&self) -> &std::path::Path {
            &self.path
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    #[test]
    fn test_quick_check_and_comprehensive_diagnostics() {
        let conn = Connection::open_in_memory().expect("open memory db");
        run_migrations(&conn).expect("migrations run");

        // Verify quick check on fresh db
        let quick = execute_quick_check(&conn).expect("quick check executes");
        assert_eq!(quick.to_lowercase(), "ok");

        // Insert valid luggage shell
        conn.execute(
            "INSERT INTO luggage_shells (id, name, brand, length_cm, width_cm, depth_cm, tare_weight_g, nominal_volume_l)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params!["bag-diag-1", "Farpoint 40", "Osprey", 55.0, 35.0, 23.0, 1580.0, 40.0],
        ).expect("insert bag");

        // Run full diagnostics
        let report = run_comprehensive_diagnostics(&conn).expect("diagnostics run");
        assert!(report.is_healthy);
        assert_eq!(report.quick_check.to_lowercase(), "ok");
        assert_eq!(report.integrity_check.to_lowercase(), "ok");
        assert!(report.foreign_key_check_passed);
        assert!(report.foreign_key_violations.is_empty());
        assert_eq!(report.optimize_status, "OPTIMIZED_OK");
        assert_eq!(report.vacuum_status, "VACUUM_OK");
    }

    #[test]
    fn test_pre_migration_snapshot_and_rolling_rotation_cap() {
        let dir = TestDir::new("snapshot_rotation");
        let db_path = dir.path().join("packmatrix.db");
        let backups_dir = dir.path().join("backups");

        // Create initial database file
        {
            let conn = Connection::open(&db_path).expect("open db");
            run_migrations(&conn).expect("migrations run");
        }

        // Generate 7 consecutive snapshots to test rolling rotation
        for i in 1..=7 {
            let snap_path =
                create_pre_migration_snapshot(&db_path, &format!("v0.1.{}", i), &backups_dir)
                    .expect("snapshot created");
            assert!(snap_path.exists());
            std::thread::sleep(std::time::Duration::from_millis(15));
        }

        // Verify rotation capped files to exactly MAX_ROLLING_SNAPSHOTS (5)
        let entries = fs::read_dir(&backups_dir)
            .expect("read backups")
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().is_some_and(|ext| ext == "bak"))
            .collect::<Vec<_>>();

        assert_eq!(entries.len(), MAX_ROLLING_SNAPSHOTS);
    }

    #[test]
    fn test_disaster_recovery_scenario_a_corrupt_wal() {
        let dir = TestDir::new("wal_salvage");
        let db_path = dir.path().join("packmatrix.db");
        let wal_path = dir.path().join("packmatrix.db-wal");
        let shm_path = dir.path().join("packmatrix.db-shm");

        // Initialize DB
        {
            let conn = Connection::open(&db_path).expect("open db");
            run_migrations(&conn).expect("migrations run");
        }

        // Simulate corrupted WAL and SHM files
        fs::write(&wal_path, b"CORRUPTED_WAL_HEADER_BYTES_RANDOM_NOISE").expect("write wal");
        fs::write(&shm_path, b"CORRUPTED_SHM_HEADER_BYTES").expect("write shm");

        assert!(wal_path.exists());
        assert!(shm_path.exists());

        // Execute Scenario A salvage
        let salvage = salvage_corrupt_wal(&db_path).expect("salvage executed");
        assert!(salvage.wal_removed);
        assert!(salvage.shm_removed);
        assert!(salvage.database_healthy);
        assert_eq!(salvage.status, "WAL_SALVAGE_SUCCESSFUL");

        // Verify corrupted WAL/SHM were cleanly removed
        assert!(!wal_path.exists());
        assert!(!shm_path.exists());
    }

    #[test]
    fn test_disaster_recovery_scenario_b_corruption_fallback() {
        let dir = TestDir::new("corruption_fallback");
        let db_path = dir.path().join("packmatrix.db");
        let backups_dir = dir.path().join("backups");
        let quarantine_dir = dir.path().join("quarantine");

        // 1. Initialize valid DB and insert data
        {
            let conn = Connection::open(&db_path).expect("open db");
            run_migrations(&conn).expect("migrations run");
            conn.execute(
                "INSERT INTO luggage_shells (id, name, brand, length_cm, width_cm, depth_cm, tare_weight_g, nominal_volume_l)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params!["shell-saved-1", "Snapshot Luggage", "Rimowa", 55.0, 40.0, 20.0, 1800.0, 38.0],
            ).expect("insert");
        }

        // 2. Create verified snapshot
        let snap_path = create_pre_migration_snapshot(&db_path, "v0.1.0", &backups_dir)
            .expect("snapshot created");
        assert!(snap_path.exists());

        // 3. Deliberately corrupt DB file (overwrite SQLite header with garbage)
        {
            let mut file = fs::OpenOptions::new()
                .write(true)
                .open(&db_path)
                .expect("open to corrupt");
            file.write_all(b"NOT_A_SQLITE3_DATABASE_GARBAGE_PAYLOAD")
                .expect("corrupt header");
        }

        // 4. Run automated corruption fallback
        let report = handle_corruption_fallback(&db_path, &backups_dir, &quarantine_dir)
            .expect("corruption fallback runs");

        assert!(report.corrupted_detected);
        assert!(report.success);
        assert!(report.quarantined_path.is_some());
        assert!(report.restored_from_snapshot.is_some());

        // 5. Verify restored DB is healthy and contains snapshot data
        let conn = Connection::open(&db_path).expect("open restored db");
        let quick = execute_quick_check(&conn).expect("quick check");
        assert_eq!(quick.to_lowercase(), "ok");

        let count: i64 = conn
            .query_row(
                "SELECT count(*) FROM luggage_shells WHERE id = 'shell-saved-1'",
                [],
                |r| r.get(0),
            )
            .expect("query row");
        assert_eq!(count, 1);

        // 6. Verify quarantined file exists in quarantine_dir
        let quarantined_files = fs::read_dir(&quarantine_dir)
            .expect("read quarantine")
            .filter_map(|e| e.ok())
            .collect::<Vec<_>>();
        assert_eq!(quarantined_files.len(), 1);
    }

    #[test]
    fn test_emergency_table_salvage_scenario_c() {
        let dir = TestDir::new("salvage_c");
        let src_db = dir.path().join("source.db");
        let dest_db = dir.path().join("salvaged.db");

        // Setup source db with records
        {
            let conn = Connection::open(&src_db).expect("open src");
            run_migrations(&conn).expect("migrations run");

            conn.execute(
                "INSERT INTO luggage_shells (id, name, brand, length_cm, width_cm, depth_cm, tare_weight_g, nominal_volume_l)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params!["shell-c-1", "Salvage Test Shell", "Peak Design", 54.0, 34.0, 22.0, 1900.0, 40.0],
            ).expect("insert shell");

            conn.execute(
                "INSERT INTO inventory_items (id, name, brand, category, weight_g, length_cm, width_cm, depth_cm, readiness_state)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                rusqlite::params!["item-c-1", "A7IV Camera", "Sony", "Tech", 658.0, 13.1, 9.6, 8.0, "Packed"],
            ).expect("insert item");
        }

        let report = execute_emergency_table_salvage(&src_db, &dest_db).expect("salvage dump");
        assert_eq!(report.recovered_shells, 1);
        assert_eq!(report.recovered_items, 1);

        // Verify destination db integrity
        let conn_dest = Connection::open(&dest_db).expect("open dest");
        let quick = execute_quick_check(&conn_dest).expect("quick check");
        assert_eq!(quick.to_lowercase(), "ok");
    }

    #[test]
    fn test_diagnostic_logging_and_pii_redaction() {
        let redactor = DiagnosticRedactor::new("packmatrix-prod-salt-2026");

        // Test deterministic salted hashing
        let hash1 = redactor.redact_item_name("MacBook Pro 16-inch M3 Max");
        let hash2 = redactor.redact_item_name("MacBook Pro 16-inch M3 Max");
        let hash3 = redactor.redact_item_name("Passport and Cash");

        assert_eq!(
            hash1, hash2,
            "Deterministic hashing must produce identical tokens for identical names"
        );
        assert_ne!(
            hash1, hash3,
            "Different item names must hash to different tokens"
        );
        assert!(hash1.starts_with("Item[#"));

        let serial_redacted = redactor.redact_serial_number("SN-9874-ABCD-2026");
        assert!(serial_redacted.starts_with("SN[#"));
        assert!(!serial_redacted.contains("9874"));

        let dir = TestDir::new("logging");
        let logger = RotatingDiagnosticLogger::new(dir.path(), "test-salt");

        let entry = logger
            .log_event(
                "INFO",
                "INVENTORY",
                "ITEM_ALLOCATED",
                "Allocated item to Spine Bottom costing $1,450.00 USD",
                Some("30x20x10cm, 500g"),
            )
            .expect("log event");

        assert!(entry.sanitized_message.contains("$***.**"));
        assert_eq!(
            entry.dimensions_telemetry.as_deref(),
            Some("30x20x10cm, 500g")
        );

        let bundle_out = dir.path().join("diagnostic_bundle.txt");
        let bundle_content = logger
            .export_sanitized_bundle(&bundle_out)
            .expect("export bundle");
        assert!(bundle_content.contains("PACKMATRIX DESKTOP SANITIZED DIAGNOSTIC SUPPORT BUNDLE"));
        assert!(bundle_content.contains("Privacy Guarantee: Zero PII"));
    }

    #[test]
    fn test_complete_data_sovereignty_vault_export() {
        let dir = TestDir::new("vault_export");
        let db_path = dir.path().join("packmatrix.db");
        let export_dir = dir.path().join("vault_export_out");

        let conn = Connection::open(&db_path).expect("open db");
        run_migrations(&conn).expect("migrations run");

        conn.execute(
            "INSERT INTO luggage_shells (id, name, brand, length_cm, width_cm, depth_cm, tare_weight_g, nominal_volume_l)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params!["shell-vault-1", "Vault Export Bag", "Bored Polymath", 55.0, 40.0, 23.0, 2100.0, 45.0],
        ).expect("insert shell");

        let vault = export_entire_data_vault(&conn, &db_path, &export_dir).expect("vault export");
        assert_eq!(vault.luggage_shells.len(), 1);
        assert_eq!(vault.luggage_shells[0].id, "shell-vault-1");
        assert!(vault.sqlite_raw_dump_path.is_some());

        // Check JSON file was written
        let json_files = fs::read_dir(&export_dir)
            .expect("read export dir")
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().is_some_and(|ext| ext == "json"))
            .collect::<Vec<_>>();
        assert_eq!(json_files.len(), 1);
    }

    #[test]
    fn test_secure_wipe_and_reset_zero_fill() {
        let dir = TestDir::new("secure_wipe");
        let db_path = dir.path().join("packmatrix.db");
        let wal_path = dir.path().join("packmatrix.db-wal");
        let shm_path = dir.path().join("packmatrix.db-shm");

        // Write sample files with known content
        fs::write(&db_path, vec![0xAA; 4096]).expect("write db");
        fs::write(&wal_path, vec![0xBB; 2048]).expect("write wal");
        fs::write(&shm_path, vec![0xCC; 1024]).expect("write shm");

        assert!(db_path.exists());
        assert!(wal_path.exists());
        assert!(shm_path.exists());

        let report = execute_secure_wipe_and_reset(&db_path).expect("secure wipe");
        assert!(report.success);
        assert_eq!(report.bytes_zeroized, 4096 + 2048 + 1024);
        assert_eq!(report.files_purged.len(), 3);

        // Verify files no longer exist on filesystem
        assert!(!db_path.exists());
        assert!(!wal_path.exists());
        assert!(!shm_path.exists());
    }
}
