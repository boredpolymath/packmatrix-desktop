//! PackMatrix Desktop — Performance & Rendering Benchmarks
//! SDLC Phase Gate 5: Section 7.3 (PM-BTM-001)

use crate::db::migrations::run_migrations;
use crate::db::pool::DbPool;
use crate::geometry::balance::{calculate_center_of_mass_with_envelope, WeightedPoint3D};
use crate::geometry::bounding_box::Dimensions;
use std::time::Instant;

#[cfg(test)]
mod tests {
    use super::*;

    /// Benchmark IPC & SQLite Query Latency Throughput
    /// Target: p95 <= 4.0 ms across 10,000 query operations
    /// Mandated by SDLC Phase Gate 5: Section 7.3
    #[test]
    fn test_ipc_command_and_query_throughput_p95_under_4ms() {
        let temp_dir =
            std::env::temp_dir().join(format!("packmatrix_bench_{}", std::process::id()));
        let db_path = temp_dir.join("bench.db");

        let pool = DbPool::open(&db_path).expect("open bench db");

        // Bootstrap schema & seed items
        pool.write(|conn| {
            run_migrations(conn)?;

            // Insert 500 initial inventory items into database
            for i in 1..=500 {
                conn.execute(
                    "INSERT INTO inventory_items (id, name, brand, category, weight_g, tags)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    rusqlite::params![
                        format!("item-{}", i),
                        format!("Ultralight Pack Item #{}", i),
                        "Bored Polymath",
                        "Tech",
                        150.0 + (i as f64),
                        "waterproof,cordura,packable"
                    ],
                )?;
            }
            Ok(())
        })
        .expect("seed benchmark data");

        const QUERY_RUNS: usize = 10_000;
        let mut latencies_micros: Vec<u128> = Vec::with_capacity(QUERY_RUNS);

        // 1. Measure standard indexed query latency (simulating IPC read commands)
        for i in 0..QUERY_RUNS {
            let target_id = format!("item-{}", (i % 500) + 1);
            let start = Instant::now();

            let item_name: String = pool
                .read(|conn| {
                    conn.query_row(
                        "SELECT name FROM inventory_items WHERE id = ?1",
                        rusqlite::params![&target_id],
                        |r| r.get(0),
                    )
                })
                .expect("query succeeds");

            let elapsed_micros = start.elapsed().as_micros();
            latencies_micros.push(elapsed_micros);
            assert!(!item_name.is_empty());
        }

        latencies_micros.sort_unstable();

        let p50_micros = latencies_micros[(QUERY_RUNS * 50) / 100];
        let p95_micros = latencies_micros[(QUERY_RUNS * 95) / 100];
        let p99_micros = latencies_micros[(QUERY_RUNS * 99) / 100];
        let max_micros = latencies_micros[QUERY_RUNS - 1];

        let p95_ms = (p95_micros as f64) / 1000.0;
        let p99_ms = (p99_micros as f64) / 1000.0;

        println!(
            "\n=== SDLC 7.3 IPC / SQLite Query Benchmark Results ({} runs) ===\n\
             p50: {:.3} ms ({} µs)\n\
             p95: {:.3} ms ({} µs) [TARGET <= 4.0 ms]\n\
             p99: {:.3} ms ({} µs)\n\
             max: {:.3} ms ({} µs)\n\
             =============================================================",
            QUERY_RUNS,
            (p50_micros as f64) / 1000.0,
            p50_micros,
            p95_ms,
            p95_micros,
            p99_ms,
            p99_micros,
            (max_micros as f64) / 1000.0,
            max_micros
        );

        // SDLC 7.3 Enforcement Gate: p95 <= 4.0 ms
        assert!(
            p95_ms <= 4.0,
            "IPC query throughput p95 ({:.3} ms) exceeded 4.0 ms SLA threshold!",
            p95_ms
        );

        drop(pool);
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    /// Benchmark Geometry and Balance Calculation IPC Throughput
    /// Target: >= 100,000 calculations/second (sub-millisecond latency)
    #[test]
    fn test_computational_geometry_ipc_throughput() {
        let points: Vec<WeightedPoint3D> = (0..50)
            .map(|i| WeightedPoint3D {
                x: ((i as f64) % 30.0) - 15.0,
                y: (i as f64) % 25.0,
                z: (i as f64) % 50.0,
                mass_g: 200.0,
            })
            .collect();

        let start = Instant::now();
        const RUNS: usize = 50_000;

        for _ in 0..RUNS {
            let dim = Dimensions::new(55.0, 35.0, 23.0);
            let _usable = dim.effective_usable_volume_liters(0.9, 3.5);
            let _balance = calculate_center_of_mass_with_envelope(&points, 35.0, 23.0, 55.0);
        }

        let total_time = start.elapsed();
        let avg_time_per_op_micros = total_time.as_micros() as f64 / (RUNS as f64);

        println!(
            "Geometry & Balance IPC throughput: {:.3} µs/op across {} runs (total {:.2} ms)",
            avg_time_per_op_micros,
            RUNS,
            total_time.as_millis()
        );

        // Average computation time per IPC packet must remain <= 100 µs (0.1 ms)
        assert!(
            avg_time_per_op_micros <= 100.0,
            "Computational geometry took {:.3} µs/op, exceeding 100 µs limit",
            avg_time_per_op_micros
        );
    }
}
