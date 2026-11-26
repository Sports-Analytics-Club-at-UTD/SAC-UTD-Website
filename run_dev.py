"""
Launch both the Django backend and Vite React frontend locally in one terminal.

Usage:
    python run_dev.py
"""

import os
from pathlib import Path
import shutil
import subprocess
import sys
import threading
import time

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "sac_backend"
FRONTEND_DIR = ROOT_DIR / "margin-frontend"


def resolve_python() -> str:
    candidates = [
        ROOT_DIR / ".venv" / "Scripts" / "python.exe",
        ROOT_DIR / ".venv" / "bin" / "python",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return sys.executable


def resolve_npm() -> str:
    if os.name == "nt":
        return shutil.which("npm.cmd") or shutil.which("npm") or "npm.cmd"
    return shutil.which("npm") or "npm"


def stream_output(proc: subprocess.Popen, prefix: str) -> None:
    if proc.stdout is None:
        return
    try:
        for line in iter(proc.stdout.readline, ""):
            if not line:
                break
            sys.stdout.write(f"[{prefix}] {line}")
            sys.stdout.flush()
    except ValueError:
        pass


def stop_process_tree(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    else:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


def main() -> int:
    python_bin = resolve_python()
    npm_bin = resolve_npm()

    backend_env = os.environ.copy()
    backend_env["PYTHONUNBUFFERED"] = "1"

    frontend_env = os.environ.copy()
    frontend_env.setdefault("VITE_API_BASE_URL", "http://127.0.0.1:8000")

    print("=" * 60)
    print("  SAC UTD Website — Local Dev Launcher")
    print(f"  Backend Python : {python_bin}")
    print(f"  Frontend URL   : http://localhost:5173")
    print(f"  Finance Portal : http://localhost:5173/finance")
    print(f"  Login Portal   : http://localhost:5173/portal")
    print(f"  Backend API    : http://127.0.0.1:8000/api/")
    print("  Press Ctrl+C to stop both servers.")
    print("=" * 60)

    backend_proc = subprocess.Popen(
        [python_bin, "manage.py", "runserver", "127.0.0.1:8000"],
        cwd=str(BACKEND_DIR),
        env=backend_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    frontend_proc = subprocess.Popen(
        [npm_bin, "run", "dev"],
        cwd=str(FRONTEND_DIR),
        env=frontend_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    for proc, label in ((backend_proc, "BACKEND"), (frontend_proc, "FRONTEND")):
        t = threading.Thread(target=stream_output, args=(proc, label), daemon=True)
        t.start()

    try:
        while True:
            b_code = backend_proc.poll()
            f_code = frontend_proc.poll()
            if b_code is not None:
                print(f"[LAUNCHER] Backend exited with code {b_code}. Stopping frontend...")
                stop_process_tree(frontend_proc)
                return b_code
            if f_code is not None:
                print(f"[LAUNCHER] Frontend exited with code {f_code}. Stopping backend...")
                stop_process_tree(backend_proc)
                return f_code
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n[LAUNCHER] Stopping backend and frontend...")
        stop_process_tree(frontend_proc)
        stop_process_tree(backend_proc)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
