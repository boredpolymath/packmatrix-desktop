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

export type ServiceTier =
  | 'Personal Item'
  | 'Standard Economy'
  | 'Premium Economy'
  | 'Business/First';

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
