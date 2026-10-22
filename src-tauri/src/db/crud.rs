//! PackMatrix Desktop — Local-First SQLite CRUD & FTS5 Repository Engine
//! SDLC Section 3.5.1 Implementation
//!
//! Provides strictly-parameterized, anti-injection SQLite data access for:
//! - Luggage shells (presets and custom bags)
//! - Sub-containers (packing cubes, pouches, organizers)
//! - Inventory items (master gear suite with FTS5 virtual table sync)
//! - Trip plans & item allocations (3D spatial coordinate placement)

use crate::db::models::{Allocation, InventoryItem, LuggageShell, SubContainer, TripPlan};
use rusqlite::{params, Connection, Result as SqliteResult};

// ============================================================================
// Luggage Shell CRUD Operations
// ============================================================================

pub fn get_luggage_shells(conn: &Connection) -> SqliteResult<Vec<LuggageShell>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, brand, length_cm, width_cm, depth_cm, tare_weight_g, nominal_volume_l, expansion_gusset_cm, is_expanded, corner_radius_cm, taper_ratio
         FROM luggage_shells
         ORDER BY name ASC",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(LuggageShell {
            id: row.get(0)?,
            name: row.get(1)?,
            brand: row.get(2)?,
            length_cm: row.get(3)?,
            width_cm: row.get(4)?,
            depth_cm: row.get(5)?,
            tare_weight_g: row.get(6)?,
            nominal_volume_l: row.get(7)?,
            expansion_gusset_cm: row.get(8)?,
            is_expanded: row.get::<_, i64>(9)? != 0,
            corner_radius_cm: row.get(10)?,
            taper_ratio: row.get(11)?,
        })
    })?;

    let shells = rows.collect::<SqliteResult<Vec<_>>>()?;
    Ok(shells)
}

