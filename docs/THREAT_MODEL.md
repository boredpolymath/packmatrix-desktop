# PackMatrix Desktop — Comprehensive STRIDE Threat Model & Defensive Security Architecture
**Document ID:** PM-THREAT-001  
**SDLC Gate:** Gate 2: Architecture, Threat Modeling & Defensive System Design (Section 2.1)  
**Methodology:** Microsoft STRIDE, OWASP Desktop Application Top 10, NIST SP 800-218  
**Scope:** PackMatrix Desktop Core, Tauri v2 IPC Bridge, Local Storage Engine, and Air-Gapped Network Boundary  

---

## 1. Executive Summary & Asset Classification

PackMatrix Desktop is a local-first, air-gapped application engineered to protect sensitive traveler and gear data. Because travelers catalog high-value expedition gear, camera equipment (with serial numbers and replacement purchase receipts), luggage geometry, and travel itineraries, the system models the following critical assets:

| Asset ID | Asset Description | Confidentiality | Integrity | Availability | Asset Classification |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **A-1** | Gear Serial Numbers & Purchase Invoices | High | High | Low | Private Financial Data |
| **A-2** | SQLite Database Files (`packmatrix.db`) | High | Critical | High | Core Local State |
| **A-3** | Airline Regulatory Seed Matrix | Low | Critical | High | Safety-Critical Data |
| **A-4** | Cryptographic Encryption Keys & Salts | Critical | Critical | Critical | Root of Trust |
| **A-5** | Exported Manifests (JSON, PDF, CSV) | Medium | High | Low | User Export Archives |
| **A-6** | Native Process Execution Memory Space | Critical | Critical | Critical | Runtime Integrity |

---

## 2. Trust Boundaries & Data Flow Diagram (DFD)

