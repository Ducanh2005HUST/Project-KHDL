import os
import logging
from typing import List, Optional
from pydantic import BaseModel
from models import ChatRequest, ChatResponse, ChatFilters, SourceInfo, Message
from config import (
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    COHERE_API_KEY,
    SIMPLE_TOP_K,
    MULTI_TOP_K,
    EMBEDDING_MODEL,
)
from retriever import retrieve
import cohere
import openai
import anthropic

# Configure logging
logger = logging.getLogger(__name__)

# --- Intent Detection ---
MULTI_SOURCE_KEYWORDS = [
    'so sánh', 'khác biệt', 'tương quan', 'tổng hợp', 'đánh giá',
    'tình hình', 'tình trạng', 'xu hướng', 'phân tích', 'quan điểm',
    'nhiều nguồn', 'các nguồn', 'nhiều bài', 'tổng quan', 'tổng kết'
]

def _detect_intent(question: str) -> str:
    """
    Xác định intent của câu hỏi: 'simple' hoặc 'multi_source'
    """
    question_lower = question.lower().strip()
    for keyword in MULTI_SOURCE_KEYWORDS:
        if keyword in question_lower:
            return "multi_source"
    return "simple"

# --- Condense Question with LLM ---
CONDENSE_PROMPT = """Cho lịch sử trò chuyện và câu hỏi mới, hãy viết lại câu hỏi mới
thành một câu độc lập, đầy đủ ngữ cảnh, không cần lịch sử để hiểu.

Lịch sử:
{history}

Câu hỏi mới: {question}

Câu hỏi độc lập:"""

def _condense_question_with_llm(question: str, history: List[Message]) -> str:
    if not history:
        return question

    history_text = "\n".join([f"{msg.role}: {msg.text}" for msg in history[-3:]])
    prompt = CONDENSE_PROMPT.format(history=history_text, question=question)

    # Try OpenAI first
    if OPENAI_API_KEY:
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=128,
                temperature=0,
            )
            condensed = response.choices[0].message.content.strip()
            if condensed:
                logger.info("Condensed query: %s", condensed)
                return condensed
        except Exception as e:
            logger.warning("OpenAI condense failed: %s", e)

    # Fallback to Anthropic
    if ANTHROPIC_API_KEY:
        try:
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=128,
                messages=[{"role": "user", "content": prompt}],
            )
            condensed = response.content[0].text.strip()
            if condensed:
                logger.info("Condensed query (Anthropic): %s", condensed)
                return condensed
        except Exception as e:
            logger.warning("Anthropic condense failed: %s", e)

    # Fallback to raw concat
    logger.warning("LLM condense failed – falling back to raw concat")
    return f"{history_text}\n{question}"

# --- Reranking with Cohere ---
def _rerank_chunks(query: str, chunks: List[dict], top_n: int = 5) -> List[dict]:
    if not COHERE_API_KEY:
        logger.warning("COHERE_API_KEY not set – skipping rerank")
        return chunks[:top_n]

    if not chunks:
        return []

    try:
        co = cohere.Client(COHERE_API_KEY)
        docs = [c["document"] for c in chunks]
        results = co.rerank(
            query=query,
            documents=docs,
            model="rerank-multilingual-v3.0",
            top_n=top_n,
        )
        reranked = [chunks[r.index] for r in results.results]
        logger.info("Reranked %d chunks to %d", len(chunks), len(reranked))
        return reranked
    except Exception as e:
        logger.error("Cohere rerank failed: %s", e)
        return chunks[:top_n]

# --- Prompt Templates ---
_SIMPLE_PROMPT = """Dựa vào các đoạn văn bản sau đây, trả lời câu hỏi của người dùng.

Các đoạn văn bản:
{chunks}

Câu hỏi: {question}

Trả lời (dùng tiếng Việt, rõ ràng, chính xác, trích dẫn nguồn nếu có):"""

_MULTI_SOURCE_PROMPT = """Dựa vào các đoạn văn bản sau đây, hãy tổng hợp và phân tích câu hỏi của người dùng.

Các đoạn văn bản:
{chunks}

Câu hỏi: {question}

Trả lời (dùng tiếng Việt, rõ ràng, chính xác, trích dẫn nguồn nếu có, phân tích nhiều khía cạnh):"""

def _build_context(chunks: List[dict], intent: str) -> str:
    context_parts = []
    for chunk in chunks:
        text = chunk["document"]
        metadata = chunk["metadata"]
        source = metadata.get("source", "")
        title = metadata.get("title", "")
        url = metadata.get("url", "")
        context_parts.append(f"---\nNguồn: {source} | Tiêu đề: {title} | URL: {url}\n{text}\n---")
    return "\n\n".join(context_parts)

def _call_llm(prompt: str) -> str:
    # Use OpenAI as default LLM for generation
    if OPENAI_API_KEY:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    else:
        return "Xin lỗi, hệ thống hiện không có mô hình ngôn ngữ để trả lời câu hỏi này."

# --- Main Chat Endpoint ---
def chat(request: ChatRequest) -> ChatResponse:
    question = request.question.strip()
    intent = _detect_intent(question)

    # Condense question with history
    condensed_question = _condense_question_with_llm(question, request.history)

    # Decide retrieval params
    top_k = MULTI_TOP_K if intent == "multi_source" else SIMPLE_TOP_K
    threshold = 0.25 if intent == "multi_source" else 0.35
    sources = request.filters.sources or None
    categories = request.filters.categories or None

    logger.info(
        "Chat | intent=%s | top_k=%d | threshold=%.2f | q=%.80s",
        intent,
        top_k,
        threshold,
        condensed_question,
    )

    # Retrieve
    chunks = retrieve(
        query=condensed_question,
        top_k=top_k,
        sources=sources,
        categories=categories,
        threshold=threshold,
    )

    if not chunks:
        return ChatResponse(
            answer="Tôi không tìm thấy thông tin về vấn đề này trong dữ liệu hiện tại.",
            sources=[],
            intent=intent,
        )

    # Rerank
    chunks = _rerank_chunks(condensed_question, chunks, top_n=top_k)

    # Build prompt
    context = _build_context(chunks, intent)
    template = _MULTI_SOURCE_PROMPT if intent == "multi_source" else _SIMPLE_PROMPT
    prompt = template.format(chunks=context, question=question)

    # Call LLM
    answer = _call_llm(prompt)

    # Build source list (deduplicated)
    seen_urls = set()
    source_list = []
    for chunk in chunks:
        url = chunk["metadata"].get("url", "")
        if url in seen_urls:
            continue
        seen_urls.add(url)
        source_list.append(SourceInfo(
            title=chunk["metadata"].get("title", ""),
            url=url,
            source=chunk["metadata"].get("source", ""),
            category=chunk["metadata"].get("category", ""),
            published_at=chunk["metadata"].get("published_at", None),
            similarity=chunk.get("similarity"),
        ))

    return ChatResponse(answer=answer, sources=source_list, intent=intent)