pub fn get_luggage_shell_by_id(conn: &Connection, id: &str) -> SqliteResult<Option<LuggageShell>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, brand, length_cm, width_cm, depth_cm, tare_weight_g, nominal_volume_l, expansion_gusset_cm, is_expanded, corner_radius_cm, taper_ratio
         FROM luggage_shells
         WHERE id = ?1",
    )?;

    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(LuggageShell {
            id: row.get(0)?,
            name: row.get(1)?,
            brand: row.get(2)?,
            length_cm: row.get(3)?,
            width_cm: row.get(4)?,
            depth_cm: row.get(5)?,
            tare_weight_g: row.get(6)?,
            nominal_volume_l: row.get(7)?,
            expansion_gusset_cm: row.get(8)?,
            is_expanded: row.get::<_, i64>(9)? != 0,
            corner_radius_cm: row.get(10)?,
            taper_ratio: row.get(11)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn create_luggage_shell(conn: &Connection, shell: &LuggageShell) -> SqliteResult<LuggageShell> {
    conn.execute(
        "INSERT INTO luggage_shells (id, name, brand, length_cm, width_cm, depth_cm, tare_weight_g, nominal_volume_l, expansion_gusset_cm, is_expanded, corner_radius_cm, taper_ratio)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
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
        ],
    )?;
    Ok(shell.clone())
}

pub fn update_luggage_shell(conn: &Connection, shell: &LuggageShell) -> SqliteResult<LuggageShell> {
    conn.execute(
        "UPDATE luggage_shells
         SET name = ?2, brand = ?3, length_cm = ?4, width_cm = ?5, depth_cm = ?6,
             tare_weight_g = ?7, nominal_volume_l = ?8, expansion_gusset_cm = ?9,
             is_expanded = ?10, corner_radius_cm = ?11, taper_ratio = ?12, updated_at = datetime('now')
         WHERE id = ?1",
        params![
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
        ],
    )?;
    Ok(shell.clone())
}

pub fn delete_luggage_shell(conn: &Connection, id: &str) -> SqliteResult<bool> {
    let rows_affected = conn.execute("DELETE FROM luggage_shells WHERE id = ?1", params![id])?;
    Ok(rows_affected > 0)
}

// ============================================================================
// Sub-Container (Compression Cubes / Pouches) CRUD Operations
// ============================================================================

pub fn get_sub_containers(
    conn: &Connection,
    luggage_id: Option<&str>,
) -> SqliteResult<Vec<SubContainer>> {
    let mut sub_containers = Vec::new();
    if let Some(lid) = luggage_id {
        let mut stmt = conn.prepare(
            "SELECT id, luggage_shell_id, parent_sub_container_id, name, container_type, length_cm, width_cm, depth_cm, max_volume_l, tare_weight_g, compression_ratio, zone_layer
             FROM sub_containers
             WHERE luggage_shell_id = ?1 OR luggage_shell_id IS NULL
             ORDER BY zone_layer ASC, name ASC",
        )?;
        let rows = stmt.query_map(params![lid], |row| {
            Ok(SubContainer {
                id: row.get(0)?,
                luggage_shell_id: row.get(1)?,
                parent_sub_container_id: row.get(2)?,
                name: row.get(3)?,
                container_type: row.get(4)?,
                length_cm: row.get(5)?,
                width_cm: row.get(6)?,
                depth_cm: row.get(7)?,
                max_volume_l: row.get(8)?,
                tare_weight_g: row.get(9)?,
                compression_ratio: row.get(10)?,
                zone_layer: row.get(11)?,
            })
        })?;
        for c in rows {
            sub_containers.push(c?);
        }
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, luggage_shell_id, parent_sub_container_id, name, container_type, length_cm, width_cm, depth_cm, max_volume_l, tare_weight_g, compression_ratio, zone_layer
             FROM sub_containers
             ORDER BY name ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(SubContainer {
                id: row.get(0)?,
                luggage_shell_id: row.get(1)?,
                parent_sub_container_id: row.get(2)?,
                name: row.get(3)?,
                container_type: row.get(4)?,
                length_cm: row.get(5)?,
                width_cm: row.get(6)?,
                depth_cm: row.get(7)?,
                max_volume_l: row.get(8)?,
                tare_weight_g: row.get(9)?,
                compression_ratio: row.get(10)?,
                zone_layer: row.get(11)?,
            })
        })?;
        for c in rows {
            sub_containers.push(c?);
        }
    }
    Ok(sub_containers)
}

pub fn create_sub_container(conn: &Connection, cube: &SubContainer) -> SqliteResult<SubContainer> {
    conn.execute(
        "INSERT INTO sub_containers (id, luggage_shell_id, parent_sub_container_id, name, container_type, length_cm, width_cm, depth_cm, max_volume_l, tare_weight_g, compression_ratio, zone_layer)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
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
        ],
    )?;
    Ok(cube.clone())
}

pub fn update_sub_container(conn: &Connection, cube: &SubContainer) -> SqliteResult<SubContainer> {
    conn.execute(
        "UPDATE sub_containers
         SET luggage_shell_id = ?2, parent_sub_container_id = ?3, name = ?4,
             container_type = ?5, length_cm = ?6, width_cm = ?7, depth_cm = ?8,
             max_volume_l = ?9, tare_weight_g = ?10, compression_ratio = ?11, zone_layer = ?12
         WHERE id = ?1",
        params![
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
        ],
    )?;
    Ok(cube.clone())
}

pub fn delete_sub_container(conn: &Connection, id: &str) -> SqliteResult<bool> {
    let rows_affected = conn.execute("DELETE FROM sub_containers WHERE id = ?1", params![id])?;
    Ok(rows_affected > 0)
}

// ============================================================================
// Inventory Items & SQLite FTS5 Query Operations
// ============================================================================

