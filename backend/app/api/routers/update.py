import logging
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

import requests
from fastapi import APIRouter, HTTPException

from app.config import GITHUB_REPO, get_app_version

logger = logging.getLogger("app.api.update")

router = APIRouter(prefix="/api/update", tags=["update"])

GITHUB_API_TIMEOUT = 10

# Matches this app's own installer naming (see desktop/installer.iss's
# OutputBaseFilename) specifically - not just "any .exe attached to the release."
# A release accidentally carrying some other .exe asset shouldn't make the
# updater silently download and run it.
_INSTALLER_ASSET_RE = re.compile(r"^MACRONI-Setup-.*\.exe$", re.IGNORECASE)


def _fetch_latest_release() -> dict:
    resp = requests.get(f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest", timeout=GITHUB_API_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def _find_installer_asset(release: dict) -> dict | None:
    return next((a for a in release.get("assets", []) if _INSTALLER_ASSET_RE.match(a.get("name", ""))), None)


@router.get("/check")
def check_for_update():
    try:
        release = _fetch_latest_release()
    except requests.RequestException as exc:
        logger.warning("update check failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"could not check for updates: {exc}") from exc

    asset = _find_installer_asset(release)
    return {
        "current_version": get_app_version(),
        "tag_name": release.get("tag_name"),
        "html_url": release.get("html_url"),
        "asset_name": asset["name"] if asset else None,
        "installable": asset is not None,
    }


def _quit_after_delay(delay: float) -> None:
    """Give the HTTP response time to reach the frontend, then hard-exit this
    entire process (backend + the pywebview GUI both live in it - see
    desktop/launcher.py) so its exe/DLL file handles are released deterministically,
    on our own schedule, rather than depending on the installer to force it closed.
    os._exit() skips cleanup on purpose - a graceful shutdown isn't the goal here,
    an immediate and reliable one is.
    """
    time.sleep(delay)
    os._exit(0)


@router.post("/install")
def install_update():
    """Download the latest release's installer, quit, let it install and relaunch.

    Two other designs were tried and rejected here, both verified directly
    against a real installed copy rather than assumed:
    - Relying on Inno Setup's CloseApplications/RestartApplications (Restart
      Manager) to close and reopen this app: closing worked, reopening did not,
      reliably, for this app.
    - A Python-side detached `cmd /c "... && start ... "` helper to chain
      "wait for install, then relaunch" ourselves: `start` failed with
      "Access is denied" in testing - spawning a new GUI process via cmd/start
      needs desktop/window-station access that a background-launched cmd doesn't
      reliably get, unlike a direct CreateProcess of the target exe.
    This version launches the installer directly (a plain subprocess launch,
    which - unlike the cmd/start path - does work) and then quits; the actual
    relaunch afterward is Inno Setup's own native, battle-tested [Run] entry
    (desktop/installer.iss, with skipifsilent removed so it fires under
    /VERYSILENT too) rather than anything hand-rolled here.
    """
    if not getattr(sys, "frozen", False):
        raise HTTPException(
            status_code=400, detail="Auto-update only works in an installed copy of the app, not in dev mode."
        )

    try:
        release = _fetch_latest_release()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"could not reach GitHub: {exc}") from exc

    asset = _find_installer_asset(release)
    if asset is None:
        raise HTTPException(status_code=404, detail="No installer found in the latest release.")

    try:
        with requests.get(asset["browser_download_url"], timeout=120, stream=True) as download:
            download.raise_for_status()
            tmp_path = Path(tempfile.gettempdir()) / asset["name"]
            with open(tmp_path, "wb") as f:
                for chunk in download.iter_content(chunk_size=1024 * 1024):
                    f.write(chunk)
    except (requests.RequestException, OSError) as exc:
        logger.exception("failed to download update installer")
        raise HTTPException(status_code=502, detail=f"failed to download the update: {exc}") from exc

    try:
        subprocess.Popen(
            [str(tmp_path), "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART"],
            close_fds=True,
        )
    except OSError as exc:
        logger.exception("failed to launch update installer")
        raise HTTPException(status_code=500, detail=f"failed to launch the installer: {exc}") from exc

    threading.Thread(target=_quit_after_delay, args=(1.5,), daemon=True).start()

    return {"status": "installing"}