```
[ External Environment / Uncontrolled OS Filesystem ]
                  │ (File Dialog Read/Write)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Trust Boundary 1: Operating System Interface                │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Trust Boundary 2: Webview Boundary                  │   │
│   │                                                     │   │
│   │   [ Presentation Layer: React 19 + TypeScript ]     │   │
│   │   - Strictly sandboxed within WebKit / WebView2     │   │
│   │   - Strict CSP (zero inline scripts, no eval)       │   │
│   │   - DOM sanitization & parameter encoding           │   │
│   │                                                     │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │ (Tauri IPC via MessagePort)   │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Trust Boundary 3: Native Core Privilege Domain      │   │
│   │                                                     │   │
│   │   [ Tauri v2 Native Core: Rust 1.98.1 ]             │   │
│   │   - #![forbid(unsafe_code)]                         │   │
│   │   - Parameterized Command Router & Zod validation   │   │
│   │   - Invariant Engine & Computational Geometry       │   │
│   │   - Rate Limiters & Bounded Stream Parsers (50MB)   │   │
│   │                                                     │   │
│   └───────────────┬─────────────────────┬───────────────┘   │
│                   │                     │                   │
│ (AES-256-GCM)     │                     │ (Redacted Tracing)│
│                   ▼                     ▼                   │
│   [ SQLCipher / SQLite WAL ]     [ Local Diagnostics ]      │
│   - Encrypted pages              - Salted PII hashes        │
│   - Page HMAC verification       - 3-day max retention      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Comprehensive STRIDE Threat Analysis Matrix

### 3.1 Threat Category S: Spoofing
* **Attack Scenario (S-1):** An attacker on an untrusted airport Wi-Fi network performs DNS poisoning or MITM to serve tampered airline dimensional rules, tricking the traveler into packing an oversized bag and facing gate penalties.
* **Risk Severity:** High (Impact: 4, Likelihood: 3 $\rightarrow$ DREAD 7.2)
* **Production Mitigation Invariant:**
  1. Static verified carrier seeds are compiled directly into the binary as immutable static data structures (`GLOBAL_CARRIER_MATRIX`).
  2. Any dynamic regulatory seed update requires Ed25519 cryptographic signature verification and monotonic semantic version checking.
* **Verification Test:** `SEC-TEST-SPOOF-01` — Reject unauthenticated or modified regulatory updates.

### 3.2 Threat Category T: Tampering
* **Attack Scenario (T-1):** Malware on the host workstation directly modifies records in `packmatrix.db` on disk to wipe equipment replacement values or tamper with serialized inventory items.
* **Risk Severity:** Critical (Impact: 5, Likelihood: 3 $\rightarrow$ DREAD 8.4)
* **Production Mitigation Invariant:**
  1. Transparent page-level database encryption using SQLCipher (256-bit AES-GCM).
  2. Page-level cryptographic HMAC checksums evaluated on every disk read before returning rows.
  3. Pre-migration backup rotation: immutable snapshots created in `backups/` before any write operation.
* **Verification Test:** `SEC-TEST-TAMP-01` — Detect raw bit manipulation and fail closed with database quarantine.

### 3.3 Threat Category R: Repudiation
* **Attack Scenario (R-1):** An accidental batch deletion or user error wipes a complex multi-year trip packing allocation, leaving no audit history or rollback mechanism.
* **Risk Severity:** Medium (Impact: 3, Likelihood: 4 $\rightarrow$ DREAD 6.8)
* **Production Mitigation Invariant:**
  1. Transaction savepoints around all batch mutative operations.
  2. An in-memory and SQLite-backed append-only undo ledger (Command Pattern) supporting multi-level rollback.
  3. Automatic pre-migration snapshot daemon retaining rolling 5 verified database states.
* **Verification Test:** `SEC-TEST-REP-01` — Full undo/redo rollback of batch operations with zero data loss.

### 3.4 Threat Category I: Information Disclosure
* **Attack Scenario (I-1):** Memory dumping tools inspect unencrypted swap space or RAM to harvest high-value camera serial numbers and receipts.
* **Risk Severity:** High (Impact: 4, Likelihood: 3 $\rightarrow$ DREAD 7.6)
* **Production Mitigation Invariant:**
  1. Implement secure memory wiping (`zeroize` / `ZeroizeOnDrop`) on all sensitive structs upon drop.
  2. Lock heap memory containing cryptographic keys using `mlock` to prevent operating system paging to swap.
  3. Strip internal filesystem paths and host OS usernames from IPC error messages (`AppError`).
* **Verification Test:** `SEC-TEST-INFO-01` — Assert memory buffer zeroing after sensitive struct drop.

### 3.5 Threat Category D: Denial of Service
* **Attack Scenario (D-1):** An attacker supplies a crafted 500MB CSV or recursive circular JSON payload designed to trigger out-of-memory (OOM) crashes or thread lockups.
* **Risk Severity:** Medium (Impact: 3, Likelihood: 4 $\rightarrow$ DREAD 6.5)
* **Production Mitigation Invariant:**
  1. Hard cap on import stream size: refuse to allocate or parse files exceeding $50\,\text{MB}$.
  2. Maximum recursion depth constraint ($\le 10$) on nested container hierarchies.
  3. Bounded non-blocking async stream parsing yielding to the Tokio runtime loop every 1000 items.
* **Verification Test:** `SEC-TEST-DOS-01` — Reject oversized streams ($> 50\,\text{MB}$) and enforce recursion depth bounds.

### 3.6 Threat Category E: Elevation of Privilege
* **Attack Scenario (E-1):** Malicious gear item title containing HTML/JavaScript escapes into native command execution via Tauri IPC or shell opener injection.
* **Risk Severity:** Critical (Impact: 5, Likelihood: 2 $\rightarrow$ DREAD 8.0)
* **Production Mitigation Invariant:**
  1. Strict Content Security Policy (`CSP`): zero inline scripts, zero `eval()`.
  2. Tauri v2 permission manifest in `capabilities/main.json`: deny arbitrary shell command execution globally.
  3. Shell opener permitted only on validated HTTPS airline domains; file dialogs scoped only to user-selected paths.
  4. Parameterized IPC handlers rejecting non-schema arguments.
* **Verification Test:** `SEC-TEST-EOP-01` — Verify XSS payload execution failure and shell injection rejection.

---

## 4. Verification Test Mapping Table

| STRIDE Threat | Production Invariant Control | Verification Test ID | Test Implementation Target |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Ed25519 signature validation & static binary seeds | `SEC-TEST-SPOOF-01` | `src-tauri/src/security/threat_tests.rs` |
| **Tampering** | SQLCipher HMAC validation & quarantine fallback | `SEC-TEST-TAMP-01` | `src-tauri/src/security/threat_tests.rs` |
| **Repudiation** | Savepoints & append-only undo ledger | `SEC-TEST-REP-01` | `src-tauri/src/security/threat_tests.rs` |
| **Information Disclosure** | `ZeroizeOnDrop` memory sanitization & path stripping | `SEC-TEST-INFO-01` | `src-tauri/src/security/threat_tests.rs` |
| **Denial of Service** | $50\,\text{MB}$ stream bound & recursion depth limit $\le 10$ | `SEC-TEST-DOS-01` | `src-tauri/src/security/threat_tests.rs` |
| **Elevation of Privilege** | Parameterized IPC & shell opener restriction | `SEC-TEST-EOP-01` | `src-tauri/src/security/threat_tests.rs` |
