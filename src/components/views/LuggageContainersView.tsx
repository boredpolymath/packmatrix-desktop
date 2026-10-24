import React, { useState } from 'react';
import type { LuggageShell, SubContainer, InventoryItem, UnitSystem } from '../../types';
import { SavedBagsView } from './SavedBagsView';
import { PackingCubesView } from './PackingCubesView';
import { Luggage, Box } from 'lucide-react';

interface Props {
  bags: LuggageShell[];
  activeBagId: string;
  onSelectActiveBag: (id: string) => void;
  onAddBag: (bag: LuggageShell) => void;
  onUpdateBag?: ((bag: LuggageShell) => void) | undefined;
  onDuplicateBag?: ((bag: LuggageShell) => void) | undefined;
  onDeleteBag?: ((bagId: string) => void) | undefined;

  cubes: SubContainer[];
  items: InventoryItem[];
  activeBag: LuggageShell;
  onUpdateCube: (cube: SubContainer) => void;
  onAddCube: (cube: SubContainer) => void;

  unitSystem: UnitSystem;
  subTab?: 'bags' | 'cubes';
  onSubTabChange?: (tab: 'bags' | 'cubes') => void;
}

export const LuggageContainersView: React.FC<Props> = ({
  bags,
  activeBagId,
  onSelectActiveBag,
  onAddBag,
  onUpdateBag,
  onDuplicateBag,
  onDeleteBag,
  cubes,
  items,
  activeBag,
  onUpdateCube,
  onAddCube,
  unitSystem,
  subTab,
  onSubTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<'bags' | 'cubes'>('bags');
  const activeTab = subTab ?? internalTab;
  const handleTabChange = (tab: 'bags' | 'cubes') => {
    if (onSubTabChange) {
      onSubTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  return (
    <div className="luggage-containers-view" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top Segmented Sub-Navigation Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-light, #e2e8f0)',
          borderRadius: '12px',
          padding: '0.65rem 1rem',
          boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-dim, #f1f5f9)',
              padding: '3px',
              borderRadius: '8px',
              gap: '3px',
            }}
          >
            <button
              type="button"
              className={`switcher-btn ${activeTab === 'bags' ? 'active' : ''}`}
              onClick={() => handleTabChange('bags')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'bags' ? '#ffffff' : 'transparent',
                color: activeTab === 'bags' ? 'var(--text-dark, #0f172a)' : 'var(--text-secondary, #64748b)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: activeTab === 'bags' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Luggage size={15} color={activeTab === 'bags' ? 'var(--primary, #0284c7)' : 'currentColor'} />
              <span>Saved Bags ({bags.length})</span>
            </button>

            <button
              type="button"
              className={`switcher-btn ${activeTab === 'cubes' ? 'active' : ''}`}
              onClick={() => handleTabChange('cubes')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'cubes' ? '#ffffff' : 'transparent',
                color: activeTab === 'cubes' ? 'var(--text-dark, #0f172a)' : 'var(--text-secondary, #64748b)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: activeTab === 'cubes' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Box size={15} color={activeTab === 'cubes' ? 'var(--primary, #0284c7)' : 'currentColor'} />
              <span>Packing Cubes ({cubes.length})</span>
            </button>
          </div>
        </div>

        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)' }}>
          {activeTab === 'bags'
            ? 'Manage outer travel backpacks, roller carry-ons, and rigid luggage'
            : 'Organize modular internal compression cubes, tech pouches, and wash bags'}
        </div>
      </div>

      {/* Render Active Sub-View */}
      {activeTab === 'bags' ? (
        <SavedBagsView
          bags={bags}
          activeBagId={activeBagId}
          onSelectActiveBag={onSelectActiveBag}
          onAddBag={onAddBag}
          onUpdateBag={onUpdateBag}
          onDuplicateBag={onDuplicateBag}
          onDeleteBag={onDeleteBag}
          unitSystem={unitSystem}
        />
      ) : (
        <PackingCubesView
          cubes={cubes}
          items={items}
          activeBag={activeBag}
          onUpdateCube={onUpdateCube}
          onAddCube={onAddCube}
          unitSystem={unitSystem}
        />
      )}
    </div>
  );
};
