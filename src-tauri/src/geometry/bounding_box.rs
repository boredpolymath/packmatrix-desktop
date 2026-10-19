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
}
