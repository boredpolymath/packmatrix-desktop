//! PackMatrix Desktop — Mathematical & Computational Invariants
//! SDLC Phase Gate 1: Section 1.2 (PM-BTM-001)

use serde::{Deserialize, Serialize};

/// Unit transformation constants (NIST SP 811 exact conversion definitions)
pub const GRAMS_PER_OUNCE: f64 = 28.349_523_125;
pub const KILOGRAMS_PER_POUND: f64 = 0.453_592_37;
pub const CM_PER_INCH: f64 = 2.54;

/// Physical matter upper density bound for dense compressible textiles (g/cm³)
/// Cotton canvas / packed wool has a physical density threshold around 0.15 - 0.25 g/cm³.
pub const MAX_COMPRESSED_TEXTILE_DENSITY_G_PER_CM3: f64 = 0.15;

/// Centroid maximum permissible numerical tolerance relative to analytical integrals (cm)
/// 0.5 mm = 0.05 cm
pub const MAX_CENTROID_ERROR_CM: f64 = 0.05;

/// Volume display boundary rounding tolerance: rounded strictly to 2 decimal places (0.01 L)
pub fn round_volume_liters(volume_l: f64) -> f64 {
    (volume_l * 100.0).round() / 100.0
}

/// Convert grams to ounces with double precision
pub fn grams_to_ounces(grams: f64) -> f64 {
    grams / GRAMS_PER_OUNCE
}

/// Convert ounces to grams with double precision
pub fn ounces_to_grams(ounces: f64) -> f64 {
    ounces * GRAMS_PER_OUNCE
}

/// Convert kilograms to pounds with double precision
pub fn kilograms_to_pounds(kg: f64) -> f64 {
    kg / KILOGRAMS_PER_POUND
}

