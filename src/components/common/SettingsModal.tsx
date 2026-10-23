import React, { useState } from 'react';
import type { UnitSystem } from '../../types';
import { formatDim } from '../../utils/units';
import {
  Settings,
  X,
  Sliders,
  Plane,
  Database,
  ShieldCheck,
  Key,
  HardDrive,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  unitSystem: UnitSystem;
  onUnitSystemChange: (units: UnitSystem) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  sizerStrictness: 'strict' | 'squeeze';
  onSizerStrictnessChange: (strictness: 'strict' | 'squeeze') => void;
  onOpenDiagnostics: () => void;
  onExportVault?: () => void;
  onSecureWipe?: () => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  unitSystem,
  onUnitSystemChange,
  currency,
  onCurrencyChange,
  sizerStrictness,
  onSizerStrictnessChange,
  onOpenDiagnostics,
  onExportVault,
  onSecureWipe,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'airline' | 'api' | 'storage'>('general');

  if (!isOpen) return null;

  return (
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
        zIndex: 1200,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--border-medium)',
          width: '740px',
          maxWidth: '92vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-accent)',
              }}
            >
              <Settings size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)' }}>
                Preferences &amp; System Configuration
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Control measurement units, calculation tolerances, API connections, and database health
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-light)',
            background: '#f8fafc',
            padding: '0 1rem',
          }}
        >
          <button
            onClick={() => setActiveTab('general')}
            style={{
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'general' ? '2px solid var(--primary-accent)' : '2px solid transparent',
              color: activeTab === 'general' ? 'var(--primary-accent)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sliders size={13} />
            <span>General &amp; Units</span>
          </button>

          <button
            onClick={() => setActiveTab('airline')}
            style={{
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'airline' ? '2px solid var(--primary-accent)' : '2px solid transparent',
              color: activeTab === 'airline' ? 'var(--primary-accent)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plane size={13} />
            <span>Sizer Tolerances</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            style={{
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'api' ? '2px solid var(--primary-accent)' : '2px solid transparent',
              color: activeTab === 'api' ? 'var(--primary-accent)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Key size={13} />
            <span>Product APIs</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            style={{
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'storage' ? '2px solid var(--primary-accent)' : '2px solid transparent',
              color: activeTab === 'storage' ? 'var(--primary-accent)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Database size={13} />
            <span>Storage &amp; Security</span>
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* TAB 1: GENERAL & UNITS */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>
                  Measurement System
                </label>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Choose your preferred global measurement standard. Conversions maintain double-precision mathematical invariance.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => onUnitSystemChange('metric')}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: `1.5px solid ${unitSystem === 'metric' ? 'var(--primary-accent)' : 'var(--border-medium)'}`,
                      background: unitSystem === 'metric' ? '#eff6ff' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12.5px', color: unitSystem === 'metric' ? 'var(--primary-accent)' : 'var(--text-dark)' }}>
                      Metric System (SI)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Grams (g), Kilograms (kg), Centimeters (cm), Liters (L)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUnitSystemChange('imperial')}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: `1.5px solid ${unitSystem === 'imperial' ? 'var(--primary-accent)' : 'var(--border-medium)'}`,
                      background: unitSystem === 'imperial' ? '#eff6ff' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12.5px', color: unitSystem === 'imperial' ? 'var(--primary-accent)' : 'var(--text-dark)' }}>
                      Imperial / US Customary
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Ounces (oz), Pounds (lbs), Inches (in), Liters (L)
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>
                  Default Financial Valuation Currency
                </label>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Used across replacement value summaries, customs declarations, and high-value gear insurance logs.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { code: 'USD', label: 'USD ($) — US Dollar' },
                    { code: 'EUR', label: 'EUR (€) — Euro' },
                    { code: 'GBP', label: 'GBP (£) — British Pound' },
                    { code: 'JPY', label: 'JPY (¥) — Japanese Yen' },
                    { code: 'CAD', label: 'CAD ($) — Canadian Dollar' },
                    { code: 'AUD', label: 'AUD ($) — Australian Dollar' },
                  ].map((cur) => (
                    <button
                      key={cur.code}
                      type="button"
                      onClick={() => onCurrencyChange(cur.code)}
                      style={{
                        padding: '0.55rem 0.75rem',
                        borderRadius: '6px',
                        border: `1px solid ${currency === cur.code ? 'var(--primary-accent)' : 'var(--border-medium)'}`,
                        background: currency === cur.code ? '#eff6ff' : '#ffffff',
                        fontWeight: 600,
                        fontSize: '11.5px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      {cur.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AIRLINE SIZER TOLERANCES */}
          {activeTab === 'airline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>
                  Airport Gate Sizer Evaluation Strictness
                </label>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Configure how rigid metal gate sizer box collisions are evaluated against soft travel backpacks versus hardshell rollers.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => onSizerStrictnessChange('strict')}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: `1.5px solid ${sizerStrictness === 'strict' ? 'var(--primary-accent)' : 'var(--border-medium)'}`,
                      background: sizerStrictness === 'strict' ? '#eff6ff' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12.5px', color: sizerStrictness === 'strict' ? 'var(--primary-accent)' : 'var(--text-dark)' }}>
                      Strict Rigid Sizer (Zero Tolerance)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Luggage effective bounding box (including wheels &amp; handles) must mathematically fit inside the regulatory box with 0 {unitSystem === 'metric' ? 'cm' : 'in'} clearance. Recommended for strict budget carriers (Ryanair, Frontier).
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSizerStrictnessChange('squeeze')}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: `1.5px solid ${sizerStrictness === 'squeeze' ? 'var(--primary-accent)' : 'var(--border-medium)'}`,
                      background: sizerStrictness === 'squeeze' ? '#eff6ff' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12.5px', color: sizerStrictness === 'squeeze' ? 'var(--primary-accent)' : 'var(--text-dark)' }}>
                      Soft Bag Compression Allowance (+{formatDim(2.0, unitSystem)} Depth Squeeze)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Permits soft nylon/polyester travel packs up to {formatDim(2.0, unitSystem)} depth friction fit into sizers when compressed manually by travelers.
                    </div>
                  </button>
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                <strong>Active Regulatory Matrices:</strong> 149 verified global carrier envelopes in native SQLite database (SDLC Section 1.3 &amp; 3.5.4 compliant).
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCT LOOKUP APIS */}
          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>
                  Product &amp; Luggage Auto-Lookup Engines
                </label>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  PackMatrix uses local-first commercial specifications and live retail search to automatically populate physical dimensions, tare mass, volume, lithium battery ratings, and TSA liquid thresholds with zero guesswork.
                </p>
              </div>

              {/* Data Sources Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Registered Lookup Engines
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>Verified Gear &amp; Bags</span>
                      <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                        0ms · Built-in
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Pre-calibrated database of commercial travel bags (Samsonite, Away, Rimowa, Osprey, Travelpro) and tech gear (Lenovo, Sony, Apple, Bose, Anker).
                    </p>
                  </div>

                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>Live Consumer Feed</span>
                      <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                        Active · Free
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Real-time keyword search for laptops, electronics, toiletries, apparel, and footwear with physical dimensional extraction.
                    </p>
                  </div>

                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>Auto-Spec Calibration</span>
                      <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                        Autonomous
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Analytical volumetric &amp; mass extrapolation for custom brand queries without requiring manual measuring tape.
                    </p>
                  </div>

                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>Air-Gap Privacy Guarantee</span>
                      <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                        Air-Gapped Core
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Zero tracking, zero analytics, zero external barcodes. All personal luggage and packing records remain 100% on your local machine.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STORAGE & SECURITY */}
          {activeTab === 'storage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <ShieldCheck size={16} color="#16a34a" />
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark)' }}>
                    Local-First SQLite WAL Vault
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  All luggage shells, sub-containers, gear items, and allocations reside in a local-first SQLite database in Write-Ahead Logging (WAL) mode. Zero cloud sync, zero telemetry, 100% data sovereignty.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDiagnostics();
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-medium)',
                    background: '#ffffff',
                    fontWeight: 600,
                    fontSize: '12px',
                    color: 'var(--text-dark)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={13} color="var(--primary-accent)" />
                  <span>Run PRAGMA Diagnostics</span>
                </button>

                {onExportVault && (
                  <button
                    type="button"
                    onClick={onExportVault}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium)',
                      background: '#ffffff',
                      fontWeight: 600,
                      fontSize: '12px',
                      color: 'var(--text-dark)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <HardDrive size={13} color="#059669" />
                    <span>Export Entire Data Vault</span>
                  </button>
                )}
              </div>

              {onSecureWipe && (
                <div style={{ borderTop: '1px solid #fee2e2', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={onSecureWipe}
                    style={{
                      padding: '0.6rem 1rem',
                      borderRadius: '8px',
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      color: '#e11d48',
                      fontWeight: 600,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Cryptographic Zero-Fill Secure Wipe &amp; Reset</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-light)',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
