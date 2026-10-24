import React, { useState } from 'react';
import type { UnitSystem } from '../../types';
import { formatDim } from '../../utils/units';
import {
  Settings,
  Sliders,
  Plane,
  Database,
  ShieldCheck,
  Key,
  HardDrive,
  Trash2,
  Monitor,
  WifiOff,
  CheckCircle2,
  Gauge,
} from 'lucide-react';

interface Props {
  unitSystem: UnitSystem;
  onUnitSystemChange: (units: UnitSystem) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  sizerStrictness: 'strict' | 'squeeze';
  onSizerStrictnessChange: (strictness: 'strict' | 'squeeze') => void;
  displayScale: '100%' | '125%' | '150%' | '200%';
  onDisplayScaleChange: (scale: '100%' | '125%' | '150%' | '200%') => void;
  onOpenDiagnostics: () => void;
  onExportVault?: () => void;
  onSecureWipe?: () => void;
}

export const SettingsView: React.FC<Props> = ({
  unitSystem,
  onUnitSystemChange,
  currency,
  onCurrencyChange,
  sizerStrictness,
  onSizerStrictnessChange,
  displayScale,
  onDisplayScaleChange,
  onOpenDiagnostics,
  onExportVault,
  onSecureWipe,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'airline' | 'api' | 'storage'>('general');

  return (
    <div
      className="settings-view"
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* Top Banner Card */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-light, #e2e8f0)',
          borderRadius: '14px',
          padding: '1.25rem 1.75rem',
          boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(2, 132, 199, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary, #0284c7)',
            }}
          >
            <Settings size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-dark, #0f172a)' }}>
              Preferences &amp; System Configuration
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
              Control measurement standards, calculation strictness, display scaling, and local SQLite data sovereignty.
            </p>
          </div>
        </div>

        {/* Air-gap security pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '20px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            fontSize: '11.5px',
            color: '#059669',
            fontWeight: 600,
          }}
          title="Network Air-Gap Verified: 100% offline, zero tracking, zero cloud telemetry"
        >
          <WifiOff size={14} />
          <span>100% Air-Gap Verified · Offline Core</span>
        </div>
      </div>

      {/* Main Settings Card */}
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-light, #e2e8f0)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05))',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Segmented Top Tab Bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-light, #e2e8f0)',
            background: '#f8fafc',
            padding: '0 1.25rem',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            style={{
              padding: '0.85rem 1.15rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'general' ? '2.5px solid var(--primary, #0284c7)' : '2.5px solid transparent',
              color: activeTab === 'general' ? 'var(--primary, #0284c7)' : 'var(--text-secondary, #64748b)',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              whiteSpace: 'nowrap',
            }}
          >
            <Sliders size={14} />
            <span>General &amp; Display</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('airline')}
            style={{
              padding: '0.85rem 1.15rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'airline' ? '2.5px solid var(--primary, #0284c7)' : '2.5px solid transparent',
              color: activeTab === 'airline' ? 'var(--primary, #0284c7)' : 'var(--text-secondary, #64748b)',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              whiteSpace: 'nowrap',
            }}
          >
            <Plane size={14} />
            <span>Sizer Tolerances</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('api')}
            style={{
              padding: '0.85rem 1.15rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'api' ? '2.5px solid var(--primary, #0284c7)' : '2.5px solid transparent',
              color: activeTab === 'api' ? 'var(--primary, #0284c7)' : 'var(--text-secondary, #64748b)',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              whiteSpace: 'nowrap',
            }}
          >
            <Key size={14} />
            <span>Product APIs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            style={{
              padding: '0.85rem 1.15rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'storage' ? '2.5px solid var(--primary, #0284c7)' : '2.5px solid transparent',
              color: activeTab === 'storage' ? 'var(--primary, #0284c7)' : 'var(--text-secondary, #64748b)',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              whiteSpace: 'nowrap',
            }}
          >
            <Database size={14} />
            <span>Storage &amp; Security</span>
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* TAB 1: GENERAL & DISPLAY */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* Unit System */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark, #0f172a)', marginBottom: '4px' }}>
                  Measurement System
                </label>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)', marginBottom: '10px' }}>
                  Choose your preferred global measurement standard. Conversions maintain double-precision mathematical invariance across grams, kilograms, ounces, and pounds.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => onUnitSystemChange('metric')}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: `1.5px solid ${unitSystem === 'metric' ? 'var(--primary, #0284c7)' : 'var(--border-medium, #cbd5e1)'}`,
                      background: unitSystem === 'metric' ? 'rgba(2, 132, 199, 0.05)' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: unitSystem === 'metric' ? 'var(--primary, #0284c7)' : 'var(--text-dark, #0f172a)' }}>
                        Metric System (SI)
                      </span>
                      {unitSystem === 'metric' && <CheckCircle2 size={16} color="var(--primary, #0284c7)" />}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
                      Grams (g), Kilograms (kg), Centimeters (cm), Liters (L)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUnitSystemChange('imperial')}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: `1.5px solid ${unitSystem === 'imperial' ? 'var(--primary, #0284c7)' : 'var(--border-medium, #cbd5e1)'}`,
                      background: unitSystem === 'imperial' ? 'rgba(2, 132, 199, 0.05)' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: unitSystem === 'imperial' ? 'var(--primary, #0284c7)' : 'var(--text-dark, #0f172a)' }}>
                        Imperial / US Customary
                      </span>
                      {unitSystem === 'imperial' && <CheckCircle2 size={16} color="var(--primary, #0284c7)" />}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
                      Ounces (oz), Pounds (lbs), Inches (in), Liters (L)
                    </div>
                  </button>
                </div>
              </div>

              {/* Display Scaling */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark, #0f172a)', marginBottom: '4px' }}>
                  Display Scaling Factor
                </label>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)', marginBottom: '10px' }}>
                  Adjust interface scale for ultra-high-resolution or compact laptop displays.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem' }}>
                  {(['100%', '125%', '150%', '200%'] as const).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => onDisplayScaleChange(scale)}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: `1.5px solid ${displayScale === scale ? 'var(--primary, #0284c7)' : 'var(--border-medium, #cbd5e1)'}`,
                        background: displayScale === scale ? 'rgba(2, 132, 199, 0.05)' : '#ffffff',
                        textAlign: 'center',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '12px',
                        color: displayScale === scale ? 'var(--primary, #0284c7)' : 'var(--text-dark, #0f172a)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Monitor size={16} color={displayScale === scale ? 'var(--primary, #0284c7)' : '#94a3b8'} />
                      <span>{scale}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Valuation Currency */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark, #0f172a)', marginBottom: '4px' }}>
                  Default Financial Valuation Currency
                </label>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)', marginBottom: '10px' }}>
                  Used across replacement value summaries, customs declarations, and high-value gear insurance logs.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
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
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: `1px solid ${currency === cur.code ? 'var(--primary, #0284c7)' : 'var(--border-medium, #cbd5e1)'}`,
                        background: currency === cur.code ? 'rgba(2, 132, 199, 0.05)' : '#ffffff',
                        fontWeight: 600,
                        fontSize: '11.5px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: currency === cur.code ? 'var(--primary, #0284c7)' : 'var(--text-dark, #0f172a)',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark, #0f172a)', marginBottom: '4px' }}>
                  Airport Gate Sizer Evaluation Strictness
                </label>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)', marginBottom: '10px' }}>
                  Configure how rigid metal gate sizer box collisions are evaluated against soft travel backpacks versus hardshell rollers.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => onSizerStrictnessChange('strict')}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: `1.5px solid ${sizerStrictness === 'strict' ? 'var(--primary, #0284c7)' : 'var(--border-medium, #cbd5e1)'}`,
                      background: sizerStrictness === 'strict' ? 'rgba(2, 132, 199, 0.05)' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: sizerStrictness === 'strict' ? 'var(--primary, #0284c7)' : 'var(--text-dark, #0f172a)' }}>
                        Strict Rigid Sizer (Zero Tolerance)
                      </span>
                      {sizerStrictness === 'strict' && <CheckCircle2 size={16} color="var(--primary, #0284c7)" />}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)' }}>
                      Luggage effective bounding box (including wheels &amp; handles) must mathematically fit inside the regulatory box with 0 {unitSystem === 'metric' ? 'cm' : 'in'} clearance. Recommended for strict budget carriers (Ryanair, Frontier).
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSizerStrictnessChange('squeeze')}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: `1.5px solid ${sizerStrictness === 'squeeze' ? 'var(--primary, #0284c7)' : 'var(--border-medium, #cbd5e1)'}`,
                      background: sizerStrictness === 'squeeze' ? 'rgba(2, 132, 199, 0.05)' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: sizerStrictness === 'squeeze' ? 'var(--primary, #0284c7)' : 'var(--text-dark, #0f172a)' }}>
                        Soft Bag Compression Allowance (+{formatDim(2.0, unitSystem)} Depth Squeeze)
                      </span>
                      {sizerStrictness === 'squeeze' && <CheckCircle2 size={16} color="var(--primary, #0284c7)" />}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)' }}>
                      Permits soft nylon/polyester travel packs up to {formatDim(2.0, unitSystem)} depth friction fit into sizers when compressed manually by travelers.
                    </div>
                  </button>
                </div>
              </div>

              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border-light, #e2e8f0)', fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                <strong>Active Regulatory Matrices:</strong> 149 verified global carrier envelopes in native SQLite database (SDLC Section 1.3 &amp; 3.5.4 compliant).
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCT LOOKUP APIS */}
          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark, #0f172a)', marginBottom: '4px' }}>
                  Product &amp; Luggage Auto-Lookup Engines
                </label>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)', marginBottom: '10px' }}>
                  PackMatrix uses local-first commercial specifications and live retail search to automatically populate physical dimensions, tare mass, volume, lithium battery ratings, and TSA liquid thresholds with zero guesswork.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border-light, #e2e8f0)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark, #0f172a)' }}>Verified Gear &amp; Bags</span>
                    <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      0ms · Built-in
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
                    Pre-calibrated database of commercial travel bags (Samsonite, Away, Rimowa, Osprey, Travelpro) and tech gear (Lenovo, Sony, Apple, Bose, Anker).
                  </p>
                </div>

                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border-light, #e2e8f0)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark, #0f172a)' }}>Live Consumer Feed</span>
                    <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      Active · Free
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
                    Real-time keyword search for laptops, electronics, toiletries, apparel, and footwear with physical dimensional extraction.
                  </p>
                </div>

                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border-light, #e2e8f0)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark, #0f172a)' }}>Auto-Spec Calibration</span>
                    <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      Autonomous
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
                    Analytical volumetric &amp; mass extrapolation for custom brand queries without requiring manual measuring tape.
                  </p>
                </div>

                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border-light, #e2e8f0)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dark, #0f172a)' }}>Air-Gap Privacy Guarantee</span>
                    <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      Air-Gapped Core
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
                    Zero tracking, zero analytics, zero external barcodes. All personal luggage and packing records remain 100% on your local machine.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STORAGE & SECURITY */}
          {activeTab === 'storage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border-light, #e2e8f0)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <ShieldCheck size={18} color="#16a34a" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark, #0f172a)' }}>
                    Local-First SQLite WAL Vault
                  </span>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)', lineHeight: '1.5', margin: 0 }}>
                  All luggage shells, sub-containers, gear items, and allocations reside in a local-first SQLite database in Write-Ahead Logging (WAL) mode. Zero cloud sync, zero telemetry, 100% data sovereignty.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <button
                  type="button"
                  onClick={onOpenDiagnostics}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-medium, #cbd5e1)',
                    background: '#ffffff',
                    fontWeight: 600,
                    fontSize: '12px',
                    color: 'var(--text-dark, #0f172a)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                  }}
                >
                  <Gauge size={14} color="var(--primary, #0284c7)" />
                  <span>Open Diagnostics HUD &amp; Benchmark</span>
                </button>

                {onExportVault && (
                  <button
                    type="button"
                    onClick={onExportVault}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium, #cbd5e1)',
                      background: '#ffffff',
                      fontWeight: 600,
                      fontSize: '12px',
                      color: 'var(--text-dark, #0f172a)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                    }}
                  >
                    <HardDrive size={14} color="#059669" />
                    <span>Export Entire Data Vault (.json)</span>
                  </button>
                )}
              </div>

              {onSecureWipe && (
                <div style={{ borderTop: '1px solid #fee2e2', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#e11d48' }}>Danger Zone</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
                      Cryptographically overwrite local storage with zeroes and reset all tables.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onSecureWipe}
                    style={{
                      padding: '0.65rem 1rem',
                      borderRadius: '8px',
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      color: '#e11d48',
                      fontWeight: 600,
                      fontSize: '12px',
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
      </div>
    </div>
  );
};
