export type UnitSystem = 'metric' | 'imperial';

export type ZoneLayerTag =
  | 'Spine Bottom'
  | 'Spine Mid'
  | 'Spine Top'
  | 'Outer Lid'
  | 'Quick Access';

export type ReadinessState =
  | 'In Closet'
  | 'Wishlist'
  | 'Staged'
  | 'Packed'
  | 'Worn';

export type ItemCategory =
  | 'Tech'
  | 'Clothing'
  | 'Toiletries'
  | 'Footwear'
  | 'Documents'
  | 'Misc';

export interface LuggageShell {
  id: string;
  name: string;
  brand?: string | undefined;
  length_cm: number;
  width_cm: number;
  depth_cm: number;
  tare_weight_g: number;
  nominal_volume_l: number;
  expansion_gusset_cm: number;
  is_expanded: boolean;
  corner_radius_cm: number;
  taper_ratio: number;
}

export interface SubContainer {
  id: string;
  luggage_shell_id?: string | undefined;
  parent_sub_container_id?: string | undefined;
  name: string;
  container_type: 'cube' | 'pouch' | 'sleeve' | 'organizer' | 'pocket';
  length_cm: number;
  width_cm: number;
  depth_cm: number;
  max_volume_l: number;
  tare_weight_g: number;
  compression_ratio: number; // 0.2 to 1.0
  zone_layer: ZoneLayerTag;
}

export interface InventoryItem {
  id: string;
  name: string;
  brand?: string | undefined;
  category: ItemCategory;
  weight_g: number;
  length_cm: number;
  width_cm: number;
  depth_cm: number;
  compressibility_factor: number;
  is_liquid: boolean;
  liquid_volume_ml: number;
  monetary_value: number;
  currency: string;
  serial_number?: string | undefined;
  readiness_state: ReadinessState;
  tags?: string | undefined;
  notes?: string | undefined;
  sub_container_id?: string | undefined;
  pos_x?: number | undefined; // Lateral offset from spine center (-W/2 to W/2)
  pos_y?: number | undefined; // Depth offset (0 at spine back panel, D at outer lid)
  pos_z?: number | undefined; // Height offset (0 at bottom floor, H at top bay)
  packed: boolean;
  is_battery?: boolean | undefined;
  battery_wh?: number | undefined;
  is_spare_cell?: boolean | undefined;
}

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  category: ItemCategory;
  weight_g: number;
  length_cm: number;
  width_cm: number;
  depth_cm: number;
  compressibility_factor: number;
  is_liquid: boolean;
  liquid_volume_ml: number;
  is_battery: boolean;
  battery_wh: number;
  monetary_value: number;
  currency: string;
  source: 'offline_catalog' | 'online_retail';
  tags?: string | undefined;
  thumbnail?: string | undefined;
}

export interface CatalogBag {
  id: string;
  name: string;
  brand: string;
  category: 'Backpack' | 'Roller' | 'Duffel' | 'Tote / Underseat';
  length_cm: number;
  width_cm: number;
  depth_cm: number;
  tare_weight_g: number;
  nominal_volume_l: number;
  expansion_gusset_cm: number;
  corner_radius_cm: number;
  taper_ratio: number;
  upc?: string | undefined;
  description?: string | undefined;
}

export type ServiceTier =
  | 'Personal Item'
  | 'Standard Economy'
  | 'Premium Economy'
  | 'Business/First'
  | 'PersonalItem'
  | 'StandardEconomy'
  | 'PremiumEconomy'
  | 'BusinessFirst';

export interface CarrierEnvelope {
  carrier_code: string;
  carrier_name: string;
  tier: ServiceTier;
  max_length_cm: number;
  max_width_cm: number;
  max_depth_cm: number;
  max_weight_kg?: number | undefined;
  underseat_allowed: boolean;
  verified_source: string;
}

export interface AirlineRule {
  id: string;
  carrier_name: string;
  carrier_code: string;
  fare_class: ServiceTier;
  carry_on_length_cm: number;
  carry_on_width_cm: number;
  carry_on_depth_cm: number;
  carry_on_max_weight_kg?: number | undefined;
  personal_item_length_cm?: number | undefined;
  personal_item_width_cm?: number | undefined;
  personal_item_depth_cm?: number | undefined;
  personal_item_max_weight_kg?: number | undefined;
  tsa_liquids_compliant: boolean;
  verified_at: string;
}

export interface BalanceReport {
  center_of_mass_x: number;
  center_of_mass_y: number;
  center_of_mass_z: number;
  total_mass_g: number;
  is_spine_flush_optimal: boolean;
  balance_score_pct: number;
  warning?: string | undefined;
}

export interface VolumetricResult {
  gross_volume_liters: number;
  usable_volume_liters: number;
  packed_volume_liters: number;
  volumetric_efficiency_pct: number;
  remaining_volume_liters: number;
}

export interface SubContainerAllocationCheck {
  total_subcontainer_volume_l: number;
  luggage_usable_volume_l: number;
  is_overflowing: boolean;
  overflow_amount_l: number;
  utilization_pct: number;
}

export interface TripPlan {
  id: string;
  title: string;
  origin_airport?: string | undefined;
  destination_airport?: string | undefined;
  departure_date?: string | undefined;
  return_date?: string | undefined;
  target_airline_rule_id?: string | undefined;
  active_luggage_shell_id?: string | undefined;
  notes?: string | undefined;
}

export interface Allocation {
  id: string;
  trip_plan_id: string;
  inventory_item_id: string;
  luggage_shell_id?: string | undefined;
  sub_container_id?: string | undefined;
  quantity: number;
  is_packed: boolean;
  packed_at?: string | undefined;
  custom_override_weight_g?: number | undefined;
  pos_x: number;
  pos_y: number;
  pos_z: number;
}

export interface AutoPackResult {
  allocations: Allocation[];
  volumetric_efficiency_pct: number;
  center_of_mass_x: number;
  center_of_mass_y: number;
  center_of_mass_z: number;
  balance_report: BalanceReport;
  items_packed_count: number;
  unallocated_items: string[];
}

export interface ComplianceEvaluation {
  carrier_name: string;
  is_compliant: boolean;
  length_diff_cm: number;
  width_diff_cm: number;
  depth_diff_cm: number;
  weight_diff_kg?: number | undefined;
  depth_alert_message?: string | undefined;
  warnings: string[];
}

export interface DiagnosticReport {
  quick_check: string;
  integrity_check: string;
  foreign_key_violations: string[];
  optimize_status: string;
  vacuum_status: string;
  is_healthy: boolean;
  timestamp: string;
}

export const DEFAULT_FALLBACK_BAG: LuggageShell = Object.freeze({
  id: 'preset-peak-design-45',
  name: 'Peak Design Travel Backpack 45L',
  brand: 'Peak Design',
  length_cm: 53.5,
  width_cm: 33.0,
  depth_cm: 24.1,
  tare_weight_g: 2050,
  nominal_volume_l: 45.0,
  expansion_gusset_cm: 5.1,
  is_expanded: false,
  corner_radius_cm: 3.5,
  taper_ratio: 0.95,
});
