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
    fetch('http://localhost:8080/api/articles')
      .then(res => res.json())
      .then(data => {
        console.log('Fetched articles:', data);
        setArticles(data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-inkBlack">Available Articles</h2>
      {loading && <p>Loading...</p>}
      <ul>
        {articles.map(article => (
          <li key={article.id} className="mb-2">
            <a
              href={`/converted/${article.id}`}
              className="text-skyFade underline"
            >
              {article.title}
            </a>
          </li>
        ))}
      </ul>
      <button onClick={onBack} className="mt-6 px-4 py-2 bg-coralGlow text-inkBlack rounded">Back</button>
    </div>
  );
}
