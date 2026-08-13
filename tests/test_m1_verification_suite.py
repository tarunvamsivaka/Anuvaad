import shutil
import subprocess
from pathlib import Path

import pytest

base_dir = Path(__file__).resolve().parent.parent
frontend_dir = base_dir / "frontend"


def test_verify_ruff_check():
    if not shutil.which("ruff"):
        pytest.skip("ruff not installed in current environment")
    res = subprocess.run("ruff check .", cwd=base_dir, capture_output=True, text=True, shell=True)
    print("\n[RUFF STDOUT]\n" + res.stdout)
    if res.stderr:
        print("\n[RUFF STDERR]\n" + res.stderr)
    assert res.returncode == 0, f"ruff check failed with returncode {res.returncode}:\n{res.stdout}\n{res.stderr}"


def test_verify_npm_build():
    if not shutil.which("npm") or not (frontend_dir / "node_modules" / "next").exists():
        pytest.skip("frontend dependencies not installed (run npm ci first)")
    res = subprocess.run("npm run build", cwd=frontend_dir, capture_output=True, text=True, shell=True)
    print("\n[NPM BUILD STDOUT]\n" + res.stdout)
    if res.stderr:
        print("\n[NPM BUILD STDERR]\n" + res.stderr)
    assert res.returncode == 0, f"npm run build failed with returncode {res.returncode}:\n{res.stdout}\n{res.stderr}"


def test_verify_vitest_run():
    if not shutil.which("npx") or not (frontend_dir / "node_modules" / "vitest").exists():
        pytest.skip("frontend dependencies not installed (run npm ci first)")
    res = subprocess.run("npx vitest run", cwd=frontend_dir, capture_output=True, text=True, shell=True)
    print("\n[VITEST STDOUT]\n" + res.stdout)
    if res.stderr:
        print("\n[VITEST STDERR]\n" + res.stderr)
    assert res.returncode == 0, f"npx vitest run failed with returncode {res.returncode}:\n{res.stdout}\n{res.stderr}"
