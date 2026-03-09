import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

/**
 * App – root layout with dark/light toggle, sidebar, and chat window.
 */
export default function App() {
    const [dark, setDark] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            if (saved) return saved === 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    const [filters, setFilters] = useState({ sources: [], categories: [] });
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Apply dark class to <html>
    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }, [dark]);

    return (
        <div
            className="h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)] transition-theme overflow-hidden"
            id="app-root"
        >
            {/* ── Sidebar ───────────────────────────────────────── */}
            <Sidebar
                filters={filters}
                onFiltersChange={setFilters}
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed((p) => !p)}
            />

            {/* ── Main area ─────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header
                    className="h-14 flex items-center justify-between px-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] transition-theme flex-shrink-0"
                    id="top-bar"
                >
                    <div className="flex items-center gap-3">
                        {/* Sidebar toggle */}
                        <button
                            id="sidebar-toggle-btn"
                            onClick={() => setSidebarCollapsed((p) => !p)}
                            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
                            aria-label="Toggle sidebar"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </button>

                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                            News RAG Chatbot
                        </h2>
                    </div>

                    {/* Dark mode toggle */}
                    <button
                        id="theme-toggle-btn"
                        onClick={() => setDark((d) => !d)}
                        className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
                        aria-label="Toggle theme"
                    >
                        {dark ? (
                            /* Sun icon */
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            /* Moon icon */
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                </header>

                {/* Chat content */}
                <div className="flex-1 min-h-0">
                    <ChatWindow filters={filters} />
                </div>
            </main>
        </div>
    );
}
