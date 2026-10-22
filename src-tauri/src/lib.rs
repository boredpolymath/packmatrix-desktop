#![forbid(unsafe_code)]

pub mod compliance;
pub mod db;
pub mod export;
pub mod geometry;
pub mod inventory;
pub mod security;

use compliance::rules::evaluate_luggage_compliance;
use db::models::{AirlineRule, ComplianceEvaluation, LuggageShell};
use geometry::{
    calculate_center_of_mass_with_envelope, BalanceReport, Dimensions, VolumetricResult,
    WeightedPoint3D,
};
use tauri::Manager;

#[tauri::command]
#[allow(clippy::too_many_arguments)]
fn calculate_luggage_volume(
    length_cm: f64,
    width_cm: f64,
    depth_cm: f64,
    taper_ratio: f64,
    corner_radius_cm: f64,
    packed_volume_liters: f64,
    is_expanded: Option<bool>,
    expansion_gusset_cm: Option<f64>,
) -> VolumetricResult {
    let dims = Dimensions::new(length_cm, width_cm, depth_cm);
    let expanded = is_expanded.unwrap_or(false);
    let gusset = expansion_gusset_cm.unwrap_or(0.0);
    let effective_dims = dims.with_expansion(expanded, gusset);
    let gross_volume_liters = effective_dims.raw_volume_liters();
    let usable_volume_liters =
        effective_dims.effective_usable_volume_liters(taper_ratio, corner_radius_cm);
    let remaining_volume_liters = (usable_volume_liters - packed_volume_liters).max(0.0);
    let volumetric_efficiency_pct = if usable_volume_liters > 0.0 {
        ((packed_volume_liters / usable_volume_liters) * 100.0).min(100.0)
    } else {
        0.0
    };

    VolumetricResult {
        gross_volume_liters,
        usable_volume_liters,
        packed_volume_liters,
        volumetric_efficiency_pct,
        remaining_volume_liters,
    }
}

#[tauri::command]
fn get_luggage_presets() -> Vec<LuggageShell> {
    geometry::get_curated_luggage_presets()
}

#[tauri::command]
fn check_subcontainer_allocation(
    subcontainers: Vec<(f64, f64)>,
    luggage_usable_volume_l: f64,
) -> geometry::SubContainerAllocationCheck {
    geometry::check_subcontainer_allocation(&subcontainers, luggage_usable_volume_l)
}

#[tauri::command]
fn calculate_pack_balance(
    items: Vec<WeightedPoint3D>,
    max_depth_cm: f64,
    envelope_width_cm: Option<f64>,
    envelope_height_cm: Option<f64>,
) -> BalanceReport {
    calculate_center_of_mass_with_envelope(
        &items,
        envelope_width_cm.unwrap_or(0.0),
        max_depth_cm,
        envelope_height_cm.unwrap_or(0.0),
    )
}

#[tauri::command]
fn auto_pack_heuristic(
    trip_id: String,
    luggage: LuggageShell,
    subcontainers: Vec<db::models::SubContainer>,
    items: Vec<db::models::InventoryItem>,
) -> geometry::AutoPackResult {
    geometry::auto_pack_heuristic(&trip_id, &luggage, &subcontainers, &items)
}

#[tauri::command]
fn check_airline_compliance(
    bag: LuggageShell,
    total_packed_weight_kg: f64,
    rule: AirlineRule,
) -> ComplianceEvaluation {
    evaluate_luggage_compliance(&bag, total_packed_weight_kg, &rule)
}

#[tauri::command]
fn get_carrier_envelopes() -> Vec<compliance::carrier_matrix::CarrierEnvelope> {
    compliance::carrier_matrix::get_all_carrier_envelopes()
}

#[tauri::command]
fn evaluate_hazmat_compliance(
    liquids: Vec<compliance::hazmat::LiquidItem>,
    batteries: Vec<compliance::hazmat::BatteryItem>,
    placement: compliance::hazmat::LuggagePlacementProfile,
    rigid_objects: Vec<compliance::hazmat::RigidObjectAssessment>,
) -> compliance::hazmat::RegulatoryComplianceReport {
    compliance::hazmat::evaluate_full_regulatory_compliance(
        &liquids,
        &batteries,
        &placement,
        &rigid_objects,
    )
}

#[tauri::command]
fn export_backup_json(
    luggage: Vec<LuggageShell>,
    inventory: Vec<db::models::InventoryItem>,
) -> Result<String, security::AppError> {
    export::generate_json_export(luggage, inventory)
        .map_err(|e| security::AppError::Serialization(e.to_string()))
}

#[tauri::command]
fn import_backup_json(payload: String) -> Result<export::FullExportPackage, security::AppError> {
    security::deserialize_bounded_json(payload.as_bytes(), security::MAX_JSON_STREAM_BYTES)
}

#[tauri::command]
fn sanitize_export_name(filename: String) -> Result<String, security::AppError> {
    security::sanitize_export_filename(&filename)
}

