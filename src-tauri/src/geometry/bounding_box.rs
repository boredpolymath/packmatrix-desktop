use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dimensions {
    pub length_cm: f64,
    pub width_cm: f64,
    pub depth_cm: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumetricResult {
    pub gross_volume_liters: f64,
    pub usable_volume_liters: f64,
    pub packed_volume_liters: f64,
    pub volumetric_efficiency_pct: f64,
    pub remaining_volume_liters: f64,
}

impl Dimensions {
    pub fn new(length_cm: f64, width_cm: f64, depth_cm: f64) -> Self {
        Self {
            length_cm,
            width_cm,
            depth_cm,
        }
    }

    /// Dynamic depth adjustment with expansion gusset ($D_{\text{eff}} = D + \Delta D_{\text{gusset}}$)
    pub fn effective_depth_cm(depth_cm: f64, is_expanded: bool, expansion_gusset_cm: f64) -> f64 {
        if is_expanded {
            depth_cm + expansion_gusset_cm.max(0.0)
        } else {
            depth_cm
        }
    }

    /// Dynamic expanded dimensions
    pub fn with_expansion(&self, is_expanded: bool, expansion_gusset_cm: f64) -> Self {
        Self {
            length_cm: self.length_cm,
            width_cm: self.width_cm,
            depth_cm: Self::effective_depth_cm(self.depth_cm, is_expanded, expansion_gusset_cm),
        }
    }

    /// Calculate raw bounding box volume in liters (cm³ / 1000)
    pub fn raw_volume_liters(&self) -> f64 {
        (self.length_cm * self.width_cm * self.depth_cm) / 1000.0
    }

    /// Compute usable volume with non-rectangular adjustments (taper and corner radius bevels)
    pub fn effective_usable_volume_liters(&self, taper_ratio: f64, corner_radius_cm: f64) -> f64 {
        let raw = self.raw_volume_liters();
        // Corner bevel volume reduction approximation (4 vertical rounded edges)
        let bevel_reduction = if corner_radius_cm > 0.0 {
            let corner_area_loss = (4.0 - std::f64::consts::PI) * corner_radius_cm.powi(2);
            (corner_area_loss * self.depth_cm) / 1000.0
        } else {
            0.0
        };

        // Hull taper approximation: average cross-section between base and top
        let taper_factor = (1.0 + taper_ratio.clamp(0.5, 1.0)) / 2.0;
        ((raw - bevel_reduction) * taper_factor).max(0.0)
    }

    /// Usable volume incorporating expansion gusset state
    pub fn effective_usable_volume_with_expansion(
        &self,
        taper_ratio: f64,
        corner_radius_cm: f64,
        is_expanded: bool,
        expansion_gusset_cm: f64,
    ) -> f64 {
        let expanded = self.with_expansion(is_expanded, expansion_gusset_cm);
        expanded.effective_usable_volume_liters(taper_ratio, corner_radius_cm)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubContainerAllocationCheck {
    pub total_subcontainer_volume_l: f64,
    pub luggage_usable_volume_l: f64,
    pub is_overflowing: bool,
    pub overflow_amount_l: f64,
    pub utilization_pct: f64,
}

pub fn check_subcontainer_allocation(
    subcontainers: &[(f64, f64)], // (nominal_volume_l, compression_ratio in 0.2..=1.0)
    luggage_usable_volume_l: f64,
) -> SubContainerAllocationCheck {
    let total_subcontainer_volume_l: f64 = subcontainers
        .iter()
        .map(|(vol, comp)| vol * comp.clamp(0.2, 1.0))
        .sum();

    let is_overflowing = total_subcontainer_volume_l > luggage_usable_volume_l;
    let overflow_amount_l = if is_overflowing {
        total_subcontainer_volume_l - luggage_usable_volume_l
    } else {
        0.0
    };
    let utilization_pct = if luggage_usable_volume_l > 0.0 {
        (total_subcontainer_volume_l / luggage_usable_volume_l) * 100.0
    } else {
        0.0
    };

    SubContainerAllocationCheck {
        total_subcontainer_volume_l,
        luggage_usable_volume_l,
        is_overflowing,
        overflow_amount_l,
        utilization_pct,
    }
}

pub fn get_curated_luggage_presets() -> Vec<crate::db::models::LuggageShell> {
    vec![
        crate::db::models::LuggageShell {
            id: "preset-osprey-farpoint-40".to_string(),
            name: "Osprey Farpoint 40".to_string(),
            brand: Some("Osprey".to_string()),
            length_cm: 55.0,
            width_cm: 35.0,
            depth_cm: 23.0,
            tare_weight_g: 1580.0,
            nominal_volume_l: 40.0,
            expansion_gusset_cm: 0.0,
            is_expanded: false,
            corner_radius_cm: 4.0,
            taper_ratio: 0.88,
        },
        crate::db::models::LuggageShell {
            id: "preset-peak-design-45".to_string(),
            name: "Peak Design Travel Backpack 45L".to_string(),
            brand: Some("Peak Design".to_string()),
            length_cm: 53.5,
            width_cm: 33.0,
            depth_cm: 24.1,
            tare_weight_g: 2050.0,
            nominal_volume_l: 45.0,
            expansion_gusset_cm: 5.1,
            is_expanded: false,
            corner_radius_cm: 3.5,
            taper_ratio: 0.95,
        },
        crate::db::models::LuggageShell {
            id: "preset-rimowa-cabin".to_string(),
            name: "Rimowa Classic Cabin".to_string(),
            brand: Some("Rimowa".to_string()),
            length_cm: 55.0,
            width_cm: 40.0,
            depth_cm: 23.0,
            tare_weight_g: 4300.0,
            nominal_volume_l: 36.0,
            expansion_gusset_cm: 0.0,
            is_expanded: false,
            corner_radius_cm: 2.5,
            taper_ratio: 1.0,
        },
        crate::db::models::LuggageShell {
            id: "preset-aer-travel-pack-3".to_string(),
            name: "Aer Travel Pack 3".to_string(),
            brand: Some("Aer".to_string()),
            length_cm: 54.5,
            width_cm: 35.0,
            depth_cm: 21.5,
            tare_weight_g: 1860.0,
            nominal_volume_l: 35.0,
            expansion_gusset_cm: 3.0,
            is_expanded: false,
            corner_radius_cm: 3.0,
            taper_ratio: 0.92,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_raw_bounding_box_volume() {
        let bag = Dimensions::new(55.0, 40.0, 20.0);
        assert_eq!(bag.raw_volume_liters(), 44.0);
    }

    #[test]
    fn test_taper_and_bevel_reductions() {
        let bag = Dimensions::new(50.0, 30.0, 20.0);
        let raw = bag.raw_volume_liters();
        assert_eq!(raw, 30.0);

        let with_bevel_and_taper = bag.effective_usable_volume_liters(0.8, 3.0);
        assert!(with_bevel_and_taper < raw);
        assert!(with_bevel_and_taper > 20.0);
    }

    #[test]
    fn test_expansion_gusset_modeling() {
        let bag = Dimensions::new(53.5, 33.0, 24.1);
        let unexpanded_depth = Dimensions::effective_depth_cm(bag.depth_cm, false, 5.1);
        assert_eq!(unexpanded_depth, 24.1);

        let expanded_depth = Dimensions::effective_depth_cm(bag.depth_cm, true, 5.1);
        assert!((expanded_depth - 29.2).abs() < 1e-6);

        let unexpanded_vol = bag.effective_usable_volume_with_expansion(0.95, 3.5, false, 5.1);
        let expanded_vol = bag.effective_usable_volume_with_expansion(0.95, 3.5, true, 5.1);
        assert!(expanded_vol > unexpanded_vol);
    }

    #[test]
    fn test_curated_luggage_presets() {
        let presets = get_curated_luggage_presets();
        assert_eq!(presets.len(), 4);
        assert!(presets.iter().any(|p| p.name.contains("Osprey")));
        assert!(presets.iter().any(|p| p.name.contains("Peak Design")));
        assert!(presets.iter().any(|p| p.name.contains("Rimowa")));
        assert!(presets.iter().any(|p| p.name.contains("Aer")));
    }

    #[test]
    fn test_subcontainer_volume_non_overlap_invariant() {
        let usable_vol = 40.0;
        let fitting_cubes = vec![(10.0, 0.8), (15.0, 0.7), (5.0, 1.0)];
        let check = check_subcontainer_allocation(&fitting_cubes, usable_vol);
        assert!(!check.is_overflowing);
        assert_eq!(check.overflow_amount_l, 0.0);

        let overflowing_cubes = vec![(20.0, 1.0), (25.0, 1.0)];
        let check_overflow = check_subcontainer_allocation(&overflowing_cubes, usable_vol);
        assert!(check_overflow.is_overflowing);
        assert_eq!(check_overflow.overflow_amount_l, 5.0);
    }

    #[test]
    fn test_analytical_raw_volume_calculation() {
        let test_cases = vec![
            (55.0, 40.0, 20.0, 44.0),
            (50.0, 30.0, 20.0, 30.0),
            (10.0, 10.0, 10.0, 1.0),
            (100.0, 50.0, 30.0, 150.0),
        ];

        for (l, w, d, expected_v) in test_cases {
            let dim = Dimensions::new(l, w, d);
            let v = dim.raw_volume_liters();
            assert!(
                (v - expected_v).abs() < 1e-9,
                "Failed raw volume proof for ({}, {}, {}): expected {}, got {}",
                l,
                w,
                d,
                expected_v,
                v
            );
        }
    }

    #[test]
    fn test_analytical_corner_bevel_against_numerical_quadrant_integration() {
        // SDLC 7.1 Analytical Geometry Proof:
        // Corner bevel deduction formula: Delta_V = (4 - pi) * r^2 * D / 1000
        // Verify against 2D numerical quadrant integration:
        // A quadrant corner removed from a square of side r has area:
        // Area_corner = \int_0^r \int_0^r [x^2 + y^2 > r^2] dx dy
        let r = 5.0; // 5 cm radius
        let d = 25.0; // 25 cm depth

        let analytical_delta_v = (4.0 - std::f64::consts::PI) * r * r * d / 1000.0;

        // Numerical integration via 2D Riemann sum (N = 500 steps per axis)
        let n = 500;
        let step = r / (n as f64);
        let mut numerical_corner_area = 0.0;

        for i in 0..n {
            let x = (i as f64 + 0.5) * step;
            for j in 0..n {
                let y = (j as f64 + 0.5) * step;
                if (x * x + y * y) > (r * r) {
                    numerical_corner_area += step * step;
                }
            }
        }

        // 4 corners around the perimeter
        let numerical_delta_v = (4.0 * numerical_corner_area * d) / 1000.0;

        let delta_error = (analytical_delta_v - numerical_delta_v).abs();
        assert!(
            delta_error < 0.005,
            "Analytical bevel deduction ({}) diverged from numerical quadrant integral ({}) by {}",
            analytical_delta_v,
            numerical_delta_v,
            delta_error
        );
    }

    #[test]
    fn test_analytical_trapezoidal_taper_factor() {
        // Hull taper factor: V_taper = V * (1 + tau) / 2
        let bag = Dimensions::new(50.0, 40.0, 20.0);
        let raw = bag.raw_volume_liters(); // 40.0 L

        // When corner_radius is 0, V_usable = raw * (1 + tau) / 2
        for tau in [0.5, 0.6, 0.75, 0.88, 0.95, 1.0] {
            let expected_usable = raw * (1.0 + tau) / 2.0;
            let actual_usable = bag.effective_usable_volume_liters(tau, 0.0);
            assert!(
                (actual_usable - expected_usable).abs() < 1e-9,
                "Taper factor proof failed for tau {}: expected {}, got {}",
                tau,
                expected_usable,
                actual_usable
            );
        }
    }

    #[test]
    fn test_analytical_boundary_conditions_zero_nan_inf() {
        // Assert zero floating-point NaN or Inf across boundary conditions (L=0, W=0, D=0)
        let boundary_dimensions = vec![
            Dimensions::new(0.0, 0.0, 0.0),
            Dimensions::new(0.0, 30.0, 20.0),
            Dimensions::new(50.0, 0.0, 20.0),
            Dimensions::new(50.0, 30.0, 0.0),
            Dimensions::new(-10.0, 30.0, 20.0),
        ];

        for dim in boundary_dimensions {
            let raw = dim.raw_volume_liters();
            assert!(!raw.is_nan(), "Raw volume must not be NaN");
            assert!(!raw.is_infinite(), "Raw volume must not be Inf");

            let usable = dim.effective_usable_volume_liters(0.8, 3.0);
            assert!(!usable.is_nan(), "Usable volume must not be NaN");
            assert!(!usable.is_infinite(), "Usable volume must not be Inf");
            assert!(usable >= 0.0, "Usable volume must be non-negative");
        }
    }
}
