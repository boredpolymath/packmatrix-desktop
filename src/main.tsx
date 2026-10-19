import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// SDLC 7.3: Cold Start Latency Benchmark (Execution to First Interactive Paint <= 600ms)
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const interactivePaintMs = performance.now();
    (window as unknown as { __PACKMATRIX_COLD_START_MS__?: number }).__PACKMATRIX_COLD_START_MS__ = interactivePaintMs;
    console.info(
      `[PackMatrix Benchmark] Cold Start to First Interactive Paint: ${interactivePaintMs.toFixed(1)}ms (Target <= 600ms: ${interactivePaintMs <= 600 ? 'PASS' : 'WARN'})`
    );
  });
});
