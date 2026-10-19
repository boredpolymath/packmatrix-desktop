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
