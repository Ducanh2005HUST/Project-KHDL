import SourceCard from './SourceCard';

/**
 * MessageBubble – renders a single chat message (user or bot).
 * Bot messages get source cards appended below.
 */
export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    const lines = message.text.split('\n');

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
                            ? 'bg-[var(--accent)] text-white rounded-br-md shadow-[var(--shadow-md)]'
                            : 'bg-[var(--bg-elevated)] backdrop-blur-md text-[var(--text-primary)] rounded-bl-md border border-[var(--border-color)] shadow-[var(--shadow-sm)]'
                        }
          `}
                >
                    {!isUser && (
                        <span className="inline-block align-middle w-1 h-4 rounded-full bg-[var(--accent)]/60 mr-2" aria-hidden="true" />
                    )}
                    {/* Render answer text – preserve newlines */}
                    {lines.map((line, i) => (
                        <span key={i}>
                            {isUser ? line : <LinkifiedText text={line} />}
                            {i < lines.length - 1 && <br />}
                        </span>
                    ))}
                </div>

                {/* Intent badge for multi-source */}
                {!isUser && message.intent === 'multi_source' && (
                    <div className="mt-1.5 ml-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/15 font-semibold">
                            Tong hop nhieu nguon
                        </span>
                    </div>
                )}

                {/* Source cards */}
                {!isUser && message.sources && message.sources.length > 0 && (
                    <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-[var(--text-muted)] ml-1 tracking-wide uppercase">
                            Nguồn tham khảo
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

function LinkifiedText({ text }) {
    // Minimal linkify for http(s) URLs in LLM answers.
    const parts = text.split(/(\s+)/);
    return parts.map((part, idx) => {
        if (/^https?:\/\/\S+$/i.test(part)) {
            const cleanUrl = part.replace(/[),.;]+$/g, '');
            const trailing = part.slice(cleanUrl.length);
            return (
                <span key={idx}>
                    <a
                        href={cleanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 decoration-[var(--text-muted)] hover:decoration-[var(--accent)] text-[var(--accent)]"
                    >
                        {cleanUrl}
                    </a>
                    {trailing}
                </span>
            );
        }
        return <span key={idx}>{part}</span>;
    });
}