/// Convert pounds to kilograms with double precision
pub fn pounds_to_kilograms(lbs: f64) -> f64 {
    lbs * KILOGRAMS_PER_POUND
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MassConservationAudit {
    pub tare_weight_g: f64,
    pub packed_items_mass_g: f64,
    pub gross_mass_g: f64,
    pub gross_mass_kg: f64,
    pub gross_mass_lbs: f64,
    pub is_conserved: bool,
}

/// Verifies the Mass Conservation Invariant: Gross Mass == Tare Mass + Sum(Packed Items)
pub fn audit_mass_conservation(tare_weight_g: f64, item_masses_g: &[f64]) -> MassConservationAudit {
    let packed_items_mass_g: f64 = item_masses_g.iter().sum();
    let gross_mass_g = tare_weight_g + packed_items_mass_g;
    let gross_mass_kg = gross_mass_g / 1000.0;
    let gross_mass_lbs = kilograms_to_pounds(gross_mass_kg);

    // Verify round-trip conversion invariance: lbs -> kg -> g
    let roundtrip_g = pounds_to_kilograms(gross_mass_lbs) * 1000.0;
    let diff = (gross_mass_g - roundtrip_g).abs();
    let is_conserved = diff < 1e-6;

    MassConservationAudit {
        tare_weight_g,
        packed_items_mass_g,
        gross_mass_g,
        gross_mass_kg,
        gross_mass_lbs,
        is_conserved,
    }
}

/// Applies textile compressibility while strictly enforcing the physical density bound
/// (Density must never exceed 0.15 g/cm³ for dense textiles)
pub fn calculate_compressed_volume_liters(
    raw_volume_liters: f64,
    item_weight_g: f64,
    requested_compressibility_ratio: f64,
) -> f64 {
    let clamped_ratio = requested_compressibility_ratio.clamp(0.2, 1.0);
    let requested_compressed_liters = raw_volume_liters * clamped_ratio;

    // Minimum physical volume allowed based on matter density: Volume (cm³) = Mass (g) / Density (g/cm³)
    // 1 Liter = 1000 cm³
    let min_physical_volume_cm3 = item_weight_g / MAX_COMPRESSED_TEXTILE_DENSITY_G_PER_CM3;
    let min_physical_liters = min_physical_volume_cm3 / 1000.0;

    // The compressed volume cannot be smaller than min_physical_liters (density cannot exceed 0.15 g/cm³)
    let bounded_liters = requested_compressed_liters.max(min_physical_liters);
    round_volume_liters(bounded_liters.min(raw_volume_liters))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_volume_precision_invariant() {
        // Rounding to +/- 0.01 L
        assert_eq!(round_volume_liters(44.12345), 44.12);
        assert_eq!(round_volume_liters(44.1289), 44.13);
        assert_eq!(round_volume_liters(0.004), 0.00);
        assert_eq!(round_volume_liters(0.006), 0.01);
    }

    #[test]
    fn test_mass_conservation_invariant() {
        let tare = 2400.0; // 2.4 kg backpack
        let items = vec![850.0, 420.5, 120.0, 310.25, 95.75];
        let audit = audit_mass_conservation(tare, &items);

        let expected_packed = 850.0 + 420.5 + 120.0 + 310.25 + 95.75;
        assert_eq!(audit.packed_items_mass_g, expected_packed);
        assert_eq!(audit.gross_mass_g, tare + expected_packed);
        assert!(audit.is_conserved);

        // Verify zero loss across metric <-> imperial roundtrip
        let oz = grams_to_ounces(audit.gross_mass_g);
        let back_to_g = ounces_to_grams(oz);
        assert!((audit.gross_mass_g - back_to_g).abs() < 1e-9);
    }

    #[test]
    fn test_compressibility_hysteresis_bound() {
        // Down jacket: 500g, uncompressed raw volume = 8 Liters (8000 cm³)
        // Raw density = 500 / 8000 = 0.0625 g/cm³
        // Max compression allowed: density reaches 0.15 g/cm³
        // Min volume = 500g / 0.15 = 3333.33 cm³ = 3.33 Liters
        let raw_vol_l = 8.0;
        let weight_g = 500.0;

        // User attempts extreme 90% compression (0.1 ratio -> 0.8 L)
        let compressed = calculate_compressed_volume_liters(raw_vol_l, weight_g, 0.1);
        // Should be bounded by min physical density ~ 3.33 Liters
        assert!(compressed >= 3.33);
        assert!(compressed < raw_vol_l);
    }

    #[test]
    fn test_centroid_tolerance_relative_to_analytical_integral() {
        use crate::geometry::balance::{calculate_center_of_mass, WeightedPoint3D};

        // For a uniformly distributed rectangular pack of dimensions L=50, D=20, H=30,
        // the analytical centroid is exactly at the midpoint: (X=0, Y=D/2=10, Z=H/2=15).
        // Let's create an 8-corner symmetrical distribution with identical mass m=100g.
        let points = vec![
            WeightedPoint3D {
                x: -25.0,
                y: 0.0,
                z: 0.0,
                mass_g: 100.0,
            },
            WeightedPoint3D {
                x: 25.0,
                y: 0.0,
                z: 0.0,
                mass_g: 100.0,
            },
            WeightedPoint3D {
                x: -25.0,
                y: 20.0,
                z: 0.0,
                mass_g: 100.0,
            },
            WeightedPoint3D {
                x: 25.0,
                y: 20.0,
                z: 0.0,
                mass_g: 100.0,
            },
            WeightedPoint3D {
                x: -25.0,
                y: 0.0,
                z: 30.0,
                mass_g: 100.0,
            },
            WeightedPoint3D {
                x: 25.0,
                y: 0.0,
                z: 30.0,
                mass_g: 100.0,
            },
            WeightedPoint3D {
                x: -25.0,
                y: 20.0,
                z: 30.0,
                mass_g: 100.0,
            },
            WeightedPoint3D {
                x: 25.0,
                y: 20.0,
                z: 30.0,
                mass_g: 100.0,
            },
        ];

        let report = calculate_center_of_mass(&points, 20.0);
        let error_x = (report.center_of_mass_x - 0.0).abs();
        let error_y = (report.center_of_mass_y - 10.0).abs();
        let error_z = (report.center_of_mass_z - 15.0).abs();

        // Must be <= 0.5 mm (0.05 cm)
        assert!(
            error_x <= MAX_CENTROID_ERROR_CM,
            "X error {} exceeds 0.5mm",
            error_x
        );
        assert!(
            error_y <= MAX_CENTROID_ERROR_CM,
            "Y error {} exceeds 0.5mm",
            error_y
        );
        assert!(
            error_z <= MAX_CENTROID_ERROR_CM,
            "Z error {} exceeds 0.5mm",
            error_z
        );
    }
}
