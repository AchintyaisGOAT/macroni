import time

import requests

from app.config import APP_SHARED_TOKEN, PROXY_URL

TIMEOUT_SECONDS = 30
RETRY_ATTEMPTS = 3
RETRY_BASE_DELAY_SECONDS = 4.0


def call_proxy(path: str, payload: dict) -> dict:
    """POST to the MACRONI AI proxy (hosted on Cloud Run), which holds the real
    Gemini key server-side. Raises requests.HTTPError on non-2xx responses -
    callers should catch and surface .response.status_code / .response.text.

    The proxy scales to zero when idle, so the first request after a quiet
    period can arrive before a cold-started instance is ready and get aborted
    with a 500 - retries with backoff on 5xx/connection failures, since a
    follow-up request almost always lands on the now-warm instance. 4xx
    responses (bad payload, auth) are raised immediately since retrying won't
    help.
    """
    last_exc: Exception | None = None
    for attempt in range(RETRY_ATTEMPTS):
        try:
            response = requests.post(
                f"{PROXY_URL}{path}",
                json=payload,
                headers={"X-App-Token": APP_SHARED_TOKEN},
                timeout=TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            return response.json()
        except (requests.HTTPError, requests.exceptions.ConnectionError) as exc:
            is_server_error = isinstance(exc, requests.exceptions.ConnectionError) or (
                exc.response is not None and exc.response.status_code >= 500
            )
            if not is_server_error or attempt == RETRY_ATTEMPTS - 1:
                raise
            last_exc = exc
            time.sleep(RETRY_BASE_DELAY_SECONDS * (2**attempt))
    assert last_exc is not None
    raise last_exc
