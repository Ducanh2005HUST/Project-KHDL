from __future__ import annotations

import logging
import re
from typing import Optional

from openai import OpenAI
import anthropic

import config
from models import ChatRequest, ChatResponse, SourceInfo
from retriever import retrieve

logger = logging.getLogger("chatbot")

MULTI_SOURCE_KEYWORDS = [
    "tong hop", "tổng hợp",
    "tom tat", "tóm tắt",
    "so sanh", "so sánh",
    "nhieu bao", "nhiều báo",
    "tuan qua", "tuần qua",
    "thang qua", "tháng qua",
    "tong quan", "tổng quan",
    "diem tin", "điểm tin",
    "cac bao", "các báo",
    "cac nguon", "các nguồn",
    "phan tich", "phân tích",
]


def _detect_intent(question: str) -> str:
    """Return 'multi_source' if question asks for synthesis, else 'simple'."""
    q_lower = question.lower()
    for kw in MULTI_SOURCE_KEYWORDS:
        if kw in q_lower:
            return "multi_source"
    return "simple"


_SIMPLE_PROMPT = """Ban la tro ly doc bao thong minh. Dua tren cac doan tin tuc sau day tu bao Viet Nam, hay tra loi cau hoi cua nguoi dung bang tieng Viet mot cach chinh xac va suc tich.

Context:
{chunks}

Cau hoi: {question}

Yeu cau:
- Tra loi dua tren context duoc cung cap
- Neu khong co du thong tin, noi ro "Toi khong tim thay thong tin ve van de nay trong du lieu hien tai"
- Cuoi cau tra loi liet ke nguon tham khao kem link"""

_MULTI_SOURCE_PROMPT = """Ban la tro ly doc bao thong minh chuyen tong hop tin tuc. Dua tren cac doan tin tuc sau day tu nhieu bao Viet Nam, hay tong hop va tra loi cau hoi cua nguoi dung.

Context (nhom theo nguon):
{chunks}

Cau hoi: {question}

Yeu cau:
- Tong hop thong tin tu tat ca cac nguon
- Trinh bay theo cau truc: Tong quan -> Chi tiet theo tung goc do/nguon -> Ket luan
- Ghi ro "Theo VnExpress...", "Theo Tuoi Tre...", "Theo Thanh Nien..." khi trich dan
- Neu thong tin mau thuan giua cac nguon, ghi nhan ca hai goc nhin
- Cuoi cau tra loi liet ke tat ca nguon tham khao kem link"""


def _build_context(chunks: list[dict], intent: str) -> str:
    if intent == "multi_source":
        # group chunks by source
        grouped: dict[str, list[str]] = {}
        for chunk in chunks:
            src = chunk["metadata"].get("source", "Unknown")
            title = chunk["metadata"].get("title", "")
            text = f"[{title}] {chunk['document']}"
            grouped.setdefault(src, []).append(text)

        parts = []
        for source, texts in grouped.items():
            parts.append(f"\n--- {source} ---")
            for t in texts:
                parts.append(t)
        return "\n".join(parts)
    else:
        lines = []
        for chunk in chunks:
            title = chunk["metadata"].get("title", "")
            src = chunk["metadata"].get("source", "")
            lines.append(f"[{src} - {title}] {chunk['document']}")
        return "\n\n".join(lines)


def _call_openai(prompt: str) -> Optional[str]:
    """Call GPT-4o-mini. Returns None on failure."""
    if not config.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set – skipping OpenAI call")
        return None

    try:
        client = OpenAI(api_key=config.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=config.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=config.LLM_MAX_TOKENS,
            temperature=config.LLM_TEMPERATURE,
        )
        return response.choices[0].message.content
    except Exception as exc:
        error_msg = str(exc).lower()
        if "quota" in error_msg or "rate" in error_msg or "billing" in error_msg:
            logger.error("OpenAI quota/billing error: %s", exc)
        else:
            logger.error("OpenAI API error: %s", exc)
        return None


def _call_anthropic(prompt: str) -> Optional[str]:
    if not config.ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set – skipping fallback")
        return None

    try:
        client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=config.LLM_FALLBACK_MODEL,
            max_tokens=config.LLM_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
    except Exception as exc:
        logger.error("Anthropic API error: %s", exc)
        return None


def _call_llm(prompt: str) -> str:
    answer = _call_openai(prompt)
    if answer:
        return answer

    logger.info("Primary LLM failed – trying Anthropic fallback...")
    answer = _call_anthropic(prompt)
    if answer:
        return answer

    return (
        "Xin loi, hien tai toi khong the xu ly yeu cau cua ban. "
        "Vui long thu lai sau hoac kiem tra cau hinh API key."
    )


def chat(request: ChatRequest) -> ChatResponse:
    """
    Full RAG pipeline:
      1. Detect intent
      2. Retrieve relevant chunks
      3. Build prompt
      4. Call LLM
      5. Return structured response
    """
    question = request.question.strip()
    intent = _detect_intent(question)

    # decide retrieval parameters
    if intent == "multi_source":
        top_k = config.MULTI_TOP_K
        # lower threshold for broader coverage
        threshold = 0.25
    else:
        top_k = config.SIMPLE_TOP_K
        threshold = 0.35

    # apply user filters
    sources = request.filters.sources or None
    categories = request.filters.categories or None

    logger.info(
        "Chat | intent=%s | top_k=%d | threshold=%.2f | q=%.80s",
        intent,
        top_k,
        threshold,
        question,
    )

    # retrieve
    chunks = retrieve(
        query=question,
        top_k=top_k,
        sources=sources,
        categories=categories,
        threshold=threshold,
    )

    if not chunks:
        return ChatResponse(
            answer="Toi khong tim thay thong tin ve van de nay trong du lieu hien tai. Hay thu lai voi cau hoi khac hoac doi du lieu duoc cap nhat.",
            sources=[],
            intent=intent,
        )

    # build prompt
    context = _build_context(chunks, intent)
    template = _MULTI_SOURCE_PROMPT if intent == "multi_source" else _SIMPLE_PROMPT
    prompt = template.format(chunks=context, question=question)

    # call LLM
    answer = _call_llm(prompt)

    # build source list (deduplicated by URL)
    seen_urls: set[str] = set()
    source_list: list[SourceInfo] = []
    for chunk in chunks:
        url = chunk["metadata"].get("url", "")
        if url in seen_urls:
            continue
        seen_urls.add(url)
        source_list.append(
            SourceInfo(
                title=chunk["metadata"].get("title", ""),
                url=url,
                source=chunk["metadata"].get("source", ""),
                category=chunk["metadata"].get("category", ""),
                published_at=chunk["metadata"].get("published_at", None),
                similarity=chunk.get("similarity"),
            )
        )

    return ChatResponse(
        answer=answer,
        sources=source_list,
        intent=intent,
    )
