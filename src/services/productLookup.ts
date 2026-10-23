import type { CatalogProduct, CatalogBag, ItemCategory } from '../types';
import { CURATED_PRODUCT_CATALOG } from '../data/productCatalog';
import { CURATED_BAG_CATALOG } from '../data/bagCatalog';

/**
 * Parses arbitrary weight strings into grams.
 * Examples: "4.55 ounces", "1.5 lbs", "250 g", "0.45 kg", "16 oz" -> returns grams
 */
export function parseWeightStringToGrams(raw: string | undefined | null): number {
  if (!raw || typeof raw !== 'string') return 100;

  const clean = raw.trim().toLowerCase();

  // Match ounces (oz, ounce, ounces)
  const ozMatch = clean.match(/([\d.]+)\s*(?:ounces?|oz)/);
  if (ozMatch) {
    const oz = parseFloat(ozMatch[1]);
    if (!isNaN(oz) && oz > 0) return Math.round(oz * 28.3495);
  }

  // Match pounds (lb, lbs, pound, pounds)
  const lbMatch = clean.match(/([\d.]+)\s*(?:pounds?|lbs?)/);
  if (lbMatch) {
    const lbs = parseFloat(lbMatch[1]);
    if (!isNaN(lbs) && lbs > 0) return Math.round(lbs * 453.592);
  }

  // Match kilograms (kg, kilo, kilograms)
  const kgMatch = clean.match(/([\d.]+)\s*(?:kilograms?|kg|kilos?)/);
  if (kgMatch) {
    const kg = parseFloat(kgMatch[1]);
    if (!isNaN(kg) && kg > 0) return Math.round(kg * 1000.0);
  }

  // Match grams (g, gram, grams)
  const gMatch = clean.match(/([\d.]+)\s*(?:grams?|g\b)/);
  if (gMatch) {
    const g = parseFloat(gMatch[1]);
    if (!isNaN(g) && g > 0) return Math.round(g);
  }

  // Fallback to naked float (assume grams if > 50, otherwise pounds)
  const nakedMatch = clean.match(/([\d.]+)/);
  if (nakedMatch) {
    const val = parseFloat(nakedMatch[1]);
    if (!isNaN(val) && val > 0) {
      return val > 30 ? Math.round(val) : Math.round(val * 453.592);
    }
  }

  return 150;
}

/**
 * Parses arbitrary dimension strings into [length_cm, width_cm, depth_cm]
 * Examples: "6.1 x 2.64 x 0.27 inches", "15.5 x 8 x 2 cm", "55 x 35 x 23"
 */
export function parseDimensionStringToCm(raw: string | undefined | null): [number, number, number] {
  if (!raw || typeof raw !== 'string') return [15, 10, 4];

  const clean = raw.trim().toLowerCase();
  const isInch = clean.includes('inch') || clean.includes('in') || clean.includes('"');
  const scale = isInch ? 2.54 : 1.0;

  // Extract all numbers
  const nums = clean.match(/([\d.]+)/g);
  if (nums && nums.length >= 3) {
    const d1 = Number((parseFloat(nums[0]) * scale).toFixed(1));
    const d2 = Number((parseFloat(nums[1]) * scale).toFixed(1));
    const d3 = Number((parseFloat(nums[2]) * scale).toFixed(1));
    // Sort descending: length (largest), width (middle), depth (smallest)
    const sorted = [d1, d2, d3].sort((a, b) => b - a);
    return [sorted[0], sorted[1], sorted[2]];
  } else if (nums && nums.length === 2) {
    const d1 = Number((parseFloat(nums[0]) * scale).toFixed(1));
    const d2 = Number((parseFloat(nums[1]) * scale).toFixed(1));
    return [Math.max(d1, d2), Math.min(d1, d2), 3.0];
  }

  return [15, 10, 4];
}

/**
 * Infers PackMatrix ItemCategory from raw category/taxonomy strings or item title
 */
