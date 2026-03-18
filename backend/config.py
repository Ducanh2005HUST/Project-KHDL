"""
Configuration module - loads environment variables and app settings.
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
BASE_DIR = Path(__file__).resolve().parent
CHROMA_PATH = os.getenv("CHROMA_PATH", str(BASE_DIR / "chroma_data_new"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

CRAWLER_INTERVAL_MINUTES = int(os.getenv("CRAWLER_INTERVAL_MINUTES", "60"))

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_BATCH_SIZE = 20          # chunks per API call
EMBEDDING_SLEEP_SECONDS = 1.0      # pause between batches (rate-limit guard)

LLM_MODEL = "gpt-4o-mini"
COHERE_API_KEY = os.getenv("COHERE_API_KEY", "")

# Reranking
RERANK_TOP_N = 5  # number of chunks to keep after reranking
RERANK_MODEL = "rerank-multilingual-v3.0"


CHUNK_SIZE = 300         # approximate tokens per chunk
CHUNK_OVERLAP = 50       # overlap tokens between chunks

SIMPLE_TOP_K = 3
MULTI_TOP_K = 15
SIMILARITY_THRESHOLD = 0.7

RSS_FEEDS = [
    # VnExpress
    {"url": "https://vnexpress.net/rss/khoa-hoc.rss",   "source": "VnExpress",  "category": "Cong nghe"},
    {"url": "https://vnexpress.net/rss/kinh-doanh.rss",  "source": "VnExpress",  "category": "Kinh te"},
    {"url": "https://vnexpress.net/rss/the-thao.rss",    "source": "VnExpress",  "category": "The thao"},
    {"url": "https://vnexpress.net/rss/the-gioi.rss",    "source": "VnExpress",  "category": "The gioi"},
    # Tuoi Tre
    {"url": "https://tuoitre.vn/rss/nhip-song-so.rss",  "source": "Tuoi Tre",   "category": "Cong nghe"},
    {"url": "https://tuoitre.vn/rss/kinh-doanh.rss",    "source": "Tuoi Tre",   "category": "Kinh te"},
    {"url": "https://tuoitre.vn/rss/the-thao.rss",      "source": "Tuoi Tre",   "category": "The thao"},
    {"url": "https://tuoitre.vn/rss/the-gioi.rss",      "source": "Tuoi Tre",   "category": "The gioi"},
    # Thanh Nien
    {"url": "https://thanhnien.vn/rss/cong-nghe.rss",    "source": "Thanh Nien", "category": "Cong nghe"},
    {"url": "https://thanhnien.vn/rss/kinh-te.rss",      "source": "Thanh Nien", "category": "Kinh te"},
    {"url": "https://thanhnien.vn/rss/the-thao.rss",     "source": "Thanh Nien", "category": "The thao"},
    {"url": "https://thanhnien.vn/rss/the-gioi.rss",     "source": "Thanh Nien", "category": "The gioi"},
]

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = "%(asctime)s | %(name)-18s | %(levelname)-7s | %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging() -> None:
    """Configure root logger once at application startup."""
    logging.basicConfig(
        level=getattr(logging, LOG_LEVEL, logging.INFO),
        format=LOG_FORMAT,
        datefmt=LOG_DATE_FORMAT,
    )
