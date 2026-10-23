import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { CatalogProduct, UnitSystem } from '../../types';
import { searchOfflineCatalog, searchOnlineProducts } from '../../services/productLookup';
import { Search, Sparkles, Globe, Database, Loader2, Battery, FlaskConical, Check, X } from 'lucide-react';

interface Props {
  onSelectProduct: (product: CatalogProduct) => void;
  unitSystem: UnitSystem;
  onInstantAddProduct?: (product: CatalogProduct) => void;
}

export const ProductSearchAutocomplete: React.FC<Props> = ({
  onSelectProduct,
  unitSystem,
  onInstantAddProduct,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [onlineResults, setOnlineResults] = useState<CatalogProduct[]>([]);
  const [isLoadingOnline, setIsLoadingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

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

  // Instant offline search as user types
  const offlineResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchOfflineCatalog(query);
  }, [query]);

  // Detect dominant brand for heading menu
  const primaryBrand = useMemo(() => {
    if (offlineResults.length === 0) return null;
    const firstBrand = offlineResults[0].brand;
    const sameBrandCount = offlineResults.filter((p) => p.brand.toLowerCase() === firstBrand.toLowerCase()).length;
    return sameBrandCount >= 2 || firstBrand.toLowerCase() === query.trim().toLowerCase() ? firstBrand : null;
  }, [offlineResults, query]);

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
      const results = await searchOnlineProducts(query);
      setOnlineResults(results);
      if (results.length === 0) {
        setOnlineError('No product matches found on online catalogs.');
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
          <span>Product Search & Auto-Calibration</span>
        </label>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Search brands (Lenovo, Sony, Apple, Bose, Anker, Patagonia) or gear names
        </span>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <Search size={14} />
        </div>

        <input
          id="catalog-search-input"
          type="text"
          placeholder="Search products: e.g. Lenovo, Sony, ThinkPad X1, WH-1000XM5, Patagonia, Anker..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => {
            if (query.trim() && totalResultsCount > 0) setIsOpen(true);
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

      {/* DROPDOWN RESULTS MENU */}
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
          {totalResultsCount === 0 && !isLoadingOnline && (
            <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No catalog products matching &ldquo;{query}&rdquo;.
            </div>
          )}

          {/* OFFLINE VERIFIED PRODUCTS SECTION */}
          {offlineResults.length > 0 && (
            <div>
              <div
                style={{
                  padding: '7px 12px',
                  background: primaryBrand ? '#eff6ff' : 'var(--surface-dim, #f8fafc)',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: primaryBrand ? '#1d4ed8' : 'var(--text-secondary)',
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
                    <Sparkles size={12} color="#2563eb" />
                    <span>{primaryBrand} Menu ({offlineResults.filter(p => p.brand.toLowerCase() === primaryBrand.toLowerCase()).length} models)</span>
                  </>
                ) : (
                  <>
                    <Database size={11} color="var(--primary-accent)" />
                    <span>Verified Gear Catalog ({offlineResults.length} matches)</span>
                  </>
                )}
              </div>

              {offlineResults.map((product: CatalogProduct) => (
                <div
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                    background: selectedProductId === product.id ? '#e0f2fe' : '#ffffff',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProductId !== product.id) e.currentTarget.style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProductId !== product.id) e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '68%' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{product.name}</span>
                      {selectedProductId === product.id && <Check size={12} color="#0284c7" />}
                      {product.id.startsWith('auto-prod-') && (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700 }}>
                          ✨ Auto-Calibrated
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span style={{ background: '#f1f5f9', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                        {product.brand}
                      </span>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 600 }}>
                        {product.category}
                      </span>
                      {product.is_battery && product.battery_wh > 0 && (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Battery size={10} />
                          {product.battery_wh} Wh
                        </span>
                      )}
                      {product.is_liquid && product.liquid_volume_ml > 0 && (
                        <span style={{ background: '#ecfdf5', color: '#047857', padding: '1px 5px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <FlaskConical size={10} />
                          {product.liquid_volume_ml} ml
                        </span>
                      )}
                      {product.monetary_value > 0 && (
                        <span style={{ color: '#64748b', fontSize: '10px' }}>
                          ${product.monetary_value}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#16a34a' }}>
                      {formatMass(product.weight_g)}
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-dark)' }}>
                      {formatDim(product.length_cm, product.width_cm, product.depth_cm)}
                    </span>
                    {onInstantAddProduct && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInstantAddProduct(product);
                          setIsOpen(false);
                          setQuery('');
                        }}
                        style={{
                          marginTop: '4px',
                          padding: '3px 9px',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Add Item
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ONLINE RESULTS SECTION */}
          {onlineResults.length > 0 && (
            <div>
              <div
                style={{
                  padding: '6px 12px',
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
                <span>Live Online Product Search ({onlineResults.length} matches)</span>
              </div>

              {onlineResults.map((product: CatalogProduct) => (
                <div
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                    background: '#ffffff',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-dim, #f8fafc)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '72%' }}>
                    {product.thumbnail && (
                      <img
                        src={product.thumbnail}
                        alt=""
                        style={{
                          width: '32px',
                          height: '32px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a' }}>
                      {formatMass(product.weight_g)}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {formatDim(product.length_cm, product.width_cm, product.depth_cm)}
                    </span>
                    {onInstantAddProduct && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInstantAddProduct(product);
                          setIsOpen(false);
                          setQuery('');
                        }}
                        style={{
                          marginTop: '4px',
                          padding: '3px 9px',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Add Item
                      </button>
                    )}
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
              padding: '8px 12px',
              background: '#f8fafc',
              borderTop: '1px solid var(--border-medium)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
              {offlineResults.length === 0 ? 'Not found in offline catalog?' : 'Need more results?'}
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
                  <span>Searching Online...</span>
                </>
              ) : (
                <>
                  <Globe size={12} color="var(--primary-accent)" />
                  <span>Search Online Catalog</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
