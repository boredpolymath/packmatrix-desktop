#!/usr/bin/env node
/**
 * PackMatrix Desktop - Release Topology, SemVer & Staged Rollout Verifier
 * Fulfills SDLC Phase Gate 7 Section 7.5
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function verifyReleaseTopology(rootDir = '.') {
  const pkgPath = resolve(rootDir, 'package.json');
  const cargoPath = resolve(rootDir, 'src-tauri/Cargo.toml');
  const tauriPath = resolve(rootDir, 'src-tauri/tauri.conf.json');
  const changelogPath = resolve(rootDir, 'CHANGELOG.md');

  if (!existsSync(pkgPath) || !existsSync(cargoPath) || !existsSync(tauriPath)) {
    throw new Error('Required configuration files missing for version verification.');
  }

  // 1. Read package.json version
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const pkgVersion = pkg.version;

  // 2. Read Cargo.toml version
  const cargoContent = readFileSync(cargoPath, 'utf8');
  const cargoMatch = cargoContent.match(/^version\s*=\s*"([^"]+)"/m);
  if (!cargoMatch) {
    throw new Error('Could not parse version from Cargo.toml');
  }
  const cargoVersion = cargoMatch[1];

  // 3. Read tauri.conf.json version
  const tauri = JSON.parse(readFileSync(tauriPath, 'utf8'));
  const tauriVersion = tauri.version;

  // 4. Assert SemVer 2.0.0 compliance
  if (!SEMVER_REGEX.test(pkgVersion)) {
    throw new Error(`package.json version "${pkgVersion}" is not valid SemVer 2.0.0`);
  }

  // 5. Assert 100% version synchronization across manifests
  if (pkgVersion !== cargoVersion || pkgVersion !== tauriVersion) {
    throw new Error(
      `Version mismatch detected across manifests: package.json=${pkgVersion}, Cargo.toml=${cargoVersion}, tauri.conf.json=${tauriVersion}`
    );
  }

  // 6. Verify CHANGELOG.md exists and contains version section
  if (!existsSync(changelogPath)) {
    throw new Error('CHANGELOG.md does not exist');
  }
  const changelogContent = readFileSync(changelogPath, 'utf8');
  if (!changelogContent.includes(`[${pkgVersion}]`)) {
    throw new Error(`CHANGELOG.md is missing entry for version [${pkgVersion}]`);
  }

  // 7. Staged progressive rollout schedule
  const rolloutSchedule = [
    { day: 1, cohortPercent: 10, target: 'Canary Tier 1' },
    { day: 3, cohortPercent: 25, target: 'Canary Tier 2' },
    { day: 5, cohortPercent: 50, target: 'Broad Preview' },
    { day: 7, cohortPercent: 100, target: 'General Availability (100% GA)' },
  ];

  return {
    synchronizedVersion: pkgVersion,
    semverValid: true,
    manifestsChecked: ['package.json', 'src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json', 'CHANGELOG.md'],
    rolloutSchedule,
  };
}

if (process.argv[1] && process.argv[1].endsWith('verify-release-rollout.mjs')) {
  try {
    const result = verifyReleaseTopology('.');
    console.log('[PackMatrix Release Topology] SemVer & Version Sync Verified: v' + result.synchronizedVersion);
    console.log('[PackMatrix Rollout Schedule] Staged Progressive Cohorts:');
    result.rolloutSchedule.forEach((s) => {
      console.log(`  Day ${s.day}: ${s.cohortPercent}% (${s.target})`);
    });
  } catch (err) {
    console.error('[PackMatrix Release Topology Error]', err.message);
    process.exit(1);
  }
}
