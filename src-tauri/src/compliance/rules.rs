use crate::db::models::{AirlineRule, ComplianceEvaluation, LuggageShell};

pub fn evaluate_luggage_compliance(
    bag: &LuggageShell,
    total_packed_weight_kg: f64,
    rule: &AirlineRule,
) -> ComplianceEvaluation {
    let mut warnings = Vec::new();

    let length_diff_cm = rule.carry_on_length_cm - bag.length_cm;
    let width_diff_cm = rule.carry_on_width_cm - bag.width_cm;
    let depth_diff_cm = rule.carry_on_depth_cm - bag.depth_cm;

    let mut is_compliant = true;

    if length_diff_cm < 0.0 {
        is_compliant = false;
        warnings.push(format!(
            "Length exceeds carrier limit by {:.1} cm",
            length_diff_cm.abs()
        ));
    }
    if width_diff_cm < 0.0 {
        is_compliant = false;
        warnings.push(format!(
            "Width exceeds carrier limit by {:.1} cm",
            width_diff_cm.abs()
        ));
    }

    let depth_alert_message = if depth_diff_cm < 0.0 {
        is_compliant = false;
        warnings.push(format!(
            "Depth exceeds limit by {:.1} cm (potential overhead sizer obstruction)",
            depth_diff_cm.abs()
        ));
        Some(format!("Depth Alert: -{:.1} cm", depth_diff_cm.abs()))
    } else {
        None
    };

    let weight_diff_kg = rule.carry_on_max_weight_kg.map(|max_w| {
        let diff = max_w - total_packed_weight_kg;
        if diff < 0.0 {
            warnings.push(format!("Weight exceeds limit by {:.2} kg", diff.abs()));
        }
        diff
    });

    ComplianceEvaluation {
        carrier_name: rule.carrier_name.clone(),
        is_compliant: is_compliant && weight_diff_kg.is_none_or(|w| w >= 0.0),
        length_diff_cm,
        width_diff_cm,
        depth_diff_cm,
        weight_diff_kg,
        depth_alert_message,
        warnings,
    }
}
