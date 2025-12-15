'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Article {
  id: string;
  title: string;
}

export default function ArticleListScreen({ onBack }: { onBack: () => void }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/articles')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load articles (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setArticles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setArticles([]);
        setLoading(false);
      });
  }, []);

  const rowStyle =
    'block w-full rounded-xl border border-[color:var(--border)] ' +
    'px-4 py-3 text-left text-sm sm:text-base ' +
    'bg-[color:color-mix(in_srgb,var(--surface)_86%,transparent)] ' +
    'hover:bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] ' +
    'active:translate-y-[1px] transition ' +
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]';

  const secondaryBtn =
    'inline-flex items-center justify-center rounded-2xl border border-[color:var(--border)] ' +
    'px-5 py-2.5 text-sm font-medium ' +
    'bg-[color:color-mix(in_srgb,var(--surface)_84%,transparent)] ' +
    'hover:bg-[color:color-mix(in_srgb,var(--surface)_90%,transparent)] ' +
    'active:translate-y-[1px] transition';

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Library
        </h2>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          Select an article to open the reader.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[color:var(--text-secondary)]">Loading…</p>
      ) : articles.length === 0 ? (
        <p className="text-sm text-[color:var(--text-secondary)]">
          No articles found.
        </p>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/converted/${article.id}/reader`}
              className={rowStyle}
            >
              <div className="font-semibold">{article.title}</div>
              <div className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                Open reader
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="pt-2">
        <button onClick={onBack} className={secondaryBtn} aria-label="Back">
          Back
        </button>
      </div>
    </div>
  );
}
