import React, { useState, useMemo } from 'react';
import type { InventoryItem, LuggageShell, UnitSystem } from '../../types';
import { ShieldCheck, Trash2 } from 'lucide-react';

export interface PrintableManifestProps {
  items: InventoryItem[];
  activeBag: LuggageShell;
  unitSystem: UnitSystem;
  manifestDate?: string | undefined;
  manifestSerial?: string | undefined;
  className?: string | undefined;
  id?: string | undefined;
  onTogglePacked?: ((id: string) => void) | undefined;
  onRemoveItem?: ((id: string) => void) | undefined;
}

export const PrintableManifest: React.FC<PrintableManifestProps> = ({
  items,
  activeBag,
  unitSystem,
  manifestDate,
  manifestSerial,
  className = '',
  id = 'printable-manifest',
  onTogglePacked,
  onRemoveItem,
}) => {
  const [defaultDate] = useState(() => new Date().toLocaleDateString());
  const [filterMode, setFilterMode] = useState<'all' | 'packed'>('all');

  const displayDate = manifestDate || defaultDate;
  const displaySerial = useMemo(
    () => manifestSerial || `PM-MAN-${activeBag.id.slice(-6).toUpperCase()}`,
    [manifestSerial, activeBag.id]
  );

  const packedItems = useMemo(
    () => items.filter((i) => i.readiness_state === 'Packed' || i.packed),
    [items]
  );

  const displayedItems = useMemo(() => {
    if (filterMode === 'packed') {
      return packedItems;
    }
    return items;
  }, [filterMode, packedItems, items]);

  const totalWeightG = packedItems.reduce((acc, i) => acc + i.weight_g, 0);
  const totalValue = packedItems.reduce((acc, i) => acc + i.monetary_value, 0);

  const hasActions = Boolean(onTogglePacked || onRemoveItem);

  return (
    <div
      id={id}
      className={`printable-manifest ${className}`}
      style={{
        background: '#ffffff',
        color: '#0f172a',
        borderRadius: '12px',
        border: '1px solid var(--border-light, #e2e8f0)',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-card, 0 1px 3px 0 rgba(0, 0, 0, 0.1))',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div
        className="manifest-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderBottom: '2px solid #0f172a',
          paddingBottom: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#0f172a',
              margin: 0,
            }}
          >
            PACKMATRIX OFFICIAL TRAVEL MANIFEST
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', marginBottom: 0 }}>
            International Customs &amp; Baggage Security Declaration · Air-Gapped Verification Token
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#475569' }}>
          <div>Date Generated: {displayDate}</div>
          <div>
            Active Bag: <strong>{activeBag.name}</strong>
          </div>
          <div>
            Serial Reference: <strong>{displaySerial}</strong>
          </div>
        </div>
      </div>

      {/* Telemetry Summary Strip */}
      <div
        className="manifest-telemetry"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          background: '#f8fafc',
          padding: '1rem',
          borderRadius: '8px',
        }}
      >
        <div>
          <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
            TOTAL PACKED ITEMS
          </span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            {packedItems.length} units
            {items.length !== packedItems.length && (
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>
                ({items.length} total)
              </span>
            )}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
            GROSS GEAR WEIGHT
          </span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            {unitSystem === 'metric'
              ? `${(totalWeightG / 1000).toFixed(2)} kg`
              : `${(totalWeightG * 0.00220462).toFixed(2)} lbs`}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
            TOTAL REPLACEMENT VALUATION
          </span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>
            ${totalValue.toLocaleString()} USD
          </span>
        </div>
        <div>
          <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
            SECURITY PROFILE
          </span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '3px',
            }}
          >
            <ShieldCheck size={14} /> TS/ICAO Cleared
          </span>
        </div>
      </div>

      {/* Interactive Manifest Filter Toolbar (Hidden in Print) */}
      {hasActions && (
        <div
          className="manifest-filter-bar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
              Manifest Filter:
            </span>
            <div
              style={{
                display: 'inline-flex',
                background: '#e2e8f0',
                padding: '2px',
                borderRadius: '6px',
                gap: '2px',
              }}
            >
              <button
                type="button"
                className={`manifest-filter-pill ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: filterMode === 'all' ? '#0284c7' : 'transparent',
                  color: filterMode === 'all' ? '#ffffff' : '#475569',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                All Gear ({items.length})
              </button>
              <button
                type="button"
                className={`manifest-filter-pill ${filterMode === 'packed' ? 'active' : ''}`}
                onClick={() => setFilterMode('packed')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: filterMode === 'packed' ? '#0284c7' : 'transparent',
                  color: filterMode === 'packed' ? '#ffffff' : '#475569',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Packed Only ({packedItems.length})
              </button>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            💡 Toggle items to remove or pack them into this manifest
          </span>
        </div>
      )}

      {/* Items Table */}
      <table
        className="manifest-table"
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}
      >
        <thead>
          <tr style={{ borderBottom: '1.5px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
            <th style={{ padding: '6px 8px' }}>ITEM &amp; BRAND</th>
            <th style={{ padding: '6px 8px' }}>CATEGORY</th>
            <th style={{ padding: '6px 8px' }}>MASS</th>
            <th style={{ padding: '6px 8px' }}>SERIAL NO.</th>
            <th style={{ padding: '6px 8px' }}>STATUS</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>DECL. VALUE</th>
            {hasActions && (
              <th
                className="manifest-actions-col"
                style={{ padding: '6px 8px', textAlign: 'center', width: '170px' }}
              >
                MANIFEST TOGGLE
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {displayedItems.length === 0 ? (
            <tr>
              <td
                colSpan={hasActions ? 7 : 6}
                style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}
              >
                {items.length === 0
                  ? 'No gear items in manifest. Add items to begin.'
                  : 'No items currently packed in this manifest. Switch filter to "All Gear" to toggle items.'}
              </td>
            </tr>
          ) : (
            displayedItems.map((i) => {
              const isPacked = i.readiness_state === 'Packed' || i.packed;
              return (
                <tr
                  key={i.id}
                  className={!isPacked ? 'manifest-row-unpacked' : ''}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: isPacked ? 'transparent' : '#f8fafc',
                    opacity: isPacked ? 1 : 0.65,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>
                    <span style={{ textDecoration: !isPacked ? 'line-through' : 'none' }}>
                      {i.name}
                    </span>
                    {i.brand && (
                      <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                        ({i.brand})
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#334155' }}>{i.category}</td>
                  <td style={{ padding: '6px 8px', color: '#334155' }}>{i.weight_g} g</td>
                  <td
                    style={{
                      padding: '6px 8px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#64748b',
                    }}
                  >
                    {i.serial_number || '—'}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: isPacked ? '#dcfce7' : '#f1f5f9',
                        color: isPacked ? '#15803d' : '#64748b',
                      }}
                    >
                      {isPacked ? 'Packed' : 'Removed'}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    ${i.monetary_value}
                  </td>
                  {hasActions && (
                    <td
                      className="manifest-actions-cell"
                      style={{ padding: '6px 8px', textAlign: 'center' }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        {onTogglePacked && (
                          <button
                            type="button"
                            className="manifest-toggle-btn"
                            onClick={() => onTogglePacked(i.id)}
                            role="switch"
                            aria-checked={isPacked}
                            aria-label={
                              isPacked
                                ? `Remove ${i.name} from bag manifest`
                                : `Pack ${i.name} into bag manifest`
                            }
                            title={
                              isPacked
                                ? 'Click to remove from bag manifest'
                                : 'Click to pack into bag manifest'
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '20px',
                              border: isPacked ? '1px solid #86efac' : '1px solid #cbd5e1',
                              background: isPacked ? '#ecfdf5' : '#f1f5f9',
                              color: isPacked ? '#047857' : '#64748b',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: isPacked ? '#10b981' : '#94a3b8',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontSize: '8px',
                                fontWeight: 900,
                              }}
                            >
                              {isPacked ? '✓' : '×'}
                            </span>
                            <span>{isPacked ? 'Packed' : 'Removed'}</span>
                          </button>
                        )}
                        {onRemoveItem && (
                          <button
                            type="button"
                            className="manifest-remove-btn"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Permanently remove "${i.name}" from the manifest and gear inventory?`
                                )
                              ) {
                                onRemoveItem(i.id);
                              }
                            }}
                            aria-label={`Permanently delete ${i.name} from manifest`}
                            title="Permanently delete item from manifest"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px 6px',
                              borderRadius: '5px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Declaration Footer */}
      <div
        className="manifest-footer"
        style={{
          borderTop: '1px solid #cbd5e1',
          paddingTop: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#64748b',
        }}
      >
        <p style={{ maxWidth: '480px', margin: 0 }}>
          I hereby certify that the contents listed above represent an accurate account of travel
          gear and personal property contained within the referenced luggage shell, containing zero
          undeclared hazardous materials or forbidden lithium cells.
        </p>
        <div style={{ textAlign: 'right' }}>
          <div style={{ height: '30px', borderBottom: '1px solid #94a3b8', width: '160px' }}></div>
          <div style={{ marginTop: '4px' }}>Passenger Signature</div>
        </div>
      </div>
    </div>
  );
};