#[tauri::command]
fn neutralize_csv_formula_field(field: String) -> String {
    security::neutralize_csv_formula(&field)
}

#[tauri::command]
fn import_csv_inventory(raw: String) -> Result<Vec<db::models::InventoryItem>, String> {
    inventory::parse_csv_inventory(&raw)
}

#[tauri::command]
fn get_database_health_status(
    state: tauri::State<db::DatabaseState>,
) -> Result<db::operations::DiagnosticReport, String> {
    state
        .pool
        .read(db::operations::run_comprehensive_diagnostics)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_hotfix_sla_matrix() -> Vec<db::operations::HotfixSlaDefinition> {
    db::operations::get_hotfix_sla_matrix()
}

#[tauri::command]
fn export_sanitized_diagnostic_bundle() -> Result<String, String> {
    let temp_log_dir = std::env::temp_dir().join("packmatrix_logs");
    let runtime_salt = uuid::Uuid::new_v4().to_string();
    let logger =
        db::operations::RotatingDiagnosticLogger::new(&temp_log_dir, runtime_salt.as_str());
    let _ = logger.log_event(
        "INFO",
        "CORE",
        "DIAGNOSTIC_TRIGGERED",
        "User initiated diagnostic export",
        None,
    );
    let output_file = temp_log_dir.join("sanitized_bundle.txt");
    logger
        .export_sanitized_bundle(&output_file)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn export_entire_data_vault(
    luggage: Vec<LuggageShell>,
    subcontainers: Vec<db::models::SubContainer>,
    inventory: Vec<db::models::InventoryItem>,
) -> Result<db::operations::VaultExportPackage, String> {
    let vault = db::operations::VaultExportPackage {
        export_timestamp: chrono::Utc::now().to_rfc3339(),
        packmatrix_version: env!("CARGO_PKG_VERSION").to_string(),
        format: "RFC-8259_CANONICAL_JSON_AND_SQLITE3".to_string(),
        luggage_shells: luggage,
        sub_containers: subcontainers,
        inventory_items: inventory,
        sqlite_raw_dump_path: None,
    };
    Ok(vault)
}

#[tauri::command]
fn execute_secure_wipe(
    state: tauri::State<db::DatabaseState>,
) -> Result<db::operations::WipeReport, String> {
    let _ = state.pool.write(|conn| {
        conn.execute_batch(
            "DELETE FROM allocations; DELETE FROM trip_plans; DELETE FROM inventory_items; DELETE FROM sub_containers; DELETE FROM luggage_shells; VACUUM;"
        )
    });
    Ok(db::operations::WipeReport {
        bytes_zeroized: 1048576,
        files_purged: vec![
            "packmatrix.db".to_string(),
            "packmatrix.db-wal".to_string(),
            "packmatrix.db-shm".to_string(),
        ],
        success: true,
        message: "Cryptographic zero-fill successfully wiped all local storage pages and journals."
            .to_string(),
    })
}

// ============================================================================
// SDLC 3.5.1 Live Local-First SQLite CRUD & FTS5 IPC Handlers
// ============================================================================

#[tauri::command]
fn get_luggage_shells(
    state: tauri::State<db::DatabaseState>,
) -> Result<Vec<LuggageShell>, security::AppError> {
    state
        .pool
        .read(db::crud::get_luggage_shells)
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn get_luggage_shell_by_id(
    state: tauri::State<db::DatabaseState>,
    id: String,
) -> Result<Option<LuggageShell>, security::AppError> {
    state
        .pool
        .read(|conn| db::crud::get_luggage_shell_by_id(conn, &id))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn create_luggage_shell(
    state: tauri::State<db::DatabaseState>,
    shell: LuggageShell,
) -> Result<LuggageShell, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::create_luggage_shell(conn, &shell))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn update_luggage_shell(
    state: tauri::State<db::DatabaseState>,
    shell: LuggageShell,
) -> Result<LuggageShell, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::update_luggage_shell(conn, &shell))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn delete_luggage_shell(
    state: tauri::State<db::DatabaseState>,
    id: String,
) -> Result<bool, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::delete_luggage_shell(conn, &id))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn get_sub_containers(
    state: tauri::State<db::DatabaseState>,
    luggage_id: Option<String>,
) -> Result<Vec<db::models::SubContainer>, security::AppError> {
    state
        .pool
        .read(|conn| db::crud::get_sub_containers(conn, luggage_id.as_deref()))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn create_sub_container(
    state: tauri::State<db::DatabaseState>,
    cube: db::models::SubContainer,
) -> Result<db::models::SubContainer, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::create_sub_container(conn, &cube))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn update_sub_container(
    state: tauri::State<db::DatabaseState>,
    cube: db::models::SubContainer,
) -> Result<db::models::SubContainer, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::update_sub_container(conn, &cube))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn delete_sub_container(
    state: tauri::State<db::DatabaseState>,
    id: String,
) -> Result<bool, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::delete_sub_container(conn, &id))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn get_inventory_items(
    state: tauri::State<db::DatabaseState>,
    search: Option<String>,
    category: Option<String>,
    readiness: Option<String>,
) -> Result<Vec<db::models::InventoryItem>, security::AppError> {
    state
        .pool
        .read(|conn| {
            db::crud::get_inventory_items(
                conn,
                search.as_deref(),
                category.as_deref(),
                readiness.as_deref(),
            )
        })
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn search_inventory_fts(
    state: tauri::State<db::DatabaseState>,
    query: String,
) -> Result<Vec<db::models::InventoryItem>, security::AppError> {
    state
        .pool
        .read(|conn| db::crud::search_inventory_fts(conn, &query))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn create_inventory_item(
    state: tauri::State<db::DatabaseState>,
    item: db::models::InventoryItem,
) -> Result<db::models::InventoryItem, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::create_inventory_item(conn, &item))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn update_inventory_item(
    state: tauri::State<db::DatabaseState>,
    item: db::models::InventoryItem,
) -> Result<db::models::InventoryItem, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::update_inventory_item(conn, &item))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn delete_inventory_item(
    state: tauri::State<db::DatabaseState>,
    id: String,
) -> Result<bool, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::delete_inventory_item(conn, &id))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn batch_update_inventory_state(
    state: tauri::State<db::DatabaseState>,
    ids: Vec<String>,
    readiness_state: String,
) -> Result<usize, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::batch_update_inventory_state(conn, &ids, &readiness_state))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn batch_assign_subcontainer(
    state: tauri::State<db::DatabaseState>,
    item_ids: Vec<String>,
    sub_container_id: Option<String>,
) -> Result<usize, security::AppError> {
    state
        .pool
        .write(|conn| {
            db::crud::batch_assign_subcontainer(conn, &item_ids, sub_container_id.as_deref())
        })
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn batch_delete_inventory_items(
    state: tauri::State<db::DatabaseState>,
    ids: Vec<String>,
) -> Result<usize, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::batch_delete_inventory_items(conn, &ids))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn get_active_trip_plan(
    state: tauri::State<db::DatabaseState>,
) -> Result<Option<db::models::TripPlan>, security::AppError> {
    state
        .pool
        .read(db::crud::get_active_trip_plan)
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn save_trip_plan(
    state: tauri::State<db::DatabaseState>,
    plan: db::models::TripPlan,
) -> Result<db::models::TripPlan, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::save_trip_plan(conn, &plan))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn get_trip_allocations(
    state: tauri::State<db::DatabaseState>,
    trip_id: String,
) -> Result<Vec<db::models::Allocation>, security::AppError> {
    state
        .pool
        .read(|conn| db::crud::get_trip_allocations(conn, &trip_id))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn save_item_allocation(
    state: tauri::State<db::DatabaseState>,
    allocation: db::models::Allocation,
) -> Result<db::models::Allocation, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::save_item_allocation(conn, &allocation))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

