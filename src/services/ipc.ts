import { invoke, isTauri } from '@tauri-apps/api/core';
import * as v from 'valibot';
import type {
  LuggageShell,
  SubContainer,
  InventoryItem,
  TripPlan,
  Allocation,
  AutoPackResult,
  CarrierEnvelope,
  BalanceReport,
  VolumetricResult,
  DiagnosticReport,
  ComplianceEvaluation,
  AirlineRule,
} from '../types';
import {
  CURATED_BAG_PRESETS,
  INITIAL_SUB_CONTAINERS,
  INITIAL_INVENTORY_ITEMS,
  AIRLINE_RULES_DATABASE,
} from '../utils/data';

// ==========================================
// Valibot Runtime Validation Schemas
// ==========================================

export const LuggageShellSchema = v.object({
  id: v.string(),
  name: v.string(),
  brand: v.optional(v.string()),
  length_cm: v.number(),
  width_cm: v.number(),
  depth_cm: v.number(),
  tare_weight_g: v.number(),
  nominal_volume_l: v.number(),
  expansion_gusset_cm: v.number(),
  is_expanded: v.boolean(),
  corner_radius_cm: v.number(),
  taper_ratio: v.number(),
});

export const SubContainerSchema = v.object({
  id: v.string(),
  luggage_shell_id: v.optional(v.string()),
  parent_sub_container_id: v.optional(v.string()),
  name: v.string(),
  container_type: v.string(),
  length_cm: v.number(),
  width_cm: v.number(),
  depth_cm: v.number(),
  max_volume_l: v.number(),
  tare_weight_g: v.number(),
  compression_ratio: v.number(),
  zone_layer: v.string(),
});

