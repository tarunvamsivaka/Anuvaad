"""
tests/test_eval_harness.py

Unit and integration tests for Phase 3A (Week 5):
Automated Benchmarking Pipeline & Verifiable Evaluation Harness.
"""

import json
from pathlib import Path

from scripts.eval_harness.eval_benchmarks import (
    CANONICAL_PROBLEMS,
    compute_bleu_1,
    evaluate_problem,
    run_benchmark_suite,
    synthesize_reference_explanation,
    tokenize,
)


def test_tokenize():
    tokens = tokenize("Arc<Mutex<i32>> in Rust!")
    assert "arc" in tokens
    assert "mutex" in tokens
    assert "rust" in tokens


def test_compute_bleu_1():
    cand = "Arc and Mutex ensure thread safety in Rust"
    ref = "Arc and Mutex provide thread safety"
    bleu = compute_bleu_1(cand, ref)
    assert bleu > 60.0

    # Empty candidate returns 0
    assert compute_bleu_1("", ref) == 0.0


def test_evaluate_problem():
    problem = CANONICAL_PROBLEMS[0]
    explanation = synthesize_reference_explanation(problem)
    result = evaluate_problem(problem, explanation)

    assert result["problem_id"] == "rust_arc_mutex"
    assert result["composite_score"] >= 90.0
    assert result["term_coverage_pct"] == 100.0
    assert result["concept_coverage_pct"] == 100.0
    assert len(result["matched_terms"]) > 0


def test_run_benchmark_suite(tmp_path: Path):
    out_file = tmp_path / "benchmarks-test.json"
    result = run_benchmark_suite(str(out_file))

    assert out_file.exists()
    assert result["metadata"]["total_canonical_problems"] == len(CANONICAL_PROBLEMS)
    assert result["metadata"]["cloud_hosting_burn_usd"] == "$0.00 / month"
    assert result["summary"]["pass_rate_pct"] == 100.0
    assert len(result["benchmarks"]) == len(CANONICAL_PROBLEMS)

    # Verify JSON structure
    with open(out_file, encoding="utf-8") as f:
        loaded = json.load(f)
    assert loaded["metadata"]["schema_version"] == "1.0.0"
    assert loaded["summary"]["mean_accuracy_pct"] > 95.0
