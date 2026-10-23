import React, { useState, useMemo } from 'react';
import type {
  LuggageShell,
  SubContainer,
  InventoryItem,
  AirlineRule,
  UnitSystem,
  CatalogProduct,
} from '../../types';
import { DEFAULT_FALLBACK_BAG } from '../../types';
import { ProductSearchAutocomplete } from '../common/ProductSearchAutocomplete';
import {
  CM_TO_IN,
  G_TO_OZ,
  OZ_TO_G,
  G_TO_LBS,
  formatDim as formatDimUtil,
  formatMassKg,
  format3D,
} from '../../utils/units';
import {
  Luggage,
  Scale,
  Box,
  Layers,
  Laptop,
  CheckCircle2,
  Check,
  Compass,
  Clock,
  Plus,
  Printer,
  ShieldCheck,
  Glasses,
  FlaskConical,
  Footprints,
  Shirt,
  Headphones,
  FileText,
  Battery,
  X,
} from 'lucide-react';

interface Props {
  activeBag: LuggageShell;
  cubes: SubContainer[];
  items: InventoryItem[];
  airlineRule: AirlineRule;
  unitSystem: UnitSystem;
  onTogglePacked: (id: string) => void;
  onToggleExpand: () => void;
  onAutoPack?: () => void;
  onAddItem?: (item: InventoryItem) => void;
}

