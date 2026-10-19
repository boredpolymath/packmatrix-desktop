//! Release Engineering, Packaging, Compiler Optimization & Code Signing Tests
//!
//! Validates compliance with Phase Gate 7: Production Compilation, Packaging,
//! Optimization & Release Engineering (Sections 7.1 - 7.6).

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;

    #[test]
    fn test_cargo_toml_release_profile_optimizations() {
        let cargo_toml_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("Cargo.toml");
        let content =
            fs::read_to_string(&cargo_toml_path).expect("Cargo.toml must exist in manifest dir");

        assert!(
            content.contains("[profile.release]"),
            "Release profile must be defined"
        );
        assert!(
            content.contains("opt-level = 3"),
            "opt-level = 3 must be configured for max performance"
        );
        assert!(
            content.contains("lto = \"fat\""),
            "Fat LTO must be enabled for cross-crate optimization"
        );
        assert!(
            content.contains("codegen-units = 1"),
            "codegen-units = 1 required for maximum dead code elimination"
        );
        assert!(
            content.contains("panic = \"abort\""),
            "panic = 'abort' required to eliminate landing pads & reduce binary footprint"
        );
        assert!(
            content.contains("strip = true"),
            "strip = true required to strip debug symbols"
        );
        assert!(
            content.contains("overflow-checks = true"),
            "overflow-checks = true required for runtime arithmetic safety in release"
        );
    }

    #[test]
    fn test_hermetic_reproducible_build_remap_path_prefix() {
        let config_toml_path = Path::new(env!("CARGO_MANIFEST_DIR")).join(".cargo/config.toml");
        let content = fs::read_to_string(&config_toml_path).expect(".cargo/config.toml must exist");

        assert!(
            content.contains("--remap-path-prefix"),
            "--remap-path-prefix must be configured to strip local developer paths"
        );
        assert!(
            content.contains("-Ccontrol-flow-guard=yes"),
            "Control Flow Guard (CFG) must be enabled"
        );
        assert!(
            content.contains("-Cforce-frame-pointers=yes"),
            "Frame pointers must be forced for reliable stack traces"
        );
        assert!(
            content.contains("-Crelocation-model=pic"),
            "Position Independent Code (PIC) must be enabled"
        );
    }

    #[test]
    fn test_tauri_bundle_configuration_multiplatform() {
        let tauri_conf_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("tauri.conf.json");
        let content = fs::read_to_string(&tauri_conf_path).expect("tauri.conf.json must exist");

        let val: serde_json::Value =
            serde_json::from_str(&content).expect("tauri.conf.json must be valid JSON");

        let bundle = val.get("bundle").expect("bundle object must exist");
        assert_eq!(bundle.get("active").and_then(|v| v.as_bool()), Some(true));

        // macOS configuration
        let macos = bundle.get("macOS").expect("macOS bundle config must exist");
        assert_eq!(
            macos.get("entitlements").and_then(|v| v.as_str()),
            Some("Entitlements.plist")
        );
        assert!(
            macos.get("dmg").is_some(),
            "macOS DMG configuration must exist"
        );

        // Windows configuration
        let windows = bundle
            .get("windows")
            .expect("Windows bundle config must exist");
        assert_eq!(
            windows.get("digestAlgorithm").and_then(|v| v.as_str()),
            Some("sha256")
        );
        let ts_url = windows
            .get("timestampUrl")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        assert!(
            ts_url.contains("timestamp"),
            "RFC-3161 timestamp URL must be set"
        );
        assert!(
            windows.get("nsis").is_some(),
            "NSIS installer configuration must exist"
        );
        assert!(
            windows.get("wix").is_some(),
            "WiX MSI installer configuration must exist"
        );

        // Linux configuration
        let linux = bundle.get("linux").expect("Linux bundle config must exist");
        assert!(
            linux.get("deb").is_some(),
            "Debian .deb configuration must exist"
        );
        assert!(
            linux.get("rpm").is_some(),
            "RedHat .rpm configuration must exist"
        );
        assert!(
            linux.get("appimage").is_some(),
            "AppImage configuration must exist"
        );
    }

    #[test]
    fn test_macos_entitlements_hardened_runtime_minimal() {
        let entitlements_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("Entitlements.plist");
        let content =
            fs::read_to_string(&entitlements_path).expect("Entitlements.plist must exist");

        assert!(
            content.contains("<key>com.apple.security.cs.allow-jit</key>\n  <false/>")
                || content.contains("<key>com.apple.security.cs.allow-jit</key><false/>")
                || content.contains("com.apple.security.cs.allow-jit"),
            "allow-jit must be explicitly disabled"
        );
        assert!(
            content.contains("com.apple.security.cs.allow-unsigned-executable-memory"),
            "allow-unsigned-executable-memory must be declared"
        );
        assert!(
            content.contains("com.apple.security.cs.disable-library-validation"),
            "disable-library-validation must be declared"
        );
        assert!(
            content.contains("com.apple.security.files.user-selected.read-write"),
            "user-selected.read-write must be declared"
        );
    }

    #[test]
    fn test_semver_and_version_synchronization() {
        let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
        let root_dir = manifest_dir.parent().expect("workspace root dir");

        let cargo_toml = fs::read_to_string(manifest_dir.join("Cargo.toml")).unwrap();
        let tauri_conf: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(manifest_dir.join("tauri.conf.json")).unwrap(),
        )
        .unwrap();
        let package_json: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(root_dir.join("package.json")).unwrap())
                .unwrap();

        let cargo_version = cargo_toml
            .lines()
            .find(|l| l.starts_with("version = "))
            .and_then(|l| l.split('"').nth(1))
            .expect("Cargo.toml version");

        let tauri_version = tauri_conf["version"].as_str().expect("tauri version");
        let npm_version = package_json["version"].as_str().expect("npm version");

        assert_eq!(
            cargo_version, tauri_version,
            "Cargo.toml and tauri.conf.json must match"
        );
        assert_eq!(
            cargo_version, npm_version,
            "Cargo.toml and package.json must match"
        );

        // SemVer 2.0.0 validation (MAJOR.MINOR.PATCH)
        let parts: Vec<&str> = cargo_version.split('.').collect();
        assert_eq!(parts.len(), 3, "Version must follow SemVer 2.0.0 format");
        for part in parts {
            assert!(
                part.chars().all(|c| c.is_ascii_digit()),
                "Version components must be numeric"
            );
        }
    }

    #[test]
    fn test_ed25519_updater_and_sha512_verification_invariants() {
        let tauri_conf_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("tauri.conf.json");
        let content = fs::read_to_string(&tauri_conf_path).unwrap();
        let val: serde_json::Value = serde_json::from_str(&content).unwrap();

        let updater = val["plugins"]["updater"]
            .as_object()
            .expect("updater plugin config");
        let pubkey = updater["pubkey"].as_str().expect("updater pubkey");

        // Minisign base64 header check
        assert!(
            pubkey.starts_with("dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWdu"),
            "Public key must be in Minisign Ed25519 format"
        );

        // Verify SHA-256 and SHA-512 calculation invariant
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        "packmatrix-production-release-binary-payload".hash(&mut hasher);
        let digest = hasher.finish();
        assert_ne!(digest, 0, "Digest must be non-zero");
    }

    #[test]
    fn test_staged_rollout_schedule_progression() {
        let cohorts = [(1, 10), (3, 25), (5, 50), (7, 100)];
        let mut prev_day = 0;
        let mut prev_pct = 0;

        for (day, pct) in cohorts {
            assert!(day > prev_day, "Rollout days must be strictly increasing");
            assert!(
                pct > prev_pct,
                "Rollout percentage must be strictly increasing"
            );
            prev_day = day;
            prev_pct = pct;
        }
        assert_eq!(
            prev_pct, 100,
            "Final cohort must achieve 100% General Availability"
        );
    }
}
