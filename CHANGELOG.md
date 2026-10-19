# Changelog

All notable changes to the PackMatrix Desktop project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Staged progressive canary rollout pipeline (10% Day 1 -> 25% Day 3 -> 50% Day 5 -> 100% GA).
- Transparent database encryption validation engine with balanced Shannon entropy ($H \ge 7.99$).
- Hermetic reproducible release build pipeline with SLSA Level 3 in-toto attestations.

## [0.1.0] - 2026-10-19

### Added
- **Core Volumetric Engine:** Exact 3D bounding box computation with corner bevel integrations and trapezoidal taper factors.
- **Center-of-Mass & Balance Analyzer:** 3-axis moment calculation, lateral tilt warnings, and top-heavy alerts.
- **Multi-Carrier Regulatory Compliance Matrix:** Pre-seeded rules for 12+ international airlines, TSA 3-1-1 liquids enforcement, and FAA lithium battery watt-hour limits.
- **Encrypted Local-First Storage:** SQLite WAL storage with strict pragma initialization sequence, foreign-key cascade chains, and FTS5 full-text search.
- **Security & Air-Gap Invariants:** Absolute zero outbound network telemetry, strict CSP with `frame-ancestors 'none'`, and bounded JSON deserialization.
- **macOS Hardened Runtime:** Minimal `Entitlements.plist` configuration enforcing safe memory constraints.
- **Packaging Topology:** Multi-platform packaging targets for macOS DMG, Windows WiX/NSIS, and Linux AppImage/deb/rpm.

### Security
- Strictly enforced `#![forbid(unsafe_code)]` across 100% of the Rust codebase.
- Neutralized all CSV formula injection vectors (`=`, `+`, `-`, `@`, `\t`, `\r`).
- Sanitized HTML entity encoding and neutralized untrusted URI schemes (`javascript:`, `data:`, `vbscript:`).
