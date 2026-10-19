use crate::db::models::{InventoryItem, LuggageShell};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct FullExportPackage {
    pub version: String,
    pub exported_at: String,
    pub luggage: Vec<LuggageShell>,
    pub inventory: Vec<InventoryItem>,
}

pub fn generate_json_export(
    luggage: Vec<LuggageShell>,
    inventory: Vec<InventoryItem>,
) -> Result<String, serde_json::Error> {
    let package = FullExportPackage {
        version: "1.0.0".to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        luggage,
        inventory,
    };
    serde_json::to_string_pretty(&package)
}

pub fn parse_json_backup(json_str: &str) -> Result<FullExportPackage, String> {
    // 50 MB DoS prevention bound (SDLC Section 2.1 SEC-TEST-DOS-01)
    if json_str.len() > 50 * 1024 * 1024 {
        return Err("Payload exceeds maximum allowable size (50 MB)".to_string());
    }

    serde_json::from_str::<FullExportPackage>(json_str)
        .map_err(|e| format!("Invalid backup JSON structure: {}", e))
}
