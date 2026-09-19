import socket
import sys
import threading
import time
from pathlib import Path

import webview

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import uvicorn  # noqa: E402


def _find_free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def _bundle_root() -> Path:
    # When frozen by PyInstaller, __file__-relative paths point into the frozen
    # bootloader's internals, not the original project tree - bundled data (like
    # frontend/dist, see desktop/build.spec) lives under sys._MEIPASS instead.
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return PROJECT_ROOT


def _frontend_built() -> bool:
    return (_bundle_root() / "frontend" / "dist" / "index.html").exists()


def _start_backend(port: int) -> None:
    from app.main import app  # imported here so BACKEND_DIR is already on sys.path

    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="info")
    server = uvicorn.Server(config)
    server.run()


def _wait_for_backend(port: int, timeout: float = 15.0) -> bool:
    import urllib.error
    import urllib.request

    deadline = time.time() + timeout
    url = f"http://127.0.0.1:{port}/api/status"
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1.0):
                return True
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            time.sleep(0.3)
    return False


def main() -> None:
    frontend_built = _frontend_built()
    # Fixed port 8000 in dev mode matches frontend/.env.development's VITE_API_BASE_URL,
    # so the Vite dev server (npm run dev, port 5173) can reach this backend.
    port = _find_free_port() if frontend_built else 8000

    thread = threading.Thread(target=_start_backend, args=(port,), daemon=True)
    thread.start()

    if not _wait_for_backend(port):
        print(f"Warning: backend did not respond on port {port} within timeout; opening window anyway.")

    if frontend_built:
        url = f"http://127.0.0.1:{port}/"
    else:
        url = "http://localhost:5173/"
        print(
            "frontend/dist not found - run `npm run dev` in frontend/ separately "
            "(dev mode). Build with `npm run build` for the packaged single-window experience."
        )

    webview.create_window(
        "MACRONI",
        url,
        width=1440,
        height=900,
        min_size=(1100, 700),
    )
    webview.start()


if __name__ == "__main__":
    main()
