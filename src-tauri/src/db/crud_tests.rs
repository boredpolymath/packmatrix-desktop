#[cfg(test)]
mod tests {
    use crate::db::crud::*;
    use crate::db::migrations::run_migrations;
    use crate::db::models::{Allocation, InventoryItem, LuggageShell, SubContainer, TripPlan};
    use crate::db::seeding::seed_database_if_empty;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("open memory db");
        run_migrations(&conn).expect("migrations run");
        conn
    }

    #[test]
    fn test_auto_seeding_daemon_idempotent() {
        let conn = setup_test_db();

        // 1. Initial seed on fresh database
        let report = seed_database_if_empty(&conn).expect("seed empty db");
        assert!(!report.already_seeded);
        assert_eq!(report.luggage_shells_seeded, 4);
        assert_eq!(report.sub_containers_seeded, 4);
        assert!(report.airline_rules_seeded >= 50);
        assert_eq!(report.inventory_items_seeded, 5);
        assert_eq!(report.trip_plans_seeded, 1);

        // 2. Second seed attempt must be idempotent and perform zero writes
        let report2 = seed_database_if_empty(&conn).expect("second seed check");
        assert!(report2.already_seeded);
        assert_eq!(report2.luggage_shells_seeded, 0);
        assert_eq!(report2.inventory_items_seeded, 0);

        // 3. Verify seeded items are queryable
        let shells = get_luggage_shells(&conn).expect("get shells");
        assert_eq!(shells.len(), 4);
        assert!(shells.iter().any(|s| s.name.contains("Osprey")));
        assert!(shells.iter().any(|s| s.name.contains("Peak Design")));

        let items = get_inventory_items(&conn, None, None, None).expect("get items");
        assert_eq!(items.len(), 5);
    }

    #[test]
    fn test_luggage_crud_operations() {
        let conn = setup_test_db();

        let new_bag = LuggageShell {
            id: "bag-test-custom-1".to_string(),
            name: "Nomatic Travel Pack 30L".to_string(),
            brand: Some("Nomatic".to_string()),
            length_cm: 47.0,
            width_cm: 30.5,
            depth_cm: 15.2,
            tare_weight_g: 1750.0,
            nominal_volume_l: 30.0,
            expansion_gusset_cm: 5.0,
            is_expanded: false,
            corner_radius_cm: 2.5,
            taper_ratio: 0.95,
        };

        // Create
        let created = create_luggage_shell(&conn, &new_bag).expect("create bag");
        assert_eq!(created.id, "bag-test-custom-1");

        // Read by ID
        let fetched = get_luggage_shell_by_id(&conn, "bag-test-custom-1")
            .expect("get bag")
            .expect("found bag");
        assert_eq!(fetched.name, "Nomatic Travel Pack 30L");
        assert_eq!(fetched.nominal_volume_l, 30.0);

        // Update
        let mut updated_bag = fetched.clone();
        updated_bag.is_expanded = true;
        updated_bag.name = "Nomatic Travel Pack 30L (Expanded)".to_string();
        let updated = update_luggage_shell(&conn, &updated_bag).expect("update bag");
        assert!(updated.is_expanded);

        // Delete
        let deleted = delete_luggage_shell(&conn, "bag-test-custom-1").expect("delete bag");
        assert!(deleted);

        let missing = get_luggage_shell_by_id(&conn, "bag-test-custom-1").expect("check missing");
        assert!(missing.is_none());
    }

    #[test]
    fn test_sub_container_crud_operations() {
        let conn = setup_test_db();

        let cube = SubContainer {
            id: "test-cube-1".to_string(),
            luggage_shell_id: None,
            parent_sub_container_id: None,
            name: "Hyperlite Mountain Gear Pod".to_string(),
            container_type: "cube".to_string(),
            length_cm: 30.0,
            width_cm: 20.0,
            depth_cm: 10.0,
            max_volume_l: 6.0,
            tare_weight_g: 35.0,
            compression_ratio: 0.9,
            zone_layer: "Spine Bottom".to_string(),
        };

        // Create
        create_sub_container(&conn, &cube).expect("create cube");

        // Read
        let cubes = get_sub_containers(&conn, None).expect("get cubes");
        assert_eq!(cubes.len(), 1);
        assert_eq!(cubes[0].name, "Hyperlite Mountain Gear Pod");

        // Update
        let mut updated_cube = cube.clone();
        updated_cube.zone_layer = "Outer Lid".to_string();
        update_sub_container(&conn, &updated_cube).expect("update cube");

        let cubes_after = get_sub_containers(&conn, None).expect("get cubes after");
        assert_eq!(cubes_after[0].zone_layer, "Outer Lid");

        // Delete
        let deleted = delete_sub_container(&conn, "test-cube-1").expect("delete cube");
        assert!(deleted);
    }

    #[test]
    fn test_inventory_crud_and_fts5_stemming() {
        let conn = setup_test_db();

        let item1 = InventoryItem {
            id: "gear-1".to_string(),
            name: "Sony Alpha 7 IV Mirrorless Camera Body".to_string(),
            brand: Some("Sony".to_string()),
            category: "Tech".to_string(),
            weight_g: 658.0,
            length_cm: 13.1,
            width_cm: 9.6,
            depth_cm: 8.0,
            compressibility_factor: 1.0,
            is_liquid: false,
            liquid_volume_ml: 0.0,
            monetary_value: 2498.0,
            currency: "USD".to_string(),
            serial_number: Some("SN-88220".to_string()),
            readiness_state: "In Closet".to_string(),
            tags: Some("camera,lens,photography".to_string()),
            notes: Some("Primary body".to_string()),
        };

        let item2 = InventoryItem {
            id: "gear-2".to_string(),
            name: "Patagonia Torrentshell 3L Rain Jacket".to_string(),
            brand: Some("Patagonia".to_string()),
            category: "Clothing".to_string(),
            weight_g: 394.0,
            length_cm: 25.0,
            width_cm: 15.0,
            depth_cm: 5.0,
            compressibility_factor: 0.5,
            is_liquid: false,
            liquid_volume_ml: 0.0,
            monetary_value: 179.0,
            currency: "USD".to_string(),
            serial_number: None,
            readiness_state: "Staged".to_string(),
            tags: Some("waterproof,outerwear".to_string()),
            notes: Some("H2No performance".to_string()),
        };

        create_inventory_item(&conn, &item1).expect("create item1");
        create_inventory_item(&conn, &item2).expect("create item2");

        // Test category filter
        let tech_items = get_inventory_items(&conn, None, Some("Tech"), None).expect("filter tech");
        assert_eq!(tech_items.len(), 1);
        assert_eq!(tech_items[0].id, "gear-1");

        // Test readiness filter
        let staged_items =
            get_inventory_items(&conn, None, None, Some("Staged")).expect("filter staged");
        assert_eq!(staged_items.len(), 1);
        assert_eq!(staged_items[0].id, "gear-2");

        // Test FTS5 full-text search
        let camera_search = search_inventory_fts(&conn, "Camera").expect("fts camera");
        assert_eq!(camera_search.len(), 1);
        assert_eq!(camera_search[0].id, "gear-1");

        let jacket_search = search_inventory_fts(&conn, "Jacket").expect("fts jacket");
        assert_eq!(jacket_search.len(), 1);
        assert_eq!(jacket_search[0].id, "gear-2");

        let tag_search = search_inventory_fts(&conn, "waterproof").expect("fts tag");
        assert_eq!(tag_search.len(), 1);
        assert_eq!(tag_search[0].id, "gear-2");

        // Test batch readiness update
        let updated_count = batch_update_inventory_state(
            &conn,
            &["gear-1".to_string(), "gear-2".to_string()],
            "Packed",
        )
        .expect("batch state update");
        assert_eq!(updated_count, 2);

        let packed_items =
            get_inventory_items(&conn, None, None, Some("Packed")).expect("get packed");
        assert_eq!(packed_items.len(), 2);

        // Test batch delete
        let deleted_count =
            batch_delete_inventory_items(&conn, &["gear-1".to_string()]).expect("batch delete");
        assert_eq!(deleted_count, 1);

        let remaining = get_inventory_items(&conn, None, None, None).expect("get remaining");
        assert_eq!(remaining.len(), 1);
    }

    #[test]
    fn test_trip_plan_and_allocations() {
        let conn = setup_test_db();

        let plan = TripPlan {
            id: "trip-alps-2026".to_string(),
            title: "Swiss Alps Trek".to_string(),
            origin_airport: Some("JFK".to_string()),
            destination_airport: Some("ZRH".to_string()),
            departure_date: Some("2026-08-01".to_string()),
            return_date: Some("2026-08-15".to_string()),
            target_airline_rule_id: None,
            active_luggage_shell_id: None,
            notes: Some("Ultralight hut-to-hut packing".to_string()),
        };

        save_trip_plan(&conn, &plan).expect("save trip plan");
        let active = get_active_trip_plan(&conn)
            .expect("get trip plan")
            .expect("active plan");
        assert_eq!(active.id, "trip-alps-2026");

        // Insert inventory item first to satisfy foreign key constraint
        let boot_item = InventoryItem {
            id: "item-boots".to_string(),
            name: "Salomon Quest 4 Gore-Tex Boots".to_string(),
            brand: Some("Salomon".to_string()),
            category: "Footwear".to_string(),
            weight_g: 1300.0,
            length_cm: 32.0,
            width_cm: 22.0,
            depth_cm: 15.0,
            compressibility_factor: 1.0,
            is_liquid: false,
            liquid_volume_ml: 0.0,
            monetary_value: 230.0,
            currency: "USD".to_string(),
            serial_number: None,
            readiness_state: "Staged".to_string(),
            tags: Some("boots,hiking".to_string()),
            notes: None,
        };
        create_inventory_item(&conn, &boot_item).expect("create boot item");

        let alloc = Allocation {
            id: "alloc-1".to_string(),
            trip_plan_id: "trip-alps-2026".to_string(),
            inventory_item_id: "item-boots".to_string(),
            luggage_shell_id: None,
            sub_container_id: None,
            quantity: 1,
            is_packed: false,
            packed_at: None,
            custom_override_weight_g: None,
            pos_x: 0.0,
            pos_y: 5.0,
            pos_z: 10.0,
        };

        save_item_allocation(&conn, &alloc).expect("save allocation");
        let allocs = get_trip_allocations(&conn, "trip-alps-2026").expect("get allocs");
        assert_eq!(allocs.len(), 1);
        assert_eq!(allocs[0].pos_z, 10.0);

        // Toggle packed
        let is_packed = toggle_allocation_packed(&conn, "alloc-1").expect("toggle packed");
        assert!(is_packed);

        let allocs_after = get_trip_allocations(&conn, "trip-alps-2026").expect("get allocs after");
        assert!(allocs_after[0].is_packed);
        assert!(allocs_after[0].packed_at.is_some());
    }
}
