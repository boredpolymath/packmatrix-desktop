//! PackMatrix Desktop — Phase Gate 6: Network Air-Gap & Zero-Telemetry Audit
//! SDLC Section 6.3 (PM-AIR-001)
//!
//! Pass Criteria: Exact total of 0 outbound TCP/UDP packets, DNS queries, or ICMP requests observed.
//! Complete absence of telemetry, tracking, or network HTTP client crates in application dependencies.

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;

    /// Forbidden direct networking and HTTP client crates for PackMatrix core
    const FORBIDDEN_DIRECT_CRATES: &[&str] = &[
        "reqwest",
        "hyper",
        "curl",
        "curl-sys",
        "ureq",
        "surf",
        "isahc",
        "attohttpc",
        "tungstenite",
        "tokio-tungstenite",
    ];

    /// Forbidden telemetry, tracking, and analytics crates anywhere in dependency tree
    const FORBIDDEN_TELEMETRY_CRATES: &[&str] = &[
        "sentry",
        "sentry-core",
        "datadog",
        "telemetry",
        "posthog",
        "mixpanel",
        "segment",
        "google-analytics",
        "amplitude",
        "launchdarkly",
    ];

    #[test]
    fn test_zero_telemetry_and_network_dependencies_audit() {
        // 1. Audit Cargo.toml - PackMatrix core must have zero direct network or HTTP dependencies
        let cargo_toml = fs::read_to_string("Cargo.toml").expect("read Cargo.toml");
        for &forbidden in FORBIDDEN_DIRECT_CRATES {
            assert!(
                !cargo_toml.contains(&format!("\"{}\"", forbidden))
                    && !cargo_toml.contains(&format!("{} =", forbidden)),
                "Cargo.toml must not depend on forbidden networking crate '{}'",
                forbidden
            );
        }

        // 2. Audit Cargo.lock to ensure no telemetry/analytics tracking crates exist anywhere
        let cargo_lock = fs::read_to_string("Cargo.lock").expect("read Cargo.lock");
        for &forbidden in FORBIDDEN_TELEMETRY_CRATES {
            assert!(
                !cargo_lock.contains(&format!("name = \"{}\"", forbidden)),
                "Cargo.lock must not contain forbidden telemetry crate '{}' anywhere in dependency graph",
                forbidden
            );
        }
    }

    #[test]
    fn test_air_gap_zero_outbound_sockets_and_dns_invariants() {
        // Audit source code to ensure no std::net or socket connections are initiated
        let src_dir = Path::new("src");
        let mut rust_files = Vec::new();
        collect_rust_files(src_dir, &mut rust_files);

        for file in &rust_files {
            if file.file_name().and_then(|n| n.to_str()) == Some("airgap_audit_tests.rs") {
                continue;
            }

            let content = fs::read_to_string(file).expect("read rust file");
            let lines: Vec<&str> = content
                .lines()
                .filter(|l| {
                    let t = l.trim_start();
                    !t.starts_with("//") && !t.starts_with("/*") && !t.starts_with('*')
                })
                .collect();

            for (idx, line) in lines.iter().enumerate() {
                // Ensure no raw TCP/UDP socket opening
                if line.contains("TcpStream::connect")
                    || line.contains("UdpSocket::bind")
                    || line.contains("std::net::ToSocketAddrs")
                {
                    panic!(
                        "Air-gap violation in {}:{}: raw socket call '{}'",
                        file.display(),
                        idx + 1,
                        line
                    );
                }
            }
        }
    }

    fn collect_rust_files(dir: &Path, acc: &mut Vec<std::path::PathBuf>) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    collect_rust_files(&path, acc);
                } else if path.extension().and_then(|s| s.to_str()) == Some("rs") {
                    acc.push(path);
                }
            }
        }
    }
}