export function inferCategory(text: string): ItemCategory {
  const s = text.toLowerCase();
  if (
    s.includes('shoe') ||
    s.includes('boot') ||
    s.includes('sandal') ||
    s.includes('sneaker') ||
    s.includes('footwear')
  ) {
    return 'Footwear';
  }
  if (
    s.includes('shampoo') ||
    s.includes('soap') ||
    s.includes('toiletr') ||
    s.includes('toothpaste') ||
    s.includes('lotion') ||
    s.includes('shaver') ||
    s.includes('razor') ||
    s.includes('cosmetic')
  ) {
    return 'Toiletries';
  }
  if (
    s.includes('shirt') ||
    s.includes('pant') ||
    s.includes('jacket') ||
    s.includes('hoody') ||
    s.includes('hoodie') ||
    s.includes('sock') ||
    s.includes('underwear') ||
    s.includes('clothing') ||
    s.includes('apparel')
  ) {
    return 'Clothing';
  }
  if (
    s.includes('passport') ||
    s.includes('ticket') ||
    s.includes('document') ||
    s.includes('visa')
  ) {
    return 'Documents';
  }
  if (
    s.includes('laptop') ||
    s.includes('phone') ||
    s.includes('headphone') ||
    s.includes('earbud') ||
    s.includes('charger') ||
    s.includes('battery') ||
    s.includes('powerbank') ||
    s.includes('camera') ||
    s.includes('tablet') ||
    s.includes('electronic') ||
    s.includes('tech')
  ) {
    return 'Tech';
  }
  return 'Misc';
}

const KNOWN_BAG_BRANDS = [
  'Samsonite', 'Away', 'Rimowa', 'Travelpro', 'Monos', 'Tumi', 'Briggs & Riley',
  'Patagonia', 'Osprey', 'Peak Design', 'Aer', 'Nomatic', 'Bellroy', 'Cotopaxi',
  'Tom Bihn', 'Tortuga', 'CabinZero', 'Delsey', 'Beis', 'Calpak', 'July',
  'Thule', 'Herschel', 'Mystery Ranch', 'GoRuck', 'Wandrd', 'Matador', 'Lululemon',
  'The North Face', 'Gregory', 'Deuter', 'Eastpak', 'JanSport', 'Victorinox',
  'American Tourister', 'Eagle Creek', 'Dagne Dover', 'Baboon to the Moon',
  'Evergoods', 'Minaal'
];

const KNOWN_GEAR_BRANDS = [
  'Apple', 'Sony', 'Bose', 'Anker', 'Kindle', 'Amazon', 'Logitech', 'Nintendo',
  'Valve', 'Steam', 'Samsung', 'Google', 'Dell', 'Lenovo', 'Asus', 'GoPro',
  'DJI', 'Fujifilm', 'Canon', 'Nikon', 'Patagonia', 'Arc\'teryx', 'Icebreaker',
  'Smartwool', 'Uniqlo', 'Lululemon', 'Nike', 'Hoka', 'On Running', 'Birkenstock',
  'Chaco', 'Teva', 'Vivobarefoot', 'Allbirds', 'Philips', 'Oral-B', 'Colgate',
  'Crest', 'Dove', 'Nivea', 'La Roche-Posay', 'Aesop', 'Matador', 'Sea to Summit',
  'Nalgene', 'Hydro Flask', 'Yeti', 'Stanley', 'Trtl', 'Cabeau', 'Peak Design',
  'Bellroy', 'Aer', 'Darn Tough', 'Western Rise', 'Osprey'
];

/**
 * Intelligent Real-World Bag Specification Extrapolator.
 * When a user types ANY arbitrary brand, model, volume, or dimensions,
 * this engine derives realistic physical luggage geometry (L × W × D, tare mass, volume in L,
 * gusset expansion, bevel radius, and taper ratio) without requiring manual measurement.
 */