pub fn get_inventory_items(
    conn: &Connection,
    search: Option<&str>,
    category: Option<&str>,
    readiness: Option<&str>,
) -> SqliteResult<Vec<InventoryItem>> {
    let mut query = String::from(
        "SELECT id, name, brand, category, weight_g, length_cm, width_cm, depth_cm, compressibility_factor, is_liquid, liquid_volume_ml, monetary_value, currency, serial_number, readiness_state, tags, notes
         FROM inventory_items
         WHERE 1=1",
    );

    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(s) = search {
        if !s.trim().is_empty() {
            query.push_str(" AND (name LIKE ? OR brand LIKE ? OR tags LIKE ?)");
            let pattern = format!("%{}%", s.trim());
            params_vec.push(pattern.clone().into());
            params_vec.push(pattern.clone().into());
            params_vec.push(pattern.into());
        }
    }

    if let Some(cat) = category {
        if cat != "All" && !cat.trim().is_empty() {
            query.push_str(" AND category = ?");
            params_vec.push(cat.to_string().into());
        }
    }

    if let Some(r) = readiness {
        if r != "All" && !r.trim().is_empty() {
            query.push_str(" AND readiness_state = ?");
            params_vec.push(r.to_string().into());
        }
    }

    query.push_str(" ORDER BY name ASC");

    let mut stmt = conn.prepare(&query)?;
    let rusqlite_params: Vec<&dyn rusqlite::ToSql> = params_vec
        .iter()
        .map(|v| v as &dyn rusqlite::ToSql)
        .collect();

    let rows = stmt.query_map(&rusqlite_params[..], |row| {
        Ok(InventoryItem {
            id: row.get(0)?,
            name: row.get(1)?,
            brand: row.get(2)?,
            category: row.get(3)?,
            weight_g: row.get(4)?,
            length_cm: row.get(5)?,
            width_cm: row.get(6)?,
            depth_cm: row.get(7)?,
            compressibility_factor: row.get(8)?,
            is_liquid: row.get::<_, i64>(9)? != 0,
            liquid_volume_ml: row.get(10)?,
            monetary_value: row.get(11)?,
            currency: row.get(12)?,
            serial_number: row.get(13)?,
            readiness_state: row.get(14)?,
            tags: row.get(15)?,
            notes: row.get(16)?,
        })
    })?;

    let items = rows.collect::<SqliteResult<Vec<_>>>()?;
    Ok(items)
}

/// Executes FTS5 query with Porter stemming against `inventory_fts` virtual table
pub fn search_inventory_fts(
    conn: &Connection,
    search_term: &str,
) -> SqliteResult<Vec<InventoryItem>> {
    if search_term.trim().is_empty() {
        return get_inventory_items(conn, None, None, None);
    }

    let mut stmt = conn.prepare(
        "SELECT i.id, i.name, i.brand, i.category, i.weight_g, i.length_cm, i.width_cm, i.depth_cm, i.compressibility_factor, i.is_liquid, i.liquid_volume_ml, i.monetary_value, i.currency, i.serial_number, i.readiness_state, i.tags, i.notes
         FROM inventory_items i
         JOIN inventory_fts fts ON i.rowid = fts.rowid
         WHERE inventory_fts MATCH ?1
         ORDER BY rank",
    )?;

    // Escape query for FTS5 syntax
    let sanitized_query = format!("\"{}\"*", search_term.trim().replace('"', "\"\""));

    let rows = stmt.query_map(params![sanitized_query], |row| {
        Ok(InventoryItem {
            id: row.get(0)?,
            name: row.get(1)?,
            brand: row.get(2)?,
            category: row.get(3)?,
            weight_g: row.get(4)?,
            length_cm: row.get(5)?,
            width_cm: row.get(6)?,
            depth_cm: row.get(7)?,
            compressibility_factor: row.get(8)?,
            is_liquid: row.get::<_, i64>(9)? != 0,
            liquid_volume_ml: row.get(10)?,
            monetary_value: row.get(11)?,
            currency: row.get(12)?,
            serial_number: row.get(13)?,
            readiness_state: row.get(14)?,
            tags: row.get(15)?,
            notes: row.get(16)?,
        })
    })?;

    let items = rows.collect::<SqliteResult<Vec<_>>>()?;
    Ok(items)
}

