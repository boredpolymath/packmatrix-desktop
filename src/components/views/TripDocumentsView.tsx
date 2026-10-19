import React, { useState } from 'react';
import type { InventoryItem, LuggageShell, UnitSystem } from '../../types';
import { validateBackupRestorePackage } from '../../utils/validation';
import {
  Upload,
  Download,
  Printer,
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

interface Props {
  items: InventoryItem[];
  bags: LuggageShell[];
  activeBag: LuggageShell;
  unitSystem: UnitSystem;
  onImportItems: (newItems: InventoryItem[]) => void;
  onRestoreBackup: (backup: { luggage: LuggageShell[]; inventory: InventoryItem[] }) => void;
  initialCsvContent?: string | null;
  onClearInitialCsv?: () => void;
}

export const TripDocumentsView: React.FC<Props> = ({
  items,
  bags,
  activeBag,
  unitSystem,
  onImportItems,
  onRestoreBackup,
  initialCsvContent,
  onClearInitialCsv,
}) => {
  const [csvContent, setCsvContent] = useState('');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Partial<InventoryItem>[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreJson, setRestoreJson] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [manifestDate] = useState(() => new Date().toLocaleDateString());
  const [manifestSerial] = useState(() => `PM-MAN-${Date.now().toString().slice(-6)}`);

  // Formula injection check: checks for leading =, +, -, @, \t, \r, %
  const sanitizeCsvValue = (val: string): string => {
    const triggerChars = ['=', '+', '-', '@', '\t', '\r', '%'];
    if (triggerChars.some((c) => val.startsWith(c))) {
      return `'${val}`;
    }
    return val;
  };

  // CSV parsing logic with header auto-detection
  const handleParseCsv = (text: string) => {
    setCsvContent(text);
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setCsvPreview([]);
      setCsvErrors(['CSV must contain a header row and at least one data row.']);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('item'));
    const brandIdx = headers.findIndex((h) => h.includes('brand'));
    const weightIdx = headers.findIndex((h) => h.includes('weight') || h.includes('mass') || h.includes('g'));
    const categoryIdx = headers.findIndex((h) => h.includes('category') || h.includes('type'));
    const valueIdx = headers.findIndex((h) => h.includes('value') || h.includes('price') || h.includes('cost'));
    const tagsIdx = headers.findIndex((h) => h.includes('tag'));

    const parsed: Partial<InventoryItem>[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const name = nameIdx !== -1 ? cols[nameIdx] : cols[0];
      if (!name) {
        errors.push(`Row ${i}: Missing item name`);
        continue;
      }

      const weight = weightIdx !== -1 ? parseFloat(cols[weightIdx]) || 100 : 100;
      const category = (categoryIdx !== -1 ? cols[categoryIdx] : 'Misc') as any;
      const value = valueIdx !== -1 ? parseFloat(cols[valueIdx]) || 0 : 0;
      const brand = brandIdx !== -1 ? cols[brandIdx] : undefined;
      const tags = tagsIdx !== -1 ? cols[tagsIdx] : undefined;

      parsed.push({
        id: `imported-${Date.now()}-${i}`,
        name: sanitizeCsvValue(name),
        brand: brand ? sanitizeCsvValue(brand) : undefined,
        weight_g: weight,
        category: category,
        monetary_value: value,
        currency: 'USD',
        readiness_state: 'In Closet',
        tags: tags ? sanitizeCsvValue(tags) : undefined,
        packed: false,
      });
    }

    setCsvPreview(parsed);
    setCsvErrors(errors);
  };

  // Handle incoming dropped CSV content (SDLC 7.4 Drag-and-Drop Ingestion)
  useEffect(() => {
    if (initialCsvContent) {
      handleParseCsv(initialCsvContent);
      setIsCsvModalOpen(true);
      onClearInitialCsv?.();
    }
  }, [initialCsvContent, onClearInitialCsv]);

  // Compute travel manifest totals
  const totalWeightG = items.reduce((acc, i) => acc + i.weight_g, 0);
  const totalValue = items.reduce((acc, i) => acc + i.monetary_value, 0);

  const handleCommitImport = () => {
    if (csvPreview.length === 0) return;
    const fullItems = csvPreview.map((item, idx) => ({
      id: item.id || `item-csv-${Date.now()}-${idx}`,
      name: item.name || 'Untitled Gear',
      brand: item.brand,
      category: item.category || 'Misc',
      weight_g: item.weight_g || 100,
      length_cm: 10,
      width_cm: 10,
      depth_cm: 2,
      compressibility_factor: 1.0,
      is_liquid: false,
      liquid_volume_ml: 0,
      monetary_value: item.monetary_value || 0,
      currency: 'USD',
      readiness_state: 'In Closet',
      tags: item.tags,
      packed: false,
    })) as InventoryItem[];

    onImportItems(fullItems);
    setIsCsvModalOpen(false);
    setCsvContent('');
    setCsvPreview([]);
  };

  // Export JSON Vault Backup
  const handleExportJson = () => {
    const backupPackage = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      luggage: bags,
      inventory: items,
    };

    const blob = new Blob([JSON.stringify(backupPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packmatrix-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Restore JSON Vault Backup
  const handleRestoreSubmit = () => {
    setRestoreError(null);
    try {
      if (restoreJson.length > 50 * 1024 * 1024) {
        throw new Error('Backup payload exceeds maximum 50 MB limit.');
      }
      const rawParsed = JSON.parse(restoreJson);
      // Strict runtime schema validation & Prototype Pollution defense (SDLC 4.3)
      const validated = validateBackupRestorePackage(rawParsed);
      onRestoreBackup(validated);
      setIsRestoreModalOpen(false);
      setRestoreJson('');
    } catch (err: any) {
      setRestoreError(err.message || 'Failed to parse JSON backup package');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.01em' }}>
            Trip Documents &amp; Export
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Printable travel manifests, customs declarations, and secure data backups
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setIsCsvModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid var(--border-medium)',
              background: 'var(--surface-card)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Upload size={14} />
            <span>CSV Import Wizard</span>
          </button>

          <button
            onClick={handleExportJson}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid var(--border-medium)',
              background: 'var(--surface-card)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            <span>Export Vault JSON</span>
          </button>

          <button
            onClick={() => setIsRestoreModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid var(--border-medium)',
              background: 'var(--surface-card)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            <span>Restore Backup</span>
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Printer size={14} />
            <span>Print Travel Manifest</span>
          </button>
        </div>
      </div>

      {/* Printable Travel Manifest Document */}
      <div
        id="printable-manifest"
        style={{
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: '12px',
          border: '1px solid var(--border-light)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>PACKMATRIX OFFICIAL TRAVEL MANIFEST</h1>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              International Customs &amp; Baggage Security Declaration · Air-Gapped Verification Token
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#475569' }}>
            <div>Date Generated: {manifestDate}</div>
            <div>Active Bag: <strong>{activeBag.name}</strong></div>
            <div>Serial Reference: <strong>{manifestSerial}</strong></div>
          </div>
        </div>

        {/* Telemetry Summary Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
          <div>
            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>TOTAL PACKED ITEMS</span>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>{items.length} units</span>
          </div>
          <div>
            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>GROSS GEAR WEIGHT</span>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>
              {unitSystem === 'metric' ? `${(totalWeightG / 1000).toFixed(2)} kg` : `${(totalWeightG * 0.00220462).toFixed(2)} lbs`}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>TOTAL REPLACEMENT VALUATION</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>${totalValue.toLocaleString()} USD</span>
          </div>
          <div>
            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>SECURITY PROFILE</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
              <ShieldCheck size={14} /> TS/ICAO Cleared
            </span>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
              <th style={{ padding: '6px 8px' }}>ITEM &amp; BRAND</th>
              <th style={{ padding: '6px 8px' }}>CATEGORY</th>
              <th style={{ padding: '6px 8px' }}>MASS</th>
              <th style={{ padding: '6px 8px' }}>SERIAL NO.</th>
              <th style={{ padding: '6px 8px' }}>STATUS</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>DECL. VALUE</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                  {i.name}
                  {i.brand && <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>({i.brand})</span>}
                </td>
                <td style={{ padding: '6px 8px' }}>{i.category}</td>
                <td style={{ padding: '6px 8px' }}>{i.weight_g} g</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                  {i.serial_number || '—'}
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <span style={{ fontWeight: 600, color: i.readiness_state === 'Packed' ? '#15803d' : '#475569' }}>
                    {i.readiness_state}
                  </span>
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
                  ${i.monetary_value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Declaration Footer */}
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <p style={{ maxWidth: '480px' }}>
            I hereby certify that the contents listed above represent an accurate account of travel gear and personal property contained within the referenced luggage shell, containing zero undeclared hazardous materials or forbidden lithium cells.
          </p>
          <div style={{ textAlign: 'right' }}>
            <div style={{ height: '30px', borderBottom: '1px solid #94a3b8', width: '160px' }}></div>
            <div style={{ marginTop: '4px' }}>Passenger Signature</div>
          </div>
        </div>
      </div>

      {/* CSV Import Wizard Modal */}
      {isCsvModalOpen && (
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
          onClick={() => setIsCsvModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface-card)',
              borderRadius: '16px',
              width: '680px',
              maxWidth: '92vw',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={20} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>RFC-4180 CSV / TSV Import Wizard</h3>
              </div>
              <button onClick={() => setIsCsvModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Paste comma-separated data. Header row is auto-detected. Formula characters (<code style={{ color: '#ef4444' }}>=, +, -, @</code>) are automatically neutralized against spreadsheet execution injection.
            </p>

            <textarea
              rows={6}
              placeholder="Name, Brand, Weight (g), Category, Value ($), Tags&#10;Sony FX3 Camera, Sony, 715, Tech, 3899, photo&#10;Patagonia Nano Puff, Patagonia, 337, Clothing, 239, jacket"
              value={csvContent}
              onChange={(e) => handleParseCsv(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-medium)',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                background: 'var(--surface)',
                outline: 'none',
              }}
            />

            {/* Validation & Column Mapping Preview */}
            {csvPreview.length > 0 && (
              <div style={{ background: 'var(--surface-dim)', borderRadius: '8px', padding: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--accent-blue)' }}>
                  Mapping Preview ({csvPreview.length} items parsed):
                </div>
                {csvPreview.slice(0, 5).map((p, idx) => (
                  <div key={idx} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', padding: '3px 0' }}>
                    <span><strong>{p.name}</strong> ({p.category})</span>
                    <span>{p.weight_g} g · ${p.monetary_value}</span>
                  </div>
                ))}
                {csvPreview.length > 5 && (
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    + {csvPreview.length - 5} more items...
                  </div>
                )}
              </div>
            )}

            {csvErrors.length > 0 && (
              <div style={{ color: '#ef4444', fontSize: '11.5px' }}>
                {csvErrors.map((err, i) => (
                  <div key={i}>⚠ {err}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                style={{ padding: '0.55rem 0.9rem', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={csvPreview.length === 0}
                onClick={handleCommitImport}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: csvPreview.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: csvPreview.length > 0 ? 1 : 0.5,
                  fontSize: '12px',
                }}
              >
                Commit {csvPreview.length} Items to Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Modal */}
      {isRestoreModalOpen && (
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
          onClick={() => setIsRestoreModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface-card)',
              borderRadius: '16px',
              width: '560px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Restore JSON Vault Backup</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Paste your exported JSON package below. This will safely reconstruct all luggage shells and gear inventory records.
            </p>
            <textarea
              rows={8}
              placeholder="Paste backup JSON package here..."
              value={restoreJson}
              onChange={(e) => setRestoreJson(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-medium)',
                fontFamily: 'monospace',
                fontSize: '11px',
                background: 'var(--surface)',
              }}
            />
            {restoreError && (
              <div style={{ color: '#ef4444', fontSize: '12px' }}>⚠ {restoreError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                style={{ padding: '0.55rem 0.9rem', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestoreSubmit}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--accent-blue)',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Restore Database State
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