export function autoInferBagSpecs(query: string): CatalogBag | null {
  if (!query || query.trim().length < 3) return null;
  const q = query.trim();
  const lower = q.toLowerCase();

  // If query is just a luggage brand name or prefix, DO NOT generate a generic item named after the brand.
  // The user should see the menu of models under that brand heading.
  const isPureBrand = KNOWN_BAG_BRANDS.some(
    (b) => b.toLowerCase() === lower || (lower.length >= 3 && b.toLowerCase().startsWith(lower) && !lower.includes(' '))
  );
  if (isPureBrand) return null;

  // Detect brand
  let detectedBrand = 'Custom';
  for (const b of KNOWN_BAG_BRANDS) {
    if (lower.includes(b.toLowerCase())) {
      detectedBrand = b;
      break;
    }
  }

  // Detect category
  let category: 'Backpack' | 'Roller' | 'Duffel' | 'Tote / Underseat' = 'Backpack';
  if (
    lower.includes('roller') ||
    lower.includes('spinner') ||
    lower.includes('suitcase') ||
    lower.includes('hardside') ||
    lower.includes('wheel') ||
    lower.includes('luggage') ||
    lower.includes('cabin') ||
    lower.includes('trunk') ||
    lower.includes('upright')
  ) {
    category = 'Roller';
  } else if (lower.includes('duffel') || lower.includes('duffle') || lower.includes('holdall')) {
    category = 'Duffel';
  } else if (lower.includes('tote') || lower.includes('underseat') || lower.includes('sling') || lower.includes('briefcase')) {
    category = 'Tote / Underseat';
  }

  // Detect explicit Liters (e.g. 40L, 45 L, 35-liter)
  let volumeL = category === 'Roller' ? 38.0 : category === 'Duffel' ? 45.0 : category === 'Tote / Underseat' ? 20.0 : 32.0;
  const volMatch = lower.match(/(\d{1,2}(?:\.\d)?)\s*(?:l\b|liter|litres?)/);
  if (volMatch) {
    const parsed = parseFloat(volMatch[1]);
    if (parsed >= 5 && parsed <= 120) {
      volumeL = parsed;
    }
  }

  // Detect explicit dimensions if typed (e.g. 55x40x20 or 21x14x9)
  const [parsedL, parsedW, parsedD] = parseDimensionStringToCm(q);
  const hasTypedDims = q.match(/(\d{1,2})\s*[x×*]\s*(\d{1,2})/);

  let lengthCm = 54.0;
  let widthCm = 35.0;
  let depthCm = 22.0;
  let tareG = 1600;

  if (hasTypedDims && parsedL > 25) {
    lengthCm = parsedL;
    widthCm = parsedW;
    depthCm = parsedD;
  } else {
    // Derive realistic dimensions from volume and category
    if (category === 'Roller') {
      if (volumeL >= 42) {
        lengthCm = 56.0; widthCm = 37.0; depthCm = 24.0; tareG = 3400;
      } else if (volumeL <= 34) {
        lengthCm = 53.0; widthCm = 35.0; depthCm = 20.0; tareG = 2900;
      } else {
        lengthCm = 55.0; widthCm = 36.0; depthCm = 23.0; tareG = 3200;
      }
    } else if (category === 'Duffel') {
      if (volumeL >= 50) {
        lengthCm = 58.0; widthCm = 34.0; depthCm = 28.0; tareG = 1200;
      } else if (volumeL <= 35) {
        lengthCm = 50.0; widthCm = 30.0; depthCm = 24.0; tareG = 950;
      } else {
        lengthCm = 53.0; widthCm = 33.0; depthCm = 25.0; tareG = 1100;
      }
    } else if (category === 'Tote / Underseat') {
      lengthCm = 42.0; widthCm = 30.0; depthCm = 18.0; tareG = 850;
    } else {
      // Backpack
      if (volumeL >= 42) {
        lengthCm = 55.0; widthCm = 35.0; depthCm = 24.0; tareG = 1950;
      } else if (volumeL <= 25) {
        lengthCm = 47.0; widthCm = 30.0; depthCm = 18.0; tareG = 1100;
      } else {
        lengthCm = 52.0; widthCm = 33.0; depthCm = 21.0; tareG = 1550;
      }
    }
  }

  const formattedTitle = q.replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: `auto-bag-${Date.now()}`,
    name: formattedTitle,
    brand: detectedBrand,
    category,
    length_cm: lengthCm,
    width_cm: widthCm,
    depth_cm: depthCm,
    tare_weight_g: tareG,
    nominal_volume_l: volumeL,
    expansion_gusset_cm: category === 'Roller' ? 3.0 : category === 'Backpack' ? 4.0 : 0,
    corner_radius_cm: category === 'Roller' ? 4.0 : 3.0,
    taper_ratio: category === 'Backpack' ? 0.94 : 0.98,
    description: `Auto-calibrated geometry: ${volumeL}L ${category} (${detectedBrand})`,
  };
}

