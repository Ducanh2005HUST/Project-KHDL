from __future__ import annotations

import hashlib
import logging
import re
import time
from datetime import datetime
from typing import Optional

import feedparser
import requests
from bs4 import BeautifulSoup

import config
from models import Article

logger = logging.getLogger("crawler")

_visited_urls: set[str] = set()

def _strip_html(raw_html: str) -> str:
    """Remove HTML tags and collapse whitespace."""
    text = BeautifulSoup(raw_html, "lxml").get_text(separator=" ")
    return re.sub(r"\s+", " ", text).strip()

def _fetch_article_content(url: str, source: str) -> Optional[str]:
    """
    Download the article page and extract the main body text.
    Each newspaper has its own CSS selectors.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }

    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding
        soup = BeautifulSoup(resp.text, "lxml")
    except Exception as exc:
        logger.warning("Failed to fetch %s : %s", url, exc)
        return None

    # maps source name to CSS selectors for article body
    selector_map: dict[str, list[str]] = {
        "VnExpress": [
            "article.fck_detail",
            ".fck_detail",
            "article",
        ],
        "Tuoi Tre": [
            "div#main-detail-body",
            "div.detail-cmain",
            "div.detail__content",
            "article",
        ],
        "Thanh Nien": [
            "div.detail__content",
            "div.detail-content",
            "div#abody",
            "article",
        ],
    }

    selectors = selector_map.get(source, ["article"])
    content_tag = None
    for sel in selectors:
        content_tag = soup.select_one(sel)
        if content_tag:
            break

    if not content_tag:
        logger.debug("No content selector matched for %s (%s)", source, url)
        return None

    for tag in content_tag.find_all(["script", "style", "figure", "figcaption", "table"]):
        tag.decompose()

    text = content_tag.get_text(separator=" ")
    text = re.sub(r"\s+", " ", text).strip()

    if len(text) < 80:
        return None

    return text

    # parse date publish
def _parse_date(entry) -> Optional[datetime]:
    """Best-effort parse of feed entry dates."""
    for attr in ("published_parsed", "updated_parsed"):
        ts = getattr(entry, attr, None)
        if ts:
            try:
                return datetime(*ts[:6])
            except Exception:
                pass
    return None

def _crawl_feed(feed_info: dict) -> list[Article]:
    """Parse one RSS feed and return list of Article objects."""
    url = feed_info["url"]
    source = feed_info["source"]
    category = feed_info["category"]
    articles: list[Article] = []

    try:
        feed = feedparser.parse(url)
    except Exception as exc:
        logger.error("Failed to parse RSS %s : %s", url, exc)
        return articles

    for entry in feed.entries:
        link = getattr(entry, "link", None)
        if not link or link in _visited_urls:
            continue

        _visited_urls.add(link)

        title = getattr(entry, "title", "")
        if not title:
            continue

        content = _fetch_article_content(link, source)

        if not content:
            raw = getattr(entry, "summary", "") or getattr(entry, "description", "")
            content = _strip_html(raw) if raw else ""

        if not content or len(content) < 50:
            continue

        published_at = _parse_date(entry)

        articles.append(
            Article(
                title=title,
                content=content,
                url=link,
                source=source,
                category=category,
                published_at=published_at,
                crawled_at=datetime.utcnow(),
            )
        )

    return articles

def run_crawl() -> list[Article]:
    """
    Crawl all configured RSS feeds and return new articles.
    Called by the scheduler and on startup.
    """
    start = time.time()
    all_articles: list[Article] = []

    logger.info(
        "Crawl cycle started – %d feeds to process", len(config.RSS_FEEDS)
    )

    for feed_info in config.RSS_FEEDS:
        try:
            new = _crawl_feed(feed_info)
            all_articles.extend(new)
            logger.info(
                "  %-12s | %-10s | %d articles",
                feed_info["source"],
                feed_info["category"],
                len(new),
            )
        except Exception as exc:
            logger.error(
                "Unexpected error crawling %s/%s : %s",
                feed_info["source"],
                feed_info["category"],
                exc,
            )

        time.sleep(0.5)

    elapsed = time.time() - start
    logger.info(
        "Crawl cycle finished – %d new articles in %.1fs",
        len(all_articles),
        elapsed,
    )

    return all_articles
