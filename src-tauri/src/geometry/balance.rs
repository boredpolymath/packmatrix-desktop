use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeightedPoint3D {
    pub x: f64, // Lateral (left < 0, right > 0)
    pub y: f64, // Depth (front > 0, spine/back flush = 0)
    pub z: f64, // Height (bottom = 0, top = H)
    pub mass_g: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceReport {
    pub center_of_mass_x: f64,
    pub center_of_mass_y: f64,
    pub center_of_mass_z: f64,
    pub total_mass_g: f64,
    pub is_spine_flush_optimal: bool,
    pub balance_score_pct: f64,
    pub warning: Option<String>,
}

pub fn calculate_center_of_mass(items: &[WeightedPoint3D], max_depth_cm: f64) -> BalanceReport {
    let total_mass_g: f64 = items.iter().map(|item| item.mass_g).sum();

    if total_mass_g <= 0.0 {
        return BalanceReport {
            center_of_mass_x: 0.0,
            center_of_mass_y: 0.0,
            center_of_mass_z: 0.0,
            total_mass_g: 0.0,
            is_spine_flush_optimal: true,
            balance_score_pct: 100.0,
            warning: None,
        };
    }

    let sum_mx: f64 = items.iter().map(|item| item.mass_g * item.x).sum();
    let sum_my: f64 = items.iter().map(|item| item.mass_g * item.y).sum();
    let sum_mz: f64 = items.iter().map(|item| item.mass_g * item.z).sum();

    let com_x = sum_mx / total_mass_g;
    let com_y = sum_my / total_mass_g;
    let com_z = sum_mz / total_mass_g;

    // Spine-flush criteria: COM depth Y should be close to back panel (Y < 0.35 * max_depth_cm)
    let is_spine_flush_optimal = com_y <= (max_depth_cm * 0.4);
    let mut warning = None;

    if !is_spine_flush_optimal {
        warning = Some("High leverage warning: heavy items positioned away from spine panel".to_string());
    }

    let lateral_penalty = (com_x.abs() * 5.0).min(20.0);
    let depth_penalty = if com_y > (max_depth_cm * 0.5) { 25.0 } else { 0.0 };
    let balance_score_pct = (100.0 - lateral_penalty - depth_penalty).clamp(0.0, 100.0);

    BalanceReport {
        center_of_mass_x: com_x,
        center_of_mass_y: com_y,
        center_of_mass_z: com_z,
        total_mass_g,
        is_spine_flush_optimal,
        balance_score_pct,
        warning,
    }
}
