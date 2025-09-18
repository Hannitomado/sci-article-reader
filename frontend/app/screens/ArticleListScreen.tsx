'use client';

import React, { useEffect, useState } from 'react';

interface Article {
  id: string;
  title: string;
}

export default function ArticleListScreen({ onBack }: { onBack: () => void }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use relative URL so Next.js rewrites proxy to backend
    fetch('/api/articles')
      .then(res => res.json())
      .then(data => {
        console.log('Fetched articles:', data);
        setArticles(data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-foreground">Available Articles</h2>
      {loading && <p className="text-foreground/80">Loading…</p>}
      <ul className="space-y-2">
        {articles.map(article => (
          <li key={article.id} className="leading-relaxed">
            <a
              href={`/converted/${article.id}`}
              className="block px-3 py-2 rounded-md text-foreground hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 transition"
            >
              {article.title}
            </a>
          </li>
        ))}
      </ul>
      <button
        onClick={onBack}
        className="mt-6 px-4 py-2 rounded-md border text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 min-h-[44px] min-w-[44px]"
        aria-label="Back"
      >
        Back
      </button>
    </div>
  );
}
