import React, { useState } from 'react';
import type { LuggageShell, UnitSystem } from '../../types';
import { Luggage, Plus, Check, Box } from 'lucide-react';

interface Props {
  bags: LuggageShell[];
  activeBagId: string;
  onSelectActiveBag: (id: string) => void;
  onAddBag: (bag: LuggageShell) => void;
  unitSystem: UnitSystem;
}

export const SavedBagsView: React.FC<Props> = ({
  bags,
  activeBagId,
  onSelectActiveBag,
  onAddBag,
  unitSystem,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [lengthCm, setLengthCm] = useState(54.0);
  const [widthCm, setWidthCm] = useState(35.0);
  const [depthCm, setDepthCm] = useState(22.0);
  const [tareWeightG, setTareWeightG] = useState(1800);
  const [expansionGussetCm, setExpansionGussetCm] = useState(3.0);
  const [cornerRadiusCm, setCornerRadiusCm] = useState(3.0);
  const [taperRatio, setTaperRatio] = useState(0.9);

  // Analytical volumetric calculations matching Rust core formulas
  const rawVolL = (lengthCm * widthCm * depthCm) / 1000.0;
  const bevelLossL = cornerRadiusCm > 0
    ? ((4.0 - Math.PI) * Math.pow(cornerRadiusCm, 2) * depthCm) / 1000.0
    : 0;
  const taperFactor = (1.0 + Math.max(0.5, Math.min(1.0, taperRatio))) / 2.0;
  const usableVolL = Math.max(0, (rawVolL - bevelLossL) * taperFactor);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newBag: LuggageShell = {
      id: `custom-bag-${Date.now()}`,
      name: name.trim(),
      brand: brand.trim() || undefined,
      length_cm: Number(lengthCm),
      width_cm: Number(widthCm),
      depth_cm: Number(depthCm),
      tare_weight_g: Number(tareWeightG),
      nominal_volume_l: Math.round(usableVolL * 10) / 10,
      expansion_gusset_cm: Number(expansionGussetCm),
      is_expanded: false,
      corner_radius_cm: Number(cornerRadiusCm),
      taper_ratio: Number(taperRatio),
    };

    onAddBag(newBag);
    setIsModalOpen(false);
    setName('');
    setBrand('');
  };

  const formatDim = (cm: number) => {
    if (unitSystem === 'metric') return `${cm.toFixed(1)} cm`;
    return `${(cm / 2.54).toFixed(1)} in`;
  };

  const formatWeight = (g: number) => {
    if (unitSystem === 'metric') return `${(g / 1000).toFixed(2)} kg`;
    return `${(g * 0.00220462).toFixed(2)} lbs`;
  };

  return (
    <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.01em' }}>
            Saved Luggage Collection
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Choose your active travel bag or add custom luggage to calculate packing capacity and airline compliance
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
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
                      color: 'var(--text-body)',
                      cursor: 'pointer',
                    }}
                  >
                    Set as Active
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

              <div style={{ display: 'flex', gap: '0.4rem', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                <span style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', fontWeight: 500 }}>
                  Corners: {bag.corner_radius_cm} cm curve
                </span>
                <span style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', fontWeight: 500 }}>
                  Shape: {bag.taper_ratio < 1 ? 'Underseat Taper' : 'Rectangular Box'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Bag Creator Modal with Real-time 3D Volumetric Preview */}
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
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface-card)',
              borderRadius: '16px',
              width: '740px',
              maxWidth: '92vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Custom Luggage Shell Geometry Engine</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Calibrated parameterized bounding box with analytical corner bevel quadrant deduction
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
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
                      Length (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={lengthCm}
                      onChange={(e) => setLengthCm(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Width (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={widthCm}
                      onChange={(e) => setWidthCm(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Depth (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={depthCm}
                      onChange={(e) => setDepthCm(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Tare Mass (g)
                    </label>
                    <input
                      type="number"
                      value={tareWeightG}
                      onChange={(e) => setTareWeightG(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      Expansion Gusset (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={expansionGussetCm}
                      onChange={(e) => setExpansionGussetCm(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600 }}>Taper Draft Factor (τ): {taperRatio.toFixed(2)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>0.5 (Wedge) → 1.0 (Rectangular)</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.02"
                    value={taperRatio}
                    onChange={(e) => setTaperRatio(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600 }}>Corner Bevel Radius: {cornerRadiusCm.toFixed(1)} cm</span>
                    <span style={{ color: 'var(--text-muted)' }}>Quadrant Area Loss</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="8.0"
                    step="0.5"
                    value={cornerRadiusCm}
                    onChange={(e) => setCornerRadiusCm(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Real-time 3D Volumetric Projection Preview */}
              <div
                style={{
                  background: 'var(--surface-dim)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  border: '1px solid var(--border-light)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                  <Box size={18} />
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>Real-time 3D Volumetric Projection</span>
                </div>

                {/* SVG Isometric Box Diagram */}
                <div
                  style={{
                    height: '170px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--surface-card)',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-medium)',
                  }}
                >
                  <svg width="220" height="150" viewBox="0 0 220 150">
                    {/* Isometric 3D Shell Outline */}
                    <polygon
                      points="110,25 180,60 110,95 40,60"
                      fill="rgba(56, 189, 248, 0.15)"
                      stroke="#0284c7"
                      strokeWidth="2"
                    />
                    <polygon
                      points="40,60 110,95 110,135 40,100"
                      fill="rgba(14, 165, 233, 0.25)"
                      stroke="#0284c7"
                      strokeWidth="2"
                    />
                    <polygon
                      points="110,95 180,60 180,100 110,135"
                      fill="rgba(3, 105, 161, 0.35)"
                      stroke="#0369a1"
                      strokeWidth="2"
                    />
                    {/* Expansion gusset projection */}
                    {expansionGussetCm > 0 && (
                      <line
                        x1="180"
                        y1="60"
                        x2="195"
                        y2="50"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeDasharray="3,3"
                      />
                    )}
                    <text x="110" y="70" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
                      {usableVolL.toFixed(1)} L
                    </text>
                    <text x="110" y="84" textAnchor="middle" fontSize="9.5" fill="#64748b">
                      usable capacity
                    </text>
                  </svg>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Gross Bounding Box:</span>
                    <span style={{ fontWeight: 600 }}>{rawVolL.toFixed(2)} L</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Bevel Reduction (ΔV):</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>-{bevelLossL.toFixed(2)} L</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Taper Deduction Factor:</span>
                    <span style={{ fontWeight: 600 }}>×{taperFactor.toFixed(3)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--border-medium)',
                      paddingTop: '0.4rem',
                      fontWeight: 700,
                      fontSize: '12.5px',
                    }}
                  >
                    <span>Effective Usable Volume:</span>
                    <span style={{ color: 'var(--accent-blue)' }}>{usableVolL.toFixed(2)} L</span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      padding: '0.55rem 0.9rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-medium)',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.55rem 1.1rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--primary)',
                      color: '#ffffff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Commit Luggage Shell
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
