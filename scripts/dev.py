"""Run MACRONI's backend and frontend together for local development.

Usage:
    python scripts/dev.py
or, on Windows, double-click "Run Dev.bat" in the project root.

What this does beyond just running two dev servers:
  - Creates backend/venv and installs requirements the first time, same for
    frontend/node_modules, so a fresh checkout works with one command.
  - If the backend's preferred port (8001) is already taken by something
    else, picks the next free one instead of failing, and points the
    frontend at the real port via an untracked .env override (see
    write_frontend_api_override below) - frontend/.env.development itself
    is left untouched.
  - Vite (the frontend dev server) already falls back to another port on
    its own when 5173 is busy, so nothing extra is needed there.
  - Waits for the backend to answer /api/status before starting the
    frontend, so the SPA's first requests don't all fail during backend
    startup.
  - On Ctrl+C, or if either process dies on its own, stops both instead of
    leaving an orphaned process holding the port for next time.
"""

from __future__ import annotations

import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"

PREFERRED_BACKEND_PORT = 8001
BACKEND_PORT_SCAN_RANGE = 50
FRONTEND_PORT = 5173  # Vite's default; Vite itself falls back if this is busy.


def find_free_port(preferred: int, host: str = "127.0.0.1") -> int:
    """Return `preferred` if it's free, else the next free port after it.

    Deliberately does NOT set SO_REUSEADDR: on Windows that flag lets bind()
    succeed even when another socket already owns the port (unlike POSIX,
    where it just allows reuse of a recently-closed TIME_WAIT socket), which
    would make this check always report "free" and defeat the whole point.
    """
    for port in range(preferred, preferred + BACKEND_PORT_SCAN_RANGE):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((host, port))
                return port
            except OSError:
                continue
    # Every port in the scan range was busy (unlikely) - let the OS assign one.
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((host, 0))
        return s.getsockname()[1]


def venv_python() -> Path:
    import os

    if os.name == "nt":
        return BACKEND_DIR / "venv" / "Scripts" / "python.exe"
    return BACKEND_DIR / "venv" / "bin" / "python"


def ensure_backend_deps() -> Path:
    venv_dir = BACKEND_DIR / "venv"
    if not venv_dir.exists():
        print("[setup] no backend venv found - creating one...")
        subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], check=True)

    python = venv_python()
    probe = subprocess.run([str(python), "-c", "import fastapi, uvicorn"], capture_output=True)
    if probe.returncode != 0:
        print("[setup] installing backend requirements...")
        subprocess.run(
            [str(python), "-m", "pip", "install", "-q", "-r", "requirements.txt"],
            check=True,
            cwd=BACKEND_DIR,
        )
    return python


def find_npm() -> str:
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm:
        print("error: npm not found on PATH. Install Node.js (18+) first.", file=sys.stderr)
        sys.exit(1)
    return npm


def ensure_frontend_deps(npm: str) -> None:
    if not (FRONTEND_DIR / "node_modules").exists():
        print("[setup] no frontend node_modules found - running npm install...")
        subprocess.run([npm, "install"], check=True, cwd=FRONTEND_DIR)


def write_frontend_api_override(port: int) -> None:
    """Point Vite at the real backend port without touching tracked files.

    frontend/.env.development is committed to git and hardcodes port 8001.
    .env.development.local loads with higher precedence in Vite and is meant
    to stay untracked (per Vite convention - see the .gitignore entry this
    script's caller relies on), so that's where the *actual* resolved port
    goes when it differs from the default.
    """
    override = FRONTEND_DIR / ".env.development.local"
    content = f"VITE_API_BASE_URL=http://127.0.0.1:{port}\n"
    if override.exists() and override.read_text() == content:
        return
    if port == PREFERRED_BACKEND_PORT and not override.exists():
        return  # default already matches frontend/.env.development - nothing to override
    override.write_text(content)


def wait_for_backend(port: int, timeout: float = 20.0) -> bool:
    deadline = time.time() + timeout
    url = f"http://127.0.0.1:{port}/api/status"
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1.0):
                return True
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError):
            time.sleep(0.3)
    return False


def main() -> None:
    if not (BACKEND_DIR / "requirements.txt").exists():
        print("error: run this from a MACRONI checkout (backend/requirements.txt not found).", file=sys.stderr)
        sys.exit(1)

    npm = find_npm()
    python = ensure_backend_deps()
    ensure_frontend_deps(npm)

    backend_port = find_free_port(PREFERRED_BACKEND_PORT)
    if backend_port != PREFERRED_BACKEND_PORT:
        print(
            f"[warn] port {PREFERRED_BACKEND_PORT} is already in use by something else - "
            f"backend will use {backend_port} instead."
        )
    write_frontend_api_override(backend_port)

    procs: list[subprocess.Popen] = []
    try:
        print(f"[dev] starting backend on 127.0.0.1:{backend_port} ...")
        backend = subprocess.Popen(
            [
                str(python),
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(backend_port),
                "--reload",
            ],
            cwd=BACKEND_DIR,
        )
        procs.append(backend)

        if not wait_for_backend(backend_port):
            print("[warn] backend did not answer /api/status within 20s - starting frontend anyway.")

        print("[dev] starting frontend (Vite) ...")
        frontend = subprocess.Popen([npm, "run", "dev"], cwd=FRONTEND_DIR)
        procs.append(frontend)

        print(f"\nBackend:  http://127.0.0.1:{backend_port}")
        print(f"Frontend: http://localhost:{FRONTEND_PORT} (or the next free port - check Vite's own output above)")
        print("\nPress Ctrl+C to stop both.\n")

        while True:
            for p in procs:
                code = p.poll()
                if code is not None:
                    print(f"\n[dev] a process exited on its own (code {code}) - stopping the other one too.")
                    raise KeyboardInterrupt
            time.sleep(0.5)

    except KeyboardInterrupt:
        print("\n[dev] shutting down...")
    finally:
        for p in procs:
            if p.poll() is None:
                p.terminate()
        deadline = time.time() + 5
        for p in procs:
            remaining = max(0.0, deadline - time.time())
            try:
                p.wait(timeout=remaining)
            except subprocess.TimeoutExpired:
                p.kill()
        print("[dev] stopped.")


if __name__ == "__main__":
    main()
