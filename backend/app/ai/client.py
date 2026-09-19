import requests

from app.config import APP_SHARED_TOKEN, PROXY_URL

TIMEOUT_SECONDS = 30


def call_proxy(path: str, payload: dict) -> dict:
    """POST to the MACRONI AI proxy (hosted on Cloud Run), which holds the real
    Gemini key server-side. Raises requests.HTTPError on non-2xx responses -
    callers should catch and surface .response.status_code / .response.text.
    """
    response = requests.post(
        f"{PROXY_URL}{path}",
        json=payload,
        headers={"X-App-Token": APP_SHARED_TOKEN},
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()
