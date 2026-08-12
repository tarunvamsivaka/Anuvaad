import subprocess

base_dir = r"C:\Users\tarun\Anuvaad\Anuvaad"
frontend_dir = r"C:\Users\tarun\Anuvaad\Anuvaad\frontend"

def test_verify_ruff_check():
    res = subprocess.run("ruff check .", cwd=base_dir, capture_output=True, text=True, shell=True)
    print("\n[RUFF STDOUT]\n" + res.stdout)
    if res.stderr:
        print("\n[RUFF STDERR]\n" + res.stderr)
    assert res.returncode == 0, f"ruff check failed with returncode {res.returncode}:\n{res.stdout}\n{res.stderr}"

def test_verify_npm_build():
    res = subprocess.run("npm run build", cwd=frontend_dir, capture_output=True, text=True, shell=True)
    print("\n[NPM BUILD STDOUT]\n" + res.stdout)
    if res.stderr:
        print("\n[NPM BUILD STDERR]\n" + res.stderr)
    assert res.returncode == 0, f"npm run build failed with returncode {res.returncode}:\n{res.stdout}\n{res.stderr}"

def test_verify_vitest_run():
    res = subprocess.run("npx vitest run", cwd=frontend_dir, capture_output=True, text=True, shell=True)
    print("\n[VITEST STDOUT]\n" + res.stdout)
    if res.stderr:
        print("\n[VITEST STDERR]\n" + res.stderr)
    assert res.returncode == 0, f"npx vitest run failed with returncode {res.returncode}:\n{res.stdout}\n{res.stderr}"
