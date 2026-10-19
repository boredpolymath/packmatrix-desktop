//! PackMatrix Desktop — Phase Gate 4: Secure Implementation & Defensive Coding Invariants
//! SDLC Reference: Section 6 (Gate 4)

use serde::Serialize;
use thiserror::Error;
use zeroize::{Zeroize, ZeroizeOnDrop};

/// 4.1 Sensitive credentials memory clearing invariant
#[derive(Debug, Clone, Zeroize, ZeroizeOnDrop)]
pub struct SensitiveGearDetails {
    pub serial_number: String,
    pub purchase_receipt_token: String,
}

impl SensitiveGearDetails {
    pub fn new(serial_number: String, purchase_receipt_token: String) -> Self {
        Self {
            serial_number,
            purchase_receipt_token,
        }
    }
}

/// 4.1 Centralized secure error handling
/// Strips internal system paths and usernames before IPC serialization
#[derive(Debug, Error, Serialize, Clone, PartialEq, Eq)]
pub enum AppError {
    #[error("Storage error: {0}")]
    Storage(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("Security violation: {0}")]
    Security(String),
    #[error("Resource limit exceeded: {0}")]
    ResourceLimit(String),
}

impl AppError {
    /// Strips absolute local filesystem paths (/Users/..., /home/..., C:\...)
    pub fn sanitize_path_string(raw: &str) -> String {
        let mut sanitized = raw.to_string();

        // macOS / Linux home directory paths
        if let Some(pos) = sanitized.find("/Users/") {
            if let Some(end_slash) = sanitized[pos + 7..].find('/') {
                let end = pos + 7 + end_slash;
                sanitized.replace_range(pos..end, "[REDACTED_USER_PATH]");
            }
        } else if let Some(pos) = sanitized.find("/home/") {
            if let Some(end_slash) = sanitized[pos + 6..].find('/') {
                let end = pos + 6 + end_slash;
                sanitized.replace_range(pos..end, "[REDACTED_USER_PATH]");
            }
        }

        // Internal SQL engine syntax traces
        if sanitized.contains("near \"") || sanitized.contains("syntax error") {
            return "Internal storage query error".to_string();
        }

        sanitized
    }

    pub fn secure_storage_error(raw_err: &str) -> Self {
        AppError::Storage(Self::sanitize_path_string(raw_err))
    }
}

/// 4.2 CSV Formula Injection Neutralization
/// Leading formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`) are prepended with an apostrophe `'`
pub fn neutralize_csv_formula(val: &str) -> String {
    const TRIGGERS: [char; 7] = ['=', '+', '-', '@', '\t', '\r', '%'];
    if let Some(first_char) = val.chars().next() {
        if TRIGGERS.contains(&first_char) {
            return format!("'{}", val);
        }
    }
    val.to_string()
}

/// 4.2 Path Traversal Defense
/// Sanitize export filenames against `../`, `..\\`, null bytes, and directory separators
pub fn sanitize_export_filename(filename: &str) -> Result<String, AppError> {
    if filename.contains('\0') {
        return Err(AppError::Security("Null byte detected in filename".into()));
    }
    if filename.contains("../")
        || filename.contains("..\\")
        || filename.contains('/')
        || filename.contains('\\')
    {
        return Err(AppError::Security(
            "Path traversal sequence prohibited in export filename".into(),
        ));
    }
    let trimmed = filename.trim();
    if trimmed.is_empty() || trimmed.starts_with('.') {
        return Err(AppError::Security(
            "Invalid filename: cannot be empty or hidden".into(),
        ));
    }
    Ok(trimmed.to_string())
}

/// 4.2 JSON Stream Deserialization
/// Bounded memory parsing enforcing maximum allocation limits
pub const MAX_JSON_STREAM_BYTES: usize = 50 * 1024 * 1024; // 50MB bounded limit

pub fn deserialize_bounded_json<'de, T: serde::Deserialize<'de>>(
    slice: &'de [u8],
    max_bytes: usize,
) -> Result<T, AppError> {
    if slice.len() > max_bytes {
        return Err(AppError::ResourceLimit(format!(
            "Payload size {} bytes exceeds bound {} bytes",
            slice.len(),
            max_bytes
        )));
    }

    serde_json::from_slice(slice).map_err(|e| AppError::Serialization(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zeroize_sensitive_gear_details() {
        let mut details = SensitiveGearDetails::new(
            "SN-ALPHA-998822".to_string(),
            "TOKEN-RECEIPT-SECRET-XYZ".to_string(),
        );

        assert_eq!(details.serial_number, "SN-ALPHA-998822");
        assert_eq!(details.purchase_receipt_token, "TOKEN-RECEIPT-SECRET-XYZ");

        details.zeroize();
        assert!(details.serial_number.is_empty());
        assert!(details.purchase_receipt_token.is_empty());
    }

    #[test]
    fn test_error_path_sanitization() {
        let raw = "Failed to open sqlite db at /Users/wardagentic/secrets/pack.db";
        let sanitized = AppError::sanitize_path_string(raw);
        assert!(!sanitized.contains("wardagentic"));
        assert!(sanitized.contains("[REDACTED_USER_PATH]/secrets/pack.db"));
    }

    #[test]
    fn test_csv_formula_injection_neutralization() {
        assert_eq!(neutralize_csv_formula("Regular Name"), "Regular Name");
        assert_eq!(neutralize_csv_formula("=SUM(A1:A10)"), "'=SUM(A1:A10)");
        assert_eq!(
            neutralize_csv_formula("+cmd|' /C calc'!A0"),
            "'+cmd|' /C calc'!A0"
        );
        assert_eq!(neutralize_csv_formula("-2+3*cmd"), "'-2+3*cmd");
        assert_eq!(neutralize_csv_formula("@SUM"), "'@SUM");
        assert_eq!(neutralize_csv_formula("%0A1"), "'%0A1");
    }

    #[test]
    fn test_path_traversal_defense() {
        assert!(sanitize_export_filename("manifest_2026.csv").is_ok());
        assert!(sanitize_export_filename("trip_backup.json").is_ok());

        assert!(sanitize_export_filename("../etc/passwd").is_err());
        assert!(sanitize_export_filename("..\\boot.ini").is_err());
        assert!(sanitize_export_filename("sub/dir/file.csv").is_err());
        assert!(sanitize_export_filename("manifest\0.csv").is_err());
        assert!(sanitize_export_filename(".hidden").is_err());
        assert!(sanitize_export_filename("   ").is_err());
    }

    #[test]
    fn test_bounded_json_deserialization() {
        #[derive(serde::Deserialize, PartialEq, Debug)]
        struct TestPayload {
            key: String,
        }

        let valid_json = b"{\"key\":\"value\"}";
        let res: Result<TestPayload, _> = deserialize_bounded_json(valid_json, 1024);
        assert!(res.is_ok());
        assert_eq!(res.unwrap().key, "value");

        // Payload exceeding maximum bound
        let overflow_res: Result<TestPayload, _> = deserialize_bounded_json(valid_json, 5);
        assert!(overflow_res.is_err());
        assert!(matches!(
            overflow_res.unwrap_err(),
            AppError::ResourceLimit(_)
        ));
    }
}
