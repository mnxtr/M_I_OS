"""Ensure nightly retrieval checks cannot silently pass without evidence."""

import importlib.util
import json
import sys
from pathlib import Path

import pytest


@pytest.fixture
def eval_module():
    path = Path(__file__).resolve().parents[3] / "evals" / "run_eval.py"
    spec = importlib.util.spec_from_file_location("mios_eval_under_test", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _configure(monkeypatch, module, tmp_path, cases):
    cases_path = tmp_path / "cases.jsonl"
    cases_path.write_text("".join(json.dumps(case) + "\n" for case in cases))
    monkeypatch.setattr(sys, "argv", ["run_eval.py", str(cases_path)])
    monkeypatch.setattr(module, "__file__", str(tmp_path / "run_eval.py"))
    monkeypatch.setenv("MIOS_TEST_DSN", "postgresql+psycopg://unused/never_connect")
    monkeypatch.setenv("MIOS_EVAL_TENANT_ID", "11111111-1111-1111-1111-111111111111")


def test_eval_requires_a_checked_in_baseline(monkeypatch, eval_module, tmp_path):
    _configure(
        monkeypatch,
        eval_module,
        tmp_path,
        [{"id": "q1", "lang": "en", "question": "Production?", "expected_doc": "q.pdf"}],
    )
    assert eval_module.main() == 2
    assert not (tmp_path / "baseline.json").exists()


def test_eval_rejects_empty_golden_set_even_with_baseline(monkeypatch, eval_module, tmp_path):
    _configure(monkeypatch, eval_module, tmp_path, [])
    (tmp_path / "baseline.json").write_text('{"hit_rate": 0.8, "mrr": 0.6}')
    assert eval_module.main() == 2
