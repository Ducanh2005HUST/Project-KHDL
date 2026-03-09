from __future__ import annotations

import logging
from typing import Optional

from openai import OpenAI

import config
from embedder import _get_collection

logger = logging.getLogger("retriever")

def _embed_query(text: str) -> list[float]:
    """Get embedding vector for a single query string."""
    client = OpenAI(api_key=config.OPENAI_API_KEY)
    response = client.embeddings.create(
        model=config.EMBEDDING_MODEL,
        input=[text],
    )
    return response.data[0].embedding

def _build_where_filter(
    sources: list[str] | None = None,
    categories: list[str] | None = None,
) -> Optional[dict]:

    conditions: list[dict] = []

    if sources:
        if len(sources) == 1:
            conditions.append({"source": {"$eq": sources[0]}})
        else:
            conditions.append({"source": {"$in": sources}})

    if categories:
        if len(categories) == 1:
            conditions.append({"category": {"$eq": categories[0]}})
        else:
            conditions.append({"category": {"$in": categories}})

    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}

def retrieve(
    query: str,
    top_k: int = config.SIMPLE_TOP_K,
    sources: list[str] | None = None,
    categories: list[str] | None = None,
    threshold: float = 0.0,
) -> list[dict]:
    collection = _get_collection()

    count = collection.count()
    if count == 0:
        logger.warning("ChromaDB collection is empty – nothing to retrieve")
        return []

    logger.info("ChromaDB has %d documents, querying top %d ...", count, top_k)

    query_embedding = _embed_query(query)
    where_filter = _build_where_filter(sources, categories)

    query_kwargs: dict = {
        "query_embeddings": [query_embedding],
        "n_results": min(top_k, count),
        "include": ["documents", "metadatas", "distances"],
    }
    if where_filter:
        query_kwargs["where"] = where_filter

    try:
        results = collection.query(**query_kwargs)
    except Exception as exc:
        logger.error("ChromaDB query failed: %s", exc)
        return []

    documents = results["documents"][0] if results["documents"] else []
    metadatas = results["metadatas"][0] if results["metadatas"] else []
    distances = results["distances"][0] if results["distances"] else []
    if distances:
        logger.info(
            "Raw distances (top %d): %s",
            len(distances),
            [round(d, 4) for d in distances[:5]],
        )

    chunks: list[dict] = []
    for doc, meta, dist in zip(documents, metadatas, distances):
        # ChromaDB cosine space: distance in [0, 2]
        #   0 = identical, 1 = orthogonal, 2 = opposite
        # Convert: similarity = 1 - (distance / 2)  => range [0, 1]
        similarity = 1.0 - (dist / 2.0)

        if similarity < threshold:
            continue

        chunks.append(
            {
                "document": doc,
                "metadata": meta,
                "distance": dist,
                "similarity": round(similarity, 4),
            }
        )

    logger.info(
        "Retrieved %d chunks (of %d) above threshold %.2f for query: %.60s...",
        len(chunks),
        len(documents),
        threshold,
        query,
    )

    return chunks
