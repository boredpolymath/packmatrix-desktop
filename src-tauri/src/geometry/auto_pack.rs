use crate::db::models::{Allocation, InventoryItem, LuggageShell, SubContainer};
use crate::geometry::balance::{
    calculate_center_of_mass_with_envelope, BalanceReport, WeightedPoint3D,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoPackResult {
    pub allocations: Vec<Allocation>,
    pub volumetric_efficiency_pct: f64,
    pub center_of_mass_x: f64,
    pub center_of_mass_y: f64,
    pub center_of_mass_z: f64,
    pub balance_report: BalanceReport,
    pub items_packed_count: usize,
    pub unallocated_items: Vec<String>,
}

/// Algorithmic 3D Auto-Pack Heuristic (3D Bin Packing / Knapsack Optimizer)
/// Distributes items across sub-containers and luggage zones based on:
/// - Weight density & mass (spine-flush ergonomics)
/// - Textile compressibility & category
/// - Reachability (quick access vs outer lid vs bottom core)
pub fn auto_pack_heuristic(
    trip_id: &str,
    luggage: &LuggageShell,
    subcontainers: &[SubContainer],
    items: &[InventoryItem],
) -> AutoPackResult {
    let mut allocations = Vec::new();
    let mut weighted_points = Vec::new();
    let mut total_packed_volume_l = 0.0;
    let mut unallocated = Vec::new();

    // Map sub-containers by zone_layer for fast lookup
    let mut zone_cubes: std::collections::HashMap<&str, Vec<&SubContainer>> =
        std::collections::HashMap::new();
    for cube in subcontainers {
        zone_cubes
            .entry(cube.zone_layer.as_str())
            .or_default()
            .push(cube);
    }

    let effective_depth = if luggage.is_expanded {
        luggage.depth_cm + luggage.expansion_gusset_cm
    } else {
        luggage.depth_cm
    };
    let luggage_height = luggage.length_cm;
    let luggage_width = luggage.width_cm;

    for (idx, item) in items.iter().enumerate() {
        if item.weight_g <= 0.0 {
            unallocated.push(item.id.clone());
            continue;
        }

        // Determine target zone based on category, mass and density
        let raw_item_vol_cm3 = (item.length_cm * item.width_cm * item.depth_cm).max(1.0);
        let density_g_cm3 = item.weight_g / raw_item_vol_cm3;
        let is_dense_heavy = density_g_cm3 > 0.8 || item.weight_g >= 750.0;

        let target_zone = match item.category.as_str() {
            "Footwear" => "Spine Bottom",
            "Tech" if is_dense_heavy => "Spine Bottom",
            "Tech" => "Spine Mid",
            "Clothing" if idx % 2 == 0 => "Spine Mid",
            "Clothing" => "Spine Top",
            "Toiletries" => "Quick Access",
            "Documents" => "Quick Access",
            _ => {
                if item.compressibility_factor < 0.6 {
                    "Outer Lid"
                } else if is_dense_heavy {
                    "Spine Bottom"
                } else {
                    "Spine Mid"
                }
            }
        };

        // Determine 3D coordinates based on target zone within luggage shell
        // X: Lateral offset (0 centered, -W/2 left, +W/2 right)
        // Y: Depth offset (0 spine flush back panel, D outer lid front)
        // Z: Height offset (0 bottom floor, H top lid)
        let (pos_x, pos_y, pos_z) = match target_zone {
            "Spine Bottom" => (0.0, effective_depth * 0.20, luggage_height * 0.15),
            "Spine Mid" => (0.0, effective_depth * 0.25, luggage_height * 0.45),
            "Spine Top" => (0.0, effective_depth * 0.25, luggage_height * 0.70),
            "Outer Lid" => (0.0, effective_depth * 0.75, luggage_height * 0.50),
            "Quick Access" => (0.0, effective_depth * 0.50, luggage_height * 0.88),
            _ => (0.0, effective_depth * 0.30, luggage_height * 0.50),
        };

        // Associate with matching sub-container if available
        let assigned_cube_id = zone_cubes
            .get(target_zone)
            .and_then(|cubes| cubes.first().map(|c| c.id.clone()));

        allocations.push(Allocation {
            id: format!("alloc-auto-{}", item.id),
            trip_plan_id: trip_id.to_string(),
            inventory_item_id: item.id.clone(),
            luggage_shell_id: Some(luggage.id.clone()),
            sub_container_id: assigned_cube_id,
            quantity: 1,
            is_packed: true,
            packed_at: Some(chrono::Utc::now().to_rfc3339()),
            custom_override_weight_g: None,
            pos_x,
            pos_y,
            pos_z,
        });

        weighted_points.push(WeightedPoint3D {
            x: pos_x,
            y: pos_y,
            z: pos_z,
            mass_g: item.weight_g,
        });

        // Item compressed volume contribution in liters
        let compressed_item_vol_l =
            (raw_item_vol_cm3 * item.compressibility_factor.clamp(0.2, 1.0)) / 1000.0;
        total_packed_volume_l += compressed_item_vol_l;
    }

    let balance_report = calculate_center_of_mass_with_envelope(
        &weighted_points,
        luggage_width,
        effective_depth,
        luggage_height,
    );

    let usable_vol_l = if luggage.nominal_volume_l > 0.0 {
        luggage.nominal_volume_l
    } else {
        (luggage_width * effective_depth * luggage_height) / 1000.0 * 0.85
    };

    let volumetric_efficiency_pct = if usable_vol_l > 0.0 {
        ((total_packed_volume_l / usable_vol_l) * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };

    let items_packed_count = allocations.len();

    AutoPackResult {
        allocations,
        volumetric_efficiency_pct,
        center_of_mass_x: balance_report.center_of_mass_x,
        center_of_mass_y: balance_report.center_of_mass_y,
        center_of_mass_z: balance_report.center_of_mass_z,
        balance_report,
        items_packed_count,
        unallocated_items: unallocated,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_luggage() -> LuggageShell {
        LuggageShell {
            id: "bag-1".to_string(),
            name: "Test Carry-On".to_string(),
            brand: Some("Aero".to_string()),
            length_cm: 55.0,
            width_cm: 35.0,
            depth_cm: 23.0,
            tare_weight_g: 2200.0,
            nominal_volume_l: 40.0,
            expansion_gusset_cm: 4.0,
            is_expanded: false,
            corner_radius_cm: 3.0,
            taper_ratio: 0.95,
        }
    }

    fn sample_cubes() -> Vec<SubContainer> {
        vec![
            SubContainer {
                id: "cube-bottom".to_string(),
                luggage_shell_id: Some("bag-1".to_string()),
                parent_sub_container_id: None,
                name: "Shoe & Tech Pod".to_string(),
                container_type: "cube".to_string(),
                length_cm: 30.0,
                width_cm: 20.0,
                depth_cm: 10.0,
                max_volume_l: 6.0,
                tare_weight_g: 120.0,
                compression_ratio: 0.9,
                zone_layer: "Spine Bottom".to_string(),
            },
            SubContainer {
                id: "cube-mid".to_string(),
                luggage_shell_id: Some("bag-1".to_string()),
                parent_sub_container_id: None,
                name: "Medium Garment Cube".to_string(),
                container_type: "cube".to_string(),
                length_cm: 30.0,
                width_cm: 25.0,
                depth_cm: 12.0,
                max_volume_l: 9.0,
                tare_weight_g: 150.0,
                compression_ratio: 0.6,
                zone_layer: "Spine Mid".to_string(),
            },
        ]
    }

    fn sample_items() -> Vec<InventoryItem> {
        vec![
            InventoryItem {
                id: "item-boots".to_string(),
                name: "Hiking Boots".to_string(),
                brand: None,
                category: "Footwear".to_string(),
                weight_g: 1100.0,
                length_cm: 28.0,
                width_cm: 20.0,
                depth_cm: 12.0,
                compressibility_factor: 0.95,
                is_liquid: false,
                liquid_volume_ml: 0.0,
                monetary_value: 180.0,
                currency: "USD".to_string(),
                serial_number: None,
                readiness_state: "Staged".to_string(),
                tags: None,
                notes: None,
            },
            InventoryItem {
                id: "item-shirts".to_string(),
                name: "Merino Wool Shirts".to_string(),
                brand: None,
                category: "Clothing".to_string(),
                weight_g: 400.0,
                length_cm: 25.0,
                width_cm: 20.0,
                depth_cm: 8.0,
                compressibility_factor: 0.5,
                is_liquid: false,
                liquid_volume_ml: 0.0,
                monetary_value: 120.0,
                currency: "USD".to_string(),
                serial_number: None,
                readiness_state: "Staged".to_string(),
                tags: None,
                notes: None,
            },
        ]
    }

    #[test]
    fn test_auto_pack_spine_flush_and_stability() {
        let luggage = sample_luggage();
        let cubes = sample_cubes();
        let items = sample_items();

        let result = auto_pack_heuristic("trip-test", &luggage, &cubes, &items);

        assert_eq!(result.items_packed_count, 2);
        assert!(result.volumetric_efficiency_pct > 0.0);
        // Boots placed in spine bottom should yield spine-flush optimal report
        assert!(result.balance_report.is_spine_flush_optimal);
        assert!(result.center_of_mass_y <= luggage.depth_cm * 0.40);
    }
}
