from __future__ import annotations

import hashlib
import logging
import os
import time
from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings
from openai import OpenAI

import config
from models import Article

logger = logging.getLogger("embedder")

_chroma_client: Optional[chromadb.PersistentClient] = None
_collection: Optional[chromadb.Collection] = None


def _get_collection() -> chromadb.Collection:
    global _chroma_client, _collection
    if _collection is None:
        logger.info("Initializing ChromaDB at: %s", config.CHROMA_PATH)
        # Ensure directory exists before initializing ChromaDB
        os.makedirs(config.CHROMA_PATH, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=config.CHROMA_PATH)
        _collection = _chroma_client.get_or_create_collection(
            name="news_articles",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "ChromaDB collection ready – %d existing documents",
            _collection.count(),
        )
    return _collection

def _approximate_tokens(text: str) -> int:
    return int(len(text.split()) * 1.3)


def _chunk_text(text: str, chunk_size: int = None, overlap: int = None) -> list[str]:
    chunk_size = chunk_size or config.CHUNK_SIZE
    overlap = overlap or config.CHUNK_OVERLAP

    words = text.split()
    words_per_chunk = max(1, int(chunk_size / 1.3))
    words_overlap = max(0, int(overlap / 1.3))

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = start + words_per_chunk
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        if end >= len(words):
            break
        start = end - words_overlap

    return chunks

def _embed_texts(texts: list[str]) -> list[list[float]]:
    try:
        client = OpenAI(api_key=config.OPENAI_API_KEY)
    except Exception as e:
        logger.error("Failed to create OpenAI client: %s", e)
        raise

    all_embeddings: list[list[float]] = []
    batch_size = config.EMBEDDING_BATCH_SIZE

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        try:
            response = client.embeddings.create(
                model=config.EMBEDDING_MODEL,
                input=batch,
            )
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)
            logger.debug(
                "Embedded batch %d–%d (%d texts)",
                i,
                i + len(batch),
                len(batch),
            )
        except Exception as exc:
            logger.error("Embedding API error (batch %d): %s", i, exc)
            # insert zero-vectors as placeholder so indices stay aligned
            dim = 1536  # text-embedding-3-small dimension
            all_embeddings.extend([[0.0] * dim] * len(batch))

        if i + batch_size < len(texts):
            time.sleep(config.EMBEDDING_SLEEP_SECONDS)

    return all_embeddings

def embed_articles(articles: list[Article]) -> int:
    if not articles:
        return 0

    collection = _get_collection()
    start = time.time()
    total_chunks = 0

    all_chunks: list[str] = []
    all_ids: list[str] = []
    all_metadatas: list[dict] = []

    for article in articles:
        chunks = _chunk_text(article.content)
        for idx, chunk in enumerate(chunks):
            chunk_id = hashlib.md5(
                f"{article.url}::chunk::{idx}".encode()
            ).hexdigest()

            all_chunks.append(chunk)
            all_ids.append(chunk_id)
            all_metadatas.append(
                {
                    "title": article.title,
                    "url": article.url,
                    "source": article.source,
                    "category": article.category,
                    "published_at": (
                        article.published_at.isoformat()
                        if article.published_at
                        else ""
                    ),
                    "crawled_at": article.crawled_at.isoformat(),
                    "chunk_index": idx,
                }
            )
        total_chunks += len(chunks)

    if not all_chunks:
        return 0

    logger.info(
        "Embedding and storing %d chunks from %d articles in batches...",
        len(all_chunks),
        len(articles),
    )

    embeddings = _embed_texts(all_chunks)

    batch_size = 500
    for i in range(0, len(all_chunks), batch_size):
        chunk_batch = all_chunks[i : i + batch_size]
        id_batch = all_ids[i : i + batch_size]
        meta_batch = all_metadatas[i : i + batch_size]

        logger.info("Processing batch %d to %d (of %d)...", i, i + len(chunk_batch), len(all_chunks))
        
        batch_embeddings = _embed_texts(chunk_batch)
        
        collection.upsert(
            ids=id_batch,
            embeddings=batch_embeddings,
            documents=chunk_batch,
            metadatas=meta_batch,
        )

    elapsed = time.time() - start
    logger.info(
        "Successfully stored %d chunks in ChromaDB (%.1fs)",
        total_chunks,
        elapsed,
    )

    return total_chunks

def get_stats() -> dict:
    collection = _get_collection()
    count = collection.count()

    stats: dict = {
        "total_chunks": count,
        "sources_breakdown": {},
        "categories_breakdown": {},
        "last_crawled_at": None,
    }

    if count == 0:
        return stats

    sample_size = min(count, 1000)
    try:
        results = collection.peek(limit=sample_size)
        metadatas = results.get("metadatas", [])

        latest_crawl = None
        for meta in metadatas:
            src = meta.get("source", "Unknown")
            cat = meta.get("category", "Unknown")
            stats["sources_breakdown"][src] = (
                stats["sources_breakdown"].get(src, 0) + 1
            )
            stats["categories_breakdown"][cat] = (
                stats["categories_breakdown"].get(cat, 0) + 1
            )
            crawled = meta.get("crawled_at", "")
            if crawled and (latest_crawl is None or crawled > latest_crawl):
                latest_crawl = crawled

        stats["last_crawled_at"] = latest_crawl
    except Exception as exc:
        logger.warning("Failed to compute stats: %s", exc)

    return stats
