## PackMatrix Desktop — Pull Request Quality Gate

### SDLC Gate 0.3 Checklist
- [ ] **Cryptographic Signature**: All commits in this PR are cryptographically signed (`git commit -S` with GPG or SSH Ed25519).
- [ ] **Static Analysis & Linting**:
  - [ ] `cargo clippy --all-targets -- -D warnings` passed with 0 warnings.
  - [ ] `cargo fmt --check` passed cleanly.
  - [ ] `npm run lint` passed without errors.
  - [ ] `npx tsc --noEmit` verified 100% type safety.
- [ ] **Secret Scanning**:
  - [ ] `trufflehog` executed with 0 exposed secrets or credentials.
- [ ] **Peer Review**:
  - [ ] Requires >= 2 independent approvals from Code Owners before merge.