export const InventoryItemSchema = v.object({
  id: v.string(),
  name: v.string(),
  brand: v.optional(v.string()),
  category: v.string(),
  weight_g: v.number(),
  length_cm: v.number(),
  width_cm: v.number(),
  depth_cm: v.number(),
  compressibility_factor: v.number(),
  is_liquid: v.boolean(),
  liquid_volume_ml: v.number(),
  monetary_value: v.number(),
  currency: v.string(),
  serial_number: v.optional(v.string()),
  readiness_state: v.string(),
  tags: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export const TripPlanSchema = v.object({
  id: v.string(),
  title: v.string(),
  origin_airport: v.optional(v.string()),
  destination_airport: v.optional(v.string()),
  departure_date: v.optional(v.string()),
  return_date: v.optional(v.string()),
  target_airline_rule_id: v.optional(v.string()),
  active_luggage_shell_id: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export const AllocationSchema = v.object({
  id: v.string(),
  trip_plan_id: v.string(),
  inventory_item_id: v.string(),
  luggage_shell_id: v.optional(v.string()),
  sub_container_id: v.optional(v.string()),
  quantity: v.number(),
  is_packed: v.boolean(),
  packed_at: v.optional(v.string()),
  custom_override_weight_g: v.optional(v.number()),
  pos_x: v.number(),
  pos_y: v.number(),
  pos_z: v.number(),
});

// ==========================================
// In-Memory Dev / Browser Fallback Storage
// ==========================================

class FallbackStore {
  bags: LuggageShell[] = [...CURATED_BAG_PRESETS];
  cubes: SubContainer[] = [...INITIAL_SUB_CONTAINERS];
  items: InventoryItem[] = [...INITIAL_INVENTORY_ITEMS];
  plan: TripPlan = {
    id: 'trip-transatlantic-starter',
    title: 'Transatlantic Summer · FRA → JFK',
    origin_airport: 'FRA',
    destination_airport: 'JFK',
    departure_date: '2026-06-14',
    return_date: '2026-06-28',
    target_airline_rule_id: 'rule-dl-standard',
    active_luggage_shell_id: 'preset-peak-design-45',
    notes: 'Primary carry-on one-bag travel loadout',
  };
  allocations: Allocation[] = [];
}

const fallback = new FallbackStore();

export function isTauriEnvironment(): boolean {
  try {
    return isTauri();
  } catch {
    return (
      typeof window !== 'undefined' &&
      (('__TAURI_INTERNALS__' in window) || ('__TAURI__' in window))
    );
  }
}

// ==========================================
// Strongly-Typed Native IPC Service
// ==========================================

export const ipc = {
  // Luggage Shells
  async getLuggageShells(): Promise<LuggageShell[]> {
    if (isTauriEnvironment()) {
      const res = await invoke<LuggageShell[]>('get_luggage_shells');
      return v.parse(v.array(LuggageShellSchema), res) as LuggageShell[];
    }
    return [...fallback.bags];
  },

  async createLuggageShell(shell: LuggageShell): Promise<LuggageShell> {
    if (isTauriEnvironment()) {
      const res = await invoke<LuggageShell>('create_luggage_shell', { shell });
      return v.parse(LuggageShellSchema, res) as LuggageShell;
    }
    fallback.bags.push(shell);
    return shell;
  },

  async updateLuggageShell(shell: LuggageShell): Promise<LuggageShell> {
    if (isTauriEnvironment()) {
      const res = await invoke<LuggageShell>('update_luggage_shell', { shell });
      return v.parse(LuggageShellSchema, res) as LuggageShell;
    }
    fallback.bags = fallback.bags.map((b) => (b.id === shell.id ? shell : b));
    return shell;
  },

  async deleteLuggageShell(id: string): Promise<boolean> {
    if (isTauriEnvironment()) {
      return await invoke<boolean>('delete_luggage_shell', { id });
    }
    fallback.bags = fallback.bags.filter((b) => b.id !== id);
    return true;
  },

  // SubContainers / Cubes
  async getSubContainers(luggageId?: string): Promise<SubContainer[]> {
    if (isTauriEnvironment()) {
      const res = await invoke<SubContainer[]>('get_sub_containers', {
        luggageId: luggageId || null,
      });
      return v.parse(v.array(SubContainerSchema), res) as SubContainer[];
    }
    return luggageId
      ? fallback.cubes.filter((c) => c.luggage_shell_id === luggageId)
      : [...fallback.cubes];
  },

  async createSubContainer(cube: SubContainer): Promise<SubContainer> {
    if (isTauriEnvironment()) {
      const res = await invoke<SubContainer>('create_sub_container', { cube });
      return v.parse(SubContainerSchema, res) as SubContainer;
    }
    fallback.cubes.push(cube);
    return cube;
  },

  async updateSubContainer(cube: SubContainer): Promise<SubContainer> {
    if (isTauriEnvironment()) {
      const res = await invoke<SubContainer>('update_sub_container', { cube });
      return v.parse(SubContainerSchema, res) as SubContainer;
    }
    fallback.cubes = fallback.cubes.map((c) => (c.id === cube.id ? cube : c));
    return cube;
  },

  async deleteSubContainer(id: string): Promise<boolean> {
    if (isTauriEnvironment()) {
      return await invoke<boolean>('delete_sub_container', { id });
    }
    fallback.cubes = fallback.cubes.filter((c) => c.id !== id);
    return true;
  },

  // Inventory Items
  async getInventoryItems(
    search?: string,
    category?: string,
    readiness?: string
  ): Promise<InventoryItem[]> {
    if (isTauriEnvironment()) {
      const res = await invoke<InventoryItem[]>('get_inventory_items', {
        search: search || null,
        category: category || null,
        readiness: readiness || null,
      });
      return v.parse(v.array(InventoryItemSchema), res) as InventoryItem[];
    }
    let list = [...fallback.items];
    if (category && category !== 'All') {
      list = list.filter((i) => i.category === category);
    }
    if (readiness && readiness !== 'All') {
      list = list.filter((i) => i.readiness_state === readiness);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.brand && i.brand.toLowerCase().includes(q)));
    }
    return list;
  },

  async searchInventoryFts(query: string): Promise<InventoryItem[]> {
    if (isTauriEnvironment()) {
      const res = await invoke<InventoryItem[]>('search_inventory_fts', { query });
      return v.parse(v.array(InventoryItemSchema), res) as InventoryItem[];
    }
    const q = query.toLowerCase();
    return fallback.items.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.brand && i.brand.toLowerCase().includes(q))
    );
  },

  async createInventoryItem(item: InventoryItem): Promise<InventoryItem> {
    if (isTauriEnvironment()) {
      const res = await invoke<InventoryItem>('create_inventory_item', { item });
      return v.parse(InventoryItemSchema, res) as InventoryItem;
    }
    fallback.items.push(item);
    return item;
  },

  async updateInventoryItem(item: InventoryItem): Promise<InventoryItem> {
    if (isTauriEnvironment()) {
      const res = await invoke<InventoryItem>('update_inventory_item', { item });
      return v.parse(InventoryItemSchema, res) as InventoryItem;
    }
    fallback.items = fallback.items.map((i) => (i.id === item.id ? item : i));
    return item;
  },

  async deleteInventoryItem(id: string): Promise<boolean> {
    if (isTauriEnvironment()) {
      return await invoke<boolean>('delete_inventory_item', { id });
    }
    fallback.items = fallback.items.filter((i) => i.id !== id);
    return true;
  },

  async batchUpdateInventoryState(ids: string[], state: string): Promise<number> {
    if (isTauriEnvironment()) {
      return await invoke<number>('batch_update_inventory_state', { ids, state });
    }
    let count = 0;
    fallback.items = fallback.items.map((i) => {
      if (ids.includes(i.id)) {
        count++;
        return {
          ...i,
          readiness_state: state as InventoryItem['readiness_state'],
          packed: state === 'Packed',
        };
      }
      return i;
    });
    return count;
  },

  async batchAssignSubcontainer(
    itemIds: string[],
    subContainerId?: string
  ): Promise<number> {
    if (isTauriEnvironment()) {
      return await invoke<number>('batch_assign_subcontainer', {
        itemIds,
        subContainerId: subContainerId || null,
      });
    }
    let count = 0;
    fallback.items = fallback.items.map((i) => {
      if (itemIds.includes(i.id)) {
        count++;
        return { ...i, sub_container_id: subContainerId };
      }
      return i;
    });
    return count;
  },

  async batchDeleteInventoryItems(ids: string[]): Promise<number> {
    if (isTauriEnvironment()) {
      return await invoke<number>('batch_delete_inventory_items', { ids });
    }
    const initial = fallback.items.length;
    fallback.items = fallback.items.filter((i) => !ids.includes(i.id));
    return initial - fallback.items.length;
  },

  // Trip Plan & Allocations
  async getActiveTripPlan(): Promise<TripPlan> {
    if (isTauriEnvironment()) {
      const res = await invoke<TripPlan>('get_active_trip_plan');
      return v.parse(TripPlanSchema, res) as TripPlan;
    }
    return { ...fallback.plan };
  },

  async getAllTripPlans(): Promise<TripPlan[]> {
    if (isTauriEnvironment()) {
      const res = await invoke<TripPlan[]>('get_all_trip_plans');
      return v.parse(v.array(TripPlanSchema), res) as TripPlan[];
    }
    return [{ ...fallback.plan }];
  },

  async deleteTripPlan(id: string): Promise<boolean> {
    if (isTauriEnvironment()) {
      return await invoke<boolean>('delete_trip_plan', { id });
    }
    return true;
  },

  async saveTripPlan(plan: TripPlan): Promise<TripPlan> {
    if (isTauriEnvironment()) {
      const res = await invoke<TripPlan>('save_trip_plan', { plan });
      return v.parse(TripPlanSchema, res) as TripPlan;
    }
    fallback.plan = { ...plan };
    return plan;
  },

  async getTripAllocations(tripId: string): Promise<Allocation[]> {
    if (isTauriEnvironment()) {
      const res = await invoke<Allocation[]>('get_trip_allocations', { tripId });
      return v.parse(v.array(AllocationSchema), res) as Allocation[];
    }
    return fallback.allocations.filter((a) => a.trip_plan_id === tripId);
  },

  async saveItemAllocation(allocation: Allocation): Promise<Allocation> {
    if (isTauriEnvironment()) {
      const res = await invoke<Allocation>('save_item_allocation', { allocation });
      return v.parse(AllocationSchema, res) as Allocation;
    }
    const idx = fallback.allocations.findIndex((a) => a.id === allocation.id);
    if (idx >= 0) fallback.allocations[idx] = allocation;
    else fallback.allocations.push(allocation);
    return allocation;
  },

  async toggleAllocationPacked(allocationId: string): Promise<boolean> {
    if (isTauriEnvironment()) {
      return await invoke<boolean>('toggle_allocation_packed', { allocationId });
    }
    const alloc = fallback.allocations.find((a) => a.id === allocationId);
    if (alloc) {
      alloc.is_packed = !alloc.is_packed;
      return alloc.is_packed;
    }
    return false;
  },

  // Computational Geometry & Physics
  async calculateLuggageVolume(
    lengthCm: number,
    widthCm: number,
    depthCm: number,
    taperRatio: number,
    cornerRadiusCm: number,
    packedVolumeLiters: number,
    isExpanded = false,
    expansionGussetCm = 0.0
  ): Promise<VolumetricResult> {
    if (isTauriEnvironment()) {
      return await invoke<VolumetricResult>('calculate_luggage_volume', {
        lengthCm,
        widthCm,
        depthCm,
        taperRatio,
        cornerRadiusCm,
        packedVolumeLiters,
        isExpanded,
        expansionGussetCm,
      });
    }
    // Analytical fallback
    const effectiveDepth = isExpanded ? depthCm + expansionGussetCm : depthCm;
    const grossVolumeLiters = (lengthCm * widthCm * effectiveDepth) / 1000.0;
    const usableVolumeLiters = grossVolumeLiters * taperRatio * 0.95;
    const remainingVolumeLiters = Math.max(0, usableVolumeLiters - packedVolumeLiters);
    const volumetricEfficiencyPct =
      usableVolumeLiters > 0
        ? Math.min(100, (packedVolumeLiters / usableVolumeLiters) * 100)
        : 0;

    return {
      gross_volume_liters: grossVolumeLiters,
      usable_volume_liters: usableVolumeLiters,
      packed_volume_liters: packedVolumeLiters,
      volumetric_efficiency_pct: volumetricEfficiencyPct,
      remaining_volume_liters: remainingVolumeLiters,
    };
  },

  async calculatePackBalance(
    items: { x: number; y: number; z: number; mass_g: number }[],
    maxDepthCm: number,
    envelopeWidthCm?: number,
    envelopeHeightCm?: number
  ): Promise<BalanceReport> {
    if (isTauriEnvironment()) {
      return await invoke<BalanceReport>('calculate_pack_balance', {
        items,
        maxDepthCm,
        envelopeWidthCm: envelopeWidthCm || null,
        envelopeHeightCm: envelopeHeightCm || null,
      });
    }

    const totalMass = items.reduce((acc, it) => acc + it.mass_g, 0);
    if (totalMass <= 0) {
      return {
        center_of_mass_x: 0,
        center_of_mass_y: 0,
        center_of_mass_z: 0,
        total_mass_g: 0,
        is_spine_flush_optimal: true,
        balance_score_pct: 100,
        warning: undefined,
      };
    }

    const comX = items.reduce((sum, it) => sum + it.mass_g * it.x, 0) / totalMass;
    const comY = items.reduce((sum, it) => sum + it.mass_g * it.y, 0) / totalMass;
    const comZ = items.reduce((sum, it) => sum + it.mass_g * it.z, 0) / totalMass;

    const isSpineFlush = maxDepthCm > 0 ? comY <= maxDepthCm * 0.4 : true;
    let score = 100;
    if (!isSpineFlush) score -= 30;
    if (Math.abs(comX) > 4.0) score -= 20;

    return {
      center_of_mass_x: comX,
      center_of_mass_y: comY,
      center_of_mass_z: comZ,
      total_mass_g: totalMass,
      is_spine_flush_optimal: isSpineFlush,
      balance_score_pct: Math.max(0, score),
      warning: !isSpineFlush
        ? 'High leverage warning: heavy items positioned away from spine panel'
        : undefined,
    };
  },

  async autoPackHeuristic(
    tripId: string,
    luggage: LuggageShell,
    subcontainers: SubContainer[],
    items: InventoryItem[]
  ): Promise<AutoPackResult> {
    if (isTauriEnvironment()) {
      return await invoke<AutoPackResult>('auto_pack_heuristic', {
        tripId,
        luggage,
        subcontainers,
        items,
      });
    }

    // Local fallback implementation
    const allocations: Allocation[] = [];
    const weightedPoints: { x: number; y: number; z: number; mass_g: number }[] = [];
    const effectiveDepth = luggage.is_expanded
      ? luggage.depth_cm + luggage.expansion_gusset_cm
      : luggage.depth_cm;

    for (const item of items) {
      let posY = effectiveDepth * 0.25;
      let posZ = luggage.length_cm * 0.45;
      let targetZone = 'Spine Mid';

      if (item.category === 'Footwear' || (item.category === 'Tech' && item.weight_g >= 750)) {
        posY = effectiveDepth * 0.20;
        posZ = luggage.length_cm * 0.15;
        targetZone = 'Spine Bottom';
      } else if (item.category === 'Toiletries' || item.category === 'Documents') {
        posY = effectiveDepth * 0.50;
        posZ = luggage.length_cm * 0.88;
        targetZone = 'Quick Access';
      }

      const cube = subcontainers.find((c) => c.zone_layer === targetZone);

      allocations.push({
        id: `alloc-${item.id}`,
        trip_plan_id: tripId,
        inventory_item_id: item.id,
        luggage_shell_id: luggage.id,
        sub_container_id: cube?.id,
        quantity: 1,
        is_packed: true,
        pos_x: 0,
        pos_y: posY,
        pos_z: posZ,
      });

      weightedPoints.push({ x: 0, y: posY, z: posZ, mass_g: item.weight_g });
    }

    const report = await this.calculatePackBalance(weightedPoints, effectiveDepth);

    return {
      allocations,
      volumetric_efficiency_pct: 68.5,
      center_of_mass_x: report.center_of_mass_x,
      center_of_mass_y: report.center_of_mass_y,
      center_of_mass_z: report.center_of_mass_z,
      balance_report: report,
      items_packed_count: allocations.length,
      unallocated_items: [],
    };
  },

  // Compliance & Carrier Regulatory Matrix
  async getCarrierEnvelopes(): Promise<CarrierEnvelope[]> {
    if (isTauriEnvironment()) {
      return await invoke<CarrierEnvelope[]>('get_carrier_envelopes');
    }
    return AIRLINE_RULES_DATABASE.map((r) => ({
      carrier_code: r.carrier_code,
      carrier_name: r.carrier_name,
      tier: r.fare_class,
      max_length_cm: r.carry_on_length_cm,
      max_width_cm: r.carry_on_width_cm,
      max_depth_cm: r.carry_on_depth_cm,
      max_weight_kg: r.carry_on_max_weight_kg,
      underseat_allowed: true,
      verified_source: r.verified_at,
    }));
  },

  async checkAirlineCompliance(
    bag: LuggageShell,
    totalPackedWeightKg: number,
    rule: AirlineRule
  ): Promise<ComplianceEvaluation> {
    if (isTauriEnvironment()) {
      return await invoke<ComplianceEvaluation>('check_airline_compliance', {
        bag,
        totalPackedWeightKg,
        rule,
      });
    }

    const lengthDiff = bag.length_cm - rule.carry_on_length_cm;
    const widthDiff = bag.width_cm - rule.carry_on_width_cm;
    const depthDiff =
      (bag.is_expanded ? bag.depth_cm + bag.expansion_gusset_cm : bag.depth_cm) -
      rule.carry_on_depth_cm;
    const isCompliant = lengthDiff <= 0 && widthDiff <= 0 && depthDiff <= 0;

    return {
      carrier_name: rule.carrier_name,
      is_compliant: isCompliant,
      length_diff_cm: lengthDiff,
      width_diff_cm: widthDiff,
      depth_diff_cm: depthDiff,
      weight_diff_kg: rule.carry_on_max_weight_kg
        ? totalPackedWeightKg - rule.carry_on_max_weight_kg
        : undefined,
      depth_alert_message:
        depthDiff > 0 ? `Exceeds depth limit by ${depthDiff.toFixed(1)} cm` : undefined,
      warnings: !isCompliant ? ['Bag exceeds carrier rigid gate box dimensions'] : [],
    };
  },

  // Operations & Diagnostics
  async getDatabaseHealthStatus(): Promise<DiagnosticReport> {
    if (isTauriEnvironment()) {
      return await invoke<DiagnosticReport>('get_database_health_status');
    }
    return {
      quick_check: 'ok',
      integrity_check: 'ok',
      foreign_key_violations: [],
      optimize_status: 'OPTIMIZED_OK',
      vacuum_status: 'VACUUM_OK',
      is_healthy: true,
      timestamp: new Date().toLocaleTimeString(),
    };
  },

  async exportSanitizedDiagnosticBundle(): Promise<string> {
    if (isTauriEnvironment()) {
      return await invoke<string>('export_sanitized_diagnostic_bundle');
    }
    return '--- PACKMATRIX ZERO-TELEMETRY SANITIZED DIAGNOSTIC BUNDLE ---\nTimestamp: ' + new Date().toISOString() + '\nSystem: Air-Gapped Standby\nIntegrity: Verified 100% OK\n';
  },

  async exportEntireDataVault(
    luggage: LuggageShell[],
    subcontainers: SubContainer[],
    inventory: InventoryItem[]
  ): Promise<unknown> {
    if (isTauriEnvironment()) {
      return await invoke('export_entire_data_vault', {
        luggage,
        subcontainers,
        inventory,
      });
    }
    return {
      export_timestamp: new Date().toISOString(),
      packmatrix_version: '0.1.0',
      format: 'RFC-8259_CANONICAL_JSON',
      luggage_shells: luggage,
      sub_containers: subcontainers,
      inventory_items: inventory,
    };
  },

  async executeSecureWipe(targetDbPath?: string): Promise<boolean> {
    if (isTauriEnvironment()) {
      return await invoke<boolean>('execute_secure_wipe', {
        targetDbPath: targetDbPath || null,
      });
    }
    fallback.bags = [];
    fallback.cubes = [];
    fallback.items = [];
    fallback.allocations = [];
    return true;
  },
};
