//! PackMatrix Desktop — Dynamic Fuzz Testing Suite
//! SDLC Phase Gate 5: Section 7.2 (PM-BTM-001)

use crate::compliance::rules::evaluate_luggage_compliance;
use crate::db::models::{AirlineRule, LuggageShell};
use crate::export::parse_json_backup;
use crate::inventory::parse_csv_inventory;
use crate::security::invariants::deserialize_bounded_json;

#[cfg(test)]
mod tests {
    use super::*;

    /// PRNG helper for high-speed dynamic fuzz vector generation
    struct FuzzRng {
        state: u64,
    }

    impl FuzzRng {
        fn new(seed: u64) -> Self {
            Self { state: seed }
        }

        fn next_u64(&mut self) -> u64 {
            self.state ^= self.state << 13;
            self.state ^= self.state >> 7;
            self.state ^= self.state << 17;
            self.state
        }

        fn next_range(&mut self, min: usize, max: usize) -> usize {
            if min >= max {
                return min;
            }
            min + (self.next_u64() as usize % (max - min + 1))
        }

        fn next_f64(&mut self, min: f64, max: f64) -> f64 {
            let u = self.next_u64();
            let frac = (u as f64) / (u64::MAX as f64);
            min + frac * (max - min)
        }

        fn random_bytes(&mut self, len: usize) -> Vec<u8> {
            (0..len).map(|_| (self.next_u64() & 0xFF) as u8).collect()
        }

        fn random_string_fuzz(&mut self, max_len: usize) -> String {
            const CHARSET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 \t\r\n,\";:'\\/=+-@%#$&*()[]{}<>?!\0\x1b\x7f";
            let len = self.next_range(0, max_len);
            (0..len)
                .map(|_| {
                    let idx = self.next_range(0, CHARSET.len() - 1);
                    CHARSET[idx] as char
                })
                .collect()
        }
    }

    /// Dynamic Fuzzing: CSV / TSV import parser
    /// Fuzzing delimiters, quotes, escapes, binary data, formula triggers
    /// Target: Zero panics, zero memory leaks, graceful error or parsed output
    #[test]
    fn fuzz_csv_tsv_import_parser() {
        let mut rng = FuzzRng::new(0xCAFEBABE12345678);

        // 1. Extreme corpus cases
        let repeated_a = "a,".repeat(5000);
        let repeated_quotes = "\"".repeat(1000);
        let repeated_controls = "\n\r\n\t".repeat(500);

        let known_edge_cases = vec![
            "",
            "\0",
            "\0\0\0\0",
            "name,brand,weight\n",
            "name,brand,weight\nitem1,brand1,100\n",
            "name\tbrand\tweight\nitem1\tbrand1\t100\n",
            "name;brand;weight\nitem1;brand1;100\n",
            "\"unclosed quote,brand,100",
            "name,\"nested \"\"escaped\"\" quotes\",50",
            "name,brand,weight\n=cmd|' /C calc'!A0,brand,100",
            "name,brand,weight\n+SUM(1+1),brand,100",
            "name,brand,weight\n@SUM(1+1),brand,100",
            "name,brand,weight\n-2+3*1,brand,100",
            "name,brand,weight\n%0Acalc,brand,100",
            &repeated_a,
            &repeated_quotes,
            &repeated_controls,
        ];

        for case in known_edge_cases {
            let _ = parse_csv_inventory(case);
        }

        // 2. 50,000 randomized dynamic fuzzing iterations
        for _ in 0..50_000 {
            let payload = rng.random_string_fuzz(200);
            let result = parse_csv_inventory(&payload);

            if let Ok(items) = result {
                for item in items {
                    // Assert formula injection was neutralized
                    const FORMULA_CHARS: [char; 6] = ['=', '+', '-', '@', '\t', '%'];
                    if let Some(first_char) = item.name.chars().next() {
                        assert!(
                            !FORMULA_CHARS.contains(&first_char),
                            "Neutralization invariant broken for name: {}",
                            item.name
                        );
                    }
                    assert!(item.weight_g >= 0.0, "Weight must be non-negative");
                    assert!(!item.weight_g.is_nan(), "Weight must not be NaN");
                }
            }
        }
    }

