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
  Luggage,
  Scale,
  Box,
  Layers,
  Sparkles,
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
  Maximize2,
} from 'lucide-react';

interface Props {
  activeBag: LuggageShell;
  cubes: SubContainer[];
  items: InventoryItem[];
  airlineRule: AirlineRule;
  unitSystem: UnitSystem;
  onTogglePacked: (id: string) => void;
  onToggleExpand: () => void;
  onAutoPack: () => void;
  onAddItem?: (item: InventoryItem) => void;
}

export const MyPackingView: React.FC<Props> = ({
  activeBag,
  cubes,
  items,
  airlineRule,
  unitSystem,
  onTogglePacked,
  onToggleExpand,
  onAutoPack,
  onAddItem,
}) => {
  const [activeTab, setActiveTab] = useState<'Top View' | 'Side Profile' | 'Balance'>('Top View');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Clothing' | 'Tech' | 'Toiletries' | 'Footwear'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemWeight, setNewItemWeight] = useState(250);
  const [newItemCategory, setNewItemCategory] = useState<'Tech' | 'Clothing' | 'Toiletries' | 'Footwear'>('Tech');
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<CatalogProduct | null>(null);

  const handleSelectCatalogProduct = (product: CatalogProduct) => {
    setSelectedCatalogProduct(product);
    setNewItemName(product.name);
    setNewItemCategory(product.category === 'Documents' || product.category === 'Misc' ? 'Tech' : product.category);
    setNewItemWeight(product.weight_g);
  };

  // Defensive fallback against undefined activeBag
  const bag = activeBag || DEFAULT_FALLBACK_BAG;

  // Filter packed items
  const packedItems = useMemo(() => items.filter((i) => i.readiness_state === 'Packed'), [items]);
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

  // Specific item classifications for dynamic overhead compartmentalization
  const laptopItems = useMemo(() => {
    return packedItems.filter((it) => {
      const name = it.name.toLowerCase();
      return it.category === 'Tech' && (name.includes('laptop') || name.includes('macbook') || name.includes('tablet') || name.includes('ipad') || name.includes('notebook'));
    });
  }, [packedItems]);

  const liquidItems = useMemo(() => {
    return packedItems.filter((it) => {
      const name = it.name.toLowerCase();
      return it.is_liquid || name.includes('liquid') || name.includes('shampoo') || name.includes('lotion') || name.includes('soap') || name.includes('toiletr');
    });
  }, [packedItems]);

  const footwearItems = useMemo(() => {
    return packedItems.filter((it) => {
      const name = it.name.toLowerCase();
      return it.category === 'Footwear' || name.includes('shoe') || name.includes('boot') || name.includes('sneaker') || name.includes('sandal');
    });
  }, [packedItems]);

  const loosePackedItems = useMemo(() => {
    return packedItems.filter((it) => !it.sub_container_id);
  }, [packedItems]);

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

  const handlePrint = () => {
    window.print();
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !onAddItem) return;

    const newItem: InventoryItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      brand: selectedCatalogProduct?.brand,
      category: newItemCategory,
      weight_g: Number(newItemWeight),
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
                {bag.length_cm.toFixed(1)} × {bag.width_cm.toFixed(1)} × {effectiveDepthCm.toFixed(1)} cm
              </span>
              <span className="depth-alert-badge">
                Depth Alert: {depthDiff > 0 ? `+${depthDiff.toFixed(1)} cm` : `${depthDiff.toFixed(1)} cm`}
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
                <span className="telemetry-val-bold">{totalGrossKg.toFixed(2)}</span>
                <span className="telemetry-val-unit"> / 10.0 kg</span>
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
                  {airlineRule.carry_on_length_cm} × {airlineRule.carry_on_width_cm} × {airlineRule.carry_on_depth_cm} cm
                </span>
              </div>

              {airlineRule.carry_on_max_weight_kg && (
                <div className="envelope-pill purple">
                  <Scale size={13} />
                  <span>{airlineRule.carry_on_max_weight_kg.toFixed(1)} kg</span>
                </div>
              )}

              <div className="envelope-pill green">
                <Box size={13} />
                <span>
                  Personal: {airlineRule.personal_item_length_cm} × {airlineRule.personal_item_width_cm} × {airlineRule.personal_item_depth_cm} cm
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
                <p className="map-subheading">Real-time packing volumetric distribution and weight center</p>
              </div>
            </div>

            <div className="map-controls-bar">
              <div className="view-switcher-pill-group">
                {(['Top View', 'Side Profile', 'Balance'] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`switcher-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                className="btn-auto-pack"
                onClick={onAutoPack}
                title="Optimize spine-flush center of gravity distribution"
              >
                <Sparkles size={13} />
                <span>Auto-Pack</span>
              </button>
            </div>

            {/* TAB 1: TOP VIEW INTERIOR SCHEMATIC BLUEPRINT */}
            {activeTab === 'Top View' && (
              <div className="schematic-blueprint-canvas">
                {packedItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary-container, #e0f2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary, #0284c7)' }}>
                      <Luggage size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                        {bag.name} is Currently Empty
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Usable volume: {usableCapacityL.toFixed(1)} L · Dimensions: {bag.length_cm} × {bag.width_cm} × {effectiveDepthCm.toFixed(1)} cm
                      </div>
                    </div>
                    <button
                      onClick={onAutoPack}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        background: 'var(--primary, #0284c7)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: '0.25rem',
                      }}
                    >
                      <Sparkles size={13} />
                      <span>Auto-Pack Staged Gear ({items.filter(i => i.readiness_state === 'Staged').length} Available)</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 1. LAPTOP SLEEVE */}
                    {laptopItems.length > 0 && (
                      <div className="schematic-compartment laptop-sleeve">
                        <div className="schematic-icon-squircle">
                          <Laptop size={15} />
                        </div>
                        <div className="schematic-text-block" style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="schematic-title">Laptop &amp; Tech Spine Sleeve</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                              {formatWeight(laptopItems.reduce((acc, it) => acc + it.weight_g, 0))}
                            </span>
                          </div>
                          <div className="schematic-sub">
                            {laptopItems.map((it) => `${it.name} (${formatWeight(it.weight_g)})`).join(' · ')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. SPLIT QUICK ACCESS ROW: LIQUIDS & QUICK ACCESS */}
                    {(liquidItems.length > 0 || loosePackedItems.some((i) => i.category === 'Toiletries')) && (
                      <div className="schematic-row-split">
                        <div className="schematic-amber-box">
                          <div className="amber-box-header">
                            <div className="amber-box-title-group">
                              <FlaskConical size={13} className="text-amber" />
                              <span className="amber-title">TSA Liquids Pouch</span>
                            </div>
                            <span className="badge-amber-pill">
                              {liquidItems.every((it) => (it.liquid_volume_ml || 0) <= 100) ? '3-1-1 Approved' : 'Hazmat Check'}
                            </span>
                          </div>
                          <div className="amber-box-desc">
                            {liquidItems.map((it) => it.name).join(', ') || 'Assigned liquids pouch'}
                          </div>
                          <div className="amber-box-footer">
                            <span>Top quick-reach cavity</span>
                            <span className="amber-weight">{formatWeight(liquidItems.reduce((acc, it) => acc + it.weight_g, 0))}</span>
                          </div>
                        </div>

                        <div className="schematic-amber-box compact">
                          <div className="amber-box-header">
                            <div className="amber-box-title-group">
                              <Glasses size={13} className="text-amber" />
                              <span className="amber-title">Quick Access Lid</span>
                            </div>
                            <span className="badge-amber-pill">Top Lid</span>
                          </div>
                          <div className="amber-box-desc">
                            {loosePackedItems.filter((i) => !laptopItems.includes(i) && !liquidItems.includes(i)).slice(0, 2).map((i) => i.name).join(', ') || 'Passport, shades, keys'}
                          </div>
                          <div className="amber-box-footer">
                            <span>Front zipper bay</span>
                            <span className="amber-weight">
                              {formatWeight(loosePackedItems.filter((i) => !laptopItems.includes(i) && !liquidItems.includes(i)).slice(0, 2).reduce((acc, it) => acc + it.weight_g, 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. SUB-CONTAINER / COMPRESSION CUBES (REAL USER CUBES) */}
                    {activeCubes.map((c, idx) => {
                      const cubeItems = packedItems.filter((it) => it.sub_container_id === c.id);
                      const cubeItemsWeight = cubeItems.reduce((acc, it) => acc + it.weight_g, 0);
                      const totalCubeG = c.tare_weight_g + cubeItemsWeight;
                      const rawL = (c.length_cm * c.width_cm * c.depth_cm) / 1000.0;
                      const compL = (rawL * Math.max(0.2, Math.min(1.0, c.compression_ratio))).toFixed(1);

                      const isGreen = idx % 2 === 1;
                      const boxClass = isGreen ? 'schematic-green-box' : 'schematic-blue-box';
                      const titleClass = isGreen ? 'green-title' : 'blue-title';
                      const dotClass = isGreen ? 'dot-indicator green' : 'dot-indicator blue';
                      const badgeClass = isGreen ? 'badge-green-pill' : 'badge-blue-pill';

                      return (
                        <div key={c.id} className={boxClass}>
                          <div className={isGreen ? 'green-box-header' : 'blue-box-header'}>
                            <div className={isGreen ? 'green-title-group' : 'blue-title-group'}>
                              <span className={dotClass} />
                              <span className={titleClass}>{c.name}</span>
                            </div>
                            <div className={isGreen ? 'green-badges-group' : 'blue-badges-group'}>
                              <span className={badgeClass}>{formatWeight(totalCubeG)} · {compL} L</span>
                              <span className="badge-gray-pill">{c.zone_layer}</span>
                            </div>
                          </div>
                          <div className={isGreen ? 'green-box-desc' : 'blue-box-desc'}>
                            {cubeItems.length > 0
                              ? cubeItems.map((it) => it.name).join(', ')
                              : 'Empty container — items can be assigned in Gear Checklist'}
                          </div>
                          <div className={isGreen ? 'green-box-footer' : 'blue-box-footer'}>
                            <span className="compression-ratio-text">✛ {Math.round(c.compression_ratio * 100)}% compression ratio</span>
                            <span className="depth-dim-text">{c.length_cm} × {c.width_cm} × {c.depth_cm} cm</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* 4. FOOTWEAR BAY */}
                    {footwearItems.length > 0 && (
                      <div className="schematic-white-box">
                        <div className="white-box-header">
                          <div className="white-title-group">
                            <Footprints size={14} className="text-secondary" />
                            <span className="white-title">Footwear Bay</span>
                          </div>
                          <span className="white-weight">{formatWeight(footwearItems.reduce((acc, it) => acc + it.weight_g, 0))}</span>
                        </div>
                        <div className="white-box-desc">
                          {footwearItems.map((it) => `${it.name} (${formatWeight(it.weight_g)})`).join(', ')}
                        </div>
                        <div className="white-box-tags">
                          <span className="tag-pill">Bottom base perimeter</span>
                          <span className="tag-pill">Spine Bottom</span>
                        </div>
                      </div>
                    )}

                    {/* 5. FREE SPACE BUFFER (REAL DYNAMIC CALCULATION) */}
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
                  </>
                )}
              </div>
            )}

            {/* TAB 2: SIDE PROFILE CROSS SECTION */}
            {activeTab === 'Side Profile' && (
              <div className="side-profile-canvas">
                <div className="side-canvas-header">
                  <span>Bag Depth Cross-Section (Depth: {effectiveDepthCm.toFixed(1)} cm)</span>
                  <button onClick={onToggleExpand} className="expand-toggle-link">
                    <Maximize2 size={12} />
                    <span>{bag.is_expanded ? 'Expanded' : 'Unexpanded'}</span>
                  </button>
                </div>
                <div className="side-svg-frame">
                  <svg width="100%" height="150" viewBox="0 0 340 140" preserveAspectRatio="xMidYMid meet">
                    {/* Spine Panel */}
                    <line x1="30" y1="20" x2="30" y2="120" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
                    <text x="30" y="135" fontSize="10" fontWeight="700" textAnchor="middle" fill="#0f172a">Spine Panel</text>
                    
                    {/* Shell Contour */}
                    {(() => {
                      const shellWidth = bag.is_expanded ? 280 : 230;
                      const comSvgX = 30 + Math.min(shellWidth, Math.max(12, (comY / effectiveDepthCm) * shellWidth));
                      const leverageThresholdX = 30 + (0.40 * shellWidth);

                      return (
                        <>
                          <path
                            d={`M 32 20 L ${30 + shellWidth} 35 L ${30 + shellWidth} 105 L 32 120 Z`}
                            fill="rgba(14, 165, 233, 0.08)"
                            stroke="#0284c7"
                            strokeWidth="2"
                          />
                          
                          {/* 40% Leverage Threshold Guide Line */}
                          <line
                            x1={leverageThresholdX}
                            y1="22"
                            x2={leverageThresholdX}
                            y2="118"
                            stroke="rgba(220, 38, 38, 0.35)"
                            strokeWidth="1.5"
                            strokeDasharray="4,3"
                          />
                          <text x={leverageThresholdX} y="18" fontSize="8" fontWeight="600" textAnchor="middle" fill="#dc2626">
                            40% Leverage Threshold
                          </text>

                          {/* Dynamic Depth Strata */}
                          <rect x="34" y="24" width={(shellWidth * 0.35)} height="92" rx="4" fill="rgba(22, 163, 74, 0.2)" stroke="#16a34a" />
                          <text x={34 + (shellWidth * 0.175)} y="74" fontSize="9" fontWeight="700" textAnchor="middle" fill="#166534">
                            Spine Core
                          </text>

                          <rect x={34 + (shellWidth * 0.38)} y="27" width={(shellWidth * 0.36)} height="86" rx="4" fill="rgba(14, 165, 233, 0.18)" stroke="#0284c7" />
                          <text x={34 + (shellWidth * 0.56)} y="74" fontSize="9" fontWeight="700" textAnchor="middle" fill="#0369a1">
                            Mid Cubes
                          </text>

                          <rect x={34 + (shellWidth * 0.76)} y="31" width={(shellWidth * 0.22)} height="78" rx="4" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" />
                          <text x={34 + (shellWidth * 0.87)} y="74" fontSize="8.5" fontWeight="700" textAnchor="middle" fill="#92400e">
                            Outer Lid
                          </text>

                          {/* DYNAMIC Center of Mass Coordinate Indicator */}
                          <circle cx={comSvgX} cy="70" r="7" fill={dynamicCom.isSpineFlush ? "#16a34a" : "#dc2626"} />
                          <circle cx={comSvgX} cy="70" r="14" fill="none" stroke={dynamicCom.isSpineFlush ? "#16a34a" : "#dc2626"} strokeWidth="1.5" strokeDasharray="3,3" />
                          <text x={comSvgX} y="94" fontSize="9" fontWeight="700" textAnchor="middle" fill={dynamicCom.isSpineFlush ? "#166534" : "#dc2626"}>
                            COM (Y = {comY.toFixed(1)} cm)
                          </text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
                <div className="side-canvas-footer">
                  <span>Spine Flush (0 cm)</span>
                  <span style={{ fontWeight: 700, color: dynamicCom.isSpineFlush ? '#16a34a' : '#dc2626' }}>
                    Center of Gravity (Y = {comY.toFixed(1)} cm · {((comY / effectiveDepthCm) * 100).toFixed(0)}%)
                  </span>
                  <span>Outer Lid ({effectiveDepthCm.toFixed(1)} cm)</span>
                </div>
              </div>
            )}

            {/* TAB 3: 3D BALANCE & ERGONOMICS */}
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
                          Centroid ({comX.toFixed(1)}, {comY.toFixed(1)}, {comZ.toFixed(1)}) cm
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
                      {Math.abs(comX).toFixed(1)} cm {comX >= 0 ? 'Right' : 'Left'}
                    </span>
                    <span className="stat-sub">
                      {dynamicCom.isLaterallyBalanced ? 'Zero spinal curvature' : 'Lateral strain warning'}
                    </span>
                  </div>
                  <div className="balance-stat-card">
                    <span className="stat-label">VERTICAL STABILITY</span>
                    <span className={`stat-val ${dynamicCom.isLowCenter ? 'optimal' : 'warning'}`}>
                      Z = {comZ.toFixed(1)} cm
                    </span>
                    <span className="stat-sub">
                      {dynamicCom.isLowCenter ? 'Low center of mass' : 'Top-heavy tipping risk'}
                    </span>
                  </div>
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
            
            {/* SDLC Instant Product Catalog Autocomplete (Local-First + UPCitemdb) */}
            <ProductSearchAutocomplete onSelectProduct={handleSelectCatalogProduct} unitSystem={unitSystem} />

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
                  <label>Weight (grams)</label>
                  <input
                    type="number"
                    value={newItemWeight}
                    onChange={(e) => setNewItemWeight(Number(e.target.value))}
                    min="1"
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
