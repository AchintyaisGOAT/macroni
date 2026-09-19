# PyInstaller spec for the MACRONI desktop app.
# Build from the project root with: pyinstaller desktop/build.spec --noconfirm
import os

block_cipher = None

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(SPEC), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FRONTEND_DIST = os.path.join(PROJECT_ROOT, "frontend", "dist")
ALERT_RULES = os.path.join(BACKEND_DIR, "app", "alerts", "rules.yaml")

a = Analysis(
    [os.path.join(PROJECT_ROOT, "desktop", "launcher.py")],
    pathex=[BACKEND_DIR],
    binaries=[],
    datas=[
        (FRONTEND_DIST, "frontend/dist"),
        (ALERT_RULES, "app/alerts"),
    ],
    hiddenimports=[
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "apscheduler.triggers.interval",
        "apscheduler.triggers.date",
        "apscheduler.triggers.cron",
        "apscheduler.executors.pool",
        "apscheduler.jobstores.memory",
        "clr_loader",
        "pythonnet",
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="MACRONI",
    debug=False,
    strip=False,
    upx=False,
    console=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="MACRONI",
)