pub fn create_inventory_item(
    conn: &Connection,
    item: &InventoryItem,
) -> SqliteResult<InventoryItem> {
    conn.execute(
        "INSERT INTO inventory_items (id, name, brand, category, weight_g, length_cm, width_cm, depth_cm, compressibility_factor, is_liquid, liquid_volume_ml, monetary_value, currency, serial_number, readiness_state, tags, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        params![
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
        ],
    )?;
    Ok(item.clone())
}

pub fn update_inventory_item(
    conn: &Connection,
    item: &InventoryItem,
) -> SqliteResult<InventoryItem> {
    conn.execute(
        "UPDATE inventory_items
         SET name = ?2, brand = ?3, category = ?4, weight_g = ?5, length_cm = ?6, width_cm = ?7, depth_cm = ?8,
             compressibility_factor = ?9, is_liquid = ?10, liquid_volume_ml = ?11, monetary_value = ?12,
             currency = ?13, serial_number = ?14, readiness_state = ?15, tags = ?16, notes = ?17, updated_at = datetime('now')
         WHERE id = ?1",
        params![
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
        ],
    )?;
    Ok(item.clone())
}

pub fn delete_inventory_item(conn: &Connection, id: &str) -> SqliteResult<bool> {
    let rows_affected = conn.execute("DELETE FROM inventory_items WHERE id = ?1", params![id])?;
    Ok(rows_affected > 0)
}

pub fn batch_update_inventory_state(
    conn: &Connection,
    ids: &[String],
    state: &str,
) -> SqliteResult<usize> {
    let mut updated = 0;
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare(
            "UPDATE inventory_items SET readiness_state = ?1, updated_at = datetime('now') WHERE id = ?2"
        )?;
        for id in ids {
            updated += stmt.execute(params![state, id])?;
        }
    }
    tx.commit()?;
    Ok(updated)
}

pub fn batch_assign_subcontainer(
    conn: &Connection,
    item_ids: &[String],
    sub_container_id: Option<&str>,
) -> SqliteResult<usize> {
    let mut count = 0;
    let tx = conn.unchecked_transaction()?;
    {
        // Fetch or create active trip plan
        let trip_plan_id: String = tx
            .query_row(
                "SELECT id FROM trip_plans ORDER BY created_at DESC LIMIT 1",
                [],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| "default-trip-plan".to_string());

        let mut stmt = tx.prepare(
            "INSERT INTO allocations (id, trip_plan_id, inventory_item_id, sub_container_id)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET sub_container_id = excluded.sub_container_id",
        )?;

        for item_id in item_ids {
            let alloc_id = format!("alloc-{}-{}", trip_plan_id, item_id);
            count += stmt.execute(params![alloc_id, trip_plan_id, item_id, sub_container_id])?;
        }
    }
    tx.commit()?;
    Ok(count)
}

pub fn batch_delete_inventory_items(conn: &Connection, ids: &[String]) -> SqliteResult<usize> {
    let mut deleted = 0;
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare("DELETE FROM inventory_items WHERE id = ?1")?;
        for id in ids {
            deleted += stmt.execute(params![id])?;
        }
    }
    tx.commit()?;
    Ok(deleted)
}

// ============================================================================
// Trip Plans & Allocations CRUD Operations
// ============================================================================

