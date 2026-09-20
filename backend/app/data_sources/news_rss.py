import logging
import re
from calendar import timegm
from datetime import datetime, timezone
from html import unescape

import feedparser
import requests
from sqlalchemy.orm import Session

from app.data_sources.base import retry, upsert_rows
from app.models.news import NewsItem

logger = logging.getLogger("app.data_sources.news")

RSS_FEEDS: dict[str, str] = {
    "fed_all": "https://www.federalreserve.gov/feeds/press_all.xml",
    "fed_monetary": "https://www.federalreserve.gov/feeds/press_monetary.xml",
    "ecb": "https://www.ecb.europa.eu/rss/press.html",
    "boe": "https://www.bankofengland.co.uk/rss/news",
    "boj": "https://www.boj.or.jp/en/rss/whatsnew.xml",
    "market_news": "https://www.investing.com/rss/news.rss",
    "yahoo_finance": "https://finance.yahoo.com/news/rssindex",
    "marketwatch": "https://feeds.content.dowjones.io/public/rss/mw_topstories",
}


_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(text: str) -> str:
    """RSS summaries are inconsistently plain-text vs HTML across feeds/providers -
    never render one raw, so tags don't leak into the UI as literal text and there's
    no XSS surface if a future feed embeds something like an <img>/<script> tag."""
    return unescape(_TAG_RE.sub(" ", text)).strip()


def _extract_image_url(entry) -> str | None:
    for item in entry.get("media_content") or []:
        if item.get("url"):
            return item["url"]
    for item in entry.get("media_thumbnail") or []:
        if item.get("url"):
            return item["url"]
    for enclosure in entry.get("enclosures") or []:
        if str(enclosure.get("type", "")).startswith("image/"):
            href = enclosure.get("href") or enclosure.get("url")
            if href:
                return href
    return None


def _parse_published(entry) -> datetime | None:
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if not parsed:
        return None
    return datetime.fromtimestamp(timegm(parsed), tz=timezone.utc)


def _fetch_feed_bytes(url: str) -> bytes:
    # feedparser's built-in fetcher relies on urllib + the OS certificate store, which
    # can fail on Windows for some hosts (CERTIFICATE_VERIFY_FAILED); requests bundles
    # certifi and verifies correctly cross-platform, so fetch the bytes ourselves.
    response = requests.get(url, timeout=10, headers={"User-Agent": "ai-macro-portfolio-manager/1.0"})
    response.raise_for_status()
    return response.content


def fetch_feed(source: str, url: str) -> list[dict]:
    content = retry(lambda: _fetch_feed_bytes(url), attempts=2, base_delay=2.0)
    parsed = feedparser.parse(content)
    if parsed.bozo and not parsed.entries:
        raise ValueError(f"failed to parse feed {source}: {parsed.bozo_exception}")

    rows = []
    for entry in parsed.entries:
        link = entry.get("link")
        if not link:
            continue
        rows.append(
            {
                "source": source,
                "title": entry.get("title", "")[:500],
                "link": link,
                "summary": _strip_html(entry.get("summary", ""))[:2000],
                "image_url": _extract_image_url(entry),
                "published_at": _parse_published(entry),
            }
        )
    return rows


def refresh_feed(db: Session, source: str, url: str) -> int:
    rows = fetch_feed(source, url)
    return upsert_rows(db, NewsItem, rows, conflict_columns=["link"])


def refresh_all_feeds(db: Session, feeds: dict[str, str] | None = None) -> dict[str, int]:
    results: dict[str, int] = {}
    for source, url in (feeds or RSS_FEEDS).items():
        try:
            results[source] = refresh_feed(db, source, url)
        except Exception:
            logger.exception("failed to refresh RSS feed %s", source)
            results[source] = -1
    return results
