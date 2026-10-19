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
    calculate_center_of_mass_with_envelope(items, 0.0, max_depth_cm, 0.0)
}

/// Calculate 3D center of mass and ergonomics alerts against 3D envelope (width, depth, height)
/// SDLC 7.1 Mass Centroid & Ergonomics Invariants:
/// - Spine flush optimal: Y_com <= 0.4 * depth_cm
/// - Top-heavy alert: Z_com > 0.70 * height_cm (triggers high-center-of-gravity alert)
/// - Lateral imbalance warning: |X_com| > 0.15 * width_cm (triggers lateral strain warning)
pub fn calculate_center_of_mass_with_envelope(
    items: &[WeightedPoint3D],
    envelope_width_cm: f64,
    envelope_depth_cm: f64,
    envelope_height_cm: f64,
) -> BalanceReport {
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

    let mut warnings: Vec<String> = Vec::new();

    // 1. Spine-flush criteria: COM depth Y should be close to back panel (Y <= 0.40 * depth)
    let is_spine_flush_optimal = if envelope_depth_cm > 0.0 {
        com_y <= (envelope_depth_cm * 0.4)
    } else {
        true
    };

    if !is_spine_flush_optimal {
        warnings.push(
            "High leverage warning: heavy items positioned away from spine panel".to_string(),
        );
    }

    // 2. Top-heavy alert: Z_com > 0.70 * height_cm
    let is_top_heavy = envelope_height_cm > 0.0 && com_z > (envelope_height_cm * 0.70);
    if is_top_heavy {
        warnings.push(
            "Top-heavy configuration alert: high center of gravity reduces stability".to_string(),
        );
    }

    // 3. Lateral imbalance alert: |X_com| > 0.15 * width_cm
    let is_laterally_imbalanced =
        envelope_width_cm > 0.0 && com_x.abs() > (0.15 * envelope_width_cm);
    if is_laterally_imbalanced {
        warnings.push("Lateral imbalance warning: lateral offset exceeds 15% width threshold, inducing musculoskeletal strain".to_string());
    }

    let lateral_penalty = if is_laterally_imbalanced {
        25.0
    } else {
        (com_x.abs() * 5.0).min(20.0)
    };

    let depth_penalty = if envelope_depth_cm > 0.0 && com_y > (envelope_depth_cm * 0.5) {
        25.0
    } else {
        0.0
    };

    let height_penalty = if is_top_heavy { 25.0 } else { 0.0 };

    let balance_score_pct =
        (100.0 - lateral_penalty - depth_penalty - height_penalty).clamp(0.0, 100.0);

    let warning = if warnings.is_empty() {
        None
    } else {
        Some(warnings.join("; "))
    };

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_or_zero_mass_neutral() {
        let report = calculate_center_of_mass(&[], 20.0);
        assert_eq!(report.total_mass_g, 0.0);
        assert_eq!(report.balance_score_pct, 100.0);
        assert!(report.warning.is_none());
    }

    #[test]
    fn test_top_heavy_configuration_triggers_alert() {
        let height_cm = 55.0;
        let width_cm = 35.0;
        let depth_cm = 20.0;

        // Place 90% of mass at high z (z = 45 cm, which is 45 / 55 = 0.818 > 0.70)
        let items = vec![
            WeightedPoint3D {
                x: 0.0,
                y: 5.0,
                z: 45.0,
                mass_g: 900.0,
            },
            WeightedPoint3D {
                x: 0.0,
                y: 5.0,
                z: 5.0,
                mass_g: 100.0,
            },
        ];

        let report = calculate_center_of_mass_with_envelope(&items, width_cm, depth_cm, height_cm);
        assert!(report.center_of_mass_z > 0.70 * height_cm);
        assert!(report.warning.is_some());
        let warn_msg = report.warning.unwrap();
        assert!(
            warn_msg.contains("Top-heavy configuration alert"),
            "Expected top-heavy alert, got: {}",
            warn_msg
        );
        assert!(report.balance_score_pct < 100.0);
    }

    #[test]
    fn test_lateral_imbalance_triggers_strain_warning() {
        let width_cm = 40.0; // 0.15 * 40 = 6.0 cm
        let depth_cm = 25.0;
        let height_cm = 50.0;

        // Place load significantly to the right (x = +8.0 cm > 6.0 cm)
        let items = vec![
            WeightedPoint3D {
                x: 8.0,
                y: 5.0,
                z: 20.0,
                mass_g: 800.0,
            },
            WeightedPoint3D {
                x: 0.0,
                y: 5.0,
                z: 20.0,
                mass_g: 200.0,
            },
        ];

        let report = calculate_center_of_mass_with_envelope(&items, width_cm, depth_cm, height_cm);
        assert!(report.center_of_mass_x.abs() > 0.15 * width_cm);
        assert!(report.warning.is_some());
        let warn_msg = report.warning.unwrap();
        assert!(
            warn_msg.contains("Lateral imbalance warning"),
            "Expected lateral strain warning, got: {}",
            warn_msg
        );
        assert!(report.balance_score_pct < 100.0);
    }

    #[test]
    fn test_symmetric_distribution_matches_centroid() {
        let width_cm = 40.0;
        let depth_cm = 20.0;
        let height_cm = 50.0;

        // Symmetrical pair centered around x=0, y=10 (D/2), z=25 (H/2)
        let items = vec![
            WeightedPoint3D {
                x: -10.0,
                y: 10.0,
                z: 25.0,
                mass_g: 500.0,
            },
            WeightedPoint3D {
                x: 10.0,
                y: 10.0,
                z: 25.0,
                mass_g: 500.0,
            },
        ];

        let report = calculate_center_of_mass_with_envelope(&items, width_cm, depth_cm, height_cm);
        assert!((report.center_of_mass_x - 0.0).abs() < 1e-9);
        assert!((report.center_of_mass_y - 10.0).abs() < 1e-9);
        assert!((report.center_of_mass_z - 25.0).abs() < 1e-9);

        // Test spine-flush optimal distribution (y <= 0.40 * 20.0 = 8.0)
        let spine_flush_items = vec![WeightedPoint3D {
            x: 0.0,
            y: 6.0,
            z: 20.0,
            mass_g: 600.0,
        }];
        let flush_report = calculate_center_of_mass_with_envelope(
            &spine_flush_items,
            width_cm,
            depth_cm,
            height_cm,
        );
        assert!(flush_report.is_spine_flush_optimal);
        assert_eq!(flush_report.balance_score_pct, 100.0);
    }
}
