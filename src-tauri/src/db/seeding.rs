//! PackMatrix Desktop — Database Auto-Seeding Daemon
//! SDLC Section 3.5.1 Implementation
//!
//! Automatically verifies and seeds fresh SQLite installations on first launch:
//! - Curated luggage shells (Osprey, Peak Design, Rimowa, Aer)
//! - Starter packing cubes and sub-containers
//! - Verified top 100 airline carrier dimensional envelopes
//! - Default starter travel trip plan & starter gear library

use crate::compliance::carrier_matrix::{get_all_carrier_envelopes, ServiceTier};
use crate::db::models::{InventoryItem, LuggageShell, SubContainer, TripPlan};
use crate::geometry::get_curated_luggage_presets;
use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeedingReport {
    pub luggage_shells_seeded: usize,
    pub sub_containers_seeded: usize,
    pub airline_rules_seeded: usize,
    pub inventory_items_seeded: usize,
    pub trip_plans_seeded: usize,
    pub already_seeded: bool,
}

pub fn seed_database_if_empty(conn: &Connection) -> SqliteResult<SeedingReport> {
    let luggage_count: i64 =
        conn.query_row("SELECT count(*) FROM luggage_shells", [], |r| r.get(0))?;

    if luggage_count > 0 {
        return Ok(SeedingReport {
            luggage_shells_seeded: 0,
            sub_containers_seeded: 0,
            airline_rules_seeded: 0,
            inventory_items_seeded: 0,
            trip_plans_seeded: 0,
            already_seeded: true,
        });
    }

    let tx = conn.unchecked_transaction()?;

    // 1. Seed Curated Luggage Presets
    let presets: Vec<LuggageShell> = get_curated_luggage_presets();
    let mut shells_seeded = 0;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO luggage_shells (id, name, brand, length_cm, width_cm, depth_cm, tare_weight_g, nominal_volume_l, expansion_gusset_cm, is_expanded, corner_radius_cm, taper_ratio)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)"
        )?;
        for shell in &presets {
            stmt.execute(params![
                shell.id,
                shell.name,
                shell.brand,
                shell.length_cm,
                shell.width_cm,
                shell.depth_cm,
                shell.tare_weight_g,
                shell.nominal_volume_l,
                shell.expansion_gusset_cm,
                if shell.is_expanded { 1 } else { 0 },
                shell.corner_radius_cm,
                shell.taper_ratio
            ])?;
            shells_seeded += 1;
        }
    }

    // 2. Seed Default Sub-Containers (Compression Cubes / Pouches)
    let default_shell_id = presets
        .first()
        .map(|p| p.id.as_str())
        .unwrap_or("preset-osprey-farpoint-40");
    let initial_cubes = vec![
        SubContainer {
            id: "cube-clothing-large".to_string(),
            luggage_shell_id: Some(default_shell_id.to_string()),
            parent_sub_container_id: None,
            name: "Peak Design Compression Cube (L)".to_string(),
            container_type: "cube".to_string(),
            length_cm: 32.0,
            width_cm: 32.0,
            depth_cm: 17.0,
            max_volume_l: 14.0,
            tare_weight_g: 110.0,
            compression_ratio: 0.55,
            zone_layer: "Spine Bottom".to_string(),
        },
        SubContainer {
            id: "cube-clothing-medium".to_string(),
            luggage_shell_id: Some(default_shell_id.to_string()),
            parent_sub_container_id: None,
            name: "Eagle Creek Clean/Dirty Cube (M)".to_string(),
            container_type: "cube".to_string(),
            length_cm: 25.0,
            width_cm: 35.0,
            depth_cm: 10.5,
            max_volume_l: 10.5,
            tare_weight_g: 90.0,
            compression_ratio: 0.65,
            zone_layer: "Spine Mid".to_string(),
        },
        SubContainer {
            id: "cube-tech-pouch".to_string(),
            luggage_shell_id: Some(default_shell_id.to_string()),
            parent_sub_container_id: None,
            name: "Aer Cable Kit 2 (Tech)".to_string(),
            container_type: "pouch".to_string(),
            length_cm: 23.0,
            width_cm: 15.0,
            depth_cm: 7.5,
            max_volume_l: 2.5,
            tare_weight_g: 310.0,
            compression_ratio: 1.0,
            zone_layer: "Outer Lid".to_string(),
        },
        SubContainer {
            id: "cube-toiletry-kit".to_string(),
            luggage_shell_id: Some(default_shell_id.to_string()),
            parent_sub_container_id: None,
            name: "Gravel Explorer PLUS (Toiletry)".to_string(),
            container_type: "organizer".to_string(),
            length_cm: 25.4,
            width_cm: 17.8,
            depth_cm: 10.2,
            max_volume_l: 3.5,
            tare_weight_g: 220.0,
            compression_ratio: 0.85,
            zone_layer: "Quick Access".to_string(),
        },
    ];

    let mut cubes_seeded = 0;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO sub_containers (id, luggage_shell_id, parent_sub_container_id, name, container_type, length_cm, width_cm, depth_cm, max_volume_l, tare_weight_g, compression_ratio, zone_layer)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)"
        )?;
        for cube in &initial_cubes {
            stmt.execute(params![
                cube.id,
                cube.luggage_shell_id,
                cube.parent_sub_container_id,
                cube.name,
                cube.container_type,
                cube.length_cm,
                cube.width_cm,
                cube.depth_cm,
                cube.max_volume_l,
                cube.tare_weight_g,
                cube.compression_ratio,
                cube.zone_layer
            ])?;
            cubes_seeded += 1;
        }
    }

    // 3. Seed Verified Airline Carrier Matrix
    let carriers = get_all_carrier_envelopes();
    let mut rules_seeded = 0;
    {
        let mut stmt = tx.prepare(
            "INSERT OR REPLACE INTO airline_rules (id, carrier_name, carrier_code, fare_class, carry_on_length_cm, carry_on_width_cm, carry_on_depth_cm, carry_on_max_weight_kg, tsa_liquids_compliant, verified_at, source_url)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, datetime('now'), ?9)"
        )?;

        for c in &carriers {
            let fare_class_str = match c.tier {
                ServiceTier::PersonalItem => "Personal Item",
                ServiceTier::StandardEconomy => "Standard Economy",
                ServiceTier::PremiumEconomy => "Premium Economy",
                ServiceTier::BusinessFirst => "Business/First",
            };

            let rule_id = format!(
                "rule-{}-{}",
                c.carrier_code.to_lowercase(),
                fare_class_str.to_lowercase().replace(['/', ' '], "-")
            );

            stmt.execute(params![
                rule_id,
                c.carrier_name,
                c.carrier_code,
                fare_class_str,
                c.max_length_cm,
                c.max_width_cm,
                c.max_depth_cm,
                c.max_weight_kg,
                c.verified_source
            ])?;
            rules_seeded += 1;
        }
    }

    // 4. Seed Default Starter Trip Plan
    let trip_plan = TripPlan {
        id: "trip-tokyo-expedition-2026".to_string(),
        title: "Tokyo Expedition 2026".to_string(),
        origin_airport: Some("SFO".to_string()),
        destination_airport: Some("HND".to_string()),
        departure_date: Some("2026-11-10".to_string()),
        return_date: Some("2026-11-25".to_string()),
        target_airline_rule_id: Some("rule-nh-standard-economy".to_string()),
        active_luggage_shell_id: Some(default_shell_id.to_string()),
        notes: Some(
            "High-mobility one-bag travel across Tokyo and Kyoto with camera gear".to_string(),
        ),
    };

    {
        tx.execute(
            "INSERT INTO trip_plans (id, title, origin_airport, destination_airport, departure_date, return_date, target_airline_rule_id, active_luggage_shell_id, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                trip_plan.id,
                trip_plan.title,
                trip_plan.origin_airport,
                trip_plan.destination_airport,
                trip_plan.departure_date,
                trip_plan.return_date,
                trip_plan.target_airline_rule_id,
                trip_plan.active_luggage_shell_id,
                trip_plan.notes
            ],
        )?;
    }

    // 5. Seed Core Starter Inventory Items
    let starter_items = vec![
        InventoryItem {
            id: "item-macbook-pro".to_string(),
            name: "Apple MacBook Pro 14\" M3 Pro".to_string(),
            brand: Some("Apple".to_string()),
            category: "Tech".to_string(),
            weight_g: 1610.0,
            length_cm: 31.3,
            width_cm: 22.1,
            depth_cm: 1.55,
            compressibility_factor: 1.0,
            is_liquid: false,
            liquid_volume_ml: 0.0,
            monetary_value: 2399.0,
            currency: "USD".to_string(),
            serial_number: Some("C02G9988MD6R".to_string()),
            readiness_state: "Packed".to_string(),
            tags: Some("laptop,work,essential".to_string()),
            notes: Some("Primary workstation".to_string()),
        },
        InventoryItem {
            id: "item-sony-camera".to_string(),
            name: "Sony Alpha 7 IV Full-Frame Mirrorless".to_string(),
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
            serial_number: Some("SN-883921-A74".to_string()),
            readiness_state: "Packed".to_string(),
            tags: Some("camera,optics,high-value".to_string()),
            notes: Some("Insured camera body".to_string()),
        },
        InventoryItem {
            id: "item-patagonia-down".to_string(),
            name: "Patagonia Down Sweater Hoody".to_string(),
            brand: Some("Patagonia".to_string()),
            category: "Clothing".to_string(),
            weight_g: 420.0,
            length_cm: 28.0,
            width_cm: 18.0,
            depth_cm: 12.0,
            compressibility_factor: 0.45,
            is_liquid: false,
            liquid_volume_ml: 0.0,
            monetary_value: 329.0,
            currency: "USD".to_string(),
            serial_number: None,
            readiness_state: "Packed".to_string(),
            tags: Some("warmth,compressible,outerwear".to_string()),
            notes: Some("800-fill-power down".to_string()),
        },
        InventoryItem {
            id: "item-anker-powerbank".to_string(),
            name: "Anker 737 Power Bank (PowerCore 24K, 86.4Wh)".to_string(),
            brand: Some("Anker".to_string()),
            category: "Tech".to_string(),
            weight_g: 635.0,
            length_cm: 15.6,
            width_cm: 5.5,
            depth_cm: 5.0,
            compressibility_factor: 1.0,
            is_liquid: false,
            liquid_volume_ml: 0.0,
            monetary_value: 149.0,
            currency: "USD".to_string(),
            serial_number: Some("AK-737-8820".to_string()),
            readiness_state: "Packed".to_string(),
            tags: Some("battery,86.4Wh,tsa-approved".to_string()),
            notes: Some("Complies with FAA 100Wh carry-on limit".to_string()),
        },
        InventoryItem {
            id: "item-sunscreen-tube".to_string(),
            name: "La Roche-Posay Anthelios SPF 50 (50ml)".to_string(),
            brand: Some("La Roche-Posay".to_string()),
            category: "Toiletries".to_string(),
            weight_g: 75.0,
            length_cm: 12.0,
            width_cm: 4.5,
            depth_cm: 2.5,
            compressibility_factor: 0.8,
            is_liquid: true,
            liquid_volume_ml: 50.0,
            monetary_value: 38.0,
            currency: "USD".to_string(),
            serial_number: None,
            readiness_state: "Packed".to_string(),
            tags: Some("liquids,tsa-3-1-1,sunscreen".to_string()),
            notes: Some("50ml container under 100ml limit".to_string()),
        },
    ];

    let mut items_seeded = 0;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO inventory_items (id, name, brand, category, weight_g, length_cm, width_cm, depth_cm, compressibility_factor, is_liquid, liquid_volume_ml, monetary_value, currency, serial_number, readiness_state, tags, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)"
        )?;

        for item in &starter_items {
            stmt.execute(params![
                item.id,
                item.name,
                item.brand,
                item.category,
                item.weight_g,
                item.length_cm,
                item.width_cm,
                item.depth_cm,
                item.compressibility_factor,
                if item.is_liquid { 1 } else { 0 },
                item.liquid_volume_ml,
                item.monetary_value,
                item.currency,
                item.serial_number,
                item.readiness_state,
                item.tags,
                item.notes
            ])?;
            items_seeded += 1;
        }
    }

    tx.commit()?;

    Ok(SeedingReport {
        luggage_shells_seeded: shells_seeded,
        sub_containers_seeded: cubes_seeded,
        airline_rules_seeded: rules_seeded,
        inventory_items_seeded: items_seeded,
        trip_plans_seeded: 1,
        already_seeded: false,
    })
}
