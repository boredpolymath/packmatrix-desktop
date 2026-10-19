//! Defensive Tauri v2 Sandboxing, Capability Scoping, & Isolation Pattern Tests
//! SDLC Phase Gate 2: Section 2.2 Verification

#[cfg(test)]
mod tests {
    use serde_json::Value;
    use std::fs;
    use std::path::Path;

    #[test]
    fn test_tauri_conf_security_and_strict_csp() {
        let conf_path = Path::new("tauri.conf.json");
        assert!(
            conf_path.exists(),
            "tauri.conf.json must exist in src-tauri"
        );

        let conf_content = fs::read_to_string(conf_path).expect("Failed to read tauri.conf.json");
        let conf: Value =
            serde_json::from_str(&conf_content).expect("Invalid JSON in tauri.conf.json");

        let security = conf
            .get("app")
            .and_then(|a| a.get("security"))
            .expect("app.security must be defined");

        // Verify Strict CSP
        let csp = security
            .get("csp")
            .and_then(|c| c.as_str())
            .expect("app.security.csp must be a string");

        assert!(
            csp.contains("default-src 'self'"),
            "CSP must enforce default-src 'self'"
        );
        assert!(
            csp.contains("script-src 'self'"),
            "CSP must enforce script-src 'self'"
        );
        assert!(
            csp.contains("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"),
            "CSP must allow Google Fonts CSS"
        );
        assert!(
            csp.contains("font-src 'self' https://fonts.gstatic.com"),
            "CSP must allow Google Fonts binaries"
        );
        assert!(
            csp.contains("img-src 'self' data: asset:"),
            "CSP must restrict img-src to local assets"
        );
        assert!(
            csp.contains("connect-src 'self'"),
            "CSP must restrict connect-src to self"
        );
        assert!(
            csp.contains("frame-src 'none'"),
            "CSP must disallow external frame-src"
        );
        assert!(
            csp.contains("object-src 'none'"),
            "CSP must deny object-src"
        );
        assert!(csp.contains("base-uri 'none'"), "CSP must deny base-uri");
        assert!(
            csp.contains("form-action 'none'"),
            "CSP must deny form-action"
        );

        // Verify Prototype Freezing
        let freeze = security
            .get("freezePrototype")
            .and_then(|f| f.as_bool())
            .unwrap_or(false);
        assert!(freeze, "Object prototype freezing must be enabled");

        // Verify Isolation Pattern
        let pattern = security.get("pattern").expect("pattern must be defined");
        let pattern_use = pattern.get("use").and_then(|u| u.as_str()).unwrap_or("");
        assert_eq!(pattern_use, "isolation", "Pattern must be set to isolation");

        let pattern_dir = pattern
            .get("options")
            .and_then(|o| o.get("dir"))
            .and_then(|d| d.as_str())
            .unwrap_or("");
        assert_eq!(
            pattern_dir, "isolation",
            "Isolation dir must point to isolation directory"
        );
    }

