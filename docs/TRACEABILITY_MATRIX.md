# PackMatrix Desktop — Bidirectional Traceability Matrix (BTM)
**Document ID:** PM-BTM-001  
**SDLC Gate:** Gate 1: Formal Requirements Engineering & Traceability  
**Standard Compliance:** NIST SP 800-218 (PW.1.1, PW.1.2), ISO/IEC/IEEE 29148  

---

## 1. Functional Requirements (FR-101 to FR-505)

| Req ID | Domain / Requirement Title | Description | Target Invariant | Implementation Module | Verification Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-101** | Raw Bounding Box Calculation | Compute gross volumetric capacity from external $(L \times W \times D)$. | Double precision IEEE-754 ($f64$) | `src-tauri/src/geometry/bounding_box.rs` | `TEST-VOL-RAW-01` |
| **FR-102** | Corner Bevel Volume Deduction | Subtract dead corner volume caused by structural radii: $\Delta V = (4 - \pi) r^2 D / 1000$. | Analytical quadrant integral accuracy | `src-tauri/src/geometry/bounding_box.rs` | `TEST-VOL-BEVEL-01` |
| **FR-103** | Hull Taper Factor | Modulate usable volume based on trapezoidal hull draft ratio $\tau \in [0.5, 1.0]$. | Linear cross-section draft | `src-tauri/src/geometry/bounding_box.rs` | `TEST-VOL-TAPER-01` |
| **FR-104** | Gusset Expansion Delta | Dynamic depth adjustment when perimeter expansion zipper is disengaged/engaged. | $D_{\text{eff}} = D + \Delta D_{\text{gusset}}$ | `src-tauri/src/geometry/bounding_box.rs` | `TEST-VOL-EXP-01` |
| **FR-105** | Sub-Container Packing Allocation | Nest packing cubes and tech organizers inside parent luggage shell boundaries. | Volumetric non-overlap invariant | `src-tauri/src/db/models.rs` | `TEST-VOL-NEST-01` |
| **FR-201** | Mass Conservation Balance | Total gross pack mass equals tare weight plus sum of packed item weights: $M_{\text{gross}} \equiv M_{\text{tare}} + \sum M_i$. | Exact mass conservation | `src-tauri/src/geometry/invariants.rs` | `TEST-MASS-CONV-01` |
| **FR-202** | 3D Center of Mass (Centroid) | Compute weighted center of gravity coordinates $(X_{\text{com}}, Y_{\text{com}}, Z_{\text{com}})$. | Centroid tolerance $\le 0.5\,\text{mm}$ | `src-tauri/src/geometry/balance.rs` | `TEST-COG-CENT-01` |
| **FR-203** | Spine-Flush Leverage Metric | Penalize depth centroids positioned $> 40\%$ away from user back panel. | Ergonomic leverage score | `src-tauri/src/geometry/balance.rs` | `TEST-COG-SPINE-01` |
| **FR-204** | Lateral Imbalance Detection | Alert when horizontal centroid $\|X_{\text{com}}\| > 0.15 \times W$ to prevent lumbar strain. | Asymmetry penalty factor | `src-tauri/src/geometry/balance.rs` | `TEST-COG-LAT-01` |
| **FR-205** | Bi-Directional Unit Transformation | Convert seamlessly between metric ($g, kg, cm, L$) and imperial ($oz, lbs, in, L$) with zero drift. | Precision drift $\le 10^{-6}$ | `src-tauri/src/geometry/invariants.rs` | `TEST-UNIT-TRANS-01` |
| **FR-301** | Textile Compressibility Factor | Compute reduced pack volume for compressible apparel and sleeping gear. | Density-bounded deduction | `src-tauri/src/geometry/invariants.rs` | `TEST-COMP-RATIO-01` |
| **FR-302** | Compressibility Hysteresis Bound | Prevent compressed items from violating physical matter limits ($\rho \le 0.15\,\text{g/cm}^3$ for dense textiles). | Physical density upper bound | `src-tauri/src/geometry/invariants.rs` | `TEST-COMP-DENSITY-01` |
| **FR-303** | Volumetric Packing Efficiency | Ratio of packed item volume to effective usable luggage capacity. | Range $[0.0\%, 100.0\%]$ | `src-tauri/src/geometry/bounding_box.rs` | `TEST-COMP-EFF-01` |
| **FR-401** | Airline Dimensional Verification | Compare luggage external envelope against carrier limits with millimeter accuracy. | Multi-axis delta calculation | `src-tauri/src/compliance/rules.rs` | `TEST-RULE-ENV-01` |
| **FR-402** | Multi-Tier Fare Constraints | Support 4 distinct airline service tiers (Personal Item, Standard Economy, Premium, Business/First). | Carrier tier matrix registry | `src-tauri/src/compliance/carrier_matrix.rs` | `TEST-RULE-TIER-01` |
| **FR-403** | Underseat Taper & Rigid Frame | Flag items with rigid frame ($L > 35\,\text{cm}$) allocated to tapered underseat aircraft zones. | Geometric interference check | `src-tauri/src/compliance/rules.rs` | `TEST-RULE-RIGID-01` |
| **FR-404** | TSA/ICAO 3-1-1 Liquids Compliance | Verify liquids individual container limit $\le 100\,\text{ml}$ and aggregate bag capacity $\le 1000\,\text{ml}$. | Regulatory envelope bound | `src-tauri/src/compliance/hazmat.rs` | `TEST-HAZ-LIQ-01` |
| **FR-405** | Hazmat Lithium Battery Restriction | Enforce prohibition of $> 100\,\text{Wh}$ batteries without carrier approval and spare cells in checked bags. | FAA / ICAO battery safety rule | `src-tauri/src/compliance/hazmat.rs` | `TEST-HAZ-BATT-01` |
| **FR-501** | Local-First SQLite Persistence | Store all user luggage, gear, and trips in local SQLite with Write-Ahead Logging (`WAL`). | ACID crash resilience | `src-tauri/src/db/migrations.rs` | `TEST-DB-WAL-01` |
| **FR-502** | Transparent SQLCipher Encryption | Optional page-level AES-256 transparent database encryption protecting gear replacement valuations. | Cryptographic page HMAC | `src-tauri/src/db/mod.rs` | `TEST-DB-CRYPTO-01` |
| **FR-503** | Hermetic Export & Backup | Export full gear and luggage manifests into reproducible, validated JSON packages. | Schema-validated payload | `src-tauri/src/export/mod.rs` | `TEST-EXP-JSON-01` |
| **FR-504** | Full-Text Gear Search (FTS5) | Sub-millisecond keyword lookup across brands, tags, and notes via SQLite FTS5 index. | $p99 < 16\,\text{ms}$ latency | `src-tauri/src/db/migrations.rs` | `TEST-DB-FTS-01` |
| **FR-505** | Air-Gapped Zero-Telemetry Guard | Prohibit background analytics, crash reporting, telemetry, and unprompted external sockets. | Zero outbound network packets | `SDLC.md` (Gate 0 / Gate 5) | `TEST-SEC-AIRGAP-01` |

