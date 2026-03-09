import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { sendChatMessage } from '../api/chatApi';

/**
 * ChatWindow – main chat area with message list, input box,
 * loading spinner, and error display.
 */
export default function ChatWindow({ filters }) {
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'bot',
            text: 'Xin chao! Toi la tro ly doc bao thong minh. Ban co the hoi toi ve tin tuc tu VnExpress, Tuoi Tre, va Thanh Nien.\n\nVi du: "Tin tuc cong nghe moi nhat?" hoac "Tong hop tinh hinh kinh te tuan qua?"',
            sources: [],
            intent: 'simple',
            timestamp: _now(),
        },
    ]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    async function handleSend() {
        const question = input.trim();
        if (!question || isLoading) return;

        // Add user message
        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: question,
            timestamp: _now(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setError(null);
        setIsLoading(true);

        try {
            const data = await sendChatMessage(question, {
                sources: filters.sources,
                categories: filters.categories,
            });

            const botMsg = {
                id: `bot-${Date.now()}`,
                role: 'bot',
                text: data.answer,
                sources: data.sources || [],
                intent: data.intent || 'simple',
                timestamp: _now(),
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch (err) {
            setError(
                err.message || 'Khong the ket noi den may chu. Vui long thu lai.'
            );
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* ── Message list ──────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" id="chat-messages">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start animate-fadeInUp" id="loading-indicator">
                        <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl rounded-bl-md px-5 py-3.5 flex items-center gap-2">
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="text-xs text-[var(--text-muted)] ml-2">Dang xu ly...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ── Error banner ──────────────────────────────────── */}
            {error && (
                <div
                    className="mx-4 mb-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center justify-between"
                    id="error-banner"
                >
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-3 text-red-400 hover:text-red-600 dark:hover:text-red-200 font-bold text-lg leading-none"
                        id="error-dismiss-btn"
                    >
                        x
                    </button>
                </div>
            )}

            {/* ── Input bar ─────────────────────────────────────── */}
            <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 transition-theme">
                <div className="flex items-end gap-3 max-w-4xl mx-auto">
                    <textarea
                        ref={inputRef}
                        id="chat-input"
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhap cau hoi ve tin tuc..."
                        disabled={isLoading}
                        className="
              flex-1 resize-none px-4 py-2.5 rounded-xl
              bg-[var(--bg-tertiary)] text-[var(--text-primary)]
              border border-[var(--border-color)]
              placeholder:text-[var(--text-muted)]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]
              disabled:opacity-50
              transition-theme text-sm leading-relaxed
              max-h-32
            "
                        onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                        }}
                    />
                    <button
                        id="send-btn"
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="
              px-4 py-2.5 rounded-xl font-medium text-sm
              bg-[var(--accent)] text-white
              hover:bg-[var(--accent-hover)]
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200
              active:scale-95
              min-w-[72px]
            "
                    >
                        {isLoading ? (
                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Gui'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Helper ───────────────────────────────────────────────── */

function _now() {
    return new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}
