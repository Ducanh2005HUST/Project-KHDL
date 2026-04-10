from __future__ import annotations

import re
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from collections import defaultdict

import nltk
from nltk.tokenize import word_tokenize
from dateutil import parser

from models import Article

logger = logging.getLogger("finance_analyzer")

# Vietnamese stopwords (NLTK doesn't support Vietnamese stopwords)
stop_words = {'và', 'hoặc', 'trong', 'trên', 'đó', 'này', 'là', 'ở', 'một', 'các', 'như', 'theo', 'đang', 'cũng', 'đã', 'sẽ', 'được'}

# Download required NLTK data if not present
def _ensure_nltk_data():
    """Lazy load NLTK punkt tokenizer."""
    try:
        nltk.data.find('tokenizers/punkt')
        return True
    except LookupError:
        try:
            nltk.download('punkt', quiet=True)
            return True
        except Exception as e:
            logger.warning("Failed to download NLTK punkt: %s", e)
            return False

# Common Vietnamese finance keywords
FINANCE_KEYWORDS = {
    "tài chính", "kinh tế", "ngân hàng", "chứng khoán", "cổ phiếu", "đầu tư",
    "lãi suất", "tỷ giá", "giá dầu", "vàng", "ngân hàng trung ương", "NHTW",
    "công ty", "doanh nghiệp", "tăng trưởng", "lợi nhuận", "doanh thu", "giá cổ phiếu",
    "đánh giá", "phân tích", "dự báo", "tín hiệu", "thị trường", "đầu tư", "mua vào", "bán ra",
    "điểm tin", "tổng hợp", "so sánh", "xu hướng", "biến động", "tăng/giảm", "cao nhất", "thấp nhất",
    "cổ tức", "đại hội", "báo cáo", "tài chính", "bảng cân đối", "lãi ròng", "EPS", "P/E", "ROE"
}

# Stock symbol patterns (e.g., VCB, VIC, VNM)
STOCK_SYMBOL_PATTERN = r'\b[A-Z]{3,5}\b'

# Company name patterns (common Vietnamese company names)
COMPANY_NAMES = {
    "VIB", "MB", "TPB", "VCB", "ACB", "BIDV", "Vietcombank", "Vietinbank", "Techcombank",
    "Vingroup", "VNM", "VIC", "VRE", "VHM", "FPT", "VJC", "HDB", "MSN", "MWG", "SAB", "HPG",
    "BVH", "VND", "VNM", "CTG", "BCM", "VCS", "VCG", "VCI"
}


def extract_stock_symbols(text: str) -> List[str]:
    """Extract potential stock symbols from text using regex."""
    if not text:
        return []
    matches = re.findall(STOCK_SYMBOL_PATTERN, text)
    # Filter to only known company symbols
    return [m for m in matches if m in COMPANY_NAMES]


def extract_financial_entities(text: str) -> Dict[str, List[str]]:
    """Extract financial entities: stocks, companies, metrics.
    Ensures NLTK tokenizer is available before tokenizing.
    """
    # Ensure NLTK data is present; log if download fails
    if not _ensure_nltk_data():
        logger.warning("Proceeding without NLTK punkt tokenizer; tokenization may be limited.")
    tokens = word_tokenize(text.lower()) if text else []
    entities = {
        "stocks": [],
        "companies": [],
        "metrics": []
    }

    # Extract stock symbols
    stocks = extract_stock_symbols(text)
    entities["stocks"] = list(set(stocks))

    # Extract company names (exact match)
    for company in COMPANY_NAMES:
        if company.lower() in text.lower():
            entities["companies"].append(company)
    entities["companies"] = list(set(entities["companies"]))

    # Extract financial metrics
    for metric in ["lãi suất", "tỷ giá", "doanh thu", "lợi nhuận", "EPS", "P/E", "ROE", "cổ tức", "tăng trưởng"]:
        if metric in text.lower():
            entities["metrics"].append(metric)
    entities["metrics"] = list(set(entities["metrics"]))

    return entities


def is_finance_question(question: str) -> bool:
    """Detect if question is finance-related."""
    q_lower = question.lower()
    for keyword in FINANCE_KEYWORDS:
        if keyword in q_lower:
            return True
    return False


def sentiment_analysis_finance(text: str) -> str:
    """Simple sentiment analysis for finance text: positive, negative, neutral."""
    # Simple keyword-based sentiment
    positive_words = ["tăng", "tăng trưởng", "lợi nhuận", "tốt", "tích cực", "đạt", "vượt", "cao", "lên", "đạt mục tiêu"]
    negative_words = ["giảm", "thua lỗ", "kém", "xuống", "rơi", "không đạt", "đau", "thất bại", "sụt giảm"]

    count_pos = sum(1 for word in positive_words if word in text.lower())
    count_neg = sum(1 for word in negative_words if word in text.lower())

    if count_pos > count_neg:
        return "tích cực"
    elif count_neg > count_pos:
        return "tiêu cực"
    else:
        return "trung tính"


def trend_detection(articles: List[Article], days: int = 7) -> Dict:
    """Detect trending topics in recent articles."""
    # Filter articles by date
    cutoff = datetime.utcnow() - timedelta(days=days)
    recent_articles = [
        a for a in articles
        if a.published_at and a.published_at > cutoff
    ]

    if not recent_articles:
        return {"trends": [], "total": 0}

    # Count keyword frequency
    keyword_freq = defaultdict(int)
    for article in recent_articles:
        text = f"{article.title} {article.content}"
        for keyword in FINANCE_KEYWORDS:
            if keyword in text.lower():
                keyword_freq[keyword] += 1

    # Get top 5 trends
    trends = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "trends": [{"keyword": k, "count": v} for k, v in trends],
        "total_articles": len(recent_articles)
    }


def generate_finance_summary(articles: List[Article]) -> str:
    """Generate a concise finance summary from a list of articles."""
    if not articles:
        return "Không có tin tài chính mới trong thời gian qua."

    # Extract entities
    stocks = set()
    companies = set()
    sentiment_counts = {"tích cực": 0, "tiêu cực": 0, "trung tính": 0}

    for article in articles:
        # Extract stocks
        stocks.update(extract_stock_symbols(article.title + " " + article.content))
        # Extract companies
        entities = extract_financial_entities(article.title + " " + article.content)
        companies.update(entities["companies"])
        # Sentiment
        sentiment = sentiment_analysis_finance(article.title + " " + article.content)
        sentiment_counts[sentiment] += 1

    # Build summary
    summary = ""

    if stocks:
        summary += f"Các mã cổ phiếu nổi bật: {', '.join(sorted(stocks))}. "
    if companies:
        summary += f"Các công ty được nhắc đến: {', '.join(sorted(companies))}. "

    # Most common sentiment
    dominant_sentiment = max(sentiment_counts, key=sentiment_counts.get)
    summary += f"Tổng thể, cảm xúc thị trường: {dominant_sentiment} ({sentiment_counts[dominant_sentiment]} bài). "

    summary += f"Tổng cộng {len(articles)} bài viết mới được cập nhật."

    return summary