/**
 * Intelligent Real-World Gear Product Specification Extrapolator.
 * When a user types ANY arbitrary product title, brand, or model,
 * this engine infers physical weight (in grams), dimensions (L × W × D in cm),
 * compressibility factor, liquid volume (ml), and battery rating (Wh).
 */
export function autoInferProductSpecs(query: string): CatalogProduct | null {
  if (!query || query.trim().length < 2) return null;
  const q = query.trim();
  const lower = q.toLowerCase();

  // If query is just a brand name or prefix, DO NOT generate a generic item named after the brand.
  // The user should see the menu of models under that brand heading.
  const isPureBrand = KNOWN_GEAR_BRANDS.some(
    (b) => b.toLowerCase() === lower || (lower.length >= 3 && b.toLowerCase().startsWith(lower) && !lower.includes(' '))
  );
  if (isPureBrand) return null;

  // Detect brand
  let detectedBrand = 'Generic';
  for (const b of KNOWN_GEAR_BRANDS) {
    if (lower.includes(b.toLowerCase())) {
      detectedBrand = b;
      break;
    }
  }

  const category = inferCategory(lower);

  // Detect liquids
  const isLiquid =
    category === 'Toiletries' ||
    lower.includes('liquid') ||
    lower.includes('shampoo') ||
    lower.includes('lotion') ||
    lower.includes('soap') ||
    lower.includes('sunscreen') ||
    lower.includes('perfume') ||
    lower.includes('paste');
  let liquidMl = 0;
  const mlMatch = lower.match(/(\d+)\s*(?:ml|fl\s*oz)/);
  if (mlMatch) {
    liquidMl = parseInt(mlMatch[1], 10);
  } else if (isLiquid) {
    liquidMl = 75;
  }

  // Detect battery
  const isBattery =
    category === 'Tech' ||
    lower.includes('battery') ||
    lower.includes('charger') ||
    lower.includes('powerbank') ||
    lower.includes('phone') ||
    lower.includes('laptop') ||
    lower.includes('tablet') ||
    lower.includes('headphone') ||
    lower.includes('camera');
  let batteryWh = 0;
  const mahMatch = lower.match(/(\d+)\s*mah/);
  if (mahMatch) {
    const mah = parseInt(mahMatch[1], 10);
    batteryWh = Number(((mah * 3.7) / 1000.0).toFixed(1));
  } else if (isBattery) {
    if (lower.includes('laptop')) batteryWh = 70.0;
    else if (lower.includes('tablet')) batteryWh = 30.0;
    else if (lower.includes('phone')) batteryWh = 14.0;
    else if (lower.includes('powerbank') || lower.includes('power bank')) batteryWh = 37.0;
    else if (lower.includes('headphone')) batteryWh = 4.0;
    else batteryWh = 10.0;
  }

  let weightG = 250;
  let lengthCm = 16.0;
  let widthCm = 10.0;
  let depthCm = 4.0;
  let compFactor = 1.0;
  let monetaryValue = 49;

  if (category === 'Footwear') {
    weightG = lower.includes('sandal') || lower.includes('flip') ? 450 : 680;
    lengthCm = 31.0; widthCm = 22.0; depthCm = 12.0;
    compFactor = 0.85;
    monetaryValue = 130;
  } else if (category === 'Clothing') {
    if (lower.includes('jacket') || lower.includes('hoodie') || lower.includes('puffer')) {
      weightG = 420; lengthCm = 28.0; widthCm = 20.0; depthCm = 7.0; compFactor = 0.45; monetaryValue = 199;
    } else if (lower.includes('pant') || lower.includes('jean')) {
      weightG = 380; lengthCm = 26.0; widthCm = 18.0; depthCm = 5.0; compFactor = 0.6; monetaryValue = 98;
    } else if (lower.includes('sock') || lower.includes('underwear')) {
      weightG = 65; lengthCm = 14.0; widthCm = 8.0; depthCm = 3.0; compFactor = 0.5; monetaryValue = 24;
    } else {
      weightG = 160; lengthCm = 22.0; widthCm = 16.0; depthCm = 3.5; compFactor = 0.55; monetaryValue = 45;
    }
  } else if (category === 'Toiletries') {
    weightG = isLiquid ? Math.round(liquidMl * 1.15) + 30 : 95;
    lengthCm = 15.0; widthCm = 5.0; depthCm = 4.0;
    compFactor = 1.0;
    monetaryValue = 18;
  } else if (category === 'Tech') {
    if (lower.includes('laptop') || lower.includes('macbook')) {
      weightG = 1600; lengthCm = 31.5; widthCm = 22.5; depthCm = 1.6; monetaryValue = 1499;
    } else if (lower.includes('tablet') || lower.includes('ipad')) {
      weightG = 480; lengthCm = 25.0; widthCm = 18.0; depthCm = 0.7; monetaryValue = 599;
    } else if (lower.includes('phone') || lower.includes('iphone')) {
      weightG = 200; lengthCm = 15.5; widthCm = 7.8; depthCm = 0.9; monetaryValue = 899;
    } else if (lower.includes('headphone')) {
      weightG = 250; lengthCm = 20.0; widthCm = 18.0; depthCm = 7.0; monetaryValue = 349;
    } else if (lower.includes('earbud') || lower.includes('airpod')) {
      weightG = 55; lengthCm = 6.0; widthCm = 5.0; depthCm = 2.4; monetaryValue = 199;
    } else if (lower.includes('powerbank') || lower.includes('power bank') || lower.includes('battery')) {
      weightG = 380; lengthCm = 15.0; widthCm = 6.0; depthCm = 3.0; monetaryValue = 69;
    } else if (lower.includes('charger') || lower.includes('adapter')) {
      weightG = 140; lengthCm = 8.0; widthCm = 5.0; depthCm = 3.0; monetaryValue = 45;
    } else if (lower.includes('kindle') || lower.includes('e-reader')) {
      weightG = 205; lengthCm = 17.4; widthCm = 12.5; depthCm = 0.8; monetaryValue = 149;
    } else if (lower.includes('camera')) {
      weightG = 650; lengthCm = 13.0; widthCm = 10.0; depthCm = 8.0; monetaryValue = 1899;
    } else {
      weightG = 200; lengthCm = 14.0; widthCm = 8.0; depthCm = 3.0; monetaryValue = 79;
    }
  } else if (category === 'Documents') {
    weightG = 45; lengthCm = 14.0; widthCm = 10.0; depthCm = 0.5; compFactor = 0.9; monetaryValue = 0;
  }

  const formattedTitle = q.replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: `auto-prod-${Date.now()}`,
    name: formattedTitle,
    brand: detectedBrand,
    category,
    weight_g: weightG,
    length_cm: lengthCm,
    width_cm: widthCm,
    depth_cm: depthCm,
    compressibility_factor: compFactor,
    is_liquid: isLiquid,
    liquid_volume_ml: liquidMl,
    is_battery: isBattery,
    battery_wh: batteryWh,
    monetary_value: monetaryValue,
    currency: 'USD',
    source: 'offline_catalog',
    tags: `Auto-calibrated: ${category} (${detectedBrand})`,
  };
}