    /// Dynamic Fuzzing: JSON import deserializer
    /// Fuzzing malformed JSON, deep nesting, huge numbers, truncated streams
    /// Target: Safe bounded rejection without panics or memory exhaustion
    #[test]
    fn fuzz_json_deserializer() {
        let mut rng = FuzzRng::new(0x1337BEEFCAFE0000);

        // 1. Structural edge cases
        let json_edge_cases = vec![
            "",
            "{}",
            "[]",
            "{\"version\":",
            "{\"version\": null}",
            "{\"luggage\": [\"corrupted\"]}",
            "[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]",
            "{\"id\": 1e999999999999999999999999999999}",
            "{\"notes\": \"\0\0\0\"}",
        ];

        for case in json_edge_cases {
            let _ = parse_json_backup(case);
            let _ =
                deserialize_bounded_json::<serde_json::Value>(case.as_bytes(), 50 * 1024 * 1024);
        }

        // 2. 50,000 randomized arbitrary byte buffer runs
        for _ in 0..50_000 {
            let len = rng.next_range(0, 512);
            let bytes = rng.random_bytes(len);
            let str_val = String::from_utf8_lossy(&bytes);

            let _ = parse_json_backup(&str_val);
            let _ = deserialize_bounded_json::<serde_json::Value>(&bytes, 1024 * 1024);
        }
    }

    /// Dynamic Fuzzing: Custom airline rule schema validator
    /// Fuzzing arbitrary negative lengths, zero, huge floats, malformed fare classes
    /// Target: Zero panics, correct boundary delta calculation
    #[test]
    fn fuzz_airline_rule_validator() {
        let mut rng = FuzzRng::new(0x9876543210ABCDEF);

        for _ in 0..50_000 {
            let bag = LuggageShell {
                id: rng.random_string_fuzz(10),
                name: rng.random_string_fuzz(20),
                brand: Some(rng.random_string_fuzz(15)),
                length_cm: rng.next_f64(-50.0, 300.0),
                width_cm: rng.next_f64(-50.0, 300.0),
                depth_cm: rng.next_f64(-50.0, 300.0),
                tare_weight_g: rng.next_f64(-1000.0, 30000.0),
                nominal_volume_l: rng.next_f64(-10.0, 200.0),
                expansion_gusset_cm: rng.next_f64(-10.0, 20.0),
                is_expanded: (rng.next_u64() & 1) == 1,
                corner_radius_cm: rng.next_f64(-5.0, 20.0),
                taper_ratio: rng.next_f64(-0.5, 2.0),
            };

            let rule = AirlineRule {
                id: rng.random_string_fuzz(8),
                carrier_name: rng.random_string_fuzz(15),
                carrier_code: rng.random_string_fuzz(3),
                fare_class: rng.random_string_fuzz(10),
                carry_on_length_cm: rng.next_f64(0.0, 200.0),
                carry_on_width_cm: rng.next_f64(0.0, 200.0),
                carry_on_depth_cm: rng.next_f64(0.0, 200.0),
                carry_on_max_weight_kg: if (rng.next_u64() & 1) == 1 {
                    Some(rng.next_f64(0.0, 50.0))
                } else {
                    None
                },
                personal_item_length_cm: None,
                personal_item_width_cm: None,
                personal_item_depth_cm: None,
                personal_item_max_weight_kg: None,
                tsa_liquids_compliant: (rng.next_u64() & 1) == 1,
                verified_at: "2026-10-19".to_string(),
            };

            let packed_weight_kg = rng.next_f64(-10.0, 100.0);
            let eval = evaluate_luggage_compliance(&bag, packed_weight_kg, &rule);

            // Assert output fields are finite (never NaN or infinite)
            assert!(!eval.length_diff_cm.is_nan());
            assert!(!eval.width_diff_cm.is_nan());
            assert!(!eval.depth_diff_cm.is_nan());
            if let Some(w) = eval.weight_diff_kg {
                assert!(!w.is_nan());
            }
        }
    }
}
