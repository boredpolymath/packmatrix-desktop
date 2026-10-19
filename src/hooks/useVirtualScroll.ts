import { useState, useRef, useCallback, useEffect } from 'react';

export interface VirtualScrollOptions {
  totalItems: number;
  rowHeight: number;
  overscan?: number;
}

export interface VirtualScrollResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  startIndex: number;
  endIndex: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  totalHeight: number;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  visibleCount: number;
}

/**
 * High-performance virtual windowing hook for rendering lists with 10,000+ items at constant 60 FPS
 * SDLC Phase Gate 5: Section 7.3 Virtualized List Rendering
 */
export function useVirtualScroll({
  totalItems,
  rowHeight,
  overscan = 6,
}: VirtualScrollOptions): VirtualScrollResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  // Measure viewport height dynamically using ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setViewportHeight(el.clientHeight || 600);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setViewportHeight(entry.contentRect.height);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = totalItems * rowHeight;

  // Compute visible item window
  const rawStartIndex = Math.floor(scrollTop / rowHeight);
  const rawEndIndex = Math.ceil((scrollTop + viewportHeight) / rowHeight);

  const startIndex = Math.max(0, rawStartIndex - overscan);
  const endIndex = Math.min(totalItems, rawEndIndex + overscan);

  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (totalItems - endIndex) * rowHeight);
  const visibleCount = Math.max(0, endIndex - startIndex);

  return {
    containerRef,
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight,
    totalHeight,
    onScroll,
    visibleCount,
  };
}
