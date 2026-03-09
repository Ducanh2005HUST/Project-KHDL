import SourceCard from './SourceCard';

/**
 * MessageBubble – renders a single chat message (user or bot).
 * Bot messages get source cards appended below.
 */
export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';

    return (
        <div
            className={`animate-fadeInUp flex ${isUser ? 'justify-end' : 'justify-start'}`}
            id={`message-${message.id}`}
        >
            <div className={`max-w-[85%] md:max-w-[75%] ${isUser ? '' : 'w-full md:w-[75%]'}`}>
                {/* Bubble */}
                <div
                    className={`
            rounded-2xl px-4 py-3 leading-relaxed text-sm
            transition-theme
            ${isUser
                            ? 'bg-[var(--accent)] text-white rounded-br-md'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-bl-md border border-[var(--border-color)]'
                        }
          `}
                >
                    {/* Render answer text – preserve newlines */}
                    {message.text.split('\n').map((line, i) => (
                        <span key={i}>
                            {line}
                            {i < message.text.split('\n').length - 1 && <br />}
                        </span>
                    ))}
                </div>

                {/* Intent badge for multi-source */}
                {!isUser && message.intent === 'multi_source' && (
                    <div className="mt-1.5 ml-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
                            Tong hop nhieu nguon
                        </span>
                    </div>
                )}

                {/* Source cards */}
                {!isUser && message.sources && message.sources.length > 0 && (
                    <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-[var(--text-muted)] ml-1 tracking-wide uppercase">
                            Nguon tham khao
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                            {message.sources.map((src, idx) => (
                                <SourceCard key={idx} source={src} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Timestamp */}
                <p className={`text-[10px] mt-1.5 text-[var(--text-muted)] ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
                    {message.timestamp}
                </p>
            </div>
        </div>
    );
}