pub fn get_active_trip_plan(conn: &Connection) -> SqliteResult<Option<TripPlan>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, origin_airport, destination_airport, departure_date, return_date, target_airline_rule_id, active_luggage_shell_id, notes
         FROM trip_plans
         ORDER BY created_at DESC
         LIMIT 1",
    )?;

    let mut rows = stmt.query([])?;
    if let Some(row) = rows.next()? {
        Ok(Some(TripPlan {
            id: row.get(0)?,
            title: row.get(1)?,
            origin_airport: row.get(2)?,
            destination_airport: row.get(3)?,
            departure_date: row.get(4)?,
            return_date: row.get(5)?,
            target_airline_rule_id: row.get(6)?,
            active_luggage_shell_id: row.get(7)?,
            notes: row.get(8)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn save_trip_plan(conn: &Connection, plan: &TripPlan) -> SqliteResult<TripPlan> {
    conn.execute(
        "INSERT INTO trip_plans (id, title, origin_airport, destination_airport, departure_date, return_date, target_airline_rule_id, active_luggage_shell_id, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            origin_airport = excluded.origin_airport,
            destination_airport = excluded.destination_airport,
            departure_date = excluded.departure_date,
            return_date = excluded.return_date,
            target_airline_rule_id = excluded.target_airline_rule_id,
            active_luggage_shell_id = excluded.active_luggage_shell_id,
            notes = excluded.notes",
        params![
            plan.id,
            plan.title,
            plan.origin_airport,
            plan.destination_airport,
            plan.departure_date,
            plan.return_date,
            plan.target_airline_rule_id,
            plan.active_luggage_shell_id,
            plan.notes
        ],
    )?;
    Ok(plan.clone())
}

pub fn get_trip_allocations(conn: &Connection, trip_id: &str) -> SqliteResult<Vec<Allocation>> {
    let mut stmt = conn.prepare(
        "SELECT id, trip_plan_id, inventory_item_id, luggage_shell_id, sub_container_id, quantity, is_packed, packed_at, custom_override_weight_g, pos_x, pos_y, pos_z
         FROM allocations
         WHERE trip_plan_id = ?1",
    )?;

    let rows = stmt.query_map(params![trip_id], |row| {
        Ok(Allocation {
            id: row.get(0)?,
            trip_plan_id: row.get(1)?,
            inventory_item_id: row.get(2)?,
            luggage_shell_id: row.get(3)?,
            sub_container_id: row.get(4)?,
            quantity: row.get(5)?,
            is_packed: row.get::<_, i64>(6)? != 0,
            packed_at: row.get(7)?,
            custom_override_weight_g: row.get(8)?,
            pos_x: row.get(9)?,
            pos_y: row.get(10)?,
            pos_z: row.get(11)?,
        })
    })?;

    let allocs = rows.collect::<SqliteResult<Vec<_>>>()?;
    Ok(allocs)
}

pub fn save_item_allocation(
    conn: &Connection,
    allocation: &Allocation,
) -> SqliteResult<Allocation> {
    conn.execute(
        "INSERT INTO allocations (id, trip_plan_id, inventory_item_id, luggage_shell_id, sub_container_id, quantity, is_packed, packed_at, custom_override_weight_g, pos_x, pos_y, pos_z)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
         ON CONFLICT(id) DO UPDATE SET
            luggage_shell_id = excluded.luggage_shell_id,
            sub_container_id = excluded.sub_container_id,
            quantity = excluded.quantity,
            is_packed = excluded.is_packed,
            packed_at = excluded.packed_at,
            custom_override_weight_g = excluded.custom_override_weight_g,
            pos_x = excluded.pos_x,
            pos_y = excluded.pos_y,
            pos_z = excluded.pos_z",
        params![
            allocation.id,
            allocation.trip_plan_id,
            allocation.inventory_item_id,
            allocation.luggage_shell_id,
            allocation.sub_container_id,
            allocation.quantity,
            if allocation.is_packed { 1 } else { 0 },
            allocation.packed_at,
            allocation.custom_override_weight_g,
            allocation.pos_x,
            allocation.pos_y,
            allocation.pos_z
        ],
    )?;
    Ok(allocation.clone())
}

pub fn toggle_allocation_packed(conn: &Connection, allocation_id: &str) -> SqliteResult<bool> {
    let current_state: Option<i64> = conn
        .query_row(
            "SELECT is_packed FROM allocations WHERE id = ?1",
            params![allocation_id],
            |r| r.get(0),
        )
        .ok();

    let new_state = match current_state {
        Some(1) => 0,
        _ => 1,
    };

    conn.execute(
        "UPDATE allocations SET is_packed = ?1, packed_at = CASE WHEN ?1 = 1 THEN datetime('now') ELSE NULL END WHERE id = ?2",
        params![new_state, allocation_id],
    )?;

    Ok(new_state == 1)
}
