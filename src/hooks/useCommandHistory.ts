import { useState, useCallback } from 'react';

export interface Command<T> {
  description: string;
  apply: (state: T) => T;
  rollback: (state: T) => T;
}

export function useCommandHistory<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const [history, setHistory] = useState<Command<T>[]>([]);
  const [redoStack, setRedoStack] = useState<Command<T>[]>([]);

  const executeCommand = useCallback((cmd: Command<T>) => {
    setState((curr) => {
      const nextState = cmd.apply(curr);
      setHistory((prev) => [...prev, cmd]);
      setRedoStack([]); // Clear redo stack on new branch
      return nextState;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      const cmdToUndo = prevHistory[prevHistory.length - 1];
      const newHistory = prevHistory.slice(0, -1);

      setState((curr) => {
        const revertedState = cmdToUndo.rollback(curr);
        setRedoStack((prevRedo) => [...prevRedo, cmdToUndo]);
        return revertedState;
      });

      return newHistory;
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const cmdToRedo = prevRedo[prevRedo.length - 1];
      const newRedo = prevRedo.slice(0, -1);

      setState((curr) => {
        const reappliedState = cmdToRedo.apply(curr);
        setHistory((prevHistory) => [...prevHistory, cmdToRedo]);
        return reappliedState;
      });

      return newRedo;
    });
  }, []);

  const resetHistory = useCallback((newState: T) => {
    setState(newState);
    setHistory([]);
    setRedoStack([]);
  }, []);

  const canUndo = history.length > 0;
  const canRedo = redoStack.length > 0;

  return {
    state,
    setState,
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    historyLength: history.length,
    lastCommandName: history[history.length - 1]?.description,
  };
}
