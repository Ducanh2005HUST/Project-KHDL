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
from embedder import embed_articles, get_stats
from models import ChatRequest, ChatResponse, StatsResponse

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
        logger.error("Crawl+embed cycle failed: %s", exc)

@asynccontextmanager
async def lifespan(app: FastAPI):
    config.setup_logging()
    logger.info("Dang khoi dong Chatbot Tin tuc RAG ...")

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
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://news-chatbot.vercel.app",  # production domain
    "https://*.vercel.app",             # cover tất cả preview deployments
    ],
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


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
