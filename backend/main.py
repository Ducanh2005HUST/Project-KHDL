from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from threading import Thread

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import config
from chatbot import chat
from crawler import run_crawl
from faiss_embedder import embed_articles, get_stats, init_index
from finance_analyzer import (
    is_finance_question,
    extract_financial_entities,
    sentiment_analysis_finance,
    trend_detection,
    generate_finance_summary
)
from models import (
    ChatRequest,
    ChatResponse,
    StatsResponse,
    FinanceAnalysisRequest,
    FinanceAnalysisResponse,
    FinanceTrendsResponse,
    SentimentRequest,
    SentimentResponse,
    FinanceEntity,
    TrendItem
)

logger = logging.getLogger("server")

_last_crawled_at: str | None = None
_total_articles: int = 0

scheduler = BackgroundScheduler()

def _crawl_and_embed() -> None:
    global _last_crawled_at, _total_articles

    try:
        articles = run_crawl()
        if articles:
            embed_articles(articles)
            _total_articles += len(articles)
        _last_crawled_at = datetime.utcnow().isoformat()
        logger.info(
            "Crawl+embed cycle complete – %d new articles, %d total",
            len(articles),
            _total_articles,
        )
    except Exception as exc:
        import traceback
        logger.error("Crawl+embed cycle failed: %s\\n%s", exc, traceback.format_exc())

@asynccontextmanager
async def lifespan(app: FastAPI):
    config.setup_logging()
    logger.info("Dang khoi dong Chatbot Tin tuc RAG ...")

    # Initialize FAISS index and load existing data
    from faiss_embedder import init_index
    init_index()

    initial_thread = Thread(target=_crawl_and_embed, daemon=True)
    initial_thread.start()

    scheduler.add_job(
        _crawl_and_embed,
        "interval",
        minutes=config.CRAWLER_INTERVAL_MINUTES,
        id="periodic_crawl",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Scheduler started – crawl every %d minutes",
        config.CRAWLER_INTERVAL_MINUTES,
    )

    yield  # app is running

    scheduler.shutdown(wait=False)
    logger.info("Server shut down.")

app = FastAPI(
    title="Chatbot Tin tức",
    description="Hỏi đáp tin tức tiếng Việt ứng dụng RAG",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        response = chat(request)
        return response
    except Exception as exc:
        logger.error("Chat endpoint error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Internal server error. Please try again later.",
        )


@app.get("/stats", response_model=StatsResponse)
async def stats_endpoint():
    try:
        db_stats = get_stats()
        return StatsResponse(
            total_articles=_total_articles,
            total_chunks=db_stats.get("total_chunks", 0),
            last_crawled_at=_last_crawled_at or db_stats.get("last_crawled_at"),
            sources_breakdown=db_stats.get("sources_breakdown", {}),
            categories_breakdown=db_stats.get("categories_breakdown", {}),
        )
    except Exception as exc:
        logger.error("Stats endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch stats")


@app.post("/finance/analysis", response_model=FinanceAnalysisResponse)
async def finance_analysis_endpoint(request: FinanceAnalysisRequest):
    try:
        question = request.question
        is_finance = is_finance_question(question)
        entities = extract_financial_entities(question) if is_finance else {"stocks": [], "companies": [], "metrics": []}
        sentiment = sentiment_analysis_finance(question) if is_finance else "trung tính"

        return FinanceAnalysisResponse(
            is_finance_related=is_finance,
            entities=FinanceEntity(**entities),
            sentiment=sentiment
        )
    except Exception as exc:
        logger.error("Finance analysis endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to analyze finance question")


@app.get("/finance/trends", response_model=FinanceTrendsResponse)
async def finance_trends_endpoint():
    try:
        # Get recent articles for trend detection
        from faiss_embedder import get_all_articles
        articles = get_all_articles()

        # Get trends for recent 7 days
        trends = trend_detection(articles, days=7)

        # Convert to response model
        trend_items = [TrendItem(keyword=k, count=v) for k, v in trends.items()]

        return FinanceTrendsResponse(
            trends=trend_items,
            total_articles=len(articles)
        )
    except Exception as exc:
        logger.error("Finance trends endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch finance trends")


@app.post("/finance/sentiment", response_model=SentimentResponse)
async def finance_sentiment_endpoint(request: SentimentRequest):
    try:
        sentiment = sentiment_analysis_finance(request.text)
        # Simple confidence based on keyword count
        confidence = min(1.0, len(request.text.split()) / 20.0)  # Normalize confidence

        return SentimentResponse(
            sentiment=sentiment,
            confidence=confidence
        )
    except Exception as exc:
        logger.error("Finance sentiment endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to analyze sentiment")