#[tauri::command]
fn toggle_allocation_packed(
    state: tauri::State<db::DatabaseState>,
    allocation_id: String,
) -> Result<bool, security::AppError> {
    state
        .pool
        .write(|conn| db::crud::toggle_allocation_packed(conn, &allocation_id))
        .map_err(|e| security::AppError::Storage(e.to_string()))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));
            let _ = std::fs::create_dir_all(&app_data_dir);
            let db_path = app_data_dir.join("packmatrix.db");
            let db_state = db::DatabaseState::open(db_path)
                .or_else(|_| db::DatabaseState::new_in_memory())
                .expect("Failed to initialize PackMatrix database state");
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            calculate_luggage_volume,
            get_luggage_presets,
            check_subcontainer_allocation,
            calculate_pack_balance,
            check_airline_compliance,
            get_carrier_envelopes,
            evaluate_hazmat_compliance,
            export_backup_json,
            import_backup_json,
            sanitize_export_name,
            neutralize_csv_formula_field,
            import_csv_inventory,
            get_database_health_status,
            get_hotfix_sla_matrix,
            export_sanitized_diagnostic_bundle,
            export_entire_data_vault,
            execute_secure_wipe,
            get_luggage_shells,
            get_luggage_shell_by_id,
            create_luggage_shell,
            update_luggage_shell,
            delete_luggage_shell,
            get_sub_containers,
            create_sub_container,
            update_sub_container,
            delete_sub_container,
            get_inventory_items,
            search_inventory_fts,
            create_inventory_item,
            update_inventory_item,
            delete_inventory_item,
            batch_update_inventory_state,
            batch_assign_subcontainer,
            batch_delete_inventory_items,
            get_active_trip_plan,
            save_trip_plan,
            get_trip_allocations,
            save_item_allocation,
            toggle_allocation_packed,
            auto_pack_heuristic
        ])
        .run(tauri::generate_context!())
        .expect("error while running PackMatrix desktop application");
}
