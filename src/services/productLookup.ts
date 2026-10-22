import type { CatalogProduct, CatalogBag, ItemCategory } from '../types';
import { CURATED_PRODUCT_CATALOG } from '../data/productCatalog';
import { CURATED_BAG_CATALOG } from '../data/bagCatalog';

let upcItemDbApiKeyMemory = '';

/**
 * Retrieves the user-configured UPCitemdb API user_key from in-memory storage.
 * This avoids persisting sensitive credentials in browser storage.
 */
export function getUpcItemDbApiKey(): string {
  return upcItemDbApiKeyMemory;
}

/**
 * Saves or clears the user-configured UPCitemdb API user_key in memory only.
 */
export function setUpcItemDbApiKey(key: string): void {
  const trimmed = key.trim();
  upcItemDbApiKeyMemory = trimmed ? trimmed : '';
}

/**
 * Parses arbitrary weight strings returned by UPCitemdb / retail feeds
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

/**
 * Searches the pre-seeded, local-first offline gear product catalog (0ms latency, zero network)
 */
export function searchOfflineCatalog(query: string): CatalogProduct[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  return CURATED_PRODUCT_CATALOG.filter((item) => {
    const hay = `${item.name} ${item.brand} ${item.category} ${item.tags || ''}`.toLowerCase();
    return tokens.every((token) => hay.includes(token));
  });
}

/**
 * Searches the pre-seeded, local-first offline luggage bag catalog (0ms latency, zero network)
 */
export function searchOfflineBagCatalog(query: string): CatalogBag[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  return CURATED_BAG_CATALOG.filter((bag) => {
    const hay = `${bag.name} ${bag.brand} ${bag.category} ${bag.upc || ''} ${bag.description || ''}`.toLowerCase();
    return tokens.every((token) => hay.includes(token));
  });
}

/**
 * Queries external product feeds (UPCitemdb with user key + Open Products Facts fallback)
 * Converts arbitrary retail attribute feeds into calibrated PackMatrix gear schemas.
 */
