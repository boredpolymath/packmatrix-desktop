import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { CatalogBag, UnitSystem } from '../../types';
import { searchOfflineBagCatalog, searchOnlineBags, getUpcItemDbApiKey, setUpcItemDbApiKey } from '../../services/productLookup';
import { Search, Globe, Database, Loader2, Check, X, Key, Luggage } from 'lucide-react';

interface Props {
  onSelectBag: (bag: CatalogBag) => void;
  unitSystem: UnitSystem;
}

export const BagSearchAutocomplete: React.FC<Props> = ({ onSelectBag, unitSystem }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [onlineResults, setOnlineResults] = useState<CatalogBag[]>([]);
  const [isLoadingOnline, setIsLoadingOnline] = useState(false);
  const [onlineNotice, setOnlineNotice] = useState<string | null>(null);
  const [selectedBagId, setSelectedBagId] = useState<string | null>(null);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getUpcItemDbApiKey());

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowKeyConfig(false);
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

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setOnlineResults([]);
    setOnlineNotice(null);
    if (val.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSearchOnline = async () => {
    if (!query.trim() || isLoadingOnline) return;
    setIsLoadingOnline(true);
    setOnlineNotice(null);

    try {
      const results = await searchOnlineBags(query);
      setOnlineResults(results);
      if (results.length === 0) {
        setOnlineNotice('No external bag matches found. Showing verified catalog.');
      }
    } catch (err: any) {
      setOnlineNotice(err.message || 'Online query error. Using verified catalog.');
    } finally {
      setIsLoadingOnline(false);
    }
  };

  const handleSaveApiKey = () => {
    setUpcItemDbApiKey(apiKeyInput);
    setShowKeyConfig(false);
  };

  const handleSelect = (bag: CatalogBag) => {
    setSelectedBagId(bag.id);
    onSelectBag(bag);
    setQuery(`${bag.brand} ${bag.name}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setOnlineResults([]);
    setOnlineNotice(null);
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

  const totalResultsCount = offlineResults.length + onlineResults.length;

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
          <span>Search Travel Bag Catalog & UPC Barcode</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            60+ verified luggage specs (0ms lookup)
          </span>
          <button
            type="button"
            onClick={() => setShowKeyConfig(!showKeyConfig)}
            title="Configure UPCitemdb user_key"
            style={{
              background: apiKeyInput ? '#e0f2fe' : 'transparent',
              border: '1px solid var(--border-medium)',
              borderRadius: '4px',
              padding: '2px 5px',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              color: apiKeyInput ? '#0369a1' : 'var(--text-secondary)',
            }}
          >
            <Key size={10} />
            <span>{apiKeyInput ? 'API Key Active' : 'API Key'}</span>
          </button>
        </div>
      </div>

      {/* Optional UPCitemdb API Key Configuration Drawer */}
      {showKeyConfig && (
        <div
          style={{
            padding: '10px 12px',
            background: '#f8fafc',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px',
            marginBottom: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '11px',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
            Optional UPCitemdb API Key (user_key)
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
            Direct UPCitemdb searches require a user_key. If unconfigured, PackMatrix automatically searches our verified offline database and Open Products Facts.
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="Paste UPCitemdb user_key..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: '5px',
                border: '1px solid var(--border-medium)',
                fontSize: '11px',
              }}
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              style={{
                padding: '4px 10px',
                background: '#0f172a',
                color: '#ffffff',
                borderRadius: '5px',
                border: 'none',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Main Search Input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <Search size={14} />
        </div>

        <input
          id="bag-catalog-search-input"
          type="text"
          placeholder="Search bag name or brand: e.g. Osprey Farpoint, Peak Design 45L, Away, Rimowa, Aer, Tortuga..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => {
            if (query.trim() && totalResultsCount > 0) setIsOpen(true);
          }}
          style={{
            width: '100%',
            padding: '0.65rem 2.4rem 0.65rem 2.1rem',
            borderRadius: '8px',
            border: '1.5px solid var(--border-medium)',
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
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {totalResultsCount === 0 && !isLoadingOnline && (
            <div style={{ padding: '14px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No bags found matching &ldquo;{query}&rdquo;. Click below to search online or enter measurements manually.
            </div>
          )}

          {/* Offline Verified Bags Section */}
          {offlineResults.length > 0 && (
            <div>
              <div
                style={{
                  padding: '6px 10px',
                  background: 'var(--surface-dim, #f8fafc)',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                <Database size={11} color="var(--primary-accent)" />
                <span>Verified Luggage Database ({offlineResults.length} matches)</span>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '65%' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{bag.name}</span>
                      {selectedBagId === bag.id && <Check size={12} color="#0284c7" />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600 }}>{bag.brand}</span>
                      <span>·</span>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 600 }}>
                        {bag.category}
                      </span>
                      {bag.expansion_gusset_cm > 0 && (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 600 }}>
                          +{bag.expansion_gusset_cm}cm Expandable
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7' }}>
                      {bag.nominal_volume_l} L
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-dark)' }}>
                      {formatDim(bag.length_cm, bag.width_cm, bag.depth_cm)}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Tare: {formatWeight(bag.tare_weight_g)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Online Results Section */}
          {onlineResults.length > 0 && (
            <div>
              <div
                style={{
                  padding: '6px 10px',
                  background: 'var(--surface-dim, #f8fafc)',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--accent-blue)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                <Globe size={11} color="var(--accent-blue)" />
                <span>Online Product Feed Matches ({onlineResults.length})</span>
              </div>

              {onlineResults.map((bag: CatalogBag) => (
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
                    background: '#ffffff',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '65%' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      {bag.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600 }}>{bag.brand}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7' }}>
                      {bag.nominal_volume_l} L
                    </span>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-dark)' }}>
                      {formatDim(bag.length_cm, bag.width_cm, bag.depth_cm)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {onlineNotice && (
            <div style={{ padding: '8px 12px', fontSize: '11px', color: '#b45309', background: '#fef3c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>ℹ {onlineNotice}</span>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div
            style={{
              padding: '8px 12px',
              background: '#f8fafc',
              borderTop: '1px solid var(--border-medium)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
              Selecting a bag auto-populates all 3D geometry specs
            </span>

            <button
              type="button"
              onClick={handleSearchOnline}
              disabled={isLoadingOnline}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-medium)',
                background: '#ffffff',
                color: 'var(--text-dark)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: isLoadingOnline ? 'wait' : 'pointer',
              }}
            >
              {isLoadingOnline ? (
                <>
                  <Loader2 size={12} className="spin-animate" />
                  <span>Searching online...</span>
                </>
              ) : (
                <>
                  <Globe size={12} color="var(--primary-accent)" />
                  <span>Search Online (Live / UPC)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
