from google import genai

from app.config import settings

_client: genai.Client | None = None


class GeminiNotConfigured(RuntimeError):
    pass


def get_client() -> genai.Client:
    global _client
    if not settings.has_gemini_key:
        raise GeminiNotConfigured("GEMINI_API_KEY is not configured")
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client