---

## 2. Non-Functional Requirements (NFR-101 to NFR-106)

| Req ID | Requirement Category | Quality Attribute / Constraint | Strict Pass Criteria | Verification Test ID |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-101** | Mathematical Precision | High-Precision Geometry & Conversions | Volume rounding strictly to $\pm 0.01\,\text{L}$; Centroid error $\le 0.5\,\text{mm}$; Zero floating point drift. | `TEST-NFR-PREC-01` |
| **NFR-102** | Performance & Latency | Database Query Efficiency | FTS5 full-text search latency $p99 \le 16\,\text{ms}$ across $50,000$ inventory items. | `TEST-NFR-PERF-01` |
| **NFR-103** | Resource Efficiency | Memory (RAM) Footprint | Peak Resident Set Size ($\text{RSS}$) $< 120\,\text{MB}$ under batch processing of 50k gear items. | `TEST-NFR-MEM-01` |
| **NFR-104** | Privacy & Air-Gap Integrity | Zero Telemetry / Network Isolation | Exactly 0 unsolicited outbound TCP/UDP/DNS packets observed during continuous application usage. | `TEST-NFR-AIRGAP-01` |
| **NFR-105** | Toolchain Reproducibility | Hermetic & Pinned Environment | Pinned Rust 1.98.1 toolchain, pinned Node 22 runtime, `--frozen` lockfiles, zero CVSS $\ge 4.0$ dependencies. | `TEST-NFR-LOCK-01` |
| **NFR-106** | Memory Safety & Hardening | Zero Undefined Behavior & Leaks | Clippy `-D warnings` clean; zero leaks under ASan/LSan/Miri; zero unescaped IPC parameters. | `TEST-NFR-SAFE-01` |
