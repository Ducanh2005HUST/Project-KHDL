import { useState } from 'react';

/**
 * SourceCard – displays a single cited article source below the bot answer.
 */
export default function SourceCard({ source }) {
    const sourceColorMap = {
        'VnExpress': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
        'Tuoi Tre': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
        'Thanh Nien': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
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
        block rounded-lg border p-3
        ${colors.bg} ${colors.border}
        hover:shadow-md transition-all duration-200
        hover:-translate-y-0.5
      `}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5 ${colors.text} ${colors.bg}`}>
                        {source.source}
                    </span>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] leading-snug line-clamp-2">
                        {source.title}
                    </h4>
                </div>
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                {source.category && <span>{source.category}</span>}
                {formattedDate && <span>{formattedDate}</span>}
                {source.similarity != null && (
                    <span className="ml-auto tabular-nums">
                        {Math.round(source.similarity * 100)}% match
                    </span>
                )}
            </div>
        </a>
    );
}
