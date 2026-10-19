# Security Policy

## Supported Versions

Only the latest release of **PackMatrix Desktop** receives active security patches.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Security Invariants

PackMatrix Desktop is engineered for strict, mission-critical local-first privacy:
- **100% Air-Gapped & Zero Telemetry**: PackMatrix Desktop never connects to external telemetry servers, analytics collectors, or third-party cloud backends.
- **Memory Safety**: Rust backend enforces `#![forbid(unsafe_code)]`.
- **Database & Data Isolation**: Local SQLite database with parameter bindings, anti-CSV formula injection neutralization, and strict desktop app sandbox permissions.

## Reporting a Vulnerability

The PackMatrix Desktop maintainers take security vulnerabilities very seriously. We appreciate your efforts to responsibly disclose findings.

### Private Vulnerability Reporting (Preferred)

Please use GitHub's **Private Vulnerability Reporting** to report security issues privately:
1. Navigate to the [PackMatrix Desktop Security Advisories tab](https://github.com/boredpolymath/packmatrix-desktop/security/advisories).
2. Click **"Report a vulnerability"** to submit a private draft advisory.
3. Include detailed reproduction steps, proof of concept, and impacted platform (macOS, Windows, Linux).

### Response Timeline

- **Initial Acknowledgement:** Within 48 hours.
- **Triage & Status Update:** Within 5 business days.
- **Public Disclosure:** Coordinated after a fix has been released.

Please do not open public GitHub issues or discussions for sensitive security vulnerabilities.
