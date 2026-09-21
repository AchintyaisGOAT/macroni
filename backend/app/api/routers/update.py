import logging
import subprocess
import sys
import tempfile
from pathlib import Path

import requests
from fastapi import APIRouter, HTTPException

from app.config import GITHUB_REPO, get_app_version

logger = logging.getLogger("app.api.update")

router = APIRouter(prefix="/api/update", tags=["update"])

GITHUB_API_TIMEOUT = 10


def _fetch_latest_release() -> dict:
    resp = requests.get(f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest", timeout=GITHUB_API_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def _find_installer_asset(release: dict) -> dict | None:
    return next((a for a in release.get("assets", []) if a.get("name", "").endswith(".exe")), None)


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


@router.post("/install")
def install_update():
    """Download the latest release's installer, run it silently, then relaunch.

    Only meaningful for an installed (frozen) copy. Inno Setup's own Restart
    Manager integration (CloseApplications, desktop/installer.iss) reliably closes
    this running exe so Setup can overwrite its files - verified directly against
    a real install. Its RestartApplications counterpart, which is supposed to
    reopen the app afterward, did NOT reliably do so in that same testing for this
    app - so the relaunch is handled explicitly here instead: a detached helper
    process waits for the (already-launched, fire-and-forget) installer to fully
    exit, then starts this exe's own path again. That helper must be detached from
    this process, since Restart Manager is about to kill this one mid-request.
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

    exe_path = sys.executable  # this app's own installed path - unchanged after an in-place update
    relaunch_cmd = (
        f'"{tmp_path}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS '
        f'&& start "" "{exe_path}"'
    )
    try:
        subprocess.Popen(
            ["cmd", "/c", relaunch_cmd],
            creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
            close_fds=True,
        )
    except OSError as exc:
        logger.exception("failed to launch update installer")
        raise HTTPException(status_code=500, detail=f"failed to launch the installer: {exc}") from exc

    return {"status": "installing"}
