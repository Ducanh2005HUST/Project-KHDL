const API_BASE = 'http://localhost:8000';

/**
 * Send a chat question to the backend RAG pipeline.
 * @param {string} question
 * @param {{ sources?: string[], categories?: string[] }} filters
 * @returns {Promise<{ answer: string, sources: Array, intent: string }>}
 */
export async function sendChatMessage(question, filters = {}) {
    const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question,
            filters: {
                sources: filters.sources || [],
                categories: filters.categories || [],
            },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.detail || `Server error (${response.status})`
        );
    }

    return response.json();
}

/**
 * Fetch crawl / vector store statistics.
 * @returns {Promise<{ total_articles: number, total_chunks: number, last_crawled_at: string|null, sources_breakdown: object, categories_breakdown: object }>}
 */
export async function fetchStats() {
    const response = await fetch(`${API_BASE}/stats`);

    if (!response.ok) {
        throw new Error(`Failed to fetch stats (${response.status})`);
    }

    return response.json();
}
