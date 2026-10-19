use serde::{Deserialize, Serialize};
use crate::db::models::{InventoryItem, LuggageShell};

#[derive(Debug, Serialize, Deserialize)]
pub struct FullExportPackage {
    pub version: String,
    pub exported_at: String,
    pub luggage: Vec<LuggageShell>,
    pub inventory: Vec<InventoryItem>,
}

pub fn generate_json_export(luggage: Vec<LuggageShell>, inventory: Vec<InventoryItem>) -> Result<String, serde_json::Error> {
    let package = FullExportPackage {
        version: "1.0.0".to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        luggage,
        inventory,
    };
    serde_json::to_string_pretty(&package)
}