export const MyPackingView: React.FC<Props> = ({
  activeBag,
  cubes,
  items,
  airlineRule,
  unitSystem,
  onTogglePacked,
  onToggleExpand: _onToggleExpand,
  onAutoPack: _onAutoPack,
  onAddItem,
}) => {
  const [activeTab, setActiveTab] = useState<'Front View' | 'Balance' | 'Checklist'>('Front View');
  const [checklistFilter, setChecklistFilter] = useState<'All' | 'Unpacked' | 'Packed'>('All');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Clothing' | 'Tech' | 'Toiletries' | 'Footwear'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [displayItemWeight, setDisplayItemWeight] = useState(unitSystem === 'imperial' ? '8.8' : '250');
  const [newItemCategory, setNewItemCategory] = useState<'Tech' | 'Clothing' | 'Toiletries' | 'Footwear'>('Tech');
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<CatalogProduct | null>(null);

  const handleSelectCatalogProduct = (product: CatalogProduct) => {
    setSelectedCatalogProduct(product);
    setNewItemName(product.name);
    setNewItemCategory(product.category === 'Documents' || product.category === 'Misc' ? 'Tech' : product.category);
    setDisplayItemWeight(unitSystem === 'metric' ? product.weight_g.toString() : (product.weight_g * G_TO_OZ).toFixed(1));
  };

  const handleInstantAddProduct = (product: CatalogProduct) => {
    if (!onAddItem) return;
    const cat = (product.category === 'Documents' || product.category === 'Misc') ? 'Tech' : product.category;
    const newItem: InventoryItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: product.name,
      brand: product.brand,
      category: cat,
      weight_g: product.weight_g,
      length_cm: product.length_cm,
      width_cm: product.width_cm,
      depth_cm: product.depth_cm,
      compressibility_factor: product.compressibility_factor || (cat === 'Clothing' ? 0.6 : 1.0),
      is_liquid: product.is_liquid,
      liquid_volume_ml: product.liquid_volume_ml || 0,
      is_battery: product.is_battery,
      battery_wh: product.battery_wh || 0,
      monetary_value: product.monetary_value || 50,
      currency: 'USD',
      readiness_state: 'Packed',
      tags: product.tags || 'user-added',
      pos_x: 0,
      pos_y: 5.0,
      pos_z: 20.0,
      packed: true,
    };
    onAddItem(newItem);
    setIsAddModalOpen(false);
    setNewItemName('');
    setSelectedCatalogProduct(null);
  };

  // Defensive fallback against undefined activeBag
  const bag = activeBag || DEFAULT_FALLBACK_BAG;

  // Filter packed items
  const packedItems = useMemo(() => items.filter((i) => i.readiness_state === 'Packed' || i.packed), [items]);
  const packedGearMassG = useMemo(() => packedItems.reduce((acc, i) => acc + i.weight_g, 0), [packedItems]);
  const totalMassG = bag.tare_weight_g + packedGearMassG;

  // Effective depth with expansion gusset ($D_{\text{eff}} = D + \Delta D_{\text{gusset}}$)
  const effectiveDepthCm = bag.is_expanded
    ? bag.depth_cm + bag.expansion_gusset_cm
    : bag.depth_cm;

  // Usable volume calculation
  const rawVolL = (bag.length_cm * bag.width_cm * effectiveDepthCm) / 1000.0;
  const bevelLossL = bag.corner_radius_cm > 0
    ? ((4.0 - Math.PI) * Math.pow(bag.corner_radius_cm, 2) * effectiveDepthCm) / 1000.0
    : 0;
  const taperFactor = (1.0 + Math.max(0.5, Math.min(1.0, bag.taper_ratio))) / 2.0;
  const usableCapacityL = Math.max(0, (rawVolL - bevelLossL) * taperFactor);

  // Volume metrics
  const estimatedPackedVolL = useMemo(() => {
    const sumCm3 = packedItems.reduce((acc, it) => {
      const vol = (it.length_cm || 12) * (it.width_cm || 12) * (it.depth_cm || 4);
      const comp = it.compressibility_factor || 1.0;
      return acc + vol * comp;
    }, 0);
    return Math.max(0.5, Number((sumCm3 / 1000.0).toFixed(1)));
  }, [packedItems]);

  const volumeUtilizationPct = usableCapacityL > 0
    ? Math.min(100, Math.round((estimatedPackedVolL / usableCapacityL) * 100))
    : 0;
  const totalGrossKg = totalMassG / 1000.0;

  // Airline depth comparison
  const depthDiff = effectiveDepthCm - airlineRule.carry_on_depth_cm;

  // Category counts
  const clothingCount = items.filter((i) => i.category === 'Clothing').length;
  const techCount = items.filter((i) => i.category === 'Tech').length;
  const toiletriesCount = items.filter((i) => i.category === 'Toiletries').length;
  const footwearCount = items.filter((i) => i.category === 'Footwear').length;

  // Active subcontainers assigned to this luggage
  const activeCubes = useMemo(() => {
    return cubes.filter((c) => !c.luggage_shell_id || c.luggage_shell_id === bag.id);
  }, [cubes, bag.id]);

  const cubeMap = useMemo(() => {
    const map = new Map<string, SubContainer>();
    activeCubes.forEach((c) => map.set(c.id, c));
    return map;
  }, [activeCubes]);

  // Exhaustive compartmentalization so EVERY item in the manifest is visually represented
  const quickAccessItems = useMemo(() => {
    return packedItems.filter((it) => {
      const name = it.name.toLowerCase();
      return (
        it.category === 'Documents' ||
        it.category === 'Toiletries' ||
        it.is_liquid ||
        name.includes('passport') ||
        name.includes('wallet') ||
        name.includes('key') ||
        name.includes('glasses') ||
        name.includes('sunglasses')
      );
    });
  }, [packedItems]);

  const techItems = useMemo(() => {
    return packedItems.filter((it) => {
      if (quickAccessItems.includes(it)) return false;
      const name = it.name.toLowerCase();
      return (
        it.category === 'Tech' ||
        it.is_battery ||
        name.includes('laptop') ||
        name.includes('macbook') ||
        name.includes('ipad') ||
        name.includes('tablet') ||
        name.includes('headphone') ||
        name.includes('earbud') ||
        name.includes('charger') ||
        name.includes('cable') ||
        name.includes('camera') ||
        name.includes('kindle') ||
        name.includes('battery') ||
        name.includes('powerbank')
      );
    });
  }, [packedItems, quickAccessItems]);

  const footwearItems = useMemo(() => {
    return packedItems.filter((it) => {
      if (quickAccessItems.includes(it) || techItems.includes(it)) return false;
      const name = it.name.toLowerCase();
      return (
        it.category === 'Footwear' ||
        name.includes('shoe') ||
        name.includes('boot') ||
        name.includes('sneaker') ||
        name.includes('sandal') ||
        name.includes('runner')
      );
    });
  }, [packedItems, quickAccessItems, techItems]);

  const cubeAssignedItems = useMemo(() => {
    return packedItems.filter((it) => {
      if (quickAccessItems.includes(it) || techItems.includes(it) || footwearItems.includes(it)) return false;
      return it.sub_container_id && cubeMap.has(it.sub_container_id);
    });
  }, [packedItems, quickAccessItems, techItems, footwearItems, cubeMap]);

  const mainCavityItems = useMemo(() => {
    return packedItems.filter((it) => {
      return (
        !quickAccessItems.includes(it) &&
        !techItems.includes(it) &&
        !footwearItems.includes(it) &&
        !cubeAssignedItems.includes(it)
      );
    });
  }, [packedItems, quickAccessItems, techItems, footwearItems, cubeAssignedItems]);

  // 3D Center of Mass
  const dynamicCom = useMemo(() => {
    if (packedItems.length === 0) {
      return {
        x: 0.0,
        y: Number((effectiveDepthCm * 0.3).toFixed(1)),
        z: Number((bag.length_cm * 0.4).toFixed(1)),
        isSpineFlush: true,
        isLaterallyBalanced: true,
        isLowCenter: true,
      };
    }
    let sumX = 0, sumY = 0, sumZ = 0, totalW = 0;
    for (const it of packedItems) {
      const px = it.pos_x ?? 0;
      let py = it.pos_y;
      let pz = it.pos_z;

      // If item is assigned to a cube, derive physical coordinates from the cube's designated zone
      if (py === undefined || pz === undefined) {
        if (it.sub_container_id && cubeMap.has(it.sub_container_id)) {
          const cube = cubeMap.get(it.sub_container_id)!;
          switch (cube.zone_layer) {
            case 'Spine Bottom':
              py = effectiveDepthCm * 0.18;
              pz = bag.length_cm * 0.20;
              break;
            case 'Spine Mid':
              py = effectiveDepthCm * 0.22;
              pz = bag.length_cm * 0.50;
              break;
            case 'Spine Top':
              py = effectiveDepthCm * 0.25;
              pz = bag.length_cm * 0.78;
              break;
            case 'Outer Lid':
              py = effectiveDepthCm * 0.78;
              pz = bag.length_cm * 0.50;
              break;
            case 'Quick Access':
              py = effectiveDepthCm * 0.72;
              pz = bag.length_cm * 0.85;
              break;
            default:
              py = effectiveDepthCm * 0.30;
              pz = bag.length_cm * 0.50;
          }
        } else {
          // Heuristic default based on item category
          if (it.category === 'Tech') {
            py = effectiveDepthCm * 0.18;
            pz = bag.length_cm * 0.50;
          } else if (it.category === 'Footwear') {
            py = effectiveDepthCm * 0.25;
            pz = bag.length_cm * 0.15;
          } else if (it.is_liquid || it.category === 'Toiletries') {
            py = effectiveDepthCm * 0.65;
            pz = bag.length_cm * 0.85;
          } else {
            py = effectiveDepthCm * 0.40;
            pz = bag.length_cm * 0.50;
          }
        }
      }

      sumX += it.weight_g * px;
      sumY += it.weight_g * py;
      sumZ += it.weight_g * pz;
      totalW += it.weight_g;
    }
    const cX = Number((sumX / totalW).toFixed(1));
    const cY = Number((sumY / totalW).toFixed(1));
    const cZ = Number((sumZ / totalW).toFixed(1));
    return {
      x: cX,
      y: cY,
      z: cZ,
      isSpineFlush: cY <= effectiveDepthCm * 0.40,
      isLaterallyBalanced: Math.abs(cX) <= 0.15 * bag.width_cm,
      isLowCenter: cZ <= 0.60 * bag.length_cm,
    };
  }, [packedItems, effectiveDepthCm, bag.length_cm, bag.width_cm, cubeMap]);

  const comX = dynamicCom.x;
  const comY = dynamicCom.y;
  const comZ = dynamicCom.z;

  const formatWeight = (g: number) => {
    if (unitSystem === 'metric') return `${g.toLocaleString()} g`;
    return `${(g * 0.035274).toFixed(1)} oz`;
  };

  const getGearIcon = (it: InventoryItem) => {
    const name = it.name.toLowerCase();
    if (it.is_liquid || it.category === 'Toiletries') return <FlaskConical size={14} />;
    if (name.includes('glasses') || name.includes('sunglasses')) return <Glasses size={14} />;
    if (it.category === 'Documents' || name.includes('passport') || name.includes('ticket')) return <FileText size={14} />;
    if (it.is_battery || name.includes('battery') || name.includes('powerbank')) return <Battery size={14} />;
    if (name.includes('laptop') || name.includes('macbook')) return <Laptop size={14} />;
    if (name.includes('headphone') || name.includes('earbud') || name.includes('audio')) return <Headphones size={14} />;
    if (it.category === 'Footwear' || name.includes('shoe') || name.includes('boot') || name.includes('sneaker') || name.includes('sandal')) return <Footprints size={14} />;
    if (it.category === 'Clothing' || name.includes('shirt') || name.includes('pant') || name.includes('jacket') || name.includes('hoodie') || name.includes('sock') || name.includes('underwear')) return <Shirt size={14} />;
    return <Box size={14} />;
  };

  const renderGearCard = (it: InventoryItem) => (
    <div key={it.id} className="mockup-gear-card" title={`${it.name} (${formatWeight(it.weight_g)})`}>
      <div className="mockup-gear-left">
        <div className="mockup-gear-icon-box">
          {getGearIcon(it)}
        </div>
        <div className="mockup-gear-info">
          <span className="mockup-gear-name">{it.name}</span>
          <div className="mockup-gear-meta">
            <span>{formatWeight(it.weight_g)}</span>
            {it.length_cm && it.width_cm && (
              <span>· {unitSystem === 'metric' ? `${it.length_cm}×${it.width_cm}cm` : `${(it.length_cm * CM_TO_IN).toFixed(1)}×${(it.width_cm * CM_TO_IN).toFixed(1)}in`}</span>
            )}
            {it.is_liquid && it.liquid_volume_ml ? (
              <span className="mockup-gear-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                {it.liquid_volume_ml}ml
              </span>
            ) : null}
            {it.is_battery && it.battery_wh ? (
              <span className="mockup-gear-badge" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
                {it.battery_wh}Wh
              </span>
            ) : null}
            {it.compressibility_factor && it.compressibility_factor < 1 ? (
              <span className="mockup-gear-badge" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                {Math.round(it.compressibility_factor * 100)}% fold
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <button
        className="mockup-gear-unpack-btn"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePacked(it.id);
        }}
        title="Unpack from bag"
        aria-label={`Unpack ${it.name}`}
      >
        <X size={13} />
      </button>
    </div>
  );

  const handlePrint = () => {
    window.print();
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !onAddItem) return;

    const finalWeightG = unitSystem === 'metric' ? Math.round(Number(displayItemWeight) || 0) : Math.round((Number(displayItemWeight) || 0) * OZ_TO_G);

    const newItem: InventoryItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      brand: selectedCatalogProduct?.brand,
      category: newItemCategory,
      weight_g: finalWeightG,
      length_cm: selectedCatalogProduct?.length_cm || 20.0,
      width_cm: selectedCatalogProduct?.width_cm || 15.0,
      depth_cm: selectedCatalogProduct?.depth_cm || 5.0,
      compressibility_factor: selectedCatalogProduct?.compressibility_factor || (newItemCategory === 'Clothing' ? 0.6 : 1.0),
      is_liquid: selectedCatalogProduct?.is_liquid || false,
      liquid_volume_ml: selectedCatalogProduct?.liquid_volume_ml || 0,
      is_battery: selectedCatalogProduct?.is_battery || false,
      battery_wh: selectedCatalogProduct?.battery_wh || 0,
      monetary_value: selectedCatalogProduct?.monetary_value || 50,
      currency: 'USD',
      readiness_state: 'Packed',
      tags: selectedCatalogProduct?.tags || 'user-added',
      pos_x: 0,
      pos_y: 5.0,
      pos_z: 20.0,
      packed: true,
    };

    onAddItem(newItem);
    setIsAddModalOpen(false);
    setNewItemName('');
    setSelectedCatalogProduct(null);
  };

  return (
    <div className="mypacking-container">
      {/* 1. ACTIVE BAG TELEMETRY BANNER */}
      <section className="active-bag-card" aria-label="Active Bag Details">
        <div className="bag-primary-info">
          <div className="bag-avatar-icon" aria-hidden="true">
            <Luggage size={22} />
          </div>
          <div className="bag-detail-column">
            <span className="active-bag-pill">ACTIVE BAG</span>
            <div className="bag-title-row">
              <h2 className="bag-name">{bag.name}</h2>
              <span className="bag-dimension-tag">
                {format3D(bag.length_cm, bag.width_cm, effectiveDepthCm, unitSystem)}
              </span>
              <span className="depth-alert-badge">
                Depth Alert: {depthDiff > 0 ? `+${formatDimUtil(depthDiff, unitSystem)}` : formatDimUtil(depthDiff, unitSystem)}
              </span>
            </div>
          </div>
        </div>

        <div className="bag-metrics-group">
          {/* Volume Metric */}
          <div className="telemetry-chip" title={`Usable interior volume capacity: ${usableCapacityL.toFixed(1)} L`}>
            <div className="telemetry-chip-icon blue" aria-hidden="true">
              <Box size={18} />
            </div>
            <div className="telemetry-data">
              <div className="telemetry-header">
                <span className="telemetry-label">VOLUME</span>
                <span className="telemetry-badge-blue">{volumeUtilizationPct}%</span>
              </div>
              <div className="telemetry-value">
                <span className="telemetry-val-bold">{estimatedPackedVolL.toFixed(1)}</span>
                <span className="telemetry-val-unit"> / 42L</span>
              </div>
            </div>
          </div>

          {/* Weight Metric */}
          <div className="telemetry-chip weight" title="Total gross mass including bag tare weight">
            <div className="telemetry-chip-icon purple" aria-hidden="true">
              <Scale size={18} />
            </div>
            <div className="telemetry-data">
              <div className="telemetry-header">
                <span className="telemetry-label">WEIGHT</span>
                <span className="telemetry-badge-green">Under Limit</span>
              </div>
              <div className="telemetry-value">
                <span className="telemetry-val-bold">{unitSystem === 'metric' ? totalGrossKg.toFixed(2) : (totalMassG * G_TO_LBS).toFixed(2)}</span>
                <span className="telemetry-val-unit"> / {unitSystem === 'metric' ? '10.0 kg' : '22.0 lbs'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DUAL COLUMN WORKSPACE */}
      <div className="workspace-columns-grid">
        {/* LEFT COLUMN: Airline Envelope + Overhead Visual Map + Ergonomics */}
        <div className="left-column-stack">
          {/* Airline Envelope Card */}
          <div className="airline-envelope-card">
            <div className="envelope-header-row">
              <div className="airline-title-group">
                <CheckCircle2 size={16} className="text-green" />
                <span className="airline-name">{airlineRule.carrier_name} Cabin Envelope</span>
                <span className="status-badge-green">Compliant</span>
              </div>
            </div>

            <div className="envelope-pills-row">
              <div className="envelope-pill gray">
                <Luggage size={13} />
                <span>
                  {format3D(airlineRule.carry_on_length_cm, airlineRule.carry_on_width_cm, airlineRule.carry_on_depth_cm, unitSystem)}
                </span>
              </div>

              {airlineRule.carry_on_max_weight_kg && (
                <div className="envelope-pill purple">
                  <Scale size={13} />
                  <span>{formatMassKg(airlineRule.carry_on_max_weight_kg, unitSystem)}</span>
                </div>
              )}

              <div className="envelope-pill green">
                <Box size={13} />
                <span>
                  Personal: {format3D(airlineRule.personal_item_length_cm || 40, airlineRule.personal_item_width_cm || 30, airlineRule.personal_item_depth_cm || 15, unitSystem)}
                </span>
              </div>
            </div>

            <div className="envelope-footer-row">
              <Clock size={12} className="text-muted" />
              <span className="route-text">FRA → JFK</span>
              <span className="verified-text">· Verified 12m ago</span>
            </div>
          </div>

          {/* OVERHEAD VISUAL MAP CARD */}
          <div className="visual-map-card">
            <div className="map-card-header">
              <div className="map-icon-box" aria-hidden="true">
                <Layers size={18} />
              </div>
              <div className="map-title-meta">
                <h3 className="map-heading">OVERHEAD VISUAL MAP</h3>
                <p className="map-subheading">Front layout view of your bag, compartments, and packing cubes</p>
              </div>
            </div>

            <div className="map-controls-bar">
              <div className="view-switcher-pill-group">
                {(['Front View', 'Balance', 'Checklist'] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`switcher-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'Checklist' ? '✓ Checklist Mode' : tab === 'Front View' ? 'Front Layout' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB 1: FRONT VIEW INTERIOR SCHEMATIC BLUEPRINT */}
            {activeTab === 'Front View' && (
              <div className="schematic-blueprint-canvas">
                {packedItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-container, #e0f2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary, #0284c7)' }}>
                      <Luggage size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                        {bag.name} is Currently Empty
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        Usable volume: {usableCapacityL.toFixed(1)} L · Dimensions: {format3D(bag.length_cm, bag.width_cm, effectiveDepthCm, unitSystem)}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        background: 'var(--primary, #0284c7)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: '0.25rem',
                      }}
                    >
                      <Plus size={14} />
                      <span>Add Gear Item to Bag</span>
                    </button>
                  </div>
                ) : (
                  <div className="mockup-bag-frame">
                    {/* 1. TOP QUICK-ACCESS & TSA LIQUIDS BAY */}
                    <div className="mockup-compartment theme-amber">
                      <div className="mockup-compartment-header">
                        <div className="mockup-compartment-title-group">
                          <FlaskConical size={14} className="text-amber" />
                          <span className="mockup-compartment-title">Quick-Access &amp; TSA Liquids Bay</span>
                        </div>
                        <div className="mockup-compartment-badges">
                          <span className="badge-amber-pill">
                            {quickAccessItems.length} {quickAccessItems.length === 1 ? 'item' : 'items'}
                          </span>
                          <span className="amber-weight" style={{ fontSize: '10px' }}>
                            {formatWeight(quickAccessItems.reduce((acc, it) => acc + it.weight_g, 0))}
                          </span>
                        </div>
                      </div>
                      {quickAccessItems.length > 0 ? (
                        <div className="mockup-gear-grid">
                          {quickAccessItems.map(renderGearCard)}
                        </div>
                      ) : (
                        <div className="mockup-empty-bay">
                          <span>Quick-Access Bay is empty</span>
                          <span style={{ fontSize: '10px' }}>Passport, toiletries &amp; 3-1-1 liquids</span>
                        </div>
                      )}
                    </div>

                    {/* 2. TECH SPINE & ELECTRONICS SLEEVE */}
                    <div className="mockup-compartment theme-indigo">
                      <div className="mockup-compartment-header">
                        <div className="mockup-compartment-title-group">
                          <Laptop size={14} style={{ color: '#7e22ce' }} />
                          <span className="mockup-compartment-title">Tech Spine &amp; Electronics Sleeve</span>
                        </div>
                        <div className="mockup-compartment-badges">
                          <span className="badge-gray-pill">Flush to Spine</span>
                          <span className="badge-blue-pill">
                            {techItems.length} {techItems.length === 1 ? 'item' : 'items'}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b21a8' }}>
                            {formatWeight(techItems.reduce((acc, it) => acc + it.weight_g, 0))}
                          </span>
                        </div>
                      </div>
                      {techItems.length > 0 ? (
                        <div className="mockup-gear-grid">
                          {techItems.map(renderGearCard)}
                        </div>
                      ) : (
                        <div className="mockup-empty-bay">
                          <span>Tech Spine Sleeve is empty</span>
                          <span style={{ fontSize: '10px' }}>Laptop, tablets, chargers &amp; power banks</span>
                        </div>
                      )}
                    </div>

                    {/* 3. MAIN CAVITY & PACKING CUBES */}
                    <div className="mockup-compartment theme-blue">
                      <div className="mockup-compartment-header">
                        <div className="mockup-compartment-title-group">
                          <Layers size={14} className="text-blue" />
                          <span className="mockup-compartment-title">Main Cavity · Folded Apparel &amp; Gear</span>
                        </div>
                        <div className="mockup-compartment-badges">
                          <span className="badge-blue-pill">
                            {mainCavityItems.length + cubeAssignedItems.length} items
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1' }}>
                            {formatWeight([...mainCavityItems, ...cubeAssignedItems].reduce((acc, it) => acc + it.weight_g, 0))}
                          </span>
                        </div>
                      </div>

                      {/* Active Subcontainers / Compression Cubes */}
                      {activeCubes.map((c, idx) => {
                        const cubeItems = packedItems.filter((it) => it.sub_container_id === c.id);
                        const cubeItemsWeight = cubeItems.reduce((acc, it) => acc + it.weight_g, 0);
                        const totalCubeG = c.tare_weight_g + cubeItemsWeight;
                        const rawL = (c.length_cm * c.width_cm * c.depth_cm) / 1000.0;
                        const compL = (rawL * Math.max(0.2, Math.min(1.0, c.compression_ratio))).toFixed(1);
                        const isGreen = idx % 2 === 1;

                        return (
                          <div
                            key={c.id}
                            style={{
                              background: '#ffffff',
                              border: `1.5px solid ${isGreen ? '#bbf7d0' : '#bae6fd'}`,
                              borderRadius: '8px',
                              padding: '0.65rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.45rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className={isGreen ? 'dot-indicator green' : 'dot-indicator blue'} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: isGreen ? '#15803d' : '#0369a1' }}>
                                  {c.name}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className={isGreen ? 'badge-green-pill' : 'badge-blue-pill'}>
                                  {formatWeight(totalCubeG)} · {compL} L
                                </span>
                                <span className="badge-gray-pill">✛ {Math.round(c.compression_ratio * 100)}% comp</span>
                              </div>
                            </div>
                            {cubeItems.length > 0 ? (
                              <div className="mockup-gear-grid">
                                {cubeItems.map(renderGearCard)}
                              </div>
                            ) : (
                              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>
                                Empty container — assign items in Checklist Mode
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Loose Folded Apparel & General Cavity Items */}
                      {mainCavityItems.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: activeCubes.length > 0 ? '0.25rem' : '0' }}>
                          {activeCubes.length > 0 && (
                            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#0369a1' }}>
                              Folded Garments &amp; Cavity Gear
                            </div>
                          )}
                          <div className="mockup-gear-grid">
                            {mainCavityItems.map(renderGearCard)}
                          </div>
                        </div>
                      ) : activeCubes.length === 0 ? (
                        <div className="mockup-empty-bay">
                          <span>Main Cavity is empty</span>
                          <span style={{ fontSize: '10px' }}>Folded apparel, jackets &amp; travel gear</span>
                        </div>
                      ) : null}
                    </div>

                    {/* 4. FOOTWEAR BAY */}
                    <div className="mockup-compartment theme-slate">
                      <div className="mockup-compartment-header">
                        <div className="mockup-compartment-title-group">
                          <Footprints size={14} className="text-secondary" />
                          <span className="mockup-compartment-title">Footwear Bay (Bottom Base)</span>
                        </div>
                        <div className="mockup-compartment-badges">
                          <span className="badge-gray-pill">Spine Base</span>
                          <span className="badge-blue-pill">
                            {footwearItems.length} {footwearItems.length === 1 ? 'pair' : 'pairs'}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#334155' }}>
                            {formatWeight(footwearItems.reduce((acc, it) => acc + it.weight_g, 0))}
                          </span>
                        </div>
                      </div>
                      {footwearItems.length > 0 ? (
                        <div className="mockup-gear-grid">
                          {footwearItems.map(renderGearCard)}
                        </div>
                      ) : (
                        <div className="mockup-empty-bay">
                          <span>Footwear Bay is empty</span>
                          <span style={{ fontSize: '10px' }}>Heavy shoes &amp; boots at base for stability</span>
                        </div>
                      )}
                    </div>

                    {/* 5. FREE SPACE BUFFER (DYNAMIC CALCULATION) */}
                    <div className="schematic-teal-dashed-box">
                      <span className="buffer-tag">FREE SPACE BUFFER</span>
                      <span className="buffer-amount">
                        {Math.max(0, usableCapacityL - estimatedPackedVolL).toFixed(1)} L Available
                      </span>
                      <span className="buffer-label">
                        {usableCapacityL - estimatedPackedVolL > 0
                          ? `Ready for expansion (${((Math.max(0, usableCapacityL - estimatedPackedVolL) / usableCapacityL) * 100).toFixed(0)}% reserve)`
                          : 'Bag packed to maximum volume capacity'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 3D BALANCE & ERGONOMICS */}
            {activeTab === 'Balance' && (
              <div className="balance-canvas">
                <div className="balance-header-row">
                  <div className="balance-meta">
                    <Compass size={16} className="text-blue" />
                    <span className="balance-title">3D Ergonomic Center of Gravity Centroid</span>
                  </div>
                  <span className={dynamicCom.isSpineFlush && dynamicCom.isLaterallyBalanced && dynamicCom.isLowCenter ? "status-badge-green" : "status-badge-amber"}>
                    {dynamicCom.isSpineFlush && dynamicCom.isLaterallyBalanced && dynamicCom.isLowCenter ? "100% Balanced" : "Imbalance Detected"}
                  </span>
                </div>
                <div className="balance-isometric-frame">
                  {(() => {
                    const w = bag.width_cm || 35;
                    const d = effectiveDepthCm || 22;
                    const h = bag.length_cm || 55;
                    const isoX = 120 + ((comX / (w / 2)) * 35) - (((comY - d / 2) / d) * 20);
                    const isoY = 65 + (((comY - d / 2) / d) * 15) - (((comZ - h / 2) / h) * 30);
                    const isOptimal = dynamicCom.isSpineFlush && dynamicCom.isLaterallyBalanced && dynamicCom.isLowCenter;

                    return (
                      <svg width="240" height="130" viewBox="0 0 240 130">
                        <polygon points="120,15 180,45 120,75 60,45" fill="rgba(14, 165, 233, 0.1)" stroke="#94a3b8" strokeWidth="1.5" />
                        <polygon points="60,45 120,75 120,115 60,85" fill="rgba(14, 165, 233, 0.15)" stroke="#94a3b8" strokeWidth="1.5" />
                        <polygon points="120,75 180,45 180,85 120,115" fill="rgba(14, 165, 233, 0.2)" stroke="#94a3b8" strokeWidth="1.5" />
                        
                        {/* Dynamic Centroid Marker */}
                        <circle cx={isoX} cy={isoY} r={7} fill={isOptimal ? "#16a34a" : "#ef4444"} />
                        <circle cx={isoX} cy={isoY} r={14} fill="none" stroke={isOptimal ? "#16a34a" : "#ef4444"} strokeWidth="1.5" strokeDasharray="3,3" />
                        <text x={isoX} y={isoY + 20} textAnchor="middle" fontSize="10" fontWeight="700" fill={isOptimal ? "#166534" : "#dc2626"}>
                          Centroid ({unitSystem === 'metric' ? `${comX.toFixed(1)}, ${comY.toFixed(1)}, ${comZ.toFixed(1)} cm` : `${(comX * CM_TO_IN).toFixed(1)}, ${(comY * CM_TO_IN).toFixed(1)}, ${(comZ * CM_TO_IN).toFixed(1)} in`})
                        </text>
                      </svg>
                    );
                  })()}
                </div>
                <div className="balance-metrics-grid">
                  <div className="balance-stat-card">
                    <span className="stat-label">SPINE LEVERAGE</span>
                    <span className={`stat-val ${dynamicCom.isSpineFlush ? 'optimal' : 'warning'}`}>
                      {((comY / effectiveDepthCm) * 100).toFixed(0)}% from spine
                    </span>
                    <span className="stat-sub">
                      {dynamicCom.isSpineFlush ? 'Optimal lumbar support' : 'High leverage alert'}
                    </span>
                  </div>
                  <div className="balance-stat-card">
                    <span className="stat-label">LATERAL BALANCE</span>
                    <span className={`stat-val ${dynamicCom.isLaterallyBalanced ? 'optimal' : 'warning'}`}>
                      {unitSystem === 'metric' ? `${Math.abs(comX).toFixed(1)} cm` : `${(Math.abs(comX) * CM_TO_IN).toFixed(1)} in`} {comX >= 0 ? 'Right' : 'Left'}
                    </span>
                    <span className="stat-sub">
                      {dynamicCom.isLaterallyBalanced ? 'Zero spinal curvature' : 'Lateral strain warning'}
                    </span>
                  </div>
                  <div className="balance-stat-card">
                    <span className="stat-label">VERTICAL STABILITY</span>
                    <span className={`stat-val ${dynamicCom.isLowCenter ? 'optimal' : 'warning'}`}>
                      Z = {unitSystem === 'metric' ? `${comZ.toFixed(1)} cm` : `${(comZ * CM_TO_IN).toFixed(1)} in`}
                    </span>
                    <span className="stat-sub">
                      {dynamicCom.isLowCenter ? 'Low center of mass' : 'Top-heavy tipping risk'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TACTILE PACKING CHECKLIST MODE */}
            {activeTab === 'Checklist' && (
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--surface-card, #ffffff)', borderRadius: '12px', minHeight: '340px' }}>
                {/* Progress Summary Card */}
                <div style={{ background: 'var(--surface-dim, #f8fafc)', border: '1px solid var(--border-medium, #cbd5e1)', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} color="var(--primary, #0284c7)" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark, #0f172a)' }}>
                        Packing Readiness Progress
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary, #0284c7)' }}>
                      {packedItems.length} of {items.length} items packed ({items.length > 0 ? Math.round((packedItems.length / items.length) * 100) : 0}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-medium, #e2e8f0)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${items.length > 0 ? Math.min(100, Math.round((packedItems.length / items.length) * 100)) : 0}%`,
                        background: 'linear-gradient(90deg, #0284c7, #10b981)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11.5px', color: 'var(--text-secondary, #64748b)' }}>
                    <span>Packed Gear Mass: <strong>{formatWeight(packedGearMassG)}</strong></span>
                    <span>Bag Tare Mass: <strong>{formatWeight(bag.tare_weight_g)}</strong></span>
                    <span>Total Gross Mass: <strong style={{ color: airlineRule.carry_on_max_weight_kg && totalGrossKg > airlineRule.carry_on_max_weight_kg ? '#ef4444' : '#10b981' }}>{totalGrossKg.toFixed(2)} kg {airlineRule.carry_on_max_weight_kg ? `/ max ${airlineRule.carry_on_max_weight_kg} kg` : ''}</strong></span>
                  </div>
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {(['All', 'Unpacked', 'Packed'] as const).map((filter) => {
                    const count = filter === 'All' ? items.length : filter === 'Packed' ? packedItems.length : (items.length - packedItems.length);
                    const isActive = checklistFilter === filter;
                    return (
                      <button
                        key={filter}
                        onClick={() => setChecklistFilter(filter)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-medium, #cbd5e1)',
                          background: isActive ? 'var(--primary-container, #e0f2fe)' : 'var(--surface-dim, #f8fafc)',
                          color: isActive ? 'var(--primary, #0284c7)' : 'var(--text-secondary, #64748b)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {filter} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Items List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '380px', overflowY: 'auto' }}>
                  {items
                    .filter((it) => {
                      if (checklistFilter === 'Packed') return it.readiness_state === 'Packed';
                      if (checklistFilter === 'Unpacked') return it.readiness_state !== 'Packed';
                      return true;
                    })
                    .map((it) => {
                      const isPacked = it.readiness_state === 'Packed';
                      const cube = it.sub_container_id ? cubeMap.get(it.sub_container_id) : undefined;
                      return (
                        <div
                          key={it.id}
                          onClick={() => onTogglePacked(it.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: isPacked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-medium, #e2e8f0)',
                            background: isPacked ? 'rgba(16, 185, 129, 0.04)' : 'var(--surface, #ffffff)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
                                border: isPacked ? '1px solid #10b981' : '1px solid #94a3b8',
                                background: isPacked ? '#10b981' : '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 800,
                              }}
                            >
                              {isPacked ? '✓' : ''}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  color: isPacked ? 'var(--text-secondary, #64748b)' : 'var(--text-dark, #0f172a)',
                                  textDecoration: isPacked ? 'line-through' : 'none',
                                }}
                              >
                                {it.name}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary, #94a3b8)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span>{it.category}</span>
                                {it.brand && <span>· {it.brand}</span>}
                                {cube && (
                                  <span style={{ background: 'var(--surface-dim, #f1f5f9)', padding: '1px 5px', borderRadius: '4px', color: 'var(--text-primary)' }}>
                                    📦 {cube.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
                              {formatWeight(it.weight_g)}
                            </span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: '5px',
                                background: isPacked ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-dim, #f1f5f9)',
                                color: isPacked ? '#10b981' : '#64748b',
                              }}
                            >
                              {it.readiness_state}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {items.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No gear items added yet. Click &quot;Add Item&quot; to begin building your manifest.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ergonomics Status Bar */}
          <div className="ergonomics-status-bar">
            <div className="ergo-title-group">
              <CheckCircle2 size={16} className={dynamicCom.isSpineFlush ? "text-green" : "text-amber"} />
              <span className="ergo-title">
                {dynamicCom.isSpineFlush
                  ? 'Spine Flush Ergonomics: Heavy gear aligned along back panel'
                  : 'High Leverage Warning: Reposition dense items toward the spine panel'}
              </span>
            </div>
            <span className={dynamicCom.isSpineFlush && dynamicCom.isLaterallyBalanced ? "status-badge-green" : "status-badge-amber"}>
              {dynamicCom.isSpineFlush && dynamicCom.isLaterallyBalanced ? "100% Balanced" : "Strain Warning"}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: PACKED ITEMS CHECKLIST */}
        <div className="right-column-stack">
          <div className="packed-checklist-card">
            {/* Checklist Header */}
            <div className="checklist-header-row">
              <div className="checklist-titles">
                <h3 className="checklist-heading">Packed Items Checklist</h3>
                <span className="checklist-subheading">
                  {packedItems.length} items packed · {(packedGearMassG / 1000).toFixed(2)} kg gear total
                </span>
              </div>
              <div className="checklist-actions">
                <button
                  className="btn-add-item"
                  onClick={() => setIsAddModalOpen(true)}
                  aria-label="Add new item to checklist"
                >
                  <Plus size={14} />
                  <span>Add Item</span>
                </button>
                <button
                  className="btn-print-manifest"
                  onClick={handlePrint}
                  aria-label="Print gear manifest"
                >
                  <Printer size={14} />
                  <span>Print Manifest</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="category-filter-pills-row">
              <button
                className={`filter-pill-btn ${selectedCategory === 'All' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('All')}
              >
                All ({items.length})
              </button>
              <button
                className={`filter-pill-btn ${selectedCategory === 'Clothing' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('Clothing')}
              >
                Clothing ({clothingCount})
              </button>
              <button
                className={`filter-pill-btn ${selectedCategory === 'Tech' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('Tech')}
              >
                Tech ({techCount})
              </button>
              <button
                className={`filter-pill-btn ${selectedCategory === 'Toiletries' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('Toiletries')}
              >
                Toiletries ({toiletriesCount})
              </button>
              <button
                className={`filter-pill-btn ${selectedCategory === 'Footwear' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('Footwear')}
              >
                Footwear ({footwearCount})
              </button>
            </div>

            {/* Checklist Items Container */}
            <div className="checklist-groups-scroll-area">
              {/* GROUP 1: ELECTRONICS & WORK */}
              {(selectedCategory === 'All' || selectedCategory === 'Tech') && (
                <div className="checklist-group-section">
                  <div className="group-header-row">
                    <div className="group-title-group">
                      <Laptop size={14} className="text-blue" />
                      <span className="group-title">ELECTRONICS &amp; WORK</span>
                    </div>
                    <span className="group-total-weight">4,880 G</span>
                  </div>

                  <div className="group-items-two-column-grid">
                    {items
                      .filter((i) => i.category === 'Tech')
                      .slice(0, 4)
                      .map((item) => (
                        <div
                          key={item.id}
                          className={`checklist-item-card ${item.readiness_state === 'Packed' ? 'checked' : ''}`}
                          onClick={() => onTogglePacked(item.id)}
                          role="checkbox"
                          aria-checked={item.readiness_state === 'Packed'}
                          tabIndex={0}
                        >
                          <div className={`checkbox-box ${item.readiness_state === 'Packed' ? 'checked' : ''}`}>
                            {item.readiness_state === 'Packed' && <Check size={11} strokeWidth={3} />}
                          </div>
                          <div className="item-details">
                            <span className="item-name">{item.name}</span>
                            <span className="item-location">
                              {cubes.find((c) => c.id === item.sub_container_id)?.name || 'Laptop compartment'}
                            </span>
                          </div>
                          <span className="item-weight">{formatWeight(item.weight_g)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* GROUP 2: CLOTHING (CUBE L) */}
              {(selectedCategory === 'All' || selectedCategory === 'Clothing') && (
                <div className="checklist-group-section">
                  <div className="group-header-row">
                    <div className="group-title-group">
                      <Box size={14} className="text-blue" />
                      <span className="group-title">CLOTHING (CUBE L)</span>
                    </div>
                    <span className="group-total-weight">1,975 G</span>
                  </div>

                  <div className="group-items-two-column-grid">
                    {items
                      .filter((i) => i.category === 'Clothing')
                      .slice(0, 3)
                      .map((item) => (
                        <div
                          key={item.id}
                          className={`checklist-item-card ${item.readiness_state === 'Packed' ? 'checked' : ''}`}
                          onClick={() => onTogglePacked(item.id)}
                          role="checkbox"
                          aria-checked={item.readiness_state === 'Packed'}
                          tabIndex={0}
                        >
                          <div className={`checkbox-box ${item.readiness_state === 'Packed' ? 'checked' : ''}`}>
                            {item.readiness_state === 'Packed' && <Check size={11} strokeWidth={3} />}
                          </div>
                          <div className="item-details">
                            <span className="item-name">{item.name}</span>
                            <span className="item-location">
                              {item.id === 'item-8'
                                ? 'Pants, rolled'
                                : item.id === 'item-9'
                                ? 'Compression packed'
                                : 'Midlayer fleece'}
                            </span>
                          </div>
                          <span className="item-weight">{formatWeight(item.weight_g)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* GROUP 3: TOILETRIES & FOOTWEAR */}
              {(selectedCategory === 'All' || selectedCategory === 'Toiletries' || selectedCategory === 'Footwear') && (
                <div className="checklist-group-section">
                  <div className="group-header-row">
                    <div className="group-title-group">
                      <FlaskConical size={14} className="text-blue" />
                      <span className="group-title">TOILETRIES &amp; FOOTWEAR</span>
                    </div>
                    <span className="group-total-weight">1,770 G</span>
                  </div>

                  <div className="group-items-two-column-grid">
                    {items
                      .filter((i) => i.category === 'Toiletries' || i.category === 'Footwear')
                      .slice(0, 3)
                      .map((item) => (
                        <div
                          key={item.id}
                          className={`checklist-item-card ${item.readiness_state === 'Packed' ? 'checked' : ''}`}
                          onClick={() => onTogglePacked(item.id)}
                          role="checkbox"
                          aria-checked={item.readiness_state === 'Packed'}
                          tabIndex={0}
                        >
                          <div className={`checkbox-box ${item.readiness_state === 'Packed' ? 'checked' : ''}`}>
                            {item.readiness_state === 'Packed' && <Check size={11} strokeWidth={3} />}
                          </div>
                          <div className="item-details">
                            <span className="item-name">{item.name}</span>
                            <span className="item-location">
                              {item.category === 'Footwear'
                                ? 'Bottom base floor'
                                : item.id === 'item-16'
                                ? 'Shampoo & wash'
                                : 'Travel case'}
                            </span>
                          </div>
                          <span className="item-weight">{formatWeight(item.weight_g)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Cabin Ready Footer */}
            <div className="checklist-cabin-ready-footer">
              <ShieldCheck size={15} className="text-green" />
              <span>All items accounted for and cabin-ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ADD ITEM MODAL */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Gear Item to Checklist</h3>
              <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            
            {/* SDLC Instant Product Catalog Autocomplete (Local-First Spec Lookup) */}
            <ProductSearchAutocomplete
              onSelectProduct={handleSelectCatalogProduct}
              onInstantAddProduct={handleInstantAddProduct}
              unitSystem={unitSystem}
            />

            <form onSubmit={handleCreateItem}>
              <div className="form-group">
                <label>Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sony Wireless Earbuds"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                  >
                    <option value="Tech">Tech</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Toiletries">Toiletries</option>
                    <option value="Footwear">Footwear</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Weight ({unitSystem === 'metric' ? 'grams' : 'oz'})</label>
                  <input
                    type="number"
                    step={unitSystem === 'metric' ? '1' : '0.1'}
                    value={displayItemWeight}
                    onChange={(e) => setDisplayItemWeight(e.target.value)}
                    min="0.1"
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-confirm">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPackingView;
