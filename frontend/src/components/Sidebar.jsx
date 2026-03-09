import { useState, useEffect } from 'react';
import { fetchStats } from '../api/chatApi';

const ALL_SOURCES = ['VnExpress', 'Tuoi Tre', 'Thanh Nien'];
const ALL_CATEGORIES = ['Cong nghe', 'Kinh te', 'The thao', 'The gioi'];

/**
 * Sidebar – source / category filters + mini dashboard.
 */
export default function Sidebar({ filters, onFiltersChange, collapsed, onToggle }) {
    const [stats, setStats] = useState(null);
    const [statsError, setStatsError] = useState(false);

    // Fetch stats on mount and every 60 seconds
    useEffect(() => {
        let timer;
        async function load() {
            try {
                const data = await fetchStats();
                setStats(data);
                setStatsError(false);
            } catch {
                setStatsError(true);
            }
        }
        load();
        timer = setInterval(load, 60_000);
        return () => clearInterval(timer);
    }, []);

    function toggleSource(src) {
        const next = filters.sources.includes(src)
            ? filters.sources.filter((s) => s !== src)
            : [...filters.sources, src];
        onFiltersChange({ ...filters, sources: next });
    }

    function toggleCategory(cat) {
        const next = filters.categories.includes(cat)
            ? filters.categories.filter((c) => c !== cat)
            : [...filters.categories, cat];
        onFiltersChange({ ...filters, categories: next });
    }

    const lastUpdated = stats?.last_crawled_at
        ? new Date(stats.last_crawled_at).toLocaleString('vi-VN')
        : '--';

    return (
        <aside
            id="sidebar"
            className={`
        ${collapsed ? 'w-0 overflow-hidden' : 'w-72'}
        flex-shrink-0
        border-r border-[var(--border-color)]
        bg-[var(--bg-secondary)]
        transition-all duration-300 ease-in-out
        flex flex-col
        h-full
      `}
        >
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* ── Header ──────────────────────────────────────── */}
                <div>
                    <h1 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                        News Chatbot
                    </h1>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        RAG-powered Vietnamese news Q&A
                    </p>
                </div>

                {/* ── Dashboard mini ──────────────────────────────── */}
                <div id="stats-dashboard" className="rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] p-4 space-y-3 transition-theme">
                    <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Thong ke
                    </h2>
                    {statsError ? (
                        <p className="text-xs text-red-500">Khong the tai thong ke</p>
                    ) : (
                        <>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Bai bao</span>
                                <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                                    {stats?.total_articles ?? '--'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Chunks</span>
                                <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                                    {stats?.total_chunks ?? '--'}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-[var(--border-color)]">
                                <p className="text-[10px] text-[var(--text-muted)]">Cap nhat gan nhat</p>
                                <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">{lastUpdated}</p>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Source filters ───────────────────────────────── */}
                <div>
                    <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                        Nguon bao
                    </h2>
                    <div className="space-y-1.5">
                        {ALL_SOURCES.map((src) => {
                            const active = filters.sources.length === 0 || filters.sources.includes(src);
                            return (
                                <button
                                    key={src}
                                    id={`filter-source-${src.replace(/\s/g, '-')}`}
                                    onClick={() => toggleSource(src)}
                                    className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm font-medium
                    transition-all duration-150
                    ${active
                                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-transparent'
                                        }
                  `}
                                >
                                    {src}
                                    {stats?.sources_breakdown?.[src] != null && (
                                        <span className="float-right text-xs opacity-60 tabular-nums">
                                            {stats.sources_breakdown[src]}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Category filters ────────────────────────────── */}
                <div>
                    <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                        Chu de
                    </h2>
                    <div className="space-y-1.5">
                        {ALL_CATEGORIES.map((cat) => {
                            const active = filters.categories.length === 0 || filters.categories.includes(cat);
                            return (
                                <button
                                    key={cat}
                                    id={`filter-category-${cat.replace(/\s/g, '-')}`}
                                    onClick={() => toggleCategory(cat)}
                                    className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm font-medium
                    transition-all duration-150
                    ${active
                                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-transparent'
                                        }
                  `}
                                >
                                    {cat}
                                    {stats?.categories_breakdown?.[cat] != null && (
                                        <span className="float-right text-xs opacity-60 tabular-nums">
                                            {stats.categories_breakdown[cat]}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Footer ────────────────────────────────────────── */}
            <div className="p-4 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)]">
                Designed for KHDL Project
            </div>
        </aside>
    );
}
