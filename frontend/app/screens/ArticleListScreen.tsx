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

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-inkBlack text-center mb-4">
          Available Articles
        </h2>

        {loading && <p className="text-center text-slateViolet">Loading…</p>}

        <div className="bg-lilacMist text-inkBlack p-4 rounded-xl shadow-md">
          <ul className="space-y-1">
            {articles.map((article) => (
              <li key={article.id} className="leading-relaxed py-1">
                <a
                  href={`/converted/${article.id}/reader`}
                  className="block px-2 py-1 rounded-md hover:bg-skyFade/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inkBlack/30 transition"
                >
                  {article.title}
                </a>
              </li>
            ))}
          </ul>

          <div className="text-center mt-6">
            <button
              onClick={onBack}
              className="bg-coralGlow hover:bg-skyFade text-inkBlack px-6 py-2 rounded-xl shadow-sm font-semibold transition-all duration-200 min-h-[44px] min-w-[44px]"
              aria-label="Back"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
