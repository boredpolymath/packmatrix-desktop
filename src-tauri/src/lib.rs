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
fn calculate_luggage_volume(
    length_cm: f64,
    width_cm: f64,
    depth_cm: f64,
    taper_ratio: f64,
    corner_radius_cm: f64,
    packed_volume_liters: f64,
) -> VolumetricResult {
    let dims = Dimensions::new(length_cm, width_cm, depth_cm);
    let gross_volume_liters = dims.raw_volume_liters();
    let usable_volume_liters = dims.effective_usable_volume_liters(taper_ratio, corner_radius_cm);
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
fn export_backup_json(
    luggage: Vec<LuggageShell>,
    inventory: Vec<db::models::InventoryItem>,
) -> Result<String, String> {
    export::generate_json_export(luggage, inventory)
        .map_err(|e| format!("Failed to generate export: {}", e))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            calculate_luggage_volume,
            calculate_pack_balance,
            check_airline_compliance,
            export_backup_json
        ])
        .run(tauri::generate_context!())
        .expect("error while running PackMatrix desktop application");
}
