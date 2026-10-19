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
    calculate_center_of_mass, BalanceReport, Dimensions, VolumetricResult, WeightedPoint3D,
};

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
fn calculate_pack_balance(items: Vec<WeightedPoint3D>, max_depth_cm: f64) -> BalanceReport {
    calculate_center_of_mass(&items, max_depth_cm)
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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
            import_csv_inventory
        ])
        .run(tauri::generate_context!())
        .expect("error while running PackMatrix desktop application");
}
