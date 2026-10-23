import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  LuggageShell,
  SubContainer,
  InventoryItem,
  TripPlan,
  Allocation,
  CarrierEnvelope,
  ReadinessState,
  AutoPackResult,
} from '../types';
import { DEFAULT_FALLBACK_BAG } from '../types';
import { ipc } from '../services/ipc';
import { useCommandHistory, type Command } from './useCommandHistory';

export interface PackMatrixDbState {
  bags: LuggageShell[];
  activeBagId: string;
  cubes: SubContainer[];
  items: InventoryItem[];
  tripPlan: TripPlan | null;
  allocations: Allocation[];
  carrierEnvelopes: CarrierEnvelope[];
  isLoading: boolean;
  error: string | null;
}

export function usePackMatrixDb(isReadOnlyMode = false) {
  const [carrierEnvelopes, setCarrierEnvelopes] = useState<CarrierEnvelope[]>([]);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Command history holds core user-mutable state: bags, activeBagId, cubes, items
  const {
    state,
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useCommandHistory<{
    bags: LuggageShell[];
    activeBagId: string;
    cubes: SubContainer[];
    items: InventoryItem[];
  }>({
    bags: [DEFAULT_FALLBACK_BAG],
    activeBagId: DEFAULT_FALLBACK_BAG.id,
    cubes: [],
    items: [],
  });

  // Initial boot sequence loading from native SQLite
  useEffect(() => {
    let isMounted = true;
    async function loadInitialDatabase() {
      try {
        setIsLoading(true);
        const [bags, cubes, items, plan, allPlans, carriers] = await Promise.all([
          ipc.getLuggageShells(),
          ipc.getSubContainers(),
          ipc.getInventoryItems(),
          ipc.getActiveTripPlan().catch(() => null),
          ipc.getAllTripPlans().catch(() => []),
          ipc.getCarrierEnvelopes(),
        ]);

        if (!isMounted) return;

        const activeId = plan?.active_luggage_shell_id || bags[0]?.id || '';
        resetHistory({
          bags,
          activeBagId: activeId,
          cubes,
          items,
        });

        if (allPlans && allPlans.length > 0) {
          setTripPlans(allPlans);
        } else if (plan) {
          setTripPlans([plan]);
        }

        if (plan) {
          setTripPlan(plan);
          const tripAllocs = await ipc.getTripAllocations(plan.id).catch(() => []);
          if (isMounted) setAllocations(tripAllocs);
        }
        setCarrierEnvelopes(carriers);
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInitialDatabase();
    return () => {
      isMounted = false;
    };
  }, [resetHistory]);

  const activeBag = useMemo(() => {
    return (
      state.bags.find((b) => b.id === state.activeBagId) ||
      state.bags[0] ||
      DEFAULT_FALLBACK_BAG
    );
  }, [state.bags, state.activeBagId]);

  // Check write guard
  const checkWriteAllowed = useCallback(() => {
    if (isReadOnlyMode) {
      setErrorMessage('Action blocked: database is mounted in read-only mode.');
      return false;
    }
    return true;
  }, [isReadOnlyMode]);

  // Actions
  const handleTogglePacked = useCallback(
    (id: string) => {
      if (!checkWriteAllowed()) return;
      const target = state.items.find((i) => i.id === id);
      if (!target) return;

      const nextPacked = !target.packed;
      const nextReadiness: ReadinessState = nextPacked ? 'Packed' : 'In Closet';
      const updatedItem: InventoryItem = {
        ...target,
        packed: nextPacked,
        readiness_state: nextReadiness,
      };

      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
        description: 'Toggle item packed state',
        apply: (curr) => ({
          ...curr,
          items: curr.items.map((i) => (i.id === id ? updatedItem : i)),
        }),
        rollback: (curr) => ({
          ...curr,
          items: curr.items.map((i) => (i.id === id ? target : i)),
        }),
      };
      executeCommand(cmd);

      // Async persistence
      ipc.updateInventoryItem(updatedItem).catch((err) => {
        undo();
        setErrorMessage(`Failed to persist item state: ${err}`);
      });
    },
    [checkWriteAllowed, state.items, executeCommand, undo]
  );

  const handleToggleExpandBag = useCallback(() => {
    if (!checkWriteAllowed() || !activeBag) return;
    const currentExpanded = activeBag.is_expanded;
    const updatedBag: LuggageShell = { ...activeBag, is_expanded: !currentExpanded };

    const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
      description: 'Toggle luggage expansion gusset',
      apply: (curr) => ({
        ...curr,
        bags: curr.bags.map((b) => (b.id === updatedBag.id ? updatedBag : b)),
      }),
      rollback: (curr) => ({
        ...curr,
        bags: curr.bags.map((b) => (b.id === activeBag.id ? activeBag : b)),
      }),
    };
    executeCommand(cmd);

    ipc.updateLuggageShell(updatedBag).catch((err) => {
      undo();
      setErrorMessage(`Failed to persist bag expansion: ${err}`);
    });
  }, [checkWriteAllowed, activeBag, executeCommand, undo]);

  const handleSelectActiveBag = useCallback(
    (bagId: string) => {
      const previousId = state.activeBagId;
      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
        description: `Switch active luggage to ${bagId}`,
        apply: (curr) => ({ ...curr, activeBagId: bagId }),
        rollback: (curr) => ({ ...curr, activeBagId: previousId }),
      };
      executeCommand(cmd);

      if (tripPlan) {
        const updatedPlan: TripPlan = { ...tripPlan, active_luggage_shell_id: bagId };
        setTripPlan(updatedPlan);
        ipc.saveTripPlan(updatedPlan).catch(() => {});
      }
    },
    [state.activeBagId, tripPlan, executeCommand]
  );

  const handleAddBag = useCallback(
    (newBag: LuggageShell) => {
      if (!checkWriteAllowed()) return;
      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
        description: `Add custom bag: ${newBag.name}`,
        apply: (curr) => ({ ...curr, bags: [...curr.bags, newBag], activeBagId: newBag.id }),
        rollback: (curr) => ({
          ...curr,
          bags: curr.bags.filter((b) => b.id !== newBag.id),
          activeBagId: curr.activeBagId === newBag.id ? curr.bags[0]?.id || '' : curr.activeBagId,
        }),
      };
      executeCommand(cmd);

      ipc.createLuggageShell(newBag).catch((err) => {
        undo();
        setErrorMessage(`Failed to persist new luggage: ${err}`);
      });
    },
    [checkWriteAllowed, executeCommand, undo]
  );

  const handleUpdateBag = useCallback(
    (updatedBag: LuggageShell) => {
      if (!checkWriteAllowed()) return;
      const original = state.bags.find((b) => b.id === updatedBag.id);
      if (!original) return;

      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
        description: `Update luggage geometry: ${updatedBag.name}`,
        apply: (curr) => ({
          ...curr,
          bags: curr.bags.map((b) => (b.id === updatedBag.id ? updatedBag : b)),
        }),
        rollback: (curr) => ({
          ...curr,
          bags: curr.bags.map((b) => (b.id === original.id ? original : b)),
        }),
      };
      executeCommand(cmd);

      ipc.updateLuggageShell(updatedBag).catch((err) => {
        undo();
        setErrorMessage(`Failed to update luggage: ${err}`);
      });
    },
    [checkWriteAllowed, state.bags, executeCommand, undo]
  );

  const handleDuplicateBag = useCallback(
    (sourceBag: LuggageShell) => {
      if (!checkWriteAllowed()) return;
      const copy: LuggageShell = {
        ...sourceBag,
        id: `bag-copy-${Date.now()}`,
        name: `${sourceBag.name} (Copy)`,
      };
      handleAddBag(copy);
    },
    [checkWriteAllowed, handleAddBag]
  );

  const handleDeleteBag = useCallback(
    (bagId: string) => {
      if (!checkWriteAllowed()) return;
      if (state.bags.length <= 1) {
        setErrorMessage('Cannot delete the only remaining luggage shell.');
        return;
      }
      const target = state.bags.find((b) => b.id === bagId);
      if (!target) return;

      const remaining = state.bags.filter((b) => b.id !== bagId);
      const nextActiveId = state.activeBagId === bagId ? remaining[0].id : state.activeBagId;

      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
        description: `Delete luggage shell: ${target.name}`,
        apply: (curr) => ({
          ...curr,
          bags: remaining,
          activeBagId: nextActiveId,
        }),
        rollback: (curr) => ({
          ...curr,
          bags: [...curr.bags, target],
          activeBagId: curr.activeBagId,
        }),
      };
      executeCommand(cmd);

      ipc.deleteLuggageShell(bagId).catch((err) => {
        undo();
        setErrorMessage(`Failed to delete luggage shell: ${err}`);
      });
    },
    [checkWriteAllowed, state.bags, state.activeBagId, executeCommand, undo]
  );

  const handleUpdateItem = useCallback(
    (updated: InventoryItem) => {
      if (!checkWriteAllowed()) return;
      const original = state.items.find((i) => i.id === updated.id);
      if (!original) return;

      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
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

      ipc.updateInventoryItem(updated).catch((err) => {
        undo();
        setErrorMessage(`Failed to update item: ${err}`);
      });
    },
    [checkWriteAllowed, state.items, executeCommand, undo]
  );

  const handleAddItem = useCallback(
    (newItem: InventoryItem) => {
      if (!checkWriteAllowed()) return;
      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
        description: `Add item: ${newItem.name}`,
        apply: (curr) => ({ ...curr, items: [...curr.items, newItem] }),
        rollback: (curr) => ({ ...curr, items: curr.items.filter((i) => i.id !== newItem.id) }),
      };
      executeCommand(cmd);

      ipc.createInventoryItem(newItem).catch((err) => {
        undo();
        setErrorMessage(`Failed to create item: ${err}`);
      });
    },
    [checkWriteAllowed, executeCommand, undo]
  );

  const handleBatchUpdateState = useCallback(
    (itemIds: string[], nextState: ReadinessState) => {
      if (!checkWriteAllowed()) return;
      const previousMap = new Map(state.items.map((i) => [i.id, i.readiness_state]));
      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
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

      ipc.batchUpdateInventoryState(itemIds, nextState).catch((err) => {
        undo();
        setErrorMessage(`Failed to batch update items: ${err}`);
      });
    },
    [checkWriteAllowed, state.items, executeCommand, undo]
  );

  const handleBatchAssignCube = useCallback(
    (itemIds: string[], cubeId?: string) => {
      if (!checkWriteAllowed()) return;
      const previousMap = new Map(state.items.map((i) => [i.id, i.sub_container_id]));
      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
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

      ipc.batchAssignSubcontainer(itemIds, cubeId).catch((err) => {
        undo();
        setErrorMessage(`Failed to batch assign subcontainer: ${err}`);
      });
    },
    [checkWriteAllowed, state.items, executeCommand, undo]
  );

  const handleBatchDelete = useCallback(
    (itemIds: string[]) => {
      if (!checkWriteAllowed()) return;
      const deletedItems = state.items.filter((i) => itemIds.includes(i.id));
      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
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

      ipc.batchDeleteInventoryItems(itemIds).catch((err) => {
        undo();
        setErrorMessage(`Failed to batch delete items: ${err}`);
      });
    },
    [checkWriteAllowed, state.items, executeCommand, undo]
  );

  const handleUpdateCube = useCallback(
    (updated: SubContainer) => {
      if (!checkWriteAllowed()) return;
      const original = state.cubes.find((c) => c.id === updated.id);
      if (!original) return;

      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
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

      ipc.updateSubContainer(updated).catch((err) => {
        undo();
        setErrorMessage(`Failed to update cube: ${err}`);
      });
    },
    [checkWriteAllowed, state.cubes, executeCommand, undo]
  );

  const handleAddCube = useCallback(
    (newCube: SubContainer) => {
      if (!checkWriteAllowed()) return;
      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
        description: `Add cube: ${newCube.name}`,
        apply: (curr) => ({ ...curr, cubes: [...curr.cubes, newCube] }),
        rollback: (curr) => ({ ...curr, cubes: curr.cubes.filter((c) => c.id !== newCube.id) }),
      };
      executeCommand(cmd);

      ipc.createSubContainer(newCube).catch((err) => {
        undo();
        setErrorMessage(`Failed to add cube: ${err}`);
      });
    },
    [checkWriteAllowed, executeCommand, undo]
  );

  const handleRunAutoPack = useCallback(async (): Promise<AutoPackResult | null> => {
    if (!checkWriteAllowed() || !activeBag) return null;
    try {
      const tripId = tripPlan?.id || 'active-trip';
      const result = await ipc.autoPackHeuristic(tripId, activeBag, state.cubes, state.items);

      // Apply coordinates and cube assignments into state
      const allocMap = new Map(result.allocations.map((a) => [a.inventory_item_id, a]));
      const updatedItems = state.items.map((item) => {
        const alloc = allocMap.get(item.id);
        if (alloc) {
          return {
            ...item,
            sub_container_id: alloc.sub_container_id,
            pos_x: alloc.pos_x,
            pos_y: alloc.pos_y,
            pos_z: alloc.pos_z,
            packed: alloc.is_packed,
            readiness_state: 'Packed' as ReadinessState,
          };
        }
        return item;
      });

      const cmd: Command<{ bags: LuggageShell[]; activeBagId: string; cubes: SubContainer[]; items: InventoryItem[] }> = {
        description: 'Run 3D gravity center distribution auto-packer',
        apply: (curr) => ({ ...curr, items: updatedItems }),
        rollback: (curr) => ({ ...curr, items: state.items }),
      };
      executeCommand(cmd);

      return result;
    } catch (err) {
      setErrorMessage(`Auto-pack execution failed: ${err}`);
      return null;
    }
  }, [checkWriteAllowed, activeBag, tripPlan, state.cubes, state.items, executeCommand]);

  const handleSelectTrip = useCallback(
    async (tripId: string) => {
      const target = tripPlans.find((t) => t.id === tripId);
      if (!target) return;
      setTripPlan(target);
      if (target.active_luggage_shell_id) {
        handleSelectActiveBag(target.active_luggage_shell_id);
      }
      const allocs = await ipc.getTripAllocations(target.id).catch(() => []);
      setAllocations(allocs);
    },
    [tripPlans, handleSelectActiveBag]
  );

  const handleCreateTrip = useCallback(
    async (newTrip: TripPlan) => {
      if (!checkWriteAllowed()) return;
      try {
        const saved = await ipc.saveTripPlan(newTrip);
        setTripPlans((curr) => [saved, ...curr.filter((t) => t.id !== saved.id)]);
        setTripPlan(saved);
        if (saved.active_luggage_shell_id) {
          handleSelectActiveBag(saved.active_luggage_shell_id);
        }
      } catch (err) {
        setErrorMessage(`Failed to create trip plan: ${err}`);
      }
    },
    [checkWriteAllowed, handleSelectActiveBag]
  );

  const handleDeleteTrip = useCallback(
    async (tripId: string) => {
      if (!checkWriteAllowed()) return;
      if (tripPlans.length <= 1) {
        setErrorMessage('Cannot delete the only remaining trip plan.');
        return;
      }
      try {
        await ipc.deleteTripPlan(tripId);
        const remaining = tripPlans.filter((t) => t.id !== tripId);
        setTripPlans(remaining);
        if (tripPlan?.id === tripId && remaining[0]) {
          setTripPlan(remaining[0]);
          if (remaining[0].active_luggage_shell_id) {
            handleSelectActiveBag(remaining[0].active_luggage_shell_id);
          }
        }
      } catch (err) {
        setErrorMessage(`Failed to delete trip: ${err}`);
      }
    },
    [checkWriteAllowed, tripPlans, tripPlan, handleSelectActiveBag]
  );

  return {
    state,
    activeBag,
    tripPlan,
    tripPlans,
    allocations,
    carrierEnvelopes,
    isLoading,
    errorMessage,
    setErrorMessage,
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    handleTogglePacked,
    handleToggleExpandBag,
    handleSelectActiveBag,
    handleAddBag,
    handleUpdateBag,
    handleDuplicateBag,
    handleDeleteBag,
    handleSelectTrip,
    handleCreateTrip,
    handleDeleteTrip,
    handleUpdateItem,
    handleAddItem,
    handleBatchUpdateState,
    handleBatchAssignCube,
    handleBatchDelete,
    handleUpdateCube,
    handleAddCube,
    handleRunAutoPack,
  };
}
