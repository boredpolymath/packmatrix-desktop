//! PackMatrix Desktop — Property-Based Testing Suite
//! SDLC Phase Gate 5: Section 7.2 (PM-BTM-001)

use crate::geometry::balance::{calculate_center_of_mass_with_envelope, WeightedPoint3D};
use crate::geometry::bounding_box::Dimensions;
use crate::geometry::invariants::{
    audit_mass_conservation, calculate_compressed_volume_liters, grams_to_ounces, ounces_to_grams,
};
use proptest::prelude::*;

proptest! {
    #![proptest_config(ProptestConfig::with_cases(5000))]

    #[test]
    fn prop_usable_volume_less_than_or_equal_raw_volume(
        l in 0.0f64..500.0,
        w in 0.0f64..500.0,
        d in 0.0f64..500.0,
        r in 0.0f64..50.0,
        tau in 0.5f64..=1.0,
        gusset in 0.0f64..30.0,
        is_expanded in any::<bool>(),
    ) {
        let bag = Dimensions::new(l, w, d);
        let raw_v = bag.raw_volume_liters();
        let usable_v = bag.effective_usable_volume_liters(tau, r);

        // Core Invariant: Usable volume never exceeds bounding box raw volume
        prop_assert!(usable_v <= raw_v + 1e-9, "Usable volume {} exceeded raw volume {}", usable_v, raw_v);
        prop_assert!(usable_v >= 0.0, "Usable volume must be non-negative");
        prop_assert!(!usable_v.is_nan(), "Usable volume must not be NaN");
        prop_assert!(!usable_v.is_infinite(), "Usable volume must not be infinite");

        // Expansion gusset invariant
        let expanded_usable = bag.effective_usable_volume_with_expansion(tau, r, is_expanded, gusset);
        if is_expanded && gusset > 0.0 && l > 0.0 && w > 0.0 {
            prop_assert!(expanded_usable >= usable_v - 1e-9, "Expansion must not decrease volume");
        }
    }

    #[test]
    fn prop_mass_conservation_and_unit_conversion_invariance(
        tare in 0.0f64..50_000.0,
        item_weights in proptest::collection::vec(0.0f64..10_000.0, 0..50),
    ) {
        let audit = audit_mass_conservation(tare, &item_weights);
        let expected_packed: f64 = item_weights.iter().sum();

        prop_assert!((audit.packed_items_mass_g - expected_packed).abs() < 1e-9);
        prop_assert!((audit.gross_mass_g - (tare + expected_packed)).abs() < 1e-9);
        prop_assert!(audit.is_conserved);

        // Roundtrip conversion: g -> oz -> g
        let oz = grams_to_ounces(audit.gross_mass_g);
        let roundtrip_g = ounces_to_grams(oz);
        prop_assert!((audit.gross_mass_g - roundtrip_g).abs() < 1e-6);
    }

    #[test]
    fn prop_textile_compressibility_matter_density_upper_bound(
        raw_v in 0.1f64..200.0,
        weight_g in 0.1f64..20_000.0,
        ratio in 0.0f64..2.0,
    ) {
        let comp_vol_l = calculate_compressed_volume_liters(raw_v, weight_g, ratio);

        // Account for +/- 0.01 L display rounding boundary
        prop_assert!(comp_vol_l <= raw_v + 0.01, "Compressed volume {} exceeds raw volume {}", comp_vol_l, raw_v);
        prop_assert!(comp_vol_l >= 0.0, "Compressed volume must be non-negative");

        // Physical textile density upper bound: density <= 0.15 g/cm^3 (150 g/L)
        // If the uncompressed raw density is within compressible bounds (<= 150 g/L),
        // compression must never compress it past the physical density threshold:
        let raw_density_g_per_l = weight_g / raw_v;
        if raw_density_g_per_l <= 150.0 {
            let density_g_per_l = weight_g / comp_vol_l.max(0.01);
            // Account for +/- 0.005 L display rounding on sub-liter volumes (e.g. 0.6028 L rounded to 0.60 L)
            prop_assert!(
                density_g_per_l <= 153.0,
                "Compressed textile density {} g/L exceeded physical threshold",
                density_g_per_l
            );
        } else {
            // Already ultra-dense matter cannot be compressed further
            prop_assert!((comp_vol_l - raw_v).abs() <= 0.02);
        }
    }

    #[test]
    fn prop_center_of_mass_bounded_within_convex_hull(
        xs in proptest::collection::vec(-50.0f64..50.0, 1..20),
        ys in proptest::collection::vec(0.0f64..60.0, 1..20),
        zs in proptest::collection::vec(0.0f64..100.0, 1..20),
        masses in proptest::collection::vec(1.0f64..2000.0, 1..20),
    ) {
        let count = xs.len().min(ys.len()).min(zs.len()).min(masses.len());
        let items: Vec<WeightedPoint3D> = (0..count).map(|i| WeightedPoint3D {
            x: xs[i],
            y: ys[i],
            z: zs[i],
            mass_g: masses[i],
        }).collect();

        let report = calculate_center_of_mass_with_envelope(&items, 100.0, 60.0, 100.0);

        let min_x = items.iter().map(|p| p.x).fold(f64::INFINITY, f64::min);
        let max_x = items.iter().map(|p| p.x).fold(f64::NEG_INFINITY, f64::max);
        let min_y = items.iter().map(|p| p.y).fold(f64::INFINITY, f64::min);
        let max_y = items.iter().map(|p| p.y).fold(f64::NEG_INFINITY, f64::max);
        let min_z = items.iter().map(|p| p.z).fold(f64::INFINITY, f64::min);
        let max_z = items.iter().map(|p| p.z).fold(f64::NEG_INFINITY, f64::max);

        prop_assert!(report.center_of_mass_x >= min_x - 1e-9 && report.center_of_mass_x <= max_x + 1e-9);
        prop_assert!(report.center_of_mass_y >= min_y - 1e-9 && report.center_of_mass_y <= max_y + 1e-9);
        prop_assert!(report.center_of_mass_z >= min_z - 1e-9 && report.center_of_mass_z <= max_z + 1e-9);
        prop_assert!(report.balance_score_pct >= 0.0 && report.balance_score_pct <= 100.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// High-throughput deterministic property sweep: 500,000 randomized iterations
    /// Mandated by SDLC Phase Gate 5: Section 7.2
    #[test]
    fn test_500k_iterations_dimension_and_volume_invariants() {
        let mut seed: u64 = 0xDEADBEEFCAFE;
        #[inline(always)]
        fn next_f64(seed: &mut u64, min: f64, max: f64) -> f64 {
            *seed ^= *seed << 13;
            *seed ^= *seed >> 7;
            *seed ^= *seed << 17;
            let frac = (*seed as f64) / (u64::MAX as f64);
            min + frac * (max - min)
        }

        const ITERATIONS: usize = 500_000;
        for _ in 0..ITERATIONS {
            let l = next_f64(&mut seed, 0.0, 500.0);
            let w = next_f64(&mut seed, 0.0, 500.0);
            let d = next_f64(&mut seed, 0.0, 500.0);
            let r = next_f64(&mut seed, 0.0, 50.0);
            let tau = next_f64(&mut seed, 0.5, 1.0);
            let gusset = next_f64(&mut seed, 0.0, 30.0);
            let is_expanded = (seed & 1) == 1;

            let dim = Dimensions::new(l, w, d);
            let raw_v = dim.raw_volume_liters();
            let usable_v = dim.effective_usable_volume_liters(tau, r);

            // Invariants: Usable volume <= raw volume, non-negative, finite
            assert!(
                usable_v <= raw_v + 1e-9,
                "Usable volume {} exceeded raw volume {}",
                usable_v,
                raw_v
            );
            assert!(usable_v >= 0.0, "Usable volume must be non-negative");
            assert!(!usable_v.is_nan(), "Usable volume must not be NaN");
            assert!(!usable_v.is_infinite(), "Usable volume must not be Inf");

            let exp_v = dim.effective_usable_volume_with_expansion(tau, r, is_expanded, gusset);
            assert!(!exp_v.is_nan());
            assert!(!exp_v.is_infinite());
            assert!(exp_v >= 0.0);
        }
    }
}
