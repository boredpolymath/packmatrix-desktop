import type { LuggageShell, InventoryItem, SubContainer } from '../types';

/**
 * Deep freezes an object to prevent Prototype Pollution attacks
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Prevent prototype pollution via dangerous keys
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  for (const key of Object.getOwnPropertyNames(obj)) {
    if (dangerousKeys.includes(key)) {
      delete (obj as any)[key];
      continue;
    }
    const val = (obj as any)[key];
    if (val && typeof val === 'object') {
      deepFreeze(val);
    }
  }

  return Object.freeze(obj);
}

/**
 * Runtime schema validator for LuggageShell payload
 */
export function validateLuggageShell(data: unknown): LuggageShell {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid luggage shell: expected object');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== 'string' || !obj.id) throw new Error('LuggageShell id must be non-empty string');
  if (typeof obj.name !== 'string' || !obj.name) throw new Error('LuggageShell name must be non-empty string');
  if (typeof obj.length_cm !== 'number' || obj.length_cm <= 0) throw new Error('LuggageShell length_cm must be positive number');
  if (typeof obj.width_cm !== 'number' || obj.width_cm <= 0) throw new Error('LuggageShell width_cm must be positive number');
  if (typeof obj.depth_cm !== 'number' || obj.depth_cm <= 0) throw new Error('LuggageShell depth_cm must be positive number');
  if (typeof obj.tare_weight_g !== 'number' || obj.tare_weight_g < 0) throw new Error('LuggageShell tare_weight_g must be non-negative number');
  if (typeof obj.nominal_volume_l !== 'number' || obj.nominal_volume_l <= 0) throw new Error('LuggageShell nominal_volume_l must be positive number');

  return {
    id: obj.id,
    name: obj.name,
    brand: typeof obj.brand === 'string' ? obj.brand : undefined,
    length_cm: obj.length_cm,
    width_cm: obj.width_cm,
    depth_cm: obj.depth_cm,
    tare_weight_g: obj.tare_weight_g,
    nominal_volume_l: obj.nominal_volume_l,
    expansion_gusset_cm: typeof obj.expansion_gusset_cm === 'number' ? obj.expansion_gusset_cm : 0,
    is_expanded: Boolean(obj.is_expanded),
    corner_radius_cm: typeof obj.corner_radius_cm === 'number' ? obj.corner_radius_cm : 0,
    taper_ratio: typeof obj.taper_ratio === 'number' ? obj.taper_ratio : 1.0,
  };
}

/**
 * Runtime schema validator for InventoryItem payload
 */
export function validateInventoryItem(data: unknown): InventoryItem {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid inventory item: expected object');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== 'string' || !obj.id) throw new Error('InventoryItem id must be non-empty string');
  if (typeof obj.name !== 'string' || !obj.name) throw new Error('InventoryItem name must be non-empty string');
  if (typeof obj.weight_g !== 'number' || obj.weight_g < 0) throw new Error('InventoryItem weight_g must be non-negative number');

  return {
    id: obj.id,
    name: obj.name,
    brand: typeof obj.brand === 'string' ? obj.brand : undefined,
    category: (obj.category as any) || 'Misc',
    weight_g: obj.weight_g,
    length_cm: typeof obj.length_cm === 'number' ? obj.length_cm : 10,
    width_cm: typeof obj.width_cm === 'number' ? obj.width_cm : 10,
    depth_cm: typeof obj.depth_cm === 'number' ? obj.depth_cm : 2,
    compressibility_factor: typeof obj.compressibility_factor === 'number' ? obj.compressibility_factor : 1.0,
    is_liquid: Boolean(obj.is_liquid),
    liquid_volume_ml: typeof obj.liquid_volume_ml === 'number' ? obj.liquid_volume_ml : 0,
    monetary_value: typeof obj.monetary_value === 'number' ? obj.monetary_value : 0,
    currency: typeof obj.currency === 'string' ? obj.currency : 'USD',
    serial_number: typeof obj.serial_number === 'string' ? obj.serial_number : undefined,
    readiness_state: (obj.readiness_state as any) || 'In Closet',
    tags: typeof obj.tags === 'string' ? obj.tags : undefined,
    notes: typeof obj.notes === 'string' ? obj.notes : undefined,
    sub_container_id: typeof obj.sub_container_id === 'string' ? obj.sub_container_id : undefined,
    pos_x: typeof obj.pos_x === 'number' ? obj.pos_x : 0,
    pos_y: typeof obj.pos_y === 'number' ? obj.pos_y : 5,
    pos_z: typeof obj.pos_z === 'number' ? obj.pos_z : 20,
    packed: Boolean(obj.packed),
    is_battery: Boolean(obj.is_battery),
    battery_wh: typeof obj.battery_wh === 'number' ? obj.battery_wh : undefined,
    is_spare_cell: Boolean(obj.is_spare_cell),
  };
}

/**
 * Runtime schema validator for SubContainer payload
 */
export function validateSubContainer(data: unknown): SubContainer {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid sub-container: expected object');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== 'string' || !obj.id) throw new Error('SubContainer id must be non-empty string');
  if (typeof obj.name !== 'string' || !obj.name) throw new Error('SubContainer name must be non-empty string');

  return {
    id: obj.id,
    luggage_shell_id: typeof obj.luggage_shell_id === 'string' ? obj.luggage_shell_id : undefined,
    parent_sub_container_id: typeof obj.parent_sub_container_id === 'string' ? obj.parent_sub_container_id : undefined,
    name: obj.name,
    container_type: (obj.container_type as any) || 'cube',
    length_cm: typeof obj.length_cm === 'number' ? obj.length_cm : 20,
    width_cm: typeof obj.width_cm === 'number' ? obj.width_cm : 15,
    depth_cm: typeof obj.depth_cm === 'number' ? obj.depth_cm : 8,
    max_volume_l: typeof obj.max_volume_l === 'number' ? obj.max_volume_l : 2.5,
    tare_weight_g: typeof obj.tare_weight_g === 'number' ? obj.tare_weight_g : 50,
    compression_ratio: typeof obj.compression_ratio === 'number' ? obj.compression_ratio : 1.0,
    zone_layer: (obj.zone_layer as any) || 'Spine Mid',
  };
}

/**
 * Runtime schema validator for Full Backup Restore Package
 */
export function validateBackupRestorePackage(payload: unknown): {
  luggage: LuggageShell[];
  inventory: InventoryItem[];
} {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid backup package: root must be an object');
  }
  const root = payload as Record<string, unknown>;

  if (!Array.isArray(root.luggage)) {
    throw new Error('Backup package missing luggage array');
  }
  if (!Array.isArray(root.inventory)) {
    throw new Error('Backup package missing inventory array');
  }

  const luggage = root.luggage.map(validateLuggageShell);
  const inventory = root.inventory.map(validateInventoryItem);

  return { luggage, inventory };
}
