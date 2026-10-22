use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LuggageShell {
    pub id: String,
    pub name: String,
    pub brand: Option<String>,
    pub length_cm: f64,
    pub width_cm: f64,
    pub depth_cm: f64,
    pub tare_weight_g: f64,
    pub nominal_volume_l: f64,
    pub expansion_gusset_cm: f64,
    pub is_expanded: bool,
    pub corner_radius_cm: f64,
    pub taper_ratio: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubContainer {
    pub id: String,
    pub luggage_shell_id: Option<String>,
    pub parent_sub_container_id: Option<String>,
    pub name: String,
    pub container_type: String,
    pub length_cm: f64,
    pub width_cm: f64,
    pub depth_cm: f64,
    pub max_volume_l: f64,
    pub tare_weight_g: f64,
    pub compression_ratio: f64,
    pub zone_layer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryItem {
    pub id: String,
    pub name: String,
    pub brand: Option<String>,
    pub category: String,
    pub weight_g: f64,
    pub length_cm: f64,
    pub width_cm: f64,
    pub depth_cm: f64,
    pub compressibility_factor: f64,
    pub is_liquid: bool,
    pub liquid_volume_ml: f64,
    pub monetary_value: f64,
    pub currency: String,
    pub serial_number: Option<String>,
    pub readiness_state: String,
    pub tags: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AirlineRule {
    pub id: String,
    pub carrier_name: String,
    pub carrier_code: String,
    pub fare_class: String,
    pub carry_on_length_cm: f64,
    pub carry_on_width_cm: f64,
    pub carry_on_depth_cm: f64,
    pub carry_on_max_weight_kg: Option<f64>,
    pub personal_item_length_cm: Option<f64>,
    pub personal_item_width_cm: Option<f64>,
    pub personal_item_depth_cm: Option<f64>,
    pub personal_item_max_weight_kg: Option<f64>,
    pub tsa_liquids_compliant: bool,
    pub verified_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceEvaluation {
    pub carrier_name: String,
    pub is_compliant: bool,
    pub length_diff_cm: f64,
    pub width_diff_cm: f64,
    pub depth_diff_cm: f64,
    pub weight_diff_kg: Option<f64>,
    pub depth_alert_message: Option<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TripPlan {
    pub id: String,
    pub title: String,
    pub origin_airport: Option<String>,
    pub destination_airport: Option<String>,
    pub departure_date: Option<String>,
    pub return_date: Option<String>,
    pub target_airline_rule_id: Option<String>,
    pub active_luggage_shell_id: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Allocation {
    pub id: String,
    pub trip_plan_id: String,
    pub inventory_item_id: String,
    pub luggage_shell_id: Option<String>,
    pub sub_container_id: Option<String>,
    pub quantity: i64,
    pub is_packed: bool,
    pub packed_at: Option<String>,
    pub custom_override_weight_g: Option<f64>,
    pub pos_x: f64,
    pub pos_y: f64,
    pub pos_z: f64,
}
