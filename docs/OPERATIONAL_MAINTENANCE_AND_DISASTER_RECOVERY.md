# PackMatrix Desktop — Operational Maintenance, Disaster Recovery & Support Runbook
## SDLC Phase Gate 8 Engineering Specification

**Product:** PackMatrix Desktop: Local-First Luggage Geometry Optimizer & Gear Suite  
**Author:** Bored Polymath Studios  
**Compliance Standard:** NIST SP 800-218 (SSDF), OWASP Desktop App Top 10, OWASP ASVS Level 3, GDPR Art. 25, SLSA Level 3  
**Architecture:** Local-First SQLite (WAL Mode) with Transparent SQLCipher Encryption  

---

## 1. Executive Summary & Operational Invariants

PackMatrix Desktop is built from the ground up on strict local-first, zero-telemetry, and high-data-sovereignty principles. Because the application processes high-value gear valuations, custom airline luggage geometry, and personal packing manifests without sending telemetry to external cloud servers, all operational maintenance, health monitoring, corruption salvage, and emergency recovery must operate deterministically on the user's local workstation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      LOCAL RUNTIME MAINTENANCE SUITE                   │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│ 1. Startup Watchdog      │ 2. Pre-Migration Daemon │ 3. Sanitized Logs │
│  - PRAGMA quick_check    │  - Automatic .bak       │  - Zero PII       │
│  - Instant corruption    │  - Rolling 5-snapshot   │  - Salted hash    │
│    detection             │    rotation             │  - 3-day / 5MB cap│
└────────────┬─────────────┴────────────┬────────────┴───────────┬───────┘
             ▼                          ▼                        ▼
┌──────────────────────────┬─────────────────────────┬───────────────────┐
│ Disaster Recovery        │ Hotfix SLA & Rollback   │ Data Sovereignty  │
│  - Scenario A: WAL drop  │  - P0: ≤ 4h SLA         │  - 1-Click Vault  │
│  - Scenario B: Snapshot  │  - P1: ≤ 24h SLA        │    (JSON + SQLite)│
│    quarantine fallback   │  - P2: Next patch       │  - Secure wipe    │
│  - Scenario C: Raw dump  │  - Tagged hotfix branch │    (Zero-fill)    │
└──────────────────────────┴─────────────────────────┴───────────────────┘
```

---

## 2. Section 8.1: Built-in Database Health Watchdog & Maintenance Suite

### 2.1 Fast Startup Quick Check
On every application launch, before any user queries or UI renders execute, the native Rust core invokes SQLite's fast b-tree integrity validator:
```sql
PRAGMA quick_check;
```
- **Execution Target:** $\le 12\,\text{ms}$.
- **Expected Return:** `"ok"`.
- **Failure Trigger:** Any return value $\ne \text{"ok"}$ immediately halts normal initialization and triggers the Automated Quarantine Fallback Daemon (Scenario B).

### 2.2 Comprehensive User-Triggered Diagnostics
Users can invoke a full health audit at any time via Settings or the Diagnostics HUD. The command executes the following atomic sequence:
```sql
PRAGMA quick_check;
PRAGMA integrity_check;
PRAGMA foreign_key_check;
PRAGMA optimize;
VACUUM;
```
- **`PRAGMA integrity_check`:** Exhaustively traverses every b-tree page, index b-tree, freelist, and cell payload.
- **`PRAGMA foreign_key_check`:** Ensures 100% cascade delete and reference integrity between `luggage_shells`, `sub_containers`, `inventory_items`, and `allocations`.
- **`PRAGMA optimize`:** Queries SQLite internal query planner metrics to generate and update b-tree statistics tables (`sqlite_stat1`, `sqlite_stat4`).
- **`VACUUM`:** Reclaims unallocated pages from deleted gear items, defragments pages into contiguous sequential disk blocks, and compacts WAL storage.

### 2.3 Automatic Pre-Migration Snapshot Daemon
Prior to applying any database schema migration:
1. The daemon inspects `backups/`.
2. Duplicates the active database file to `backups/packmatrix_<version>_<timestamp>.bak`.
3. Verifies file byte-count equality.
4. Executes rolling rotation: retains the 5 most recent verified snapshots; older `.bak` files are deleted automatically to prevent unbounded storage accumulation.

---

## 3. Section 8.2: Disaster Recovery & Corruption Salvage Runbooks

### 3.1 Scenario A: Corrupt WAL or Shared Memory Header
*Symptom:* Database fails to open due to `SQLITE_IOERR_SHORT_READ` or uncoordinated power failure while writes were flushing to WAL.
*Remediation:*
1. Close all active database connections.
2. Unlink the active write-ahead log (`packmatrix.db-wal`) and shared memory index (`packmatrix.db-shm`).
3. Re-open `packmatrix.db` in single-connection mode; SQLite recovers consistent committed state from the main database file.
4. Run `PRAGMA quick_check;` to verify b-tree consistency.
*Automated Method:*
```rust
db::operations::salvage_corrupt_wal(&db_path)?;
```

### 3.2 Scenario B: Database Header Corruption & Emergency Snapshot Fallback
*Symptom:* SQLite header bytes corrupted, disk sector bad block, or `PRAGMA quick_check` returns non-ok.
*Automated Fallback Sequence:*
1. Detect failure of `PRAGMA quick_check`.
2. Quarantine the corrupted file to `quarantine/packmatrix_corrupt_<timestamp>.db`.
3. Locate the newest verified snapshot from `backups/` (`packmatrix_<version>_<timestamp>.bak`).
4. Restore snapshot as active `packmatrix.db`.
5. Remove any orphaned `.db-wal` or `.db-shm` files.
6. Present a non-destructive explanatory modal to the user containing the quarantine location and snapshot timestamp.
*Automated Method:*
```rust
db::operations::handle_corruption_fallback(&db_path, &backups_dir, &quarantine_dir)?;
```

### 3.3 Scenario C: Emergency Raw Table Dump / Salvage CLI Runbook
*Symptom:* Header or indexes corrupted and no backup snapshot available.
*Manual CLI Procedure:*
```bash
# Extract readable rows from corrupted SQLite database
sqlite3 packmatrix.db ".recover" | sqlite3 packmatrix_recovered.db

