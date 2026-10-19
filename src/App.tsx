import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Luggage,
  Menu,
  Search,
  Briefcase,
  Box,
  FileText,
  CheckCircle2,
  Plane,
  ChevronDown,
} from 'lucide-react';
import type {
  LuggageShell,
  SubContainer,
  InventoryItem,
  UnitSystem,
  ReadinessState,
} from './types';
import {
  CURATED_BAG_PRESETS,
  INITIAL_SUB_CONTAINERS,
  INITIAL_INVENTORY_ITEMS,
  AIRLINE_RULES_DATABASE,
} from './utils/data';
import { useCommandHistory, type Command } from './hooks/useCommandHistory';
import { MyPackingView } from './components/views/MyPackingView';
import { SavedBagsView } from './components/views/SavedBagsView';
import { PackingCubesView } from './components/views/PackingCubesView';
import { GearInventoryView } from './components/views/GearInventoryView';
import { AirlineRulesView } from './components/views/AirlineRulesView';
import { TripDocumentsView } from './components/views/TripDocumentsView';

interface AppState {
  bags: LuggageShell[];
  activeBagId: string;
  cubes: SubContainer[];
  items: InventoryItem[];
}

export function App() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [activeNav, setActiveNav] = useState<
    'My Packing' | 'Saved Bags' | 'Packing Cubes' | 'Airline Baggage Rules' | 'Gear Checklist' | 'Trip Documents'
  >('My Packing');
  const [globalSearch, setGlobalSearch] = useState('');

  // Command-pattern undo/redo history for root application state
  const {
    state,
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCommandHistory<AppState>({
    bags: CURATED_BAG_PRESETS,
    activeBagId: CURATED_BAG_PRESETS[0].id,
    cubes: INITIAL_SUB_CONTAINERS,
    items: INITIAL_INVENTORY_ITEMS,
  });

  const activeBag = useMemo(() => {
    return state.bags.find((b) => b.id === state.activeBagId) || state.bags[0];
  }, [state.bags, state.activeBagId]);

  // Active airline rule
  const activeAirlineRule = AIRLINE_RULES_DATABASE[0];

  // Keyboard navigation shortcuts (SDLC Section 3.7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z / Ctrl+Z: Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Cmd+Shift+Z / Ctrl+Shift+Z: Redo
      else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Cmd+K or /: Search focus
      else if (((e.metaKey || e.ctrlKey) && e.key === 'k') || (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT')) {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        searchInput?.focus();
      }
      // 1 to 6 numbers for fast view navigation when not typing
      else if (!e.metaKey && !e.ctrlKey && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        if (e.key === '1') setActiveNav('My Packing');
        if (e.key === '2') setActiveNav('Saved Bags');
        if (e.key === '3') setActiveNav('Packing Cubes');
        if (e.key === '4') setActiveNav('Airline Baggage Rules');
        if (e.key === '5') setActiveNav('Gear Checklist');
        if (e.key === '6') setActiveNav('Trip Documents');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Command handlers
  const handleTogglePacked = useCallback((id: string) => {
    const cmd: Command<AppState> = {
      description: 'Toggle item packed state',
      apply: (curr) => ({
        ...curr,
        items: curr.items.map((i) =>
          i.id === id
            ? { ...i, readiness_state: i.readiness_state === 'Packed' ? 'In Closet' : 'Packed', packed: i.readiness_state !== 'Packed' }
            : i
        ),
      }),
      rollback: (curr) => ({
        ...curr,
        items: curr.items.map((i) =>
          i.id === id
            ? { ...i, readiness_state: i.readiness_state === 'Packed' ? 'In Closet' : 'Packed', packed: i.readiness_state !== 'Packed' }
            : i
        ),
      }),
    };
    executeCommand(cmd);
  }, [executeCommand]);

  const handleToggleExpandBag = useCallback(() => {
    const currentExpanded = activeBag.is_expanded;
    const cmd: Command<AppState> = {
      description: 'Toggle luggage expansion gusset',
      apply: (curr) => ({
        ...curr,
        bags: curr.bags.map((b) =>
          b.id === curr.activeBagId ? { ...b, is_expanded: !currentExpanded } : b
        ),
      }),
      rollback: (curr) => ({
        ...curr,
        bags: curr.bags.map((b) =>
          b.id === curr.activeBagId ? { ...b, is_expanded: currentExpanded } : b
        ),
      }),
    };
    executeCommand(cmd);
  }, [activeBag.is_expanded, executeCommand]);

  const handleSelectActiveBag = useCallback((bagId: string) => {
    const previousId = state.activeBagId;
    const cmd: Command<AppState> = {
      description: `Switch active luggage to ${bagId}`,
      apply: (curr) => ({ ...curr, activeBagId: bagId }),
      rollback: (curr) => ({ ...curr, activeBagId: previousId }),
    };
    executeCommand(cmd);
  }, [state.activeBagId, executeCommand]);

  const handleAddBag = useCallback((newBag: LuggageShell) => {
    const cmd: Command<AppState> = {
      description: `Add custom bag: ${newBag.name}`,
      apply: (curr) => ({ ...curr, bags: [...curr.bags, newBag], activeBagId: newBag.id }),
      rollback: (curr) => ({
        ...curr,
        bags: curr.bags.filter((b) => b.id !== newBag.id),
        activeBagId: curr.activeBagId === newBag.id ? curr.bags[0]?.id || '' : curr.activeBagId,
      }),
    };
    executeCommand(cmd);
  }, [executeCommand]);

  const handleUpdateItem = useCallback((updated: InventoryItem) => {
    const original = state.items.find((i) => i.id === updated.id);
    if (!original) return;

    const cmd: Command<AppState> = {
      description: `Edit item: ${updated.name}`,
      apply: (curr) => ({
        ...curr,
        items: curr.items.map((i) => (i.id === updated.id ? updated : i)),
      }),
      rollback: (curr) => ({
        ...curr,
        items: curr.items.map((i) => (i.id === updated.id ? original : i)),
      }),
    };
    executeCommand(cmd);
  }, [state.items, executeCommand]);

  const handleAddItem = useCallback((newItem: InventoryItem) => {
    const cmd: Command<AppState> = {
      description: `Add item: ${newItem.name}`,
      apply: (curr) => ({ ...curr, items: [...curr.items, newItem] }),
      rollback: (curr) => ({ ...curr, items: curr.items.filter((i) => i.id !== newItem.id) }),
    };
    executeCommand(cmd);
  }, [executeCommand]);

  const handleBatchUpdateState = useCallback((itemIds: string[], nextState: ReadinessState) => {
    const previousMap = new Map(state.items.map((i) => [i.id, i.readiness_state]));
    const cmd: Command<AppState> = {
      description: `Batch change state to ${nextState} (${itemIds.length} items)`,
      apply: (curr) => ({
        ...curr,
        items: curr.items.map((i) =>
          itemIds.includes(i.id)
            ? { ...i, readiness_state: nextState, packed: nextState === 'Packed' }
            : i
        ),
      }),
      rollback: (curr) => ({
        ...curr,
        items: curr.items.map((i) =>
          itemIds.includes(i.id)
            ? {
                ...i,
                readiness_state: previousMap.get(i.id) || i.readiness_state,
                packed: (previousMap.get(i.id) || i.readiness_state) === 'Packed',
              }
            : i
        ),
      }),
    };
    executeCommand(cmd);
  }, [state.items, executeCommand]);

  const handleBatchAssignCube = useCallback((itemIds: string[], cubeId?: string) => {
    const previousMap = new Map(state.items.map((i) => [i.id, i.sub_container_id]));
    const cmd: Command<AppState> = {
      description: `Batch assign cube (${itemIds.length} items)`,
      apply: (curr) => ({
        ...curr,
        items: curr.items.map((i) =>
          itemIds.includes(i.id) ? { ...i, sub_container_id: cubeId } : i
        ),
      }),
      rollback: (curr) => ({
        ...curr,
        items: curr.items.map((i) =>
          itemIds.includes(i.id) ? { ...i, sub_container_id: previousMap.get(i.id) } : i
        ),
      }),
    };
    executeCommand(cmd);
  }, [state.items, executeCommand]);

  const handleBatchDelete = useCallback((itemIds: string[]) => {
    const deletedItems = state.items.filter((i) => itemIds.includes(i.id));
    const cmd: Command<AppState> = {
      description: `Delete ${itemIds.length} items`,
      apply: (curr) => ({
        ...curr,
        items: curr.items.filter((i) => !itemIds.includes(i.id)),
      }),
      rollback: (curr) => ({
        ...curr,
        items: [...curr.items, ...deletedItems],
      }),
    };
    executeCommand(cmd);
  }, [state.items, executeCommand]);

  const handleUpdateCube = useCallback((updated: SubContainer) => {
    const original = state.cubes.find((c) => c.id === updated.id);
    if (!original) return;

    const cmd: Command<AppState> = {
      description: `Update cube: ${updated.name}`,
      apply: (curr) => ({
        ...curr,
        cubes: curr.cubes.map((c) => (c.id === updated.id ? updated : c)),
      }),
      rollback: (curr) => ({
        ...curr,
        cubes: curr.cubes.map((c) => (c.id === updated.id ? original : c)),
      }),
    };
    executeCommand(cmd);
  }, [state.cubes, executeCommand]);

  const handleAddCube = useCallback((newCube: SubContainer) => {
    const cmd: Command<AppState> = {
      description: `Add cube: ${newCube.name}`,
      apply: (curr) => ({ ...curr, cubes: [...curr.cubes, newCube] }),
      rollback: (curr) => ({ ...curr, cubes: curr.cubes.filter((c) => c.id !== newCube.id) }),
    };
    executeCommand(cmd);
  }, [executeCommand]);

  const handleImportItems = useCallback((newItems: InventoryItem[]) => {
    const cmd: Command<AppState> = {
      description: `Import ${newItems.length} items from CSV`,
      apply: (curr) => ({ ...curr, items: [...curr.items, ...newItems] }),
      rollback: (curr) => {
        const importedIds = new Set(newItems.map((n) => n.id));
        return {
          ...curr,
          items: curr.items.filter((i) => !importedIds.has(i.id)),
        };
      },
    };
    executeCommand(cmd);
  }, [executeCommand]);

  const handleRestoreBackup = useCallback((backup: { luggage: LuggageShell[]; inventory: InventoryItem[] }) => {
    const prev = { ...state };
    const cmd: Command<AppState> = {
      description: 'Restore full JSON vault backup',
      apply: (curr) => ({
        ...curr,
        bags: backup.luggage.length > 0 ? backup.luggage : curr.bags,
        activeBagId: backup.luggage[0]?.id || curr.activeBagId,
        items: backup.inventory.length > 0 ? backup.inventory : curr.items,
      }),
      rollback: () => prev,
    };
    executeCommand(cmd);
  }, [state, executeCommand]);

  // Auto-pack gravity distribution heuristic
  const handleAutoPack = useCallback(() => {
    const cmd: Command<AppState> = {
      description: 'Run 3D gravity center distribution auto-packer',
      apply: (curr) => ({
        ...curr,
        items: curr.items.map((item) => {
          if (item.category === 'Tech') {
            return { ...item, pos_x: 0, pos_y: 2.0, pos_z: 20.0 }; // Spine flush
          }
          if (item.category === 'Clothing') {
            return { ...item, pos_x: 0, pos_y: 8.0, pos_z: 22.0 }; // Mid layer
          }
          if (item.category === 'Toiletries') {
            return { ...item, pos_x: 0, pos_y: 11.0, pos_z: 42.0 }; // Top quick reach
          }
          return item;
        }),
      }),
      rollback: () => state,
    };
    executeCommand(cmd);
  }, [state, executeCommand]);

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
            <input
              id="global-search-input"
              type="text"
              placeholder="Search gear, bags, rules (Cmd+K or /)..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              aria-label="Search gear, bags, rules"
            />
            <span className="kbd-shortcut">⌘K</span>
          </div>
        </div>

        <div className="header-right">
          <div className="unit-switch">
            <span
              className={`unit-pill ${unitSystem === 'metric' ? 'active' : ''}`}
              onClick={() => setUnitSystem('metric')}
              role="button"
              tabIndex={0}
              aria-label="Switch to Metric Units"
            >
              CM / KG
            </span>
            <span
              className={`unit-pill ${unitSystem === 'imperial' ? 'active' : ''}`}
              onClick={() => setUnitSystem('imperial')}
              role="button"
              tabIndex={0}
              aria-label="Switch to Imperial Units"
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
              role="button"
              tabIndex={0}
            >
              <Briefcase size={16} />
              <span>My Packing</span>
              <span className="nav-badge">
                {state.items.filter((i) => i.readiness_state === 'Packed').length}
              </span>
            </div>

            <div
              className={`nav-item ${activeNav === 'Saved Bags' ? 'active' : ''}`}
              onClick={() => setActiveNav('Saved Bags')}
              role="button"
              tabIndex={0}
            >
              <Luggage size={16} />
              <span>Saved Bags</span>
              <span className="nav-badge" style={{ background: 'var(--surface-dim)', color: 'var(--text-secondary)' }}>
                {state.bags.length}
              </span>
            </div>

            <div
              className={`nav-item ${activeNav === 'Packing Cubes' ? 'active' : ''}`}
              onClick={() => setActiveNav('Packing Cubes')}
              role="button"
              tabIndex={0}
            >
              <Box size={16} />
              <span>Packing Cubes</span>
              <span className="nav-badge" style={{ background: 'var(--surface-dim)', color: 'var(--text-secondary)' }}>
                {state.cubes.length}
              </span>
            </div>

            <div
              className={`nav-item ${activeNav === 'Airline Baggage Rules' ? 'active' : ''}`}
              onClick={() => setActiveNav('Airline Baggage Rules')}
              role="button"
              tabIndex={0}
            >
              <FileText size={16} />
              <span>Airline Baggage Rules</span>
            </div>

            <div
              className={`nav-item ${activeNav === 'Gear Checklist' ? 'active' : ''}`}
              onClick={() => setActiveNav('Gear Checklist')}
              role="button"
              tabIndex={0}
            >
              <CheckCircle2 size={16} />
              <span>Gear Checklist</span>
              <span className="nav-badge">{state.items.length}</span>
            </div>

            <div
              className={`nav-item ${activeNav === 'Trip Documents' ? 'active' : ''}`}
              onClick={() => setActiveNav('Trip Documents')}
              role="button"
              tabIndex={0}
            >
              <FileText size={16} />
              <span>Trip Documents</span>
            </div>
          </nav>
        </aside>

        {/* Dynamic Canvas Area */}
        <main className="main-content" style={{ overflowY: 'auto' }}>
          {activeNav === 'My Packing' && (
            <MyPackingView
              activeBag={activeBag}
              cubes={state.cubes}
              items={state.items}
              airlineRule={activeAirlineRule}
              unitSystem={unitSystem}
              onTogglePacked={handleTogglePacked}
              onToggleExpand={handleToggleExpandBag}
              onAutoPack={handleAutoPack}
              onAddItem={handleAddItem}
            />
          )}

          {activeNav === 'Saved Bags' && (
            <SavedBagsView
              bags={state.bags}
              activeBagId={state.activeBagId}
              onSelectActiveBag={handleSelectActiveBag}
              onAddBag={handleAddBag}
              unitSystem={unitSystem}
            />
          )}

          {activeNav === 'Packing Cubes' && (
            <PackingCubesView
              cubes={state.cubes}
              items={state.items}
              activeBag={activeBag}
              onUpdateCube={handleUpdateCube}
              onAddCube={handleAddCube}
              unitSystem={unitSystem}
            />
          )}

          {activeNav === 'Gear Checklist' && (
            <GearInventoryView
              items={state.items}
              cubes={state.cubes}
              unitSystem={unitSystem}
              onUpdateItem={handleUpdateItem}
              onBatchUpdateState={handleBatchUpdateState}
              onBatchAssignCube={handleBatchAssignCube}
              onBatchDelete={handleBatchDelete}
              onAddItem={handleAddItem}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
            />
          )}

          {activeNav === 'Airline Baggage Rules' && (
            <AirlineRulesView
              rules={AIRLINE_RULES_DATABASE}
              activeBag={activeBag}
              items={state.items}
              unitSystem={unitSystem}
            />
          )}

          {activeNav === 'Trip Documents' && (
            <TripDocumentsView
              items={state.items}
              bags={state.bags}
              activeBag={activeBag}
              unitSystem={unitSystem}
              onImportItems={handleImportItems}
              onRestoreBackup={handleRestoreBackup}
            />
          )}
        </main>
      </div>
    </>
  );
}

export default App;
