/**
 * SourceCard – displays a single cited article source below the bot answer.
 */
export default function SourceCard({ source }) {
    const sourceColorMap = {
        'VnExpress': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
        'Tuoi Tre': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
        'Thanh Nien': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    };

    const sourceLabelMap = {
        'VnExpress': 'VnExpress',
        'Tuoi Tre': 'Tuổi Trẻ',
        'Thanh Nien': 'Thanh Niên',
    };

    const colors = sourceColorMap[source.source] || {
        bg: 'bg-gray-50 dark:bg-gray-800',
        text: 'text-gray-700 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-700',
    };

    const formattedDate = source.published_at
        ? new Date(source.published_at).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        })
        : null;

    return (
        <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            id={`source-card-${source.url?.replace(/\W/g, '-')?.slice(0, 30)}`}
            className={`
        group block rounded-2xl border p-4
        ${colors.bg} ${colors.border}
        hover:shadow-[var(--shadow-md)] transition-all duration-200
        hover:-translate-y-0.5
        focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
      `}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${colors.text} ${colors.bg} border ${colors.border}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                            {sourceLabelMap[source.source] ?? source.source}
                        </span>
                        {formattedDate && (
                            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                                {formattedDate}
                            </span>
                        )}
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:underline underline-offset-4 decoration-[var(--border-color)] group-hover:decoration-[var(--accent)]">
                        {source.title}
                    </h4>
                </div>
                <div className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7 17L17 7" />
                        <path d="M7 7h10v10" />
                    </svg>
                </div>
            </div>

            <div className="flex items-center gap-3 mt-3 text-xs text-[var(--text-muted)]">
                {source.category && (
                    <span className="inline-flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
                            <path d="M16 2h6v6" />
                            <path d="M16 8l6-6" />
                        </svg>
                        {source.category}
                    </span>
                )}
                {source.similarity != null && (
                    <span className="ml-auto inline-flex items-center gap-2 tabular-nums">
                        <span className="w-20 h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                            <span
                                className="block h-full rounded-full bg-[var(--accent)]"
                                style={{ width: `${Math.max(5, Math.min(100, Math.round(source.similarity * 100)))}%` }}
                            />
                        </span>
                        {Math.round(source.similarity * 100)}%
                    </span>
                )}
            </div>
        </a>
    );
}
