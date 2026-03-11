import { useState, useEffect } from 'react';
import { fetchStats } from '../api/chatApi';

const ALL_SOURCES = ['VnExpress', 'Tuoi Tre', 'Thanh Nien'];
const ALL_CATEGORIES = ['Cong nghe', 'Kinh te', 'The thao', 'The gioi'];

const SOURCE_LABELS = {
    'VnExpress': 'VnExpress',
    'Tuoi Tre': 'Tuổi Trẻ',
    'Thanh Nien': 'Thanh Niên',
};

const CATEGORY_LABELS = {
    'Cong nghe': 'Công nghệ',
    'Kinh te': 'Kinh tế',
    'The thao': 'Thể thao',
    'The gioi': 'Thế giới',
};

/**
 * Sidebar – source / category filters + mini dashboard.
 */
export default function Sidebar({
    filters,
    onFiltersChange,
    collapsed,
    onToggle,
    chats = [],
    activeChatId = null,
    onNewChat,
    onSelectChat,
    onRenameChat,
    onDeleteChat,
    onExportChat,
}) {
    const [stats, setStats] = useState(null);
    const [statsError, setStatsError] = useState(false);
    const [chatQuery, setChatQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [draftTitle, setDraftTitle] = useState('');

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
        // UX rule: empty list means "All".
        const current = filters.sources.length === 0 ? ALL_SOURCES : filters.sources;
        const nextSelected = current.includes(src)
            ? current.filter((s) => s !== src)
            : [...current, src];
        const next = nextSelected.length === ALL_SOURCES.length ? [] : nextSelected;
        onFiltersChange({ ...filters, sources: next });
    }

    function toggleCategory(cat) {
        const current = filters.categories.length === 0 ? ALL_CATEGORIES : filters.categories;
        const nextSelected = current.includes(cat)
            ? current.filter((c) => c !== cat)
            : [...current, cat];
        const next = nextSelected.length === ALL_CATEGORIES.length ? [] : nextSelected;
        onFiltersChange({ ...filters, categories: next });
    }

    function resetFilters() {
        onFiltersChange({ sources: [], categories: [] });
    }

    const lastUpdated = stats?.last_crawled_at
        ? new Date(stats.last_crawled_at).toLocaleString('vi-VN')
        : '--';

    const effectiveSources = filters.sources.length === 0 ? ALL_SOURCES : filters.sources;
    const effectiveCategories = filters.categories.length === 0 ? ALL_CATEGORIES : filters.categories;
    const isAllSources = filters.sources.length === 0;
    const isAllCategories = filters.categories.length === 0;
    const isAll = isAllSources && isAllCategories;

    const filteredChats = chats.filter((c) => {
        if (!chatQuery.trim()) return true;
        const t = (c?.title ?? '').toString().toLowerCase();
        return t.includes(chatQuery.trim().toLowerCase());
    });

    return (
        <aside
            id="sidebar"
            className={`
        ${collapsed ? 'w-0 overflow-hidden' : 'w-72'}
        flex-shrink-0
        border-r border-[var(--border-color)]
        bg-[var(--bg-elevated)]
        backdrop-blur-md
        transition-all duration-300 ease-in-out
        flex flex-col
        h-full
      `}
        >
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* ── Header ──────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/15 flex items-center justify-center shadow-[var(--shadow-sm)]">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H6a2 2 0 0 1-2-2V7z" />
                                <path d="M8 9h8" />
                                <path d="M8 13h6" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">
                                Chatbot Tin tức
                            </h1>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                Hỏi đáp tin tức tiếng Việt (RAG)
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                    <span className={`w-1.5 h-1.5 rounded-full ${statsError ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                    {statsError ? 'Backend chưa sẵn sàng' : 'Sẵn sàng'}
                                </span>
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    disabled={isAll}
                                    className={`
                    text-[10px] font-semibold px-2 py-0.5 rounded-full
                    border border-[var(--border-color)]
                    ${isAll
                                                    ? 'opacity-40 cursor-not-allowed text-[var(--text-muted)]'
                                                    : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--ring)]'
                                                }
                  `}
                                >
                                    Xóa lọc
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onToggle}
                        className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors focus:ring-2 focus:ring-[var(--ring)]"
                        aria-label="Toggle sidebar"
                        title="Thu gọn sidebar"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                </div>

                {/* ── Chats (ChatGPT-like) ───────────────────────── */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            Đoạn chat
                        </h2>
                        <button
                            type="button"
                            onClick={() => onNewChat && onNewChat()}
                            className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-[var(--shadow-sm)] focus:ring-2 focus:ring-[var(--ring)]"
                            title="Tạo đoạn chat mới"
                        >
                            Mới
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            value={chatQuery}
                            onChange={(e) => setChatQuery(e.target.value)}
                            placeholder="Tìm kiếm đoạn chat..."
                            className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] shadow-[var(--shadow-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                        {chatQuery.trim() && (
                            <button
                                type="button"
                                onClick={() => setChatQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2 py-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                                aria-label="Xóa tìm kiếm"
                                title="Xóa"
                            >
                                x
                            </button>
                        )}
                    </div>

                    <div className="mt-3 space-y-1.5">
                        {filteredChats.length === 0 ? (
                            <p className="text-xs text-[var(--text-muted)]">
                                Không có đoạn chat phù hợp.
                            </p>
                        ) : (
                            filteredChats.map((chat) => {
                                const active = chat.id === activeChatId;
                                const when = chat.updatedAt
                                    ? new Date(chat.updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
                                    : '';
                                const isEditing = editingId === chat.id;

                                return (
                                    <div
                                        key={chat.id}
                                        className={`
                      group rounded-2xl border
                      ${active ? 'border-[var(--accent)]/25 bg-[var(--accent-soft)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'}
                      transition-colors shadow-[var(--shadow-sm)]
                    `}
                                    >
                                        <div className="flex items-center gap-2 px-3 py-2.5">
                                            <button
                                                type="button"
                                                onClick={() => onSelectChat && onSelectChat(chat.id)}
                                                className="flex-1 min-w-0 text-left"
                                                title={chat.title}
                                            >
                                                {isEditing ? (
                                                    <input
                                                        autoFocus
                                                        value={draftTitle}
                                                        onChange={(e) => setDraftTitle(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                onRenameChat && onRenameChat(chat.id, draftTitle);
                                                                setEditingId(null);
                                                            }
                                                            if (e.key === 'Escape') {
                                                                e.preventDefault();
                                                                setEditingId(null);
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            onRenameChat && onRenameChat(chat.id, draftTitle);
                                                            setEditingId(null);
                                                        }}
                                                        className="w-full px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                                                        maxLength={80}
                                                    />
                                                ) : (
                                                    <>
                                                        <p className={`text-sm font-semibold truncate ${active ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                                                            {chat.title || 'Đoạn chat'}
                                                        </p>
                                                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                                                            {when}
                                                        </p>
                                                    </>
                                                )}
                                            </button>

                                            {!isEditing && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingId(chat.id);
                                                            setDraftTitle(chat.title || '');
                                                        }}
                                                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:ring-2 focus:ring-[var(--ring)]"
                                                        title="Đổi tên"
                                                        aria-label="Đổi tên đoạn chat"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <path d="M12 20h9" />
                                                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onExportChat && onExportChat(chat.id)}
                                                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:ring-2 focus:ring-[var(--ring)]"
                                                        title="Tải JSON"
                                                        aria-label="Tải đoạn chat"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                            <path d="M7 10l5 5 5-5" />
                                                            <path d="M12 15V3" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onDeleteChat && onDeleteChat(chat.id)}
                                                        className="p-2 rounded-xl text-red-500/80 hover:text-red-600 hover:bg-red-500/10 transition-colors focus:ring-2 focus:ring-[var(--ring)]"
                                                        title="Xóa"
                                                        aria-label="Xóa đoạn chat"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <path d="M3 6h18" />
                                                            <path d="M8 6V4h8v2" />
                                                            <path d="M19 6l-1 14H6L5 6" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── Dashboard mini ──────────────────────────────── */}
                <div id="stats-dashboard" className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 space-y-3 shadow-[var(--shadow-sm)] transition-theme">
                    <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-between">
                        Thống kê
                        <span className="text-[10px] font-medium text-[var(--text-muted)]">
                            {lastUpdated}
                        </span>
                    </h2>
                    {statsError ? (
                        <p className="text-xs text-red-500">Không thể tải thống kê</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3">
                                    <p className="text-[10px] text-[var(--text-muted)]">Bài báo</p>
                                    <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                                        {stats?.total_articles ?? '--'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3">
                                    <p className="text-[10px] text-[var(--text-muted)]">Chunks</p>
                                    <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                                        {stats?.total_chunks ?? '--'}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Source filters ───────────────────────────────── */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            Nguồn báo
                        </h2>
                        <span className="text-[10px] text-[var(--text-muted)]">
                            {isAllSources ? 'Tất cả' : `${effectiveSources.length}/${ALL_SOURCES.length}`}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {ALL_SOURCES.map((src) => {
                            const active = effectiveSources.includes(src);
                            return (
                                <button
                                    key={src}
                                    id={`filter-source-${src.replace(/\s/g, '-')}`}
                                    onClick={() => toggleSource(src)}
                                    className={`
                    w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold
                    transition-all duration-150 shadow-none
                    ${active
                                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-transparent'
                                        }
                    focus:ring-2 focus:ring-[var(--ring)]
                  `}
                                >
                                    {SOURCE_LABELS[src] ?? src}
                                    {stats?.sources_breakdown?.[src] != null && (
                                        <span className="float-right text-xs opacity-60 tabular-nums">
                                            {stats.sources_breakdown[src]}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2">
                        {isAllSources ? 'Chế độ: Tất cả nguồn' : 'Mẹo: chọn đủ 3/3 sẽ tự quay về Tất cả'}
                    </p>
                </div>

                {/* ── Category filters ────────────────────────────── */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            Chủ đề
                        </h2>
                        <span className="text-[10px] text-[var(--text-muted)]">
                            {isAllCategories ? 'Tất cả' : `${effectiveCategories.length}/${ALL_CATEGORIES.length}`}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {ALL_CATEGORIES.map((cat) => {
                            const active = effectiveCategories.includes(cat);
                            return (
                                <button
                                    key={cat}
                                    id={`filter-category-${cat.replace(/\s/g, '-')}`}
                                    onClick={() => toggleCategory(cat)}
                                    className={`
                    w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold
                    transition-all duration-150
                    ${active
                                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-transparent'
                                        }
                    focus:ring-2 focus:ring-[var(--ring)]
                  `}
                                >
                                    {CATEGORY_LABELS[cat] ?? cat}
                                    {stats?.categories_breakdown?.[cat] != null && (
                                        <span className="float-right text-xs opacity-60 tabular-nums">
                                            {stats.categories_breakdown[cat]}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2">
                        {isAllCategories ? 'Chế độ: Tất cả chủ đề' : 'Mẹo: chọn đủ 4/4 sẽ tự quay về Tất cả'}
                    </p>
                </div>
            </div>

            {/* ── Footer ────────────────────────────────────────── */}
            <div className="p-4 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)] flex items-center justify-between bg-[var(--bg-elevated)] backdrop-blur-md">
                <span>Thiết kế cho đồ án KHDL</span>
                <span className="tabular-nums">v1.0</span>
            </div>
        </aside>
    );
}
