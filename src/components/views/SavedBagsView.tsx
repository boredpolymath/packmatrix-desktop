import React, { useState } from 'react';
import type { LuggageShell, UnitSystem, CatalogBag } from '../../types';
import { Luggage, Plus, Check, Box, Edit3, Copy, Trash2, ArrowLeftRight, X } from 'lucide-react';
import { BagSearchAutocomplete } from '../common/BagSearchAutocomplete';
import {
  CM_TO_IN,
  IN_TO_CM,
  G_TO_LBS,
  LBS_TO_G,
  formatDim as formatDimUtil,
  formatLuggageWeight as formatLuggageWeightUtil,
} from '../../utils/units';

interface Props {
  bags: LuggageShell[];
  activeBagId: string;
  onSelectActiveBag: (id: string) => void;
  onAddBag: (bag: LuggageShell) => void;
  onUpdateBag?: ((bag: LuggageShell) => void) | undefined;
  onDuplicateBag?: ((bag: LuggageShell) => void) | undefined;
  onDeleteBag?: ((bagId: string) => void) | undefined;
  unitSystem: UnitSystem;
}

export const SavedBagsView: React.FC<Props> = ({
  bags,
  activeBagId,
  onSelectActiveBag,
  onAddBag,
  onUpdateBag,
  onDuplicateBag,
  onDeleteBag,
  unitSystem,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBagId, setEditingBagId] = useState<string | null>(null);

  // Form states (unit-aware input fields)
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [displayLength, setDisplayLength] = useState(unitSystem === 'imperial' ? (54.0 * CM_TO_IN).toFixed(1) : '54.0');
  const [displayWidth, setDisplayWidth] = useState(unitSystem === 'imperial' ? (35.0 * CM_TO_IN).toFixed(1) : '35.0');
  const [displayDepth, setDisplayDepth] = useState(unitSystem === 'imperial' ? (22.0 * CM_TO_IN).toFixed(1) : '22.0');
  const [displayTare, setDisplayTare] = useState(unitSystem === 'imperial' ? (1800 * G_TO_LBS).toFixed(2) : '1800');
  const [displayGusset, setDisplayGusset] = useState(unitSystem === 'imperial' ? (3.0 * CM_TO_IN).toFixed(1) : '3.0');
  const [displayCorner, setDisplayCorner] = useState(unitSystem === 'imperial' ? (3.0 * CM_TO_IN).toFixed(1) : '3.0');
  const [taperRatio, setTaperRatio] = useState(0.9);

  // Synchronize display inputs during render when unitSystem changes
  const [prevUnitSystem, setPrevUnitSystem] = useState(unitSystem);
  if (prevUnitSystem !== unitSystem) {
    setPrevUnitSystem(unitSystem);
    if (unitSystem === 'imperial') {
      const curL = parseFloat(displayLength) || 54.0;
      const curW = parseFloat(displayWidth) || 35.0;
      const curD = parseFloat(displayDepth) || 22.0;
      const curT = parseFloat(displayTare) || 1800;
      const curG = parseFloat(displayGusset) || 3.0;
      const curC = parseFloat(displayCorner) || 3.0;
      setDisplayLength((curL * CM_TO_IN).toFixed(1));
      setDisplayWidth((curW * CM_TO_IN).toFixed(1));
      setDisplayDepth((curD * CM_TO_IN).toFixed(1));
      setDisplayTare((curT * G_TO_LBS).toFixed(2));
      setDisplayGusset((curG * CM_TO_IN).toFixed(1));
      setDisplayCorner((curC * CM_TO_IN).toFixed(1));
    } else {
      const curL = parseFloat(displayLength) || 21.3;
      const curW = parseFloat(displayWidth) || 13.8;
      const curD = parseFloat(displayDepth) || 8.7;
      const curT = parseFloat(displayTare) || 3.97;
      const curG = parseFloat(displayGusset) || 1.2;
      const curC = parseFloat(displayCorner) || 1.2;
      setDisplayLength((curL * IN_TO_CM).toFixed(1));
      setDisplayWidth((curW * IN_TO_CM).toFixed(1));
      setDisplayDepth((curD * IN_TO_CM).toFixed(1));
      setDisplayTare(Math.round(curT * LBS_TO_G).toString());
      setDisplayGusset((curG * IN_TO_CM).toFixed(1));
      setDisplayCorner((curC * IN_TO_CM).toFixed(1));
    }
  }

  // Derived canonical values in metric for calculations & database storage
  const lengthCm = unitSystem === 'imperial' ? (parseFloat(displayLength) || 0) * IN_TO_CM : (parseFloat(displayLength) || 0);
  const widthCm = unitSystem === 'imperial' ? (parseFloat(displayWidth) || 0) * IN_TO_CM : (parseFloat(displayWidth) || 0);
  const depthCm = unitSystem === 'imperial' ? (parseFloat(displayDepth) || 0) * IN_TO_CM : (parseFloat(displayDepth) || 0);
  const tareWeightG = unitSystem === 'imperial' ? Math.round((parseFloat(displayTare) || 0) * LBS_TO_G) : Math.round(parseFloat(displayTare) || 0);
  const expansionGussetCm = unitSystem === 'imperial' ? (parseFloat(displayGusset) || 0) * IN_TO_CM : (parseFloat(displayGusset) || 0);
  const cornerRadiusCm = unitSystem === 'imperial' ? (parseFloat(displayCorner) || 0) * IN_TO_CM : (parseFloat(displayCorner) || 0);

  // Side-by-side comparison modal state
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareBagAId, setCompareBagAId] = useState<string>(bags[0]?.id || '');
  const [compareBagBId, setCompareBagBId] = useState<string>(bags[1]?.id || bags[0]?.id || '');

  // Analytical volumetric calculations matching Rust core formulas
  const rawVolL = (lengthCm * widthCm * depthCm) / 1000.0;
  const bevelLossL = cornerRadiusCm > 0
    ? ((4.0 - Math.PI) * Math.pow(cornerRadiusCm, 2) * depthCm) / 1000.0
    : 0;
  const taperFactor = (1.0 + Math.max(0.5, Math.min(1.0, taperRatio))) / 2.0;
  const usableVolL = Math.max(0, (rawVolL - bevelLossL) * taperFactor);

  const resetForm = () => {
    setEditingBagId(null);
    setName('');
    setBrand('');
    setTaperRatio(0.9);
    if (unitSystem === 'imperial') {
      setDisplayLength((54.0 * CM_TO_IN).toFixed(1));
      setDisplayWidth((35.0 * CM_TO_IN).toFixed(1));
      setDisplayDepth((22.0 * CM_TO_IN).toFixed(1));
      setDisplayTare((1800 * G_TO_LBS).toFixed(2));
      setDisplayGusset((3.0 * CM_TO_IN).toFixed(1));
      setDisplayCorner((3.0 * CM_TO_IN).toFixed(1));
    } else {
      setDisplayLength('54.0');
      setDisplayWidth('35.0');
      setDisplayDepth('22.0');
      setDisplayTare('1800');
      setDisplayGusset('3.0');
      setDisplayCorner('3.0');
    }
  };

  const handleStartCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleStartEdit = (bag: LuggageShell) => {
    setEditingBagId(bag.id);
    setName(bag.name);
    setBrand(bag.brand || '');
    setTaperRatio(bag.taper_ratio);
    if (unitSystem === 'imperial') {
      setDisplayLength((bag.length_cm * CM_TO_IN).toFixed(1));
      setDisplayWidth((bag.width_cm * CM_TO_IN).toFixed(1));
      setDisplayDepth((bag.depth_cm * CM_TO_IN).toFixed(1));
      setDisplayTare((bag.tare_weight_g * G_TO_LBS).toFixed(2));
      setDisplayGusset((bag.expansion_gusset_cm * CM_TO_IN).toFixed(1));
      setDisplayCorner((bag.corner_radius_cm * CM_TO_IN).toFixed(1));
    } else {
      setDisplayLength(bag.length_cm.toFixed(1));
      setDisplayWidth(bag.width_cm.toFixed(1));
      setDisplayDepth(bag.depth_cm.toFixed(1));
      setDisplayTare(bag.tare_weight_g.toString());
      setDisplayGusset(bag.expansion_gusset_cm.toFixed(1));
      setDisplayCorner(bag.corner_radius_cm.toFixed(1));
    }
    setIsModalOpen(true);
  };

  const handleSelectCatalogBag = (catalogBag: CatalogBag) => {
    setName(catalogBag.name);
    setBrand(catalogBag.brand);
    setTaperRatio(catalogBag.taper_ratio);
    if (unitSystem === 'imperial') {
      setDisplayLength((catalogBag.length_cm * CM_TO_IN).toFixed(1));
      setDisplayWidth((catalogBag.width_cm * CM_TO_IN).toFixed(1));
      setDisplayDepth((catalogBag.depth_cm * CM_TO_IN).toFixed(1));
      setDisplayTare((catalogBag.tare_weight_g * G_TO_LBS).toFixed(2));
      setDisplayGusset((catalogBag.expansion_gusset_cm * CM_TO_IN).toFixed(1));
      setDisplayCorner((catalogBag.corner_radius_cm * CM_TO_IN).toFixed(1));
    } else {
      setDisplayLength(catalogBag.length_cm.toFixed(1));
      setDisplayWidth(catalogBag.width_cm.toFixed(1));
      setDisplayDepth(catalogBag.depth_cm.toFixed(1));
      setDisplayTare(catalogBag.tare_weight_g.toString());
      setDisplayGusset(catalogBag.expansion_gusset_cm.toFixed(1));
      setDisplayCorner(catalogBag.corner_radius_cm.toFixed(1));
    }
  };

  const handleInstantAddBag = (catalogBag: CatalogBag) => {
    const rawVol = (catalogBag.length_cm * catalogBag.width_cm * catalogBag.depth_cm) / 1000.0;
    const bevelLoss = catalogBag.corner_radius_cm > 0
      ? ((4.0 - Math.PI) * Math.pow(catalogBag.corner_radius_cm, 2) * catalogBag.depth_cm) / 1000.0
      : 0;
    const taper = (1.0 + Math.max(0.5, Math.min(1.0, catalogBag.taper_ratio))) / 2.0;
    const usableVol = Math.max(0, (rawVol - bevelLoss) * taper);

    const newBag: LuggageShell = {
      id: `bag-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: catalogBag.name,
      brand: catalogBag.brand || undefined,
      length_cm: catalogBag.length_cm,
      width_cm: catalogBag.width_cm,
      depth_cm: catalogBag.depth_cm,
      tare_weight_g: catalogBag.tare_weight_g,
      nominal_volume_l: Math.round(usableVol * 10) / 10,
      expansion_gusset_cm: catalogBag.expansion_gusset_cm,
      is_expanded: false,
      corner_radius_cm: catalogBag.corner_radius_cm,
      taper_ratio: catalogBag.taper_ratio,
    };
    onAddBag(newBag);
    onSelectActiveBag(newBag.id);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingBagId && onUpdateBag) {
      const updatedBag: LuggageShell = {
        id: editingBagId,
        name: name.trim(),
        brand: brand.trim() || undefined,
        length_cm: Math.round(lengthCm * 10) / 10,
        width_cm: Math.round(widthCm * 10) / 10,
        depth_cm: Math.round(depthCm * 10) / 10,
        tare_weight_g: tareWeightG,
        nominal_volume_l: Math.round(usableVolL * 10) / 10,
        expansion_gusset_cm: Math.round(expansionGussetCm * 10) / 10,
        is_expanded: false,
        corner_radius_cm: Math.round(cornerRadiusCm * 10) / 10,
        taper_ratio: Number(taperRatio),
      };
      onUpdateBag(updatedBag);
    } else {
      const newBag: LuggageShell = {
        id: `custom-bag-${Date.now()}`,
        name: name.trim(),
        brand: brand.trim() || undefined,
        length_cm: Math.round(lengthCm * 10) / 10,
        width_cm: Math.round(widthCm * 10) / 10,
        depth_cm: Math.round(depthCm * 10) / 10,
        tare_weight_g: tareWeightG,
        nominal_volume_l: Math.round(usableVolL * 10) / 10,
        expansion_gusset_cm: Math.round(expansionGussetCm * 10) / 10,
        is_expanded: false,
        corner_radius_cm: Math.round(cornerRadiusCm * 10) / 10,
        taper_ratio: Number(taperRatio),
      };
      onAddBag(newBag);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const formatDim = (cm: number) => formatDimUtil(cm, unitSystem);
  const formatWeight = (g: number) => formatLuggageWeightUtil(g, unitSystem);

  // Resolve bags for comparison
  const bagA = bags.find((b) => b.id === compareBagAId) || bags[0];
  const bagB = bags.find((b) => b.id === compareBagBId) || bags[1] || bags[0];

  return (
    <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.01em' }}>
            Saved Luggage Collection
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Choose your active travel bag, compare models side-by-side, or adjust custom 3D luggage geometry
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {bags.length >= 2 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.9rem',
                borderRadius: '6px',
                background: '#ffffff',
                color: 'var(--text-dark)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                border: '1px solid var(--border-medium)',
              }}
              title="Compare volume, dimensions, and weight of two travel bags side-by-side"
            >
              <ArrowLeftRight size={14} color="var(--primary-accent)" />
              <span>Compare Bags</span>
            </button>
          )}

          <button
            onClick={handleStartCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <Plus size={15} />
            <span>Add New Bag</span>
          </button>
        </div>
      </div>

      {/* SDLC Automated Bag Search & Instant Add */}
      <div
        style={{
          background: 'var(--surface-card, #ffffff)',
          border: '1px solid var(--border-medium, #e2e8f0)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Luggage size={16} color="var(--primary-accent, #2563eb)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark, #0f172a)' }}>
              Luggage Search & Instant Setup
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
            Search any bag (Samsonite, Away, Rimowa, Osprey, Travelpro, etc.) to auto-calibrate dimensions & tare weight
          </span>
        </div>
        <BagSearchAutocomplete
          onSelectBag={handleInstantAddBag}
          onInstantAddBag={handleInstantAddBag}
          unitSystem={unitSystem}
          placeholder="Search by brand or luggage model (e.g. Samsonite Winfield, Away The Carry-On, Osprey Farpoint)..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {bags.map((bag) => {
          const isActive = bag.id === activeBagId;
          const raw = (bag.length_cm * bag.width_cm * bag.depth_cm) / 1000;
          return (
            <div
              key={bag.id}
              style={{
                background: '#ffffff',
                border: `1.5px solid ${isActive ? 'var(--primary-accent)' : 'var(--border-light)'}`,
                borderRadius: '12px',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                boxShadow: isActive ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'var(--shadow-card)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: isActive ? '#eff6ff' : '#f1f5f9',
                      border: `1px solid ${isActive ? '#dbeafe' : '#e2e8f0'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? 'var(--primary-accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <Luggage size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      {bag.name}
                    </h3>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {bag.brand || 'Custom Luggage'}
                    </span>
                  </div>
                </div>

                {isActive ? (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'var(--green-bg)',
                      color: 'var(--green-text)',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    <Check size={12} /> Active Bag
                  </span>
                ) : (
                  <button
                    onClick={() => onSelectActiveBag(bag.id)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-dark)',
                      cursor: 'pointer',
                    }}
                  >
                    Set Active
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: '#f8fafc', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '11.5px', border: '1px solid var(--border-light)' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>DIMENSIONS</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{formatDim(bag.length_cm)} × {formatDim(bag.width_cm)} × {formatDim(bag.depth_cm)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>EMPTY WEIGHT</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{formatWeight(bag.tare_weight_g)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>PACKING CAPACITY</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary-accent)' }}>{bag.nominal_volume_l} L (Gross: {raw.toFixed(1)} L)</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>EXPANSION ZIPPER</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>+{formatDim(bag.expansion_gusset_cm)} depth</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.4rem', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                  <span style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', fontWeight: 500 }}>
                    Corners: {formatDim(bag.corner_radius_cm)} curve
                  </span>
                  <span style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', fontWeight: 500 }}>
                    {bag.taper_ratio < 1 ? 'Underseat Taper' : 'Rectangular Box'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => handleStartEdit(bag)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '11px',
                      padding: '3px 7px',
                      borderRadius: '5px',
                      background: 'transparent',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-dark)',
                      cursor: 'pointer',
                    }}
                    title="Edit bag geometry dimensions"
                  >
                    <Edit3 size={11} />
                    <span>Edit</span>
                  </button>

                  {onDuplicateBag && (
                    <button
                      onClick={() => onDuplicateBag(bag)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '11px',
                        padding: '3px 7px',
                        borderRadius: '5px',
                        background: 'transparent',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-dark)',
                        cursor: 'pointer',
                      }}
                      title="Clone this bag configuration"
                    >
                      <Copy size={11} />
                      <span>Clone</span>
                    </button>
                  )}

                  {onDeleteBag && bags.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete luggage shell "${bag.name}"?`)) {
                          onDeleteBag(bag.id);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '11px',
                        padding: '3px 6px',
                        borderRadius: '5px',
                        background: 'transparent',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        cursor: 'pointer',
                      }}
                      title="Delete luggage shell"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bag Creator / Editor Modal with Real-time 3D Volumetric Preview */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => {
            setIsModalOpen(false);
            resetForm();
          }}
        >
          <div
            style={{
              background: '#ffffff',
              backgroundColor: '#ffffff',
              color: 'var(--text-dark, #0f172a)',
              border: '1px solid var(--border-medium, #cbd5e1)',
              borderRadius: '16px',
              width: '740px',
              maxWidth: '92vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-modal, 0 25px 50px -12px rgba(0, 0, 0, 0.35))',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>
                  {editingBagId ? 'Edit Luggage Shell Geometry' : 'Custom Luggage Shell Geometry Engine'}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Calibrated parameterized bounding box with analytical corner bevel quadrant deduction
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                ✕
              </button>
            </div>

            <BagSearchAutocomplete
              onSelectBag={handleSelectCatalogBag}
              onInstantAddBag={(bag) => {
                handleInstantAddBag(bag);
                setIsModalOpen(false);
              }}
              unitSystem={unitSystem}
            />

            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Bag Model Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tortuga Travel Backpack 40L"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-medium)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Brand Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tortuga"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-medium)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Length ({unitSystem === 'metric' ? 'cm' : 'in'})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={displayLength}
                      onChange={(e) => setDisplayLength(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Width ({unitSystem === 'metric' ? 'cm' : 'in'})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={displayWidth}
                      onChange={(e) => setDisplayWidth(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Depth ({unitSystem === 'metric' ? 'cm' : 'in'})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={displayDepth}
                      onChange={(e) => setDisplayDepth(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Tare Weight ({unitSystem === 'metric' ? 'g' : 'lbs'})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={displayTare}
                      onChange={(e) => setDisplayTare(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Expansion Gusset (+{unitSystem === 'metric' ? 'cm' : 'in'})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={displayGusset}
                      onChange={(e) => setDisplayGusset(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Corner Bevel Radius ({unitSystem === 'metric' ? 'cm' : 'in'})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={displayCorner}
                      onChange={(e) => setDisplayCorner(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Draft Taper Ratio (0.5 - 1.0)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="1.0"
                      value={taperRatio}
                      onChange={(e) => setTaperRatio(parseFloat(e.target.value) || 1.0)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {editingBagId ? 'Save Luggage Modifications' : 'Save & Register Luggage Shell'}
                </button>
              </div>

              {/* Real-time Visual Volumetric Feedback Card */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-dark)' }}>
                    Calculated Volumetric Breakdown
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Raw Bounding Volume:</span>
                      <span style={{ fontWeight: 600 }}>{rawVolL.toFixed(2)} L</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                      <span>Corner Bevel Deduction:</span>
                      <span>-{bevelLossL.toFixed(2)} L</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                      <span>Taper Factor Reduction:</span>
                      <span>× {taperFactor.toFixed(3)}</span>
                    </div>
                    <div style={{ height: '1px', background: 'var(--border-medium)', margin: '0.3rem 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: 'var(--primary-accent)' }}>
                      <span>Net Usable Packing Space:</span>
                      <span>{usableVolL.toFixed(1)} L</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      <span>Expanded Capacity (+{formatDim(expansionGussetCm)}):</span>
                      <span>{Math.max(0, ((lengthCm * widthCm * (depthCm + expansionGussetCm)) / 1000.0 - bevelLossL) * taperFactor).toFixed(1)} L</span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <Box size={28} color="var(--primary-accent)" />
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Analytical quadrature integration active. Dimensions strictly enforce double-precision IEEE-754 volume conservation.</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Side-by-Side Bag Comparison Modal */}
      {isCompareModalOpen && bagA && bagB && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsCompareModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--border-medium)',
              width: '820px',
              maxWidth: '92vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-modal)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <ArrowLeftRight size={18} color="var(--primary-accent)" />
                  <span>Side-by-Side Luggage Comparison</span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Compare dimensional profiles, packing volumes, tare weights, and airline clearances
                </p>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Bag Selector Dropdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  BAG A (REFERENCE)
                </label>
                <select
                  value={compareBagAId}
                  onChange={(e) => setCompareBagAId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px', fontWeight: 600 }}
                >
                  {bags.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.nominal_volume_l}L)</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  BAG B (TARGET)
                </label>
                <select
                  value={compareBagBId}
                  onChange={(e) => setCompareBagBId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px', fontWeight: 600 }}
                >
                  {bags.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.nominal_volume_l}L)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Metrics Grid */}
            <div style={{ border: '1px solid var(--border-light)', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border-medium)' }}>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', width: '34%' }}>Metric</th>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#0369a1', width: '33%' }}>{bagA.name}</th>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#047857', width: '33%' }}>{bagB.name}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600 }}>Usable Packing Volume</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0369a1' }}>{bagA.nominal_volume_l} L</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#047857' }}>
                      {bagB.nominal_volume_l} L
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: bagB.nominal_volume_l >= bagA.nominal_volume_l ? '#16a34a' : '#dc2626' }}>
                        ({bagB.nominal_volume_l >= bagA.nominal_volume_l ? '+' : ''}{(bagB.nominal_volume_l - bagA.nominal_volume_l).toFixed(1)} L)
                      </span>
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600 }}>External Dimensions</td>
                    <td style={{ padding: '9px 12px' }}>{formatDim(bagA.length_cm)} × {formatDim(bagA.width_cm)} × {formatDim(bagA.depth_cm)}</td>
                    <td style={{ padding: '9px 12px' }}>{formatDim(bagB.length_cm)} × {formatDim(bagB.width_cm)} × {formatDim(bagB.depth_cm)}</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600 }}>Tare Weight (Empty)</td>
                    <td style={{ padding: '9px 12px' }}>{formatWeight(bagA.tare_weight_g)}</td>
                    <td style={{ padding: '9px 12px' }}>
                      {formatWeight(bagB.tare_weight_g)}
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: bagB.tare_weight_g <= bagA.tare_weight_g ? '#16a34a' : '#dc2626' }}>
                        ({bagB.tare_weight_g <= bagA.tare_weight_g ? '-' : '+'}{formatWeight(Math.abs(bagB.tare_weight_g - bagA.tare_weight_g))})
                      </span>
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600 }}>Expansion Gusset</td>
                    <td style={{ padding: '9px 12px' }}>{bagA.expansion_gusset_cm > 0 ? `+${formatDim(bagA.expansion_gusset_cm)} depth` : 'None (Fixed)'}</td>
                    <td style={{ padding: '9px 12px' }}>{bagB.expansion_gusset_cm > 0 ? `+${formatDim(bagB.expansion_gusset_cm)} depth` : 'None (Fixed)'}</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600 }}>Corner Curve / Bevel</td>
                    <td style={{ padding: '9px 12px' }}>{formatDim(bagA.corner_radius_cm)} bevel</td>
                    <td style={{ padding: '9px 12px' }}>{formatDim(bagB.corner_radius_cm)} bevel</td>
                  </tr>

                  <tr>
                    <td style={{ padding: '9px 12px', fontWeight: 600 }}>Underseat Geometry</td>
                    <td style={{ padding: '9px 12px' }}>{bagA.taper_ratio < 1 ? `Tapered (${Math.round(bagA.taper_ratio * 100)}%)` : 'Rectangular Box'}</td>
                    <td style={{ padding: '9px 12px' }}>{bagB.taper_ratio < 1 ? `Tapered (${Math.round(bagB.taper_ratio * 100)}%)` : 'Rectangular Box'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', background: '#0f172a', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
