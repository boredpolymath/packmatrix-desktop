use crate::db::models::InventoryItem;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct InventorySummary {
    pub total_count: usize,
    pub total_mass_g: f64,
    pub packed_count: usize,
    pub packed_mass_g: f64,
}

pub fn summarize_inventory(items: &[InventoryItem]) -> InventorySummary {
    let total_count = items.len();
    let total_mass_g = items.iter().map(|i| i.weight_g).sum();
    let packed_items: Vec<_> = items
        .iter()
        .filter(|i| i.readiness_state == "packed")
        .collect();
    let packed_count = packed_items.len();
    let packed_mass_g = packed_items.iter().map(|i| i.weight_g).sum();

    InventorySummary {
        total_count,
        total_mass_g,
        packed_count,
        packed_mass_g,
    }
}

/// Parses CSV or TSV raw data into inventory items with formula neutralization and delimiter auto-detection
pub fn parse_csv_inventory(raw: &str) -> Result<Vec<InventoryItem>, String> {
    if raw.len() > 10 * 1024 * 1024 {
        return Err("CSV payload exceeds 10 MB limit".to_string());
    }

    // Auto-detect delimiter (comma, tab, semicolon)
    let first_line = raw.lines().next().unwrap_or("");
    let delimiter = if first_line.contains('\t') {
        b'\t'
    } else if first_line.contains(';') {
        b';'
    } else {
        b','
    };

    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(raw.as_bytes());

    let headers = rdr
        .headers()
        .map_err(|e| format!("CSV header error: {}", e))?
        .clone();
    let mut items = Vec::new();

    for (row_idx, result) in rdr.records().enumerate() {
        let record = match result {
            Ok(r) => r,
            Err(_) => continue, // safely tolerate malformed records
        };

        let mut name = String::new();
        let mut brand = None;
        let mut category = "Misc".to_string();
        let mut weight_g = 0.0;
        let mut tags = None;

        for (col_idx, field) in record.iter().enumerate() {
            let col_name = headers.get(col_idx).unwrap_or("").to_lowercase();
            let sanitized = crate::security::neutralize_csv_formula(field.trim());

            if col_name.contains("name") || col_name.contains("item") {
                name = sanitized;
            } else if col_name.contains("brand") || col_name.contains("mfg") {
                brand = Some(sanitized);
            } else if col_name.contains("cat") {
                category = sanitized;
            } else if col_name.contains("weight") || col_name.contains("mass") {
                weight_g = sanitized.parse::<f64>().unwrap_or(0.0).max(0.0);
            } else if col_name.contains("tag") {
                tags = Some(sanitized);
            }
        }

        if !name.is_empty() {
            items.push(InventoryItem {
                id: format!("item-csv-import-{}", row_idx + 1),
                name,
                brand,
                category,
                weight_g,
                length_cm: 0.0,
                width_cm: 0.0,
                depth_cm: 0.0,
                compressibility_factor: 1.0,
                is_liquid: false,
                liquid_volume_ml: 0.0,
                monetary_value: 0.0,
                currency: "USD".to_string(),
                serial_number: None,
                readiness_state: "clean".to_string(),
                tags,
                notes: None,
            });
        }
    }

    Ok(items)
}