    #[test]
    fn test_capabilities_scoping_main_json() {
        let cap_path = Path::new("capabilities/main.json");
        assert!(cap_path.exists(), "capabilities/main.json must exist");

        let cap_content =
            fs::read_to_string(cap_path).expect("Failed to read capabilities/main.json");
        let cap: Value =
            serde_json::from_str(&cap_content).expect("Invalid JSON in capabilities/main.json");

        // Verify window targeting
        let windows = cap
            .get("windows")
            .and_then(|w| w.as_array())
            .expect("windows array must exist");
        assert!(
            windows.iter().any(|w| w.as_str() == Some("main")),
            "Capability must target 'main' window"
        );

        let permissions = cap
            .get("permissions")
            .and_then(|p| p.as_array())
            .expect("permissions array must exist");

        // Ensure arbitrary shell execution is denied globally
        for perm in permissions {
            if let Some(perm_str) = perm.as_str() {
                assert!(
                    !perm_str.starts_with("shell:"),
                    "shell execution plugin is strictly forbidden: found {}",
                    perm_str
                );
                assert_ne!(
                    perm_str, "opener:default",
                    "Unscoped opener:default is forbidden"
                );
            }
        }

        // Verify opener:allow-open-url is strictly scoped to approved HTTPS airline/regulatory domains
        let mut found_scoped_opener = false;
        for perm in permissions {
            if let Some(obj) = perm.as_object() {
                if obj.get("identifier").and_then(|id| id.as_str()) == Some("opener:allow-open-url")
                {
                    found_scoped_opener = true;
                    let allow_list = obj
                        .get("allow")
                        .and_then(|a| a.as_array())
                        .expect("allow array required");
                    assert!(
                        !allow_list.is_empty(),
                        "opener allow list must not be empty"
                    );
                    for entry in allow_list {
                        let url = entry
                            .get("url")
                            .and_then(|u| u.as_str())
                            .expect("entry must have url");
                        assert!(
                            url.starts_with("https://"),
                            "All allowed opener URLs must strictly require HTTPS: {}",
                            url
                        );
                    }
                }
            }
        }
        assert!(
            found_scoped_opener,
            "Scoped opener:allow-open-url must be configured"
        );

        // Verify opener:deny-open-path is present
        let found_deny_open_path = permissions
            .iter()
            .any(|p| p.as_str() == Some("opener:deny-open-path"));
        assert!(
            found_deny_open_path,
            "opener:deny-open-path must be explicitly enforced"
        );

        // Verify file dialog permissions
        let found_dialog_open = permissions
            .iter()
            .any(|p| p.as_str() == Some("dialog:allow-open"));
        let found_dialog_save = permissions
            .iter()
            .any(|p| p.as_str() == Some("dialog:allow-save"));
        assert!(
            found_dialog_open && found_dialog_save,
            "Dialog open and save permissions must be present"
        );

        // Verify file read/write permissions are scoped only to user directories
        let mut found_scoped_fs_read = false;
        let mut found_scoped_fs_write = false;
        for perm in permissions {
            if let Some(obj) = perm.as_object() {
                let id = obj.get("identifier").and_then(|i| i.as_str()).unwrap_or("");
                if id == "fs:allow-read-text-file" {
                    found_scoped_fs_read = true;
                    let allow_paths = obj
                        .get("allow")
                        .and_then(|a| a.as_array())
                        .expect("allow required");
                    for p in allow_paths {
                        let path_str = p
                            .get("path")
                            .and_then(|s| s.as_str())
                            .expect("path string required");
                        assert!(
                            path_str.starts_with("$DOCUMENT")
                                || path_str.starts_with("$DOWNLOAD")
                                || path_str.starts_with("$DESKTOP")
                                || path_str.starts_with("$APPDATA"),
                            "fs path must be scoped to user directories: {}",
                            path_str
                        );
                    }
                }
                if id == "fs:allow-write-text-file" {
                    found_scoped_fs_write = true;
                }
            }
        }
        assert!(
            found_scoped_fs_read && found_scoped_fs_write,
            "Scoped fs read/write must be defined"
        );
    }

    #[test]
    fn test_isolation_pattern_files_exist_and_validate() {
        let html_path = Path::new("isolation/index.html");
        assert!(html_path.exists(), "isolation/index.html must exist");

        let js_path = Path::new("isolation/index.js");
        assert!(js_path.exists(), "isolation/index.js must exist");

        let js_content = fs::read_to_string(js_path).expect("Failed to read isolation/index.js");
        assert!(
            js_content.contains("window.__TAURI_ISOLATION_HOOK__"),
            "isolation/index.js must export window.__TAURI_ISOLATION_HOOK__"
        );
        assert!(
            js_content.contains("typeof payload !== 'object'"),
            "isolation/index.js must reject non-object payloads"
        );
    }
}
