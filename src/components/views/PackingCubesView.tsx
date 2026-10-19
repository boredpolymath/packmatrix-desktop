import React, { useState } from 'react';
import type { SubContainer, InventoryItem, LuggageShell, ZoneLayerTag, UnitSystem } from '../../types';
import { Box, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  cubes: SubContainer[];
  items: InventoryItem[];
  activeBag: LuggageShell;
  onUpdateCube: (cube: SubContainer) => void;
  onAddCube: (cube: SubContainer) => void;
  unitSystem: UnitSystem;
}

const ZONE_TAGS: ZoneLayerTag[] = [
  'Spine Bottom',
  'Spine Mid',
  'Spine Top',
  'Outer Lid',
  'Quick Access',
];

export const PackingCubesView: React.FC<Props> = ({
  cubes,
  items,
  activeBag,
  onUpdateCube,
  onAddCube,
  unitSystem,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCubeName, setNewCubeName] = useState('');
  const [newCubeType, setNewCubeType] = useState<'cube' | 'pouch' | 'sleeve' | 'organizer' | 'pocket'>('cube');
  const [lengthCm, setLengthCm] = useState(28.0);
  const [widthCm, setWidthCm] = useState(20.0);
  const [depthCm, setDepthCm] = useState(8.0);
  const [tareG, setTareG] = useState(90);
  const [compRatio, setCompRatio] = useState(0.8);
  const [zone, setZone] = useState<ZoneLayerTag>('Spine Mid');

  // Compute total compressed volume of all subcontainers assigned to active bag
  const totalSubContainerVolL = cubes.reduce((acc, c) => {
    const rawL = (c.length_cm * c.width_cm * c.depth_cm) / 1000.0;
    return acc + (rawL * Math.max(0.2, Math.min(1.0, c.compression_ratio)));
  }, 0);

  const usableBagVolL = activeBag.nominal_volume_l;
  const isOverflowing = totalSubContainerVolL > usableBagVolL;
  const overflowL = isOverflowing ? totalSubContainerVolL - usableBagVolL : 0;
  const utilizationPct = usableBagVolL > 0 ? (totalSubContainerVolL / usableBagVolL) * 100 : 0;

  const handleCreateCube = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCubeName.trim()) return;

    const rawL = (lengthCm * widthCm * depthCm) / 1000.0;
    const newCube: SubContainer = {
      id: `cube-${Date.now()}`,
      luggage_shell_id: activeBag.id,
      name: newCubeName.trim(),
      container_type: newCubeType,
      length_cm: Number(lengthCm),
      width_cm: Number(widthCm),
      depth_cm: Number(depthCm),
      max_volume_l: Math.round(rawL * 10) / 10,
      tare_weight_g: Number(tareG),
      compression_ratio: Number(compRatio),
      zone_layer: zone,
    };

    onAddCube(newCube);
    setIsModalOpen(false);
    setNewCubeName('');
  };

  const formatDim = (cm: number) => {
    if (unitSystem === 'metric') return `${cm.toFixed(1)} cm`;
    return `${(cm / 2.54).toFixed(1)} in`;
  };

  return (
    <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.01em' }}>
            Packing Organizer Cubes
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Organize clothes, toiletries, and tech pouches into compressed compartments inside {activeBag.name}
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
          <span>Add Packing Cube</span>
        </button>
      </div>

      {/* Bag Volume Capacity Progress Bar */}
      <div
        style={{
          background: isOverflowing ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${isOverflowing ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {isOverflowing ? (
            <AlertTriangle size={18} color="#dc2626" />
          ) : (
            <CheckCircle2 size={18} color="#16a34a" />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: isOverflowing ? '#b91c1c' : '#15803d' }}>
              {isOverflowing
                ? `Bag Space Exceeded (+${overflowL.toFixed(1)} L over bag capacity)`
                : `All Cubes Fit Comfortably (${utilizationPct.toFixed(0)}% Bag Volume Used)`}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Total cube volume: {totalSubContainerVolL.toFixed(1)} L of {usableBagVolL.toFixed(1)} L bag capacity
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, utilizationPct)}%`,
                background: isOverflowing ? '#ef4444' : '#16a34a',
                borderRadius: '4px',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: 'var(--text-muted)' }}>
            <span>0 L</span>
            <span>{usableBagVolL} L Max</span>
          </div>
        </div>
      </div>

      {/* Sub-Containers List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {cubes.map((cube) => {
          const rawL = (cube.length_cm * cube.width_cm * cube.depth_cm) / 1000.0;
          const compressedL = rawL * cube.compression_ratio;
          const nestedItems = items.filter((i) => i.sub_container_id === cube.id);
          const packedMassG = nestedItems.reduce((acc, i) => acc + i.weight_g, 0);

          return (
            <div
              key={cube.id}
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-blue)',
                    }}
                  >
                    <Box size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '13.5px', fontWeight: 700 }}>{cube.name}</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Type: {cube.container_type.toUpperCase()} · Tare: {cube.tare_weight_g} g · {packedMassG} g gear ({nestedItems.length} items)
                    </span>
                  </div>
                </div>

                {/* Zone Placement Pill */}
                <select
                  value={cube.zone_layer}
                  onChange={(e) => onUpdateCube({ ...cube, zone_layer: e.target.value as ZoneLayerTag })}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: '1px solid var(--border-medium)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {ZONE_TAGS.map((t) => (
                    <option key={t} value={t}>
                      Zone: {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Compression Slider & Volumetric Specs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '0.75rem',
                  background: 'var(--surface)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  alignItems: 'center',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10.5px', display: 'block' }}>DIMENSIONS</span>
                  <span style={{ fontWeight: 600 }}>{formatDim(cube.length_cm)} × {formatDim(cube.width_cm)} × {formatDim(cube.depth_cm)}</span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '2px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>COMPRESSION RATIO</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                      {Math.round(cube.compression_ratio * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={cube.compression_ratio}
                    onChange={(e) => onUpdateCube({ ...cube, compression_ratio: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10.5px', display: 'block' }}>EFFECTIVE VOLUME</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {compressedL.toFixed(1)} L <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Raw: {rawL.toFixed(1)} L)</span>
                  </span>
                </div>
              </div>

              {/* Nested Items Row */}
              {nestedItems.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', paddingTop: '0.2rem' }}>
                  {nestedItems.map((item) => (
                    <span
                      key={item.id}
                      style={{
                        background: 'var(--surface-dim)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>({item.weight_g} g)</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Cube Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.65)',
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
              width: '520px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Add Sub-Container / Compression Cube</h3>
            <form onSubmit={handleCreateCube} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
                  Container Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Medium Compression Cube M"
                  value={newCubeName}
                  onChange={(e) => setNewCubeName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Type</label>
                  <select
                    value={newCubeType}
                    onChange={(e) => setNewCubeType(e.target.value as any)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                  >
                    <option value="cube">Packing Cube</option>
                    <option value="pouch">Accessory Pouch</option>
                    <option value="sleeve">Padded Sleeve</option>
                    <option value="organizer">Tech Organizer</option>
                    <option value="pocket">Zipper Pocket</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Placement Zone</label>
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value as ZoneLayerTag)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                  >
                    {ZONE_TAGS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Length (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={lengthCm}
                    onChange={(e) => setLengthCm(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Width (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={widthCm}
                    onChange={(e) => setWidthCm(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Depth (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={depthCm}
                    onChange={(e) => setDepthCm(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>Tare Weight (g)</label>
                  <input
                    type="number"
                    value={tareG}
                    onChange={(e) => setTareG(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '12.5px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    Compression ({Math.round(compRatio * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={compRatio}
                    onChange={(e) => setCompRatio(parseFloat(e.target.value))}
                    style={{ width: '100%', marginTop: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.5rem 0.9rem',
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
                    padding: '0.5rem 1.1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Save Sub-Container
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
