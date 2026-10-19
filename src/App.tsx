import { useState } from 'react';
import {
  Luggage,
  Menu,
  Search,
  Layers,
  Sparkles,
  Plane,
  Briefcase,
  Box,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Laptop,
  Shirt,
  Headphones,
  Footprints,
  Plus,
  Printer,
  ChevronDown,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';

interface GearItem {
  id: string;
  name: string;
  location: string;
  weightG: number;
  category: 'Tech' | 'Clothing' | 'Toiletries' | 'Footwear';
  packed: boolean;
}

const INITIAL_GEAR: GearItem[] = [
  // Electronics & Work
  { id: '1', name: 'MacBook Pro 16" M3 ...', location: 'Laptop compartment', weightG: 2140, category: 'Tech', packed: true },
  { id: '2', name: 'Anker GaN Charger (1...', location: 'Tech Pouch', weightG: 320, category: 'Tech', packed: true },
  { id: '3', name: 'Sony WH-1000XM5', location: 'Top bay hardcase', weightG: 250, category: 'Tech', packed: true },
  { id: '4', name: 'Roost V3 Laptop Stand', location: 'Side pocket', weightG: 170, category: 'Tech', packed: true },
  
  // Clothing
  { id: '5', name: 'Outlier Dungarees (x2)', location: 'Pants, rolled', weightG: 920, category: 'Clothing', packed: true },
  { id: '6', name: 'Merino T-Shirts (4-Pa...', location: 'Compression packed', weightG: 680, category: 'Clothing', packed: true },
  { id: '7', name: 'Arc\'teryx Atom LT Hoo...', location: 'Midlayer fleece', weightG: 375, category: 'Clothing', packed: true },

  // Toiletries & Footwear
  { id: '8', name: 'Matador Bottles 100m...', location: 'Shampoo & wash', weightG: 310, category: 'Toiletries', packed: true },
  { id: '9', name: 'Trail Running Shoes (U...', location: 'Bottom base floor', weightG: 680, category: 'Footwear', packed: true },
  { id: '10', name: 'Oral-B iO Toothbrush ...', location: 'Travel case', weightG: 190, category: 'Toiletries', packed: true }
];

export function App() {
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [activeNav, setActiveNav] = useState('My Packing');
  const [activeViewTab, setActiveViewTab] = useState<'Top View' | 'Side Profile' | 'Balance'>('Top View');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const [items, setItems] = useState<GearItem[]>(INITIAL_GEAR);

  const toggleItemPacked = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, packed: !item.packed } : item))
    );
  };

  const filteredItems = items.filter((item) => {
    if (activeCategoryFilter === 'All') return true;
    if (activeCategoryFilter === 'Clothing') return item.category === 'Clothing';
    if (activeCategoryFilter === 'Tech') return item.category === 'Tech';
    if (activeCategoryFilter === 'Toiletries') return item.category === 'Toiletries';
    if (activeCategoryFilter === 'Footwear') return item.category === 'Footwear';
    return true;
  });

  const electronicsItems = filteredItems.filter((i) => i.category === 'Tech');
  const clothingItems = filteredItems.filter((i) => i.category === 'Clothing');
  const toiletryAndFootwearItems = filteredItems.filter((i) => i.category === 'Toiletries' || i.category === 'Footwear');

  const formatWeight = (grams: number) => {
    if (unitSystem === 'metric') {
      return `${grams.toLocaleString()} g`;
    }
    return `${(grams * 0.035274).toFixed(1)} oz`;
  };

  return (
    <>
      {/* 60px Cockpit App Header */}
      <header className="app-header">
        <div className="header-left">
          <button className="header-icon-btn" aria-label="Toggle navigation">
            <Menu size={18} />
          </button>
          <div className="brand-mark">
            <Luggage size={20} />
          </div>
          <div className="brand-meta">
            <h1 className="brand-title">PackMatrix</h1>
            <span className="brand-subtitle">Luggage Geometry &amp; Volumetric Optimizer</span>
          </div>
        </div>

        <div className="header-center">
          <div className="search-bar">
            <Search size={15} color="#94a3b8" />
            <input type="text" placeholder="Search gear, bags, rules..." aria-label="Search gear, bags, rules" />
            <span className="kbd-shortcut">⌘K</span>
          </div>
        </div>

        <div className="header-right">
          <div className="unit-switch">
            <span
              className={`unit-pill ${unitSystem === 'metric' ? 'active' : ''}`}
              onClick={() => setUnitSystem('metric')}
            >
              CM / KG
            </span>
            <span
              className={`unit-pill ${unitSystem === 'imperial' ? 'active' : ''}`}
              onClick={() => setUnitSystem('imperial')}
            >
              IN / LBS
            </span>
          </div>
          <div className="user-avatar" title="Account: Alexander Lin">
            AL
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="app-container">
        {/* 256px Cockpit Sidebar */}
        <aside className="app-sidebar">
          <div className="workspace-section-label">Workspace</div>
          <div className="workspace-card" title="Active Trip Itinerary">
            <div className="workspace-icon-box">
              <Plane size={18} />
            </div>
            <div className="workspace-meta">
              <div className="workspace-title">Transatlantic Summer ...</div>
              <div className="workspace-sub">FRA → JFK · Jun 14</div>
            </div>
            <ChevronDown size={14} color="#94a3b8" />
          </div>

          <nav className="nav-group">
            <div
              className={`nav-item ${activeNav === 'My Packing' ? 'active' : ''}`}
              onClick={() => setActiveNav('My Packing')}
            >
              <Briefcase size={16} />
              <span>My Packing</span>
              <span className="nav-badge">18</span>
            </div>

            <div
              className={`nav-item ${activeNav === 'Saved Bags' ? 'active' : ''}`}
              onClick={() => setActiveNav('Saved Bags')}
            >
              <Luggage size={16} />
              <span>Saved Bags</span>
            </div>

            <div
              className={`nav-item ${activeNav === 'Packing Cubes' ? 'active' : ''}`}
              onClick={() => setActiveNav('Packing Cubes')}
            >
              <Box size={16} />
              <span>Packing Cubes</span>
            </div>

            <div
              className={`nav-item ${activeNav === 'Airline Baggage Rules' ? 'active' : ''}`}
              onClick={() => setActiveNav('Airline Baggage Rules')}
            >
              <FileText size={16} />
              <span>Airline Baggage Rules</span>
            </div>

            <div
              className={`nav-item ${activeNav === 'Gear Checklist' ? 'active' : ''}`}
              onClick={() => setActiveNav('Gear Checklist')}
            >
              <CheckCircle2 size={16} />
              <span>Gear Checklist</span>
            </div>

            <div
              className={`nav-item ${activeNav === 'Trip Documents' ? 'active' : ''}`}
              onClick={() => setActiveNav('Trip Documents')}
            >
              <FileText size={16} />
              <span>Trip Documents</span>
            </div>
          </nav>
        </aside>

        {/* Dynamic Canvas Area */}
        <main className="main-content">
          {/* Active Bag Telemetry Banner */}
          <section className="active-bag-card">
            <div className="bag-primary-info">
              <div className="bag-avatar-icon">
                <Luggage size={22} />
              </div>
              <div className="bag-detail-column">
                <span className="active-bag-pill">Active Bag</span>
                <div className="bag-title-row">
                  <h2 className="bag-name">Peak Design Travel Backpack 45L</h2>
                  <span className="bag-dimension-tag">
                    {unitSystem === 'metric' ? '53.5 × 33.0 × 24.1 cm' : '21.1 × 13.0 × 9.5 in'}
                  </span>
                  <span className="depth-alert-badge">
                    {unitSystem === 'metric' ? 'Depth Alert: -1.1 cm' : 'Depth Alert: -0.4 in'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bag-metrics-group">
              {/* Volume Gauge */}
              <div className="telemetry-chip">
                <div className="telemetry-chip-icon">
                  <Box size={18} />
                </div>
                <div className="telemetry-data">
                  <div className="telemetry-header">
                    <span className="telemetry-label">Volume</span>
                    <span className="telemetry-badge-blue">91%</span>
                  </div>
                  <span className="telemetry-value">38.4 / 42 L</span>
                </div>
              </div>

              {/* Weight Gauge */}
              <div className="telemetry-chip weight">
                <div className="telemetry-chip-icon">
                  <Scale size={18} />
                </div>
                <div className="telemetry-data">
                  <div className="telemetry-header">
                    <span className="telemetry-label">Weight</span>
                    <span className="telemetry-badge-green">Under Limit</span>
                  </div>
                  <span className="telemetry-value">
                    {unitSystem === 'metric' ? '8.42 / 10.0 kg' : '18.56 / 22.0 lbs'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Dual-Hero Workspace Grid */}
          <div className="workspace-grid">
            {/* Left Hero: Map & Flight Envelope */}
            <div className="map-column">
              {/* Airline Envelope Compliance */}
              <div className="airline-envelope-card">
                <div className="envelope-header-row">
                  <div className="carrier-title-group">
                    <ShieldCheck size={18} color="#059669" />
                    <span className="carrier-name">Lufthansa Cabin Envelope</span>
                    <span className="status-badge-compliant">Compliant</span>
                  </div>
                </div>

                <div className="envelope-metrics-row">
                  <div className="envelope-spec-pill">
                    <Luggage size={13} />
                    <span>{unitSystem === 'metric' ? '55 × 40 × 23 cm' : '21.6 × 15.7 × 9.0 in'}</span>
                  </div>
                  <div className="envelope-spec-pill">
                    <Scale size={13} />
                    <span>{unitSystem === 'metric' ? '8.0 kg' : '17.6 lbs'}</span>
                  </div>
                  <div className="envelope-spec-pill personal">
                    <Briefcase size={13} />
                    <span>Personal: {unitSystem === 'metric' ? '40 × 30 × 10 cm' : '15.7 × 11.8 × 3.9 in'}</span>
                  </div>
                </div>

                <div className="verification-meta-row">
                  <Clock size={12} />
                  <span>FRA → JFK · Verified 12m ago</span>
                </div>
              </div>

              {/* Overhead Visual Map Card */}
              <div className="visual-map-card">
                <div className="map-card-header">
                  <div className="icon-cube">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 className="map-title">Overhead Visual Map</h3>
                    <p className="map-subtitle">Real-time packing volumetric distribution and weight center</p>
                  </div>
                </div>

                <div className="map-view-controls">
                  <div className="view-segmented-group">
                    {(['Top View', 'Side Profile', 'Balance'] as const).map((tab) => (
                      <button
                        key={tab}
                        className={`view-segment-btn ${activeViewTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveViewTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <button className="auto-pack-btn" title="Run geometric gravity distribution solver">
                    <Sparkles size={13} />
                    <span>Auto-Pack</span>
                  </button>
                </div>

                {/* Recessed Backpack Clamshell Blueprint */}
                <div className="blueprint-frame">
                  {/* Laptop Sleeve */}
                  <div className="compartment-laptop">
                    <div className="icon-box">
                      <Laptop size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f2b5c' }}>
                        16" Laptop &amp; Tablet Sleeve
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        MacBook Pro 16" (2.14 kg) · Roost V3 Stand
                      </div>
                    </div>
                  </div>

                  {/* Split Row: Liquids & Sunglasses */}
                  <div className="compartment-row-split">
                    <div className="compartment-liquids">
                      <div className="liquids-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700, color: '#92400e' }}>
                          <AlertTriangle size={13} color="#d97706" />
                          <span>TSA Liquids ...</span>
                        </div>
                        <span className="badge-amber-micro">3-1-1 Approved</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#78350f' }}>
                        Matador bottles (3x 100ml shampoo), ...
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#92400e', fontWeight: 600, marginTop: '2px' }}>
                        <span>Top quick-reach cavity</span>
                        <span>780 g</span>
                      </div>
                    </div>

                    <div className="compartment-sunglasses">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#854d0e' }}>Sunglas...</span>
                        <span className="badge-amber-micro" style={{ background: '#fef08a' }}>Top Lid</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#713f12' }}>
                        Hardcase polarized shad...
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#854d0e', fontWeight: 600, marginTop: '2px' }}>
                        <span>Hardcase bay</span>
                        <span>110 g</span>
                      </div>
                    </div>
                  </div>

                  {/* Clothing Compression Cube L */}
                  <div className="compartment-clothing-cube">
                    <div className="clothing-cube-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }}></span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1' }}>Clothing Compression Cube L</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span className="badge-sky-micro">1.42 kg · 4.2 L</span>
                        <span className="badge-sky-micro" style={{ background: '#bae6fd' }}>Center Layer</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#0284c7' }}>
                      6x Merino Shirts, 2x Chinos (Outlier Dungarees), Arc'teryx Atom L...
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#0369a1', fontWeight: 600, marginTop: '2px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        ✦ 88% compression ratio
                      </span>
                      <span>Depth: 11.2 cm</span>
                    </div>
                  </div>

                  {/* Electronics & Tech Bay */}
                  <div className="compartment-tech-bay">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>Electronics &amp; Tech Bay</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span className="badge-green-micro">1.85 kg · Dense</span>
                        <span className="badge-green-micro" style={{ background: '#bbf7d0' }}>Heavy Base</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#15803d' }}>
                      140W GaN Fast Charger, 24k mAh Powerbank, Sony WH-1000X...
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#166534', fontWeight: 600, marginTop: '2px' }}>
                      <span>Spine-centered low center-of-gravity</span>
                      <span>Load Balance: Optimal</span>
                    </div>
                  </div>

                  {/* Shoes & Free Space Buffer */}
                  <div className="compartment-shoes-buffer-row">
                    <div className="compartment-shoes">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                        <Footprints size={14} color="#64748b" />
                        <span>Trail Running Shoes (US 11)</span>
                        <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 500 }}>680 g</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        In shoe bags along bottom curved floor
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                        <span>Bottom base perimeter</span>
                        <span style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', color: '#475569' }}>Bottom Floor</span>
                      </div>
                    </div>

                    <div className="compartment-free-buffer">
                      <span className="buffer-title">FREE SPACE BUFFER</span>
                      <span className="buffer-liters">3.6 L Available</span>
                      <span className="buffer-caption">Souvenirs / Jacket</span>
                    </div>
                  </div>
                </div>

                {/* Spine Flush Ergonomics Banner */}
                <div className="spine-flush-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: '#166534' }}>
                    <CheckCircle2 size={15} color="#059669" />
                    <span>Spine Flush Ergonomics: Heavy gear aligned a...</span>
                  </div>
                  <span className="status-badge-compliant" style={{ background: '#dcfce7', color: '#15803d', borderColor: '#86efac' }}>
                    100% Balanced
                  </span>
                </div>
              </div>
            </div>

            {/* Right Hero: Packed Items Checklist */}
            <div className="checklist-card">
              <div className="checklist-header-row">
                <div className="checklist-title-group">
                  <h3 className="checklist-title">Packed Items Checklist</h3>
                  <span className="checklist-subtitle">18 items packed · 6.37 kg gear total</span>
                </div>
                <div className="checklist-actions-group">
                  <button className="btn-primary-dark">
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>
                  <button className="btn-outline">
                    <Printer size={14} />
                    <span>Print Manifest</span>
                  </button>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="filter-pills-row">
                {(['All (18)', 'Clothing (8)', 'Tech (6)', 'Toiletries (3)', 'Footwear (1)'] as const).map((tab) => {
                  const categoryKey = tab.split(' ')[0];
                  const isActive = activeCategoryFilter === (categoryKey === 'All' ? 'All' : categoryKey);
                  return (
                    <button
                      key={tab}
                      className={`filter-pill ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveCategoryFilter(categoryKey === 'All' ? 'All' : categoryKey)}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Category 1: Electronics & Work */}
              {electronicsItems.length > 0 && (
                <div className="checklist-category-group">
                  <div className="category-header-row">
                    <span className="category-label">
                      <Headphones size={13} />
                      <span>Electronics &amp; Work</span>
                    </span>
                    <span className="category-subtotal">4,880 G</span>
                  </div>
                  <div className="items-two-col-grid">
                    {electronicsItems.map((item) => (
                      <div
                        key={item.id}
                        className={`gear-item-card ${item.packed ? 'checked' : ''}`}
                        onClick={() => toggleItemPacked(item.id)}
                      >
                        <div className={`custom-checkbox ${item.packed ? 'checked' : ''}`}>
                          {item.packed && <Check size={11} strokeWidth={3} />}
                        </div>
                        <div className="gear-text-col">
                          <div className="gear-name">{item.name}</div>
                          <div className="gear-location">{item.location}</div>
                        </div>
                        <div className="gear-weight-col">{formatWeight(item.weightG)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 2: Clothing (Cube L) */}
              {clothingItems.length > 0 && (
                <div className="checklist-category-group">
                  <div className="category-header-row">
                    <span className="category-label">
                      <Shirt size={13} />
                      <span>Clothing (Cube L)</span>
                    </span>
                    <span className="category-subtotal">1,975 G</span>
                  </div>
                  <div className="items-two-col-grid">
                    {clothingItems.map((item) => (
                      <div
                        key={item.id}
                        className={`gear-item-card ${item.packed ? 'checked' : ''}`}
                        onClick={() => toggleItemPacked(item.id)}
                      >
                        <div className={`custom-checkbox ${item.packed ? 'checked' : ''}`}>
                          {item.packed && <Check size={11} strokeWidth={3} />}
                        </div>
                        <div className="gear-text-col">
                          <div className="gear-name">{item.name}</div>
                          <div className="gear-location">{item.location}</div>
                        </div>
                        <div className="gear-weight-col">{formatWeight(item.weightG)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 3: Toiletries & Footwear */}
              {toiletryAndFootwearItems.length > 0 && (
                <div className="checklist-category-group">
                  <div className="category-header-row">
                    <span className="category-label">
                      <Footprints size={13} />
                      <span>Toiletries &amp; Footwear</span>
                    </span>
                    <span className="category-subtotal">1,770 G</span>
                  </div>
                  <div className="items-two-col-grid">
                    {toiletryAndFootwearItems.map((item) => (
                      <div
                        key={item.id}
                        className={`gear-item-card ${item.packed ? 'checked' : ''}`}
                        onClick={() => toggleItemPacked(item.id)}
                      >
                        <div className={`custom-checkbox ${item.packed ? 'checked' : ''}`}>
                          {item.packed && <Check size={11} strokeWidth={3} />}
                        </div>
                        <div className="gear-text-col">
                          <div className="gear-name">{item.name}</div>
                          <div className="gear-location">{item.location}</div>
                        </div>
                        <div className="gear-weight-col">{formatWeight(item.weightG)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cabin-ready footer row */}
              <div className="cabin-ready-footer">
                <CheckCircle2 size={15} />
                <span>All items accounted for and cabin-ready</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default App;
