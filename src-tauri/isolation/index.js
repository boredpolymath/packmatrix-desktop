/**
 * PackMatrix Isolation Pattern Interceptor
 * SDLC Phase Gate 2: Section 2.2 Defensive Sandboxing & Isolation Boundary
 *
 * Intercepts Inter-Process Communication (IPC) messages sent from the frontend
 * application before they reach the Tauri Core backend. Validates payload
 * integrity, guards against malformed/tampered IPC messages, and passes
 * payloads through cryptographic authentication.
 */

window.__TAURI_ISOLATION_HOOK__ = (payload) => {
  // Validate payload is a well-formed object
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('PackMatrix Isolation Security Error: Non-object IPC payload rejected.');
  }

  // Validate message callback / error tokens if present
  if ('callback' in payload && typeof payload.callback !== 'number') {
    throw new Error('PackMatrix Isolation Security Error: Invalid callback identifier.');
  }

  if ('error' in payload && typeof payload.error !== 'number') {
    throw new Error('PackMatrix Isolation Security Error: Invalid error callback identifier.');
  }

  // Verify command name does not contain illegal characters or directory traversal
  if ('cmd' in payload && typeof payload.cmd === 'string') {
    if (payload.cmd.includes('../') || payload.cmd.includes('..\\')) {
      throw new Error('PackMatrix Isolation Security Error: Path traversal detected in IPC cmd.');
    }
  }

  // Return sanitized and validated payload to be cryptographically sealed by Tauri
  return payload;
};
