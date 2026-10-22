import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { CatalogProduct, UnitSystem } from '../../types';
import { searchOfflineCatalog, searchOnlineUpcItemDb, getUpcItemDbApiKey, setUpcItemDbApiKey } from '../../services/productLookup';
import { Search, Sparkles, Globe, Database, Loader2, Battery, FlaskConical, Check, X, Key } from 'lucide-react';

interface Props {
  onSelectProduct: (product: CatalogProduct) => void;
  unitSystem: UnitSystem;
}

export const ProductSearchAutocomplete: React.FC<Props> = ({ onSelectProduct, unitSystem }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [onlineResults, setOnlineResults] = useState<CatalogProduct[]>([]);
  const [isLoadingOnline, setIsLoadingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
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

  // Instant offline fuzzy search as user types derived directly during render
  const offlineResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchOfflineCatalog(query);
  }, [query]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setOnlineResults([]);
    setOnlineError(null);
    if (val.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSearchOnline = async () => {
    if (!query.trim() || isLoadingOnline) return;
    setIsLoadingOnline(true);
    setOnlineError(null);

    try {
      const results = await searchOnlineUpcItemDb(query);
      setOnlineResults(results);
      if (results.length === 0) {
        setOnlineError('No product matches found on UPCitemdb.');
      }
    } catch (err: any) {
      setOnlineError(err.message || 'Online query failed. Air-gap fallback engaged.');
    } finally {
      setIsLoadingOnline(false);
    }
  };

  const handleSelect = (product: CatalogProduct) => {
    setSelectedProductId(product.id);
    onSelectProduct(product);
    setQuery(product.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setOnlineResults([]);
    setOnlineError(null);
    setSelectedProductId(null);
    setIsOpen(false);
  };

  const formatMass = (g: number) => {
    if (unitSystem === 'metric') return `${g.toLocaleString()} g`;
    return `${(g * 0.035274).toFixed(1)} oz`;
  };

  const formatDim = (l: number, w: number, d: number) => {
    if (unitSystem === 'metric') return `${l} × ${w} × ${d} cm`;
    return `${(l / 2.54).toFixed(1)} × ${(w / 2.54).toFixed(1)} × ${(d / 2.54).toFixed(1)} in`;
  };

  const handleSaveApiKey = () => {
    setUpcItemDbApiKey(apiKeyInput);
    setShowKeyConfig(false);
  };

  const totalResultsCount = offlineResults.length + onlineResults.length;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', marginBottom: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <label
          htmlFor="catalog-search-input"
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--primary-accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Sparkles size={12} />
          <span>Auto-Fill From Product Database (Instant Spec Lookup)</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Offline catalog + live UPC
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
            UPCitemdb v1 direct searches require a user_key. If not configured, PackMatrix automatically searches our verified offline database and Open Products Facts.
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

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <Search size={14} />
        </div>

        <input
          id="catalog-search-input"
          type="text"
          placeholder="Search products: e.g. Sony WH-1000XM5, MacBook Pro 16, Anker 737, Patagonia..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => {
            if (query.trim() && totalResultsCount > 0) setIsOpen(true);
          }}
          style={{
            width: '100%',
            padding: '0.6rem 2.2rem 0.6rem 2rem',
            borderRadius: '8px',
            border: '1.5px solid var(--border-medium)',
            background: 'var(--surface-dim, #f1f5f9)',
            fontSize: '12.5px',
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

      {/* Floating Autocomplete Dropdown */}
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
            maxHeight: '280px',
            overflowY: 'auto',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* OFFLINE CATALOG SECTION */}
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
                <span>Verified Offline Catalog ({offlineResults.length} matches)</span>
              </div>

              {offlineResults.map((product: CatalogProduct) => (
                <div
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  style={{
                    padding: '8px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                    background: selectedProductId === product.id ? 'var(--primary-container, #e0f2fe)' : '#ffffff',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProductId !== product.id) {
                      e.currentTarget.style.background = 'var(--surface-dim, #f8fafc)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProductId !== product.id) {
                      e.currentTarget.style.background = '#ffffff';
                    }
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '68%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>
                        {product.name}
                      </span>
                      {selectedProductId === product.id && <Check size={12} color="var(--primary-accent)" />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600 }}>{product.brand}</span>
                      <span>·</span>
                      <span style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 600 }}>
                        {product.category}
                      </span>
                      {product.is_battery && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#d97706', fontSize: '9.5px', fontWeight: 600 }}>
                          <Battery size={10} /> {product.battery_wh} Wh
                        </span>
                      )}
                      {product.is_liquid && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#0284c7', fontSize: '9.5px', fontWeight: 600 }}>
                          <FlaskConical size={10} /> {product.liquid_volume_ml} ml
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--primary-accent)' }}>
                      {formatMass(product.weight_g)}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {formatDim(product.length_cm, product.width_cm, product.depth_cm)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ONLINE UPCITEMDB RESULTS SECTION */}
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
                <span>UPCitemdb Live Online Search ({onlineResults.length} matches)</span>
              </div>

              {onlineResults.map((product: CatalogProduct) => (
                <div
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  style={{
                    padding: '8px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                    background: '#ffffff',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-dim, #f8fafc)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '68%' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      {product.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600 }}>{product.brand}</span>
                      <span>·</span>
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 600 }}>
                        {product.category}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a' }}>
                      {formatMass(product.weight_g)}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {formatDim(product.length_cm, product.width_cm, product.depth_cm)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {onlineError && (
            <div style={{ padding: '8px 10px', fontSize: '11px', color: '#b45309', background: '#fef3c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>⚠ {onlineError}</span>
            </div>
          )}

          {/* BOTTOM SEARCH ONLINE BAR */}
          <div
            style={{
              padding: '8px 10px',
              background: '#f8fafc',
              borderTop: '1px solid var(--border-medium)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
              {offlineResults.length === 0 ? 'Not in offline seed catalog?' : 'Need more results?'}
            </span>

            <button
              type="button"
              onClick={handleSearchOnline}
              disabled={isLoadingOnline}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
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
                  <span>Querying Live / UPC...</span>
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
