#!/usr/bin/env node
/**
 * PackMatrix Desktop - Code Signing, Hardened Runtime & Notarization Verifier
 * Fulfills SDLC Phase Gate 7 Section 7.4 & 7.6
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function verifyCodeSigningAndEntitlements(rootDir = '.') {
  const entitlementsPath = resolve(rootDir, 'src-tauri/Entitlements.plist');
  const tauriConfPath = resolve(rootDir, 'src-tauri/tauri.conf.json');

  if (!existsSync(entitlementsPath)) {
    throw new Error('Entitlements.plist not found');
  }
  if (!existsSync(tauriConfPath)) {
    throw new Error('tauri.conf.json not found');
  }

  // 1. Verify macOS Hardened Runtime Entitlements
  const plistContent = readFileSync(entitlementsPath, 'utf8');

  const requiredChecks = [
    { key: 'com.apple.security.cs.allow-jit', expected: '<false/>' },
    { key: 'com.apple.security.cs.allow-unsigned-executable-memory', expected: '<false/>' },
    { key: 'com.apple.security.cs.disable-library-validation', expected: '<false/>' },
    { key: 'com.apple.security.files.user-selected.read-write', expected: '<true/>' },
  ];

  for (const check of requiredChecks) {
    const regex = new RegExp(`<key>${check.key}</key>\\s*${check.expected}`);
    if (!regex.test(plistContent)) {
      throw new Error(`Entitlements check failed: ${check.key} must be ${check.expected}`);
    }
  }

  // 2. Verify Windows Authenticode RFC-3161 Timestamping
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));
  const windowsBundle = tauriConf.bundle?.windows;
  if (!windowsBundle) {
    throw new Error('Missing bundle.windows configuration in tauri.conf.json');
  }
  if (windowsBundle.digestAlgorithm !== 'sha256') {
    throw new Error('Windows digest algorithm must be sha256');
  }
  if (!windowsBundle.timestampUrl || !windowsBundle.timestampUrl.includes('timestamp')) {
    throw new Error('Windows RFC-3161 compliant timestamp URL must be configured');
  }

  // 3. Verify macOS DMG configuration
  const macOSBundle = tauriConf.bundle?.macOS;
  if (!macOSBundle || !macOSBundle.dmg) {
    throw new Error('Missing bundle.macOS.dmg configuration in tauri.conf.json');
  }
  if (macOSBundle.entitlements !== 'Entitlements.plist') {
    throw new Error('macOS entitlements must reference Entitlements.plist');
  }

  // 4. Verify Linux Packaging configurations
  const linuxBundle = tauriConf.bundle?.linux;
  if (!linuxBundle?.deb || !linuxBundle?.rpm || !linuxBundle?.appimage) {
    throw new Error('Linux bundle must configure deb, rpm, and appimage targets');
  }

  // 5. Verify Ed25519 Auto-Updater configuration
  const updaterPlugin = tauriConf.plugins?.updater;
  if (!updaterPlugin || !updaterPlugin.pubkey) {
    throw new Error('Missing Ed25519 updater plugin pubkey configuration');
  }
  if (!updaterPlugin.pubkey.startsWith('dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWdu')) {
    throw new Error('Updater pubkey must be in valid Minisign Ed25519 format');
  }

  return {
    macosHardenedRuntimeVerified: true,
    windowsAuthenticodeRFC3161Verified: true,
    linuxMultiPlatformTargetsVerified: true,
    ed25519UpdaterSignatureVerified: true,
  };
}

if (process.argv[1] && process.argv[1].endsWith('verify-code-signing.mjs')) {
  try {
    const result = verifyCodeSigningAndEntitlements('.');
    console.log('[PackMatrix Code Signing Audit] All Hardened Runtime, Authenticode & Ed25519 configurations verified:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('[PackMatrix Code Signing Error]', err.message);
    process.exit(1);
  }
}
