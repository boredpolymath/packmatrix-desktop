import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { CatalogBag, UnitSystem } from '../../types';
import { searchOfflineBagCatalog } from '../../services/productLookup';
import { Search, Database, Check, X, Luggage } from 'lucide-react';

interface Props {
  onSelectBag: (bag: CatalogBag) => void;
  unitSystem: UnitSystem;
  placeholder?: string;
  onInstantAddBag?: (bag: CatalogBag) => void;
}

export const BagSearchAutocomplete: React.FC<Props> = ({
  onSelectBag,
  unitSystem,
  placeholder,
  onInstantAddBag,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBagId, setSelectedBagId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Instant offline fuzzy search as user types
  const offlineResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchOfflineBagCatalog(query);
  }, [query]);

  // Detect dominant brand for heading menu
  const primaryBrand = useMemo(() => {
    if (offlineResults.length === 0) return null;
    const firstBrand = offlineResults[0].brand;
    const sameBrandCount = offlineResults.filter((b) => b.brand.toLowerCase() === firstBrand.toLowerCase()).length;
    return sameBrandCount >= 2 || firstBrand.toLowerCase() === query.trim().toLowerCase() ? firstBrand : null;
  }, [offlineResults, query]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (val.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (bag: CatalogBag) => {
    setSelectedBagId(bag.id);
    onSelectBag(bag);
    setQuery(bag.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedBagId(null);
    setIsOpen(false);
  };

  const formatWeight = (g: number) => {
    if (unitSystem === 'metric') return `${(g / 1000).toFixed(2)} kg`;
    return `${(g * 0.00220462).toFixed(2)} lbs`;
  };

  const formatDim = (l: number, w: number, d: number) => {
    if (unitSystem === 'metric') return `${l} × ${w} × ${d} cm`;
    return `${(l / 2.54).toFixed(1)} × ${(w / 2.54).toFixed(1)} × ${(d / 2.54).toFixed(1)} in`;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <label
          htmlFor="bag-catalog-search-input"
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--primary-accent, #0284c7)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Luggage size={13} />
          <span>Luggage Spec Search &amp; Auto-Calibration</span>
        </label>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Search brands (Samsonite, Away, Rimowa, Osprey, Travelpro) or models
        </span>
      </div>

      {/* Main Search Input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <Search size={14} />
        </div>

        <input
          id="bag-catalog-search-input"
          type="text"
          placeholder={placeholder || 'Search by luggage brand or model (e.g. Samsonite, Away, Rimowa, Osprey, Travelpro)...'}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => {
            if (query.trim() && offlineResults.length > 0) setIsOpen(true);
          }}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.6rem 2.2rem 0.6rem 2rem',
            borderRadius: '8px',
            border: '1px solid var(--border-medium, #cbd5e1)',
            background: 'var(--surface-dim, #f1f5f9)',
            fontSize: '13px',
            color: 'var(--text-dark)',
            outline: 'none',
            transition: 'border-color 0.15s ease',
          }}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '8px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid var(--border-medium, #cbd5e1)',
            boxShadow: 'var(--shadow-modal, 0 20px 25px -5px rgba(0, 0, 0, 0.25))',
            maxHeight: '340px',
            overflowY: 'auto',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {offlineResults.length === 0 && (
            <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No luggage shells matching &ldquo;{query}&rdquo;.
            </div>
          )}

          {/* Offline Verified Bags Section */}
          {offlineResults.length > 0 && (
            <div>
              <div
                style={{
                  padding: '7px 12px',
                  background: primaryBrand ? '#f0f9ff' : 'var(--surface-dim, #f8fafc)',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: primaryBrand ? '#0369a1' : 'var(--text-secondary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                {primaryBrand ? (
                  <>
                    <Luggage size={12} color="#0284c7" />
                    <span>{primaryBrand} Collection ({offlineResults.filter(b => b.brand.toLowerCase() === primaryBrand.toLowerCase()).length} models)</span>
                  </>
                ) : (
                  <>
                    <Database size={11} color="var(--primary-accent)" />
                    <span>Verified Luggage Database ({offlineResults.length} matches)</span>
                  </>
                )}
              </div>

              {offlineResults.map((bag: CatalogBag) => (
                <div
                  key={bag.id}
                  onClick={() => handleSelect(bag)}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                    background: selectedBagId === bag.id ? '#e0f2fe' : '#ffffff',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedBagId !== bag.id) e.currentTarget.style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedBagId !== bag.id) e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '65%' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{bag.name}</span>
                      {selectedBagId === bag.id && <Check size={12} color="#0284c7" />}
                      {bag.id.startsWith('auto-bag-') && (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700 }}>
                          ✨ Auto-Calibrated
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span style={{ background: '#f1f5f9', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                        {bag.brand}
                      </span>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 600 }}>
                        {bag.category}
                      </span>
                      {bag.expansion_gusset_cm > 0 && (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 600 }}>
                          +{bag.expansion_gusset_cm}cm Expandable
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7' }}>
                      {bag.nominal_volume_l} L
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-dark)' }}>
                      {formatDim(bag.length_cm, bag.width_cm, bag.depth_cm)}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Tare: {formatWeight(bag.tare_weight_g)}
                    </span>
                    {onInstantAddBag && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInstantAddBag(bag);
                          setIsOpen(false);
                          setQuery('');
                        }}
                        style={{
                          marginTop: '4px',
                          padding: '3px 9px',
                          borderRadius: '4px',
                          border: 'none',
                          background: 'var(--primary, #0284c7)',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Add Bag
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