# Validate recovered database
sqlite3 packmatrix_recovered.db "PRAGMA quick_check;"

# Swap recovered database into active production path
mv packmatrix.db quarantine/packmatrix_manual_quarantine.db
mv packmatrix_recovered.db packmatrix.db
```
*Programmatic Equivalent:*
```rust
db::operations::execute_emergency_table_salvage(&corrupt_db_path, &recovered_db_path)?;
```

---

## 4. Section 8.3: Zero-Telemetry Diagnostic Logging & User Support Bundles

### 4.1 Strict Redaction Invariants
To preserve privacy and air-gap integrity:
- **Zero Remote Telemetry:** The application makes zero HTTP/TCP/UDP connections.
- **Salted Hash Hashing:** Sensitive gear titles, luggage names, and notes are replaced with deterministic salted hashes:
  $$\text{Item Title} \longrightarrow \text{Item[#a1b2]}$$
  $$\text{Serial Number} \longrightarrow \text{SN[#3f9c]}$$
  $$\text{User ID / Profile} \longrightarrow \text{User[#e821]}$$
- **Financial Redaction:** All prices and replacement costs are masked to `$***.**`.
- **Dimensional Retention:** Physical dimensions ($L \times W \times D$), tare masses ($g, kg$), and calculation timestamps are preserved for mathematical diagnosis.

### 4.2 Rotating Log Management
- Rotating file buffer stored in local user cache directory (`packmatrix_diagnostic.log`).
- **Storage Cap:** Hard threshold of $5\,\text{MB}$.
- **Retention Period:** 3 calendar days; older archives are purged automatically.

### 4.3 Export Sanitized Diagnostic Bundle
Users can export plain-text support bundles via the UI:
- Bundle begins with cryptographic attestation of zero PII.
- Plain-text formatted so users can inspect every line before emailing or sharing with support engineers.

---

## 5. Section 8.4: Post-Launch Hotfix SLA & Emergency Rollback Procedures

### 5.1 Hotfix Severity Levels & Response Times

| Severity | Incident Description | Resolution SLA | Rollback Action | Branch Pattern |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | Data loss, database corruption, or fatal crash on startup | **$\le 4$ Hours** | Immediate revocation of update manifest; push signed previous known-good binary with incremented patch version | `hotfix/vX.Y.Z` (branched from release tag) |
| **P1** | Core feature regression (e.g. incorrect geometry, false airline non-compliance) | **$\le 24$ Hours** | Staged canary rollout ($25\% \rightarrow 100\%$ within 12h) | `hotfix/vX.Y.Z` |
| **P2** | Minor cosmetic glitch, typo, or non-blocking edge case | **Next Patch Release (Weekly)** | Merged into main branch pipeline | `feature/` or `fix/` |

### 5.2 Git Hotfix Branch Topology
```
main (v0.1.0) ──●───────────────● (v0.1.1)
                 \             /
                  └──[hotfix]─┘ (branch: hotfix/v0.1.1)
```

### 5.3 Emergency Rollback Runbook
If a deployed release introduces an unforeseen P0 regression:
1. Re-tag previous known-good commit: `git checkout v0.1.0 && git checkout -b hotfix/v0.1.1-rollback`.
2. Increment `Cargo.toml` and `package.json` to next patch version number (`0.1.1`).
3. Recompile hermetic production binaries.
4. Sign release bundles with Apple Developer ID (macOS) and Authenticode EV (Windows).
5. Generate Ed25519 digital signature manifest using `minisign`.
6. Publish manifest to auto-updater endpoint.

---

## 6. Section 8.5: End-of-Life & Complete Data Sovereignty Guarantee

### 6.1 One-Click "Export Entire Data Vault"
PackMatrix guarantees zero vendor lock-in. At any time, users can generate a complete data vault containing:
1. **Canonical JSON Manifest (`packmatrix_data_vault_<timestamp>.json`):** Formatted to standard RFC-8259 without proprietary wrappers or encryption.
2. **Pristine SQLite Database (`packmatrix_standard_<timestamp>.db`):** Standard unencrypted SQLite file directly openable in DB Browser for SQLite, Python (`sqlite3`), or Excel.

### 6.2 Secure Wipe & Reset Protocol
When retiring a machine or resetting application data:
1. Every byte of `packmatrix.db`, `packmatrix.db-wal`, and `packmatrix.db-shm` is overwritten with cryptographic zero-fill buffers in $64\,\text{KB}$ blocks.
2. `fsync` / `sync_all` is called on all file handles to force physical magnetic/flash media commit.
3. Memory buffers are scrubbed using the `zeroize` crate.
4. Files are safely unlinked from disk.
5. Zero forensic recovery of historical items or valuations is possible.
