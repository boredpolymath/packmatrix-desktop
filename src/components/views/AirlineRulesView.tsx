import React, { useState } from 'react';
import type { AirlineRule, LuggageShell, InventoryItem, ServiceTier, UnitSystem } from '../../types';
import {
  Droplet,
  Battery,
  Box,
} from 'lucide-react';

interface Props {
  rules: AirlineRule[];
  activeBag: LuggageShell;
  items: InventoryItem[];
  unitSystem: UnitSystem;
}

const FARE_TIERS: ServiceTier[] = [
  'Personal Item',
  'Standard Economy',
  'Premium Economy',
  'Business/First',
];

export const AirlineRulesView: React.FC<Props> = ({
  rules,
  activeBag,
  items,
  unitSystem,
}) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string>(rules[0]?.id || '');
  const [activeTier, setActiveTier] = useState<ServiceTier>('StandardEconomy' as any);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) || rules[0];

  // Calculate packed weight
  const packedItems = items.filter((i) => i.readiness_state === 'Packed');
  const packedGearWeightKg = packedItems.reduce((acc, i) => acc + i.weight_g, 0) / 1000.0;
  const totalBagWeightKg = (activeBag.tare_weight_g / 1000.0) + packedGearWeightKg;

  // Effective depth with expansion gusset
  const effectiveDepthCm = activeBag.is_expanded
    ? activeBag.depth_cm + activeBag.expansion_gusset_cm
    : activeBag.depth_cm;

  // Gate sizer limit
  const limitL = selectedRule?.carry_on_length_cm || 55.0;
  const limitW = selectedRule?.carry_on_width_cm || 40.0;
  const limitD = selectedRule?.carry_on_depth_cm || 23.0;
  const limitKg = selectedRule?.carry_on_max_weight_kg;

  // Dimensional diffs
  const diffL = activeBag.length_cm - limitL;
  const diffW = activeBag.width_cm - limitW;
  const diffD = effectiveDepthCm - limitD;
  const diffKg = limitKg ? totalBagWeightKg - limitKg : undefined;

  const fitsLength = diffL <= 0;
  const fitsWidth = diffW <= 0;
  const fitsDepth = diffD <= 0;
  const fitsWeight = diffKg !== undefined ? diffKg <= 0 : true;

  const isFullyCompliant = fitsLength && fitsWidth && fitsDepth && fitsWeight;

  // Liquids TSA 3-1-1 evaluation
  const liquidItems = packedItems.filter((i) => i.is_liquid);
  const totalLiquidMl = liquidItems.reduce((acc, i) => acc + i.liquid_volume_ml, 0);
  const oversizedLiquids = liquidItems.filter((i) => i.liquid_volume_ml > 100);
  const isLiquidsOk = totalLiquidMl <= 1000 && oversizedLiquids.length === 0;

  // Battery evaluation
  const batteryItems = packedItems.filter((i) => i.is_battery);

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
            Airline Baggage Rules &amp; Size Limits
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Compare your active bag against airline carry-on sizer dimensions, weight limits, and TSA safety rules
          </p>
        </div>

        {/* 4-tier fare switch */}
        <div style={{ display: 'flex', background: 'var(--surface-dim)', borderRadius: '8px', padding: '3px' }}>
          {FARE_TIERS.map((tier) => (
            <button
              key={tier}
              onClick={() => setActiveTier(tier)}
              style={{
                border: 'none',
                background: activeTier === tier ? 'var(--primary)' : 'transparent',
                color: activeTier === tier ? '#ffffff' : 'var(--text-secondary)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Left Column: Carrier Selector & Gate Sizer Simulation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Carrier Select Card */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.1rem', boxShadow: 'var(--shadow-card)' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              TARGET AIRLINE REGULATION RULE
            </label>
            <select
              value={selectedRule?.id}
              onChange={(e) => setSelectedRuleId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '8px',
                border: '1px solid var(--border-medium)',
                background: 'var(--surface)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {rules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.carrier_name} ({rule.carrier_code}) — {rule.fare_class} [{rule.carry_on_length_cm}×{rule.carry_on_width_cm}×{rule.carry_on_depth_cm} cm]
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              <span>Verified: {selectedRule?.verified_at}</span>
              <span>Class: {selectedRule?.fare_class}</span>
            </div>
          </div>

          {/* Interactive Gate Sizer Simulator Box */}
          <div
            style={{
              background: 'var(--surface-card)',
              border: `1.5px solid ${isFullyCompliant ? '#86efac' : '#fca5a5'}`,
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Box size={18} color={isFullyCompliant ? '#059669' : '#dc2626'} />
                <h3 style={{ fontSize: '14px', fontWeight: 700 }}>
                  Airport Gate Sizer Simulator ({selectedRule?.carrier_code})
                </h3>
              </div>
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  background: isFullyCompliant ? 'rgba(5, 150, 105, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: isFullyCompliant ? '#059669' : '#dc2626',
                  border: `1px solid ${isFullyCompliant ? '#86efac' : '#fca5a5'}`,
                }}
              >
                {isFullyCompliant ? 'PASSES SIZER BOX' : 'OVERSIZED — REJECTED'}
              </span>
            </div>

            {/* Visual 3D Metal Sizer representation */}
            <div
              style={{
                height: '180px',
                background: 'var(--surface-dim)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <svg width="240" height="160" viewBox="0 0 240 160">
                {/* Gate Sizer Outer Metal Frame (Grey dashed) */}
                <rect
                  x="30"
                  y="20"
                  width="180"
                  height="120"
                  rx="6"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                />
                {/* Luggage Bag Box */}
                <rect
                  x="40"
                  y="30"
                  width={diffW > 0 ? "175" : "155"}
                  height={diffL > 0 ? "115" : "100"}
                  rx={activeBag.corner_radius_cm * 2}
                  fill={isFullyCompliant ? "rgba(5, 150, 105, 0.15)" : "rgba(239, 68, 68, 0.2)"}
                  stroke={isFullyCompliant ? "#059669" : "#dc2626"}
                  strokeWidth="2"
                />
                <text x="120" y="75" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">
                  {activeBag.name}
                </text>
                <text x="120" y="92" textAnchor="middle" fontSize="10" fill="#64748b">
                  {formatDim(activeBag.length_cm)} × {formatDim(activeBag.width_cm)} × {formatDim(effectiveDepthCm)}
                </text>
                {activeBag.is_expanded && (
                  <text x="120" y="108" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#d97706">
                    (Zipper Expanded: +{activeBag.expansion_gusset_cm} cm)
                  </text>
                )}
              </svg>
            </div>

            {/* Dimensional Diffs Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '11px' }}>
              <div style={{ background: 'var(--surface)', padding: '6px', borderRadius: '6px', textAlign: 'center' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>LENGTH</span>
                <span style={{ fontWeight: 700, color: fitsLength ? '#059669' : '#dc2626' }}>
                  {fitsLength ? '✓ Fit' : `+${diffL.toFixed(1)} cm`}
                </span>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Max: {limitL} cm</span>
              </div>

              <div style={{ background: 'var(--surface)', padding: '6px', borderRadius: '6px', textAlign: 'center' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>WIDTH</span>
                <span style={{ fontWeight: 700, color: fitsWidth ? '#059669' : '#dc2626' }}>
                  {fitsWidth ? '✓ Fit' : `+${diffW.toFixed(1)} cm`}
                </span>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Max: {limitW} cm</span>
              </div>

              <div style={{ background: 'var(--surface)', padding: '6px', borderRadius: '6px', textAlign: 'center' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>DEPTH</span>
                <span style={{ fontWeight: 700, color: fitsDepth ? '#059669' : '#dc2626' }}>
                  {fitsDepth ? '✓ Fit' : `+${diffD.toFixed(1)} cm`}
                </span>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Max: {limitD} cm</span>
              </div>

              <div style={{ background: 'var(--surface)', padding: '6px', borderRadius: '6px', textAlign: 'center' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>MASS</span>
                <span style={{ fontWeight: 700, color: fitsWeight ? '#059669' : '#dc2626' }}>
                  {diffKg !== undefined ? (fitsWeight ? '✓ Fit' : `+${diffKg.toFixed(1)} kg`) : 'No Limit'}
                </span>
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Bag: {totalBagWeightKg.toFixed(1)} kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: TSA 3-1-1 Liquids Simulator & Battery Safety Checker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* TSA 3-1-1 Liquids Pouch Simulator */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.1rem', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Droplet size={18} color="#0284c7" />
                <h3 style={{ fontSize: '13.5px', fontWeight: 700 }}>TSA / ICAO 3-1-1 Liquids Pouch Simulator</h3>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isLiquidsOk ? 'rgba(5, 150, 105, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: isLiquidsOk ? '#059669' : '#dc2626',
                }}
              >
                {isLiquidsOk ? 'TSA 3-1-1 Compliant' : 'Liquids Non-Compliant'}
              </span>
            </div>

            {/* Pouch Capacity Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Aggregate Liquid Capacity:</span>
                <span style={{ fontWeight: 600 }}>{totalLiquidMl} / 1,000 ml (1-quart envelope)</span>
              </div>
              <div style={{ height: '8px', background: 'var(--surface-dim)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (totalLiquidMl / 1000) * 100)}%`,
                    background: totalLiquidMl > 1000 ? '#ef4444' : '#0284c7',
                  }}
                />
              </div>
            </div>

            {/* Container breakdown */}
            <div style={{ fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {liquidItems.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No liquids currently packed in active bag.</div>
              ) : (
                liquidItems.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--surface)',
                      padding: '5px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    <span>{l.name}</span>
                    <span style={{ fontWeight: 600, color: l.liquid_volume_ml > 100 ? '#dc2626' : '#059669' }}>
                      {l.liquid_volume_ml} ml {l.liquid_volume_ml > 100 ? '(! >100ml limit)' : '✓'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Battery Safety Watt-Hour (Wh) Checker */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.1rem', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Battery size={18} color="#f59e0b" />
                <h3 style={{ fontSize: '13.5px', fontWeight: 700 }}>FAA / ICAO Lithium Battery Safety Checker</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Carry-on only for loose cells
              </span>
            </div>

            <div style={{ fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {batteryItems.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No lithium battery gear detected in pack.</div>
              ) : (
                batteryItems.map((b) => {
                  const wh = b.battery_wh || 0;
                  const needsApproval = wh > 100 && wh <= 160;
                  const isForbidden = wh > 160;

                  return (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--surface)',
                        padding: '6px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{b.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {b.is_spare_cell ? 'Loose Spare Cell (Prohibited in Checked Bags)' : 'Installed in Device'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: isForbidden ? '#dc2626' : needsApproval ? '#d97706' : '#059669' }}>
                          {wh.toFixed(1)} Wh
                        </div>
                        <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                          {isForbidden ? 'Forbidden (>160Wh)' : needsApproval ? 'Prior Approval' : 'Unrestricted'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
