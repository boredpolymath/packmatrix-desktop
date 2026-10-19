# Contributing to PackMatrix Desktop

Thank you for your interest in contributing to **PackMatrix Desktop**! We welcome community contributions that help improve local-first luggage geometry optimization, airline rule modeling, and gear planning ergonomics.

Please take a moment to review this document before submitting your contribution.

---

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior via [GitHub Security Advisories](https://github.com/boredpolymath/packmatrix-desktop/security/advisories/new) or directly to the project maintainers.

---

## Security Vulnerabilities

**Do not file public GitHub issues for security vulnerabilities.**

If you discover a potential security bug or vulnerability, please refer to our [Security Policy](.github/SECURITY.md) and report it privately through [GitHub Private Vulnerability Reporting](https://github.com/boredpolymath/packmatrix-desktop/security/advisories/new).

---

## Core Engineering Invariants

Before contributing code, please note our core architectural commitments:
1. **100% Air-Gapped & Zero Telemetry**: Never introduce network calls, analytics SDKs, trackers, or remote telemetry. All calculation and storage must remain purely local.
2. **Forbid Unsafe Code**: The Rust backend enforces `#![forbid(unsafe_code)]`.
3. **Deterministic Numerical Calculus**: Calculations for 3D luggage volume, center-of-gravity (CoG), and packing cube geometries must use exact IEEE-754 precision with thorough unit test coverage.
4. **Defensive Data Handling**: All database interactions must use parameterized SQLite queries; CSV imports/exports must sanitize against spreadsheet formula injection triggers (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`).

---

## How Can I Contribute?

### 1. Reporting Bugs
- Search existing issues before creating a new one to avoid duplicates.
- Use the **Bug Report** template provided in `.github/ISSUE_TEMPLATE/bug_report.yml`.
- Include your operating system, luggage dimensions / model data, reproduction steps, and expected behavior.

### 2. Suggesting Enhancements & Airline Rule Updates
- Use the **Feature Request** template in `.github/ISSUE_TEMPLATE/feature_request.yml`.
- For airline sizer dimensions or weight limit updates, please link to official airline baggage policy documentation.

### 3. Submitting Pull Requests
1. **Fork** the repository and create your feature branch:
   ```bash
   git checkout -b feat/airline-iberia-rules
   ```
2. **Make your changes** following the project structure:
   - Rust backend & Tauri core: `src-tauri/`
   - Presentation layer: `src/`
   - Design tokens & styles: `src/index.css`
   - Documentation & specifications: `docs/` or `SDLC.md`
3. **Run local verification checks** (see [Testing & Quality Checks](#testing--quality-checks) below).
4. **Commit your changes** with clear, descriptive commit messages (Conventional Commits preferred, e.g., `feat:`, `fix:`, `docs:`).
5. **Push to your fork** and open a Pull Request against `main`. Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).

---

## Development Setup

### Prerequisites
- **Node.js**: $\ge 22.0.0$ and **npm**: $\ge 11.0.0$ (matching `.nvmrc` and `package.json`).
- **Rust**: Pinned stable toolchain configured via `rust-toolchain.toml` (managed via `rustup`).
- **Tauri v2 CLI**: Installed via cargo or npm.

### Quick Start

```bash
# 1. Install frontend dependencies
npm install

# 2. Run frontend in development mode
npm run dev

# 3. Or run the full Tauri desktop application
cargo tauri dev
```

---

## Testing & Quality Checks

All pull requests must pass the following quality gates:

```bash
# Frontend linting and type check
npm run lint
npx tsc -b --noEmit

# Frontend production build
npm run build

# Rust backend formatting and clippy analysis
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

# Rust backend unit & integration tests
cargo test --manifest-path src-tauri/Cargo.toml
```

---

## Documentation

For extensive technical architecture, phase gates, and formal compliance specifications, please consult [`SDLC.md`](SDLC.md).
