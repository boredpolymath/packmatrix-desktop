import type { UnitSystem } from '../types';

export const CM_TO_IN = 1 / 2.54; // ~0.3937007874
export const IN_TO_CM = 2.54;

export const G_TO_OZ = 0.03527396195; // ~0.035274
export const OZ_TO_G = 28.349523125; // ~28.3495

export const G_TO_LBS = 0.00220462262; // ~0.00220462
export const LBS_TO_G = 453.59237;

export const KG_TO_LBS = 2.20462262;
export const LBS_TO_KG = 0.45359237;

/**
 * Format a single linear dimension with unit symbol (cm vs in)
 */
export function formatDim(cm: number, unitSystem: UnitSystem, precision = 1): string {
  if (unitSystem === 'imperial') {
    return `${(cm * CM_TO_IN).toFixed(precision)} in`;
  }
  return `${cm.toFixed(precision)} cm`;
}

/**
 * Format 3-dimensional bounding box (Length × Width × Depth)
 */
export function format3D(l: number, w: number, d: number, unitSystem: UnitSystem, precision = 1): string {
  if (unitSystem === 'imperial') {
    return `${(l * CM_TO_IN).toFixed(precision)} × ${(w * CM_TO_IN).toFixed(precision)} × ${(d * CM_TO_IN).toFixed(precision)} in`;
  }
  return `${l.toFixed(precision)} × ${w.toFixed(precision)} × ${d.toFixed(precision)} cm`;
}

/**
 * Format gear item weight (grams vs ounces)
 */
export function formatGearWeight(g: number, unitSystem: UnitSystem, precision = 1): string {
  if (unitSystem === 'imperial') {
    return `${(g * G_TO_OZ).toFixed(precision)} oz`;
  }
  return `${Math.round(g).toLocaleString()} g`;
}

/**
 * Format total luggage mass (kilograms vs pounds)
 */
export function formatLuggageWeight(g: number, unitSystem: UnitSystem, precision = 2): string {
  if (unitSystem === 'imperial') {
    return `${(g * G_TO_LBS).toFixed(precision)} lbs`;
  }
  return `${(g / 1000).toFixed(precision)} kg`;
}

/**
 * Format mass in kilograms or pounds directly
 */
export function formatMassKg(kg: number, unitSystem: UnitSystem, precision = 1): string {
  if (unitSystem === 'imperial') {
    return `${(kg * KG_TO_LBS).toFixed(precision)} lbs`;
  }
  return `${kg.toFixed(precision)} kg`;
}