export async function searchOnlineUpcItemDb(query: string): Promise<CatalogProduct[]> {
  if (!query || !query.trim()) return [];
  const q = query.trim();
  const userKey = getUpcItemDbApiKey();
  const isBarcode = /^\d{8,14}$/.test(q);

  let upcItems: any[] = [];
  let upcErrorNotice = '';

  // 1. Try UPCitemdb if barcode or if user key is present
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (userKey) {
      headers.user_key = userKey;
      headers.key_type = '3scale';
    }

    // Free trial lookup for barcode or standard endpoint with user key
    const endpoint = isBarcode
      ? (userKey ? `https://api.upcitemdb.com/prod/v1/lookup?upc=${encodeURIComponent(q)}` : `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(q)}`)
      : `https://api.upcitemdb.com/prod/v1/search?s=${encodeURIComponent(q)}`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        upcItems = data.items;
      }
    } else {
      if (res.status === 403 && !userKey) {
        upcErrorNotice = 'UPCitemdb keyword search requires an API user_key (configurable via settings icon).';
      } else if (res.status === 429) {
        upcErrorNotice = 'UPCitemdb rate limit reached. Using Open Products Facts & offline catalog.';
      }
    }
  } catch (err) {
    // Webview CORS or offline connection
    console.warn('[PackMatrix Product Lookup] UPCitemdb direct fetch notice:', err);
    upcErrorNotice = 'UPCitemdb is restricted by origin CORS or network. Using Open Products Facts fallback.';
  }

  // 2. If UPCitemdb returned results, map and return them
  if (upcItems.length > 0) {
    return upcItems.map((it: any, idx: number): CatalogProduct => {
      const name = it.title || it.model || `Product #${idx + 1}`;
      const brand = it.brand || 'Generic';
      const weightG = parseWeightStringToGrams(it.weight || it.description);
      const [lengthCm, widthCm, depthCm] = parseDimensionStringToCm(it.dimension || it.description);
      const category = inferCategory(`${it.category || ''} ${name} ${it.description || ''}`);

      const desc = (it.description || '').toLowerCase();
      const isLiquid = category === 'Toiletries' && (desc.includes('fluid') || desc.includes('liquid') || desc.includes('ml'));
      const liquidMlMatch = desc.match(/([\d.]+)\s*(?:ml|milliliter|fl oz)/);
      const liquidMl = liquidMlMatch ? Math.min(1000, parseFloat(liquidMlMatch[1])) : isLiquid ? 100 : 0;

      const isBattery = category === 'Tech' && (desc.includes('mah') || desc.includes('lithium') || desc.includes('battery') || desc.includes('rechargeable'));
      let batteryWh = 0;
      const whMatch = desc.match(/([\d.]+)\s*wh\b/);
      if (whMatch) {
        batteryWh = parseFloat(whMatch[1]);
      } else {
        const mahMatch = desc.match(/([\d,]+)\s*mah\b/);
        if (mahMatch) {
          const mah = parseFloat(mahMatch[1].replace(/,/g, ''));
          batteryWh = Number(((mah * 3.7) / 1000.0).toFixed(1));
        }
      }

      const price = typeof it.lowest_recorded_price === 'number' && it.lowest_recorded_price > 0
        ? Math.round(it.lowest_recorded_price)
        : typeof it.highest_recorded_price === 'number' && it.highest_recorded_price > 0
        ? Math.round(it.highest_recorded_price)
        : 0;

      return {
        id: `upc-${it.upc || it.ean || Date.now()}-${idx}`,
        name,
        brand,
        category,
        weight_g: weightG,
        length_cm: lengthCm,
        width_cm: widthCm,
        depth_cm: depthCm,
        compressibility_factor: category === 'Clothing' ? 0.6 : 1.0,
        is_liquid: isLiquid,
        liquid_volume_ml: liquidMl,
        is_battery: isBattery,
        battery_wh: batteryWh,
        monetary_value: price,
        currency: 'USD',
        source: 'online_upcitemdb',
        tags: it.category ? String(it.category).split('>').pop()?.trim() : undefined,
      };
    });
  }

  // 3. Fallback: Query Open Products Facts (Open CORS with Access-Control-Allow-Origin: *)
  try {
    const opfUrl = isBarcode
      ? `https://world.openproductsfacts.org/api/v2/product/${encodeURIComponent(q)}.json`
      : `https://world.openproductsfacts.org/api/v2/search?search_terms=${encodeURIComponent(q)}&fields=code,product_name,brands,quantity,packaging_text,categories_tags_en&page_size=12`;

    const opfRes = await fetch(opfUrl, { method: 'GET', headers: { Accept: 'application/json' } });
    if (opfRes.ok) {
      const opfData = await opfRes.json();
      let rawProducts: any[] = [];
      if (isBarcode && opfData && opfData.product) {
        rawProducts = [opfData.product];
      } else if (opfData && Array.isArray(opfData.products)) {
        rawProducts = opfData.products.filter((p: any) => p && (p.product_name || p.brands));
      }

      if (rawProducts.length > 0) {
        return rawProducts.map((p: any, idx: number): CatalogProduct => {
          const name = p.product_name || `Item ${p.code || idx + 1}`;
          const brand = p.brands || 'Generic';
          const weightG = parseWeightStringToGrams(p.quantity || p.packaging_text);
          const [lengthCm, widthCm, depthCm] = parseDimensionStringToCm(p.packaging_text);
          const category = inferCategory(`${p.categories_tags_en?.join(' ') || ''} ${name}`);

          return {
            id: `opf-${p.code || Date.now()}-${idx}`,
            name,
            brand,
            category,
            weight_g: weightG,
            length_cm: lengthCm,
            width_cm: widthCm,
            depth_cm: depthCm,
            compressibility_factor: category === 'Clothing' ? 0.6 : 1.0,
            is_liquid: false,
            liquid_volume_ml: 0,
            is_battery: false,
            battery_wh: 0,
            monetary_value: 0,
            currency: 'USD',
            source: 'online_upcitemdb',
            tags: 'Open Products Facts',
          };
        });
      }
    }
  } catch (opfErr) {
    console.warn('[PackMatrix Product Lookup] Open Products Facts fetch notice:', opfErr);
  }

  // 4. Fallback to offline catalog fuzzy match if online returned empty
  const offlineFallback = searchOfflineCatalog(q);
  if (offlineFallback.length > 0) {
    return offlineFallback;
  }

  if (upcErrorNotice) {
    throw new Error(upcErrorNotice);
  }

  return [];
}

/**
 * Searches for bags online or via the offline catalog
 */
export async function searchOnlineBags(query: string): Promise<CatalogBag[]> {
  if (!query || !query.trim()) return [];
  const q = query.trim();

  // 1. Instant match in verified curated bag database
  const offlineMatches = searchOfflineBagCatalog(q);
  if (offlineMatches.length > 0) {
    return offlineMatches;
  }

  // 2. Query online UPC / Open Products Facts for bags
  try {
    const products = await searchOnlineUpcItemDb(q);
    if (products.length > 0) {
      return products.map((p): CatalogBag => {
        // Derive luggage shell geometry from product specs
        const rawVolL = (p.length_cm * p.width_cm * p.depth_cm) / 1000.0;
        return {
          id: `online-bag-${p.id}`,
          name: p.name,
          brand: p.brand,
          category: 'Backpack',
          length_cm: p.length_cm > 25 ? p.length_cm : 54.0,
          width_cm: p.width_cm > 15 ? p.width_cm : 35.0,
          depth_cm: p.depth_cm > 10 ? p.depth_cm : 22.0,
          tare_weight_g: p.weight_g > 300 ? p.weight_g : 1600,
          nominal_volume_l: rawVolL > 10 ? Math.round(rawVolL * 10) / 10 : 38.0,
          expansion_gusset_cm: 3.0,
          corner_radius_cm: 3.5,
          taper_ratio: 0.94,
          description: `Auto-derived from product catalog (${p.brand})`,
        };
      });
    }
  } catch (err) {
    console.warn('[PackMatrix Bag Lookup] Online query notice:', err);
  }

  return searchOfflineBagCatalog(q);
}