/**
 * Searches the pre-seeded, local-first offline gear product catalog (0ms latency, zero network).
 * Applies strict token matching to eliminate false-positive generic list drift.
 */
export function searchOfflineCatalog(query: string): CatalogProduct[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);

  const results: { item: CatalogProduct; score: number }[] = [];

  for (const item of CURATED_PRODUCT_CATALOG) {
    const nameLow = item.name.toLowerCase();
    const brandLow = item.brand.toLowerCase();
    const catLow = item.category.toLowerCase();
    const tagsLow = (item.tags || '').toLowerCase();
    const hay = `${nameLow} ${brandLow} ${catLow} ${tagsLow}`;

    let score = 0;

    // Exact brand match or prefix: highest priority so brand searches display full brand menu
    if (brandLow === q) {
      score += 150;
    } else if (brandLow.startsWith(q)) {
      score += 100;
    } else if (brandLow.includes(q)) {
      score += 50;
    }

    // Full query matches anywhere in name
    if (nameLow.includes(q)) score += 40;

    let allTokensFound = true;
    let foundCount = 0;

    for (const token of tokens) {
      if (token.length === 1) {
        // Single character: only match word initials
        const words = hay.split(/\s+/);
        if (words.some((w) => w.startsWith(token))) {
          foundCount++;
          score += 2;
        } else {
          allTokensFound = false;
        }
      } else {
        if (hay.includes(token)) {
          foundCount++;
          score += 10;
          if (nameLow.startsWith(token) || brandLow.startsWith(token)) {
            score += 15;
          }
        } else {
          allTokensFound = false;
        }
      }
    }

    if (foundCount > 0 && allTokensFound) {
      score += 20;
      results.push({ item, score });
    } else if (foundCount >= Math.ceil(tokens.length * 0.7) && score >= 20) {
      results.push({ item, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  
  // Deduplicate by ID
  const seenIds = new Set<string>();
  const catalogMatches: CatalogProduct[] = [];
  for (const r of results) {
    if (!seenIds.has(r.item.id)) {
      seenIds.add(r.item.id);
      catalogMatches.push(r.item);
    }
  }

  // If query is >= 3 chars, also include the auto-inferred real specs item
  if (q.length >= 3) {
    const inferred = autoInferProductSpecs(query);
    if (inferred) {
      const alreadyHasExact = catalogMatches.some((m) => m.name.toLowerCase() === inferred.name.toLowerCase());
      if (!alreadyHasExact) {
        if (catalogMatches.length === 0) {
          return [inferred];
        }
        return [...catalogMatches.slice(0, 10), inferred];
      }
    }
  }

  return catalogMatches.slice(0, 12);
}

/**
 * Searches the pre-seeded, local-first offline luggage bag catalog (0ms latency, zero network).
 * Applies strict token matching so searching specific brands surfaces only relevant bags.
 */
export function searchOfflineBagCatalog(query: string): CatalogBag[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);

  const results: { bag: CatalogBag; score: number }[] = [];

  for (const bag of CURATED_BAG_CATALOG) {
    const nameLow = bag.name.toLowerCase();
    const brandLow = bag.brand.toLowerCase();
    const catLow = bag.category.toLowerCase();
    const hay = `${nameLow} ${brandLow} ${catLow} ${bag.description || ''}`.toLowerCase();

    let score = 0;

    // Exact brand match or prefix: highest priority so brand searches display full brand menu
    if (brandLow === q) {
      score += 150;
    } else if (brandLow.startsWith(q)) {
      score += 100;
    } else if (brandLow.includes(q)) {
      score += 50;
    }

    if (nameLow.includes(q)) score += 40;

    let allTokensFound = true;
    let foundCount = 0;

    for (const token of tokens) {
      if (token.length === 1) {
        const words = hay.split(/\s+/);
        if (words.some((w) => w.startsWith(token))) {
          foundCount++;
          score += 2;
        } else {
          allTokensFound = false;
        }
      } else {
        if (hay.includes(token)) {
          foundCount++;
          score += 10;
          if (nameLow.startsWith(token) || brandLow.startsWith(token)) {
            score += 15;
          }
        } else {
          allTokensFound = false;
        }
      }
    }

    if (foundCount > 0 && allTokensFound) {
      score += 20;
      results.push({ bag, score });
    } else if (foundCount >= Math.ceil(tokens.length * 0.7) && score >= 20) {
      results.push({ bag, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  
  // Deduplicate by ID
  const seenIds = new Set<string>();
  const catalogMatches: CatalogBag[] = [];
  for (const r of results) {
    if (!seenIds.has(r.bag.id)) {
      seenIds.add(r.bag.id);
      catalogMatches.push(r.bag);
    }
  }

  // If query is >= 3 chars, also include the auto-inferred real bag specs
  if (q.length >= 3) {
    const inferred = autoInferBagSpecs(query);
    if (inferred) {
      const alreadyHasExact = catalogMatches.some((m) => m.name.toLowerCase() === inferred.name.toLowerCase());
      if (!alreadyHasExact) {
        if (catalogMatches.length === 0) {
          return [inferred];
        }
        return [...catalogMatches.slice(0, 10), inferred];
      }
    }
  }

  return catalogMatches.slice(0, 12);
}

/**
 * Queries the DummyJSON Public Product API (100% Free, zero key required, open CORS).
 * Provides fast, instant keyword search for electronics, personal care, apparel, footwear,
 * accessories, and bags with physical dimensions (width, height, depth) and weights.
 */
export async function searchDummyJson(query: string): Promise<CatalogProduct[]> {
  if (!query || !query.trim()) return [];
  const q = query.trim();

  try {
    const res = await fetch(`https://dummyjson.com/products/search?q=${encodeURIComponent(q)}&limit=15`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.products) && data.products.length > 0) {
        return data.products.map((p: any, idx: number): CatalogProduct => {
          const category = inferCategory(`${p.category || ''} ${p.title || ''} ${p.description || ''}`);

          // DummyJSON weights: calibrate into grams
          let weightG = 250;
          if (typeof p.weight === 'number' && p.weight > 0) {
            if (p.weight < 25) {
              weightG = Math.round(p.weight * 28.3495); // ounces to grams
            } else {
              weightG = Math.round(p.weight);
            }
          } else if (p.weight) {
            weightG = parseWeightStringToGrams(String(p.weight));
          }

          // Dimensions: width, height, depth
          let lengthCm = 15;
          let widthCm = 10;
          let depthCm = 4;
          if (p.dimensions && typeof p.dimensions === 'object') {
            const d1 = typeof p.dimensions.width === 'number' ? p.dimensions.width : 15;
            const d2 = typeof p.dimensions.height === 'number' ? p.dimensions.height : 10;
            const d3 = typeof p.dimensions.depth === 'number' ? p.dimensions.depth : 4;
            const sorted = [d1, d2, d3].sort((a, b) => b - a);
            lengthCm = Number(sorted[0].toFixed(1));
            widthCm = Number(sorted[1].toFixed(1));
            depthCm = Number(sorted[2].toFixed(1));
          }

          const desc = `${p.description || ''} ${p.title || ''}`.toLowerCase();
          const isLiquid =
            category === 'Toiletries' &&
            (desc.includes('liquid') ||
              desc.includes('lotion') ||
              desc.includes('cream') ||
              desc.includes('serum') ||
              desc.includes('oil') ||
              desc.includes('fragrance') ||
              desc.includes('perfume') ||
              desc.includes('shampoo'));

          const isBattery =
            category === 'Tech' &&
            (desc.includes('laptop') ||
              desc.includes('phone') ||
              desc.includes('battery') ||
              desc.includes('rechargeable') ||
              desc.includes('watch') ||
              desc.includes('tablet') ||
              desc.includes('headphone') ||
              desc.includes('airpods'));

          return {
            id: `dummy-${p.id}-${idx}`,
            name: p.title || `Product #${p.id}`,
            brand: p.brand || 'Generic',
            category,
            weight_g: weightG,
            length_cm: lengthCm,
            width_cm: widthCm,
            depth_cm: depthCm,
            compressibility_factor: category === 'Clothing' ? 0.6 : 1.0,
            is_liquid: isLiquid,
            liquid_volume_ml: isLiquid ? 100 : 0,
            is_battery: isBattery,
            battery_wh: isBattery ? (category === 'Tech' && desc.includes('laptop') ? 70 : 15) : 0,
            monetary_value: Math.round(p.price || 0),
            currency: 'USD',
            source: 'online_retail',
            tags: Array.isArray(p.tags) ? p.tags.join(', ') : p.category,
            thumbnail: p.thumbnail || (Array.isArray(p.images) ? p.images[0] : undefined),
          };
        });
      }
    }
  } catch (err) {
    console.warn('[PackMatrix Product Lookup] DummyJSON fetch notice:', err);
  }

  return [];
}

/**
 * High-reliability consumer product search.
 * Searches live keyword retail feed (DummyJSON) with fallback to offline verified catalog.
 */
export async function searchOnlineProducts(query: string): Promise<CatalogProduct[]> {
  if (!query || !query.trim()) return [];
  const q = query.trim();

  try {
    const liveMatches = await searchDummyJson(q);
    if (liveMatches.length > 0) {
      return liveMatches;
    }
  } catch (err) {
    console.warn('[PackMatrix Product Lookup] Online search notice:', err);
  }

  return searchOfflineCatalog(q);
}

/**
 * Searches for bags online or via the offline catalog
 */
export async function searchOnlineBags(query: string): Promise<CatalogBag[]> {
  if (!query || !query.trim()) return [];
  const q = query.trim();
  return searchOfflineBagCatalog(q);
}
