//! PackMatrix Desktop — TSA / ICAO / FAA Regulatory Compliance & Hazardous Materials Validator
//! SDLC Phase Gate 1: Section 1.3 (PM-BTM-001)

use serde::{Deserialize, Serialize};

/// Maximum individual liquid container size allowed by TSA / ICAO 3-1-1 rule (ml)
pub const MAX_LIQUID_CONTAINER_ML: f64 = 100.0;

/// Maximum aggregate liquid capacity allowed per passenger in carry-on bag (ml)
/// Equivalent to standard 1-quart (0.95 - 1.0 Liter) clear bag
pub const MAX_AGGREGATE_LIQUIDS_ML: f64 = 1000.0;

/// Maximum lithium-ion battery capacity permitted without explicit airline approval (Watt-hours)
pub const MAX_UNRESTRICTED_BATTERY_WH: f64 = 100.0;

/// Maximum lithium-ion battery capacity permitted even with airline prior approval (Wh)
/// Over 160 Wh is universally forbidden on passenger aircraft
pub const MAX_AIRLINE_APPROVED_BATTERY_WH: f64 = 160.0;

/// Maximum length for rigid frame objects in tapered underseat zones (cm)
pub const MAX_UNDERSEAT_RIGID_LENGTH_CM: f64 = 35.0;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum LuggagePlacementProfile {
    CarryOnOverhead,
    CarryOnUnderseat,
    CheckedBaggage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatteryItem {
    pub name: String,
    pub watt_hours: f64,
    pub is_spare_cell: bool,
    pub is_installed_in_device: bool,
    pub airline_prior_approval_obtained: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidItem {
    pub name: String,
    pub container_volume_ml: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RigidObjectAssessment {
    pub name: String,
    pub length_cm: f64,
    pub is_rigid_frame: bool,
    pub is_assigned_to_underseat: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegulatoryComplianceReport {
    pub is_tsa_311_compliant: bool,
    pub total_liquid_volume_ml: f64,
    pub is_battery_compliant: bool,
    pub is_underseat_taper_compliant: bool,
    pub violations: Vec<String>,
    pub warnings: Vec<String>,
}

/// Validates full TSA / ICAO 3-1-1 liquids compliance for carry-on luggage
pub fn evaluate_liquids_compliance(liquids: &[LiquidItem]) -> (bool, f64, Vec<String>) {
    let mut violations = Vec::new();
    let mut total_volume_ml = 0.0;

    for item in liquids {
        total_volume_ml += item.container_volume_ml;
        if item.container_volume_ml > MAX_LIQUID_CONTAINER_ML {
            violations.push(format!(
                "Liquid violation: '{}' container ({:.1} ml) exceeds the 100 ml individual TSA/ICAO limit",
                item.name, item.container_volume_ml
            ));
        }
    }

    if total_volume_ml > MAX_AGGREGATE_LIQUIDS_ML {
        violations.push(format!(
            "Aggregate liquid violation: Total liquids ({:.1} ml) exceed the 1000 ml (1-quart envelope) allowance",
            total_volume_ml
        ));
    }

    let is_compliant = violations.is_empty();
    (is_compliant, total_volume_ml, violations)
}

/// Validates FAA / ICAO battery safety restrictions across luggage placement profiles
pub fn evaluate_battery_compliance(
    batteries: &[BatteryItem],
    placement: &LuggagePlacementProfile,
) -> (bool, Vec<String>) {
    let mut violations = Vec::new();

    for battery in batteries {
        // 1. Prohibit loose spare cells in checked luggage
        if *placement == LuggagePlacementProfile::CheckedBaggage && battery.is_spare_cell {
            violations.push(format!(
                "Hazardous materials violation: Loose spare battery '{}' is strictly prohibited in checked baggage (FAA/ICAO fire safety rule)",
                battery.name
            ));
        }

        // 2. Battery pack capacity limits (> 100 Wh requires airline approval, > 160 Wh forbidden)
        if battery.watt_hours > MAX_AIRLINE_APPROVED_BATTERY_WH {
            violations.push(format!(
                "Battery prohibited: '{}' ({:.1} Wh) exceeds universal 160 Wh passenger aircraft ceiling",
                battery.name, battery.watt_hours
            ));
        } else if battery.watt_hours > MAX_UNRESTRICTED_BATTERY_WH
            && !battery.airline_prior_approval_obtained
        {
            violations.push(format!(
                "Prior approval required: Battery '{}' ({:.1} Wh) exceeds 100 Wh threshold; requires airline prior authorization",
                battery.name, battery.watt_hours
            ));
        }
    }

    let is_compliant = violations.is_empty();
    (is_compliant, violations)
}

/// Validates underseat taper constraints: flags rigid objects (> 35 cm) assigned to underseat taper zones
pub fn evaluate_underseat_taper_compatibility(
    objects: &[RigidObjectAssessment],
) -> (bool, Vec<String>) {
    let mut warnings = Vec::new();

    for obj in objects {
        if obj.is_assigned_to_underseat
            && obj.is_rigid_frame
            && obj.length_cm > MAX_UNDERSEAT_RIGID_LENGTH_CM
        {
            warnings.push(format!(
                "Underseat taper warning: Rigid object '{}' (L = {:.1} cm) exceeds 35 cm threshold for tapered underseat footwell",
                obj.name, obj.length_cm
            ));
        }
    }

    let is_compliant = warnings.is_empty();
    (is_compliant, warnings)
}

/// Aggregate evaluation of all regulatory safety rules
pub fn evaluate_full_regulatory_compliance(
    liquids: &[LiquidItem],
    batteries: &[BatteryItem],
    placement: &LuggagePlacementProfile,
    rigid_objects: &[RigidObjectAssessment],
) -> RegulatoryComplianceReport {
    let (is_tsa_311_compliant, total_liquid_volume_ml, mut liquid_violations) =
        evaluate_liquids_compliance(liquids);
    let (is_battery_compliant, mut battery_violations) =
        evaluate_battery_compliance(batteries, placement);
    let (is_underseat_taper_compliant, underseat_warnings) =
        evaluate_underseat_taper_compatibility(rigid_objects);

    let mut violations = Vec::new();
    violations.append(&mut liquid_violations);
    violations.append(&mut battery_violations);

    RegulatoryComplianceReport {
        is_tsa_311_compliant,
        total_liquid_volume_ml,
        is_battery_compliant,
        is_underseat_taper_compliant,
        violations,
        warnings: underseat_warnings,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tsa_311_liquids_rule() {
        let compliant_liquids = vec![
            LiquidItem {
                name: "Toothpaste".into(),
                container_volume_ml: 75.0,
            },
            LiquidItem {
                name: "Sunscreen".into(),
                container_volume_ml: 100.0,
            },
            LiquidItem {
                name: "Contact Solution".into(),
                container_volume_ml: 60.0,
            },
        ];
        let (compliant, total, violations) = evaluate_liquids_compliance(&compliant_liquids);
        assert!(compliant);
        assert_eq!(total, 235.0);
        assert!(violations.is_empty());

        let oversized_liquid = vec![LiquidItem {
            name: "Water Bottle".into(),
            container_volume_ml: 500.0,
        }];
        let (compliant, _, violations) = evaluate_liquids_compliance(&oversized_liquid);
        assert!(!compliant);
        assert_eq!(violations.len(), 1);

        // Aggregate volume exceeding 1000 ml
        let mut many_small_liquids = Vec::new();
        for i in 0..15 {
            many_small_liquids.push(LiquidItem {
                name: format!("Shampoo Sample {}", i),
                container_volume_ml: 80.0,
            });
        }
        let (compliant, total, violations) = evaluate_liquids_compliance(&many_small_liquids);
        assert!(!compliant);
        assert_eq!(total, 1200.0);
        assert!(violations.iter().any(|v| v.contains("Total liquids")));
    }

    #[test]
    fn test_lithium_battery_restrictions() {
        // 99 Wh power bank (compliant in carry-on)
        let safe_powerbank = vec![BatteryItem {
            name: "Anker 99Wh Bank".into(),
            watt_hours: 99.0,
            is_spare_cell: true,
            is_installed_in_device: false,
            airline_prior_approval_obtained: false,
        }];
        let (compliant, _) =
            evaluate_battery_compliance(&safe_powerbank, &LuggagePlacementProfile::CarryOnOverhead);
        assert!(compliant);

        // 140 Wh drone battery without approval
        let unapproved_large = vec![BatteryItem {
            name: "Cinema Drone Battery".into(),
            watt_hours: 140.0,
            is_spare_cell: true,
            is_installed_in_device: false,
            airline_prior_approval_obtained: false,
        }];
        let (compliant, violations) = evaluate_battery_compliance(
            &unapproved_large,
            &LuggagePlacementProfile::CarryOnOverhead,
        );
        assert!(!compliant);
        assert!(violations[0].contains("requires airline prior authorization"));

        // Same 140 Wh battery with approval -> compliant
        let approved_large = vec![BatteryItem {
            name: "Cinema Drone Battery".into(),
            watt_hours: 140.0,
            is_spare_cell: true,
            is_installed_in_device: false,
            airline_prior_approval_obtained: true,
        }];
        let (compliant, _) =
            evaluate_battery_compliance(&approved_large, &LuggagePlacementProfile::CarryOnOverhead);
        assert!(compliant);

        // Spare battery in checked bag -> forbidden!
        let (compliant, violations) =
            evaluate_battery_compliance(&safe_powerbank, &LuggagePlacementProfile::CheckedBaggage);
        assert!(!compliant);
        assert!(violations[0].contains("prohibited in checked baggage"));
    }

    #[test]
    fn test_underseat_taper_rigid_objects() {
        let items = vec![
            RigidObjectAssessment {
                name: "16-inch Hard Shell Case".into(),
                length_cm: 38.0,
                is_rigid_frame: true,
                is_assigned_to_underseat: true,
            },
            RigidObjectAssessment {
                name: "Packable Jacket".into(),
                length_cm: 40.0,
                is_rigid_frame: false, // flexible
                is_assigned_to_underseat: true,
            },
        ];

        let (compliant, warnings) = evaluate_underseat_taper_compatibility(&items);
        assert!(!compliant);
        assert_eq!(warnings.len(), 1);
        assert!(warnings[0].contains("16-inch Hard Shell Case"));
    }
}
