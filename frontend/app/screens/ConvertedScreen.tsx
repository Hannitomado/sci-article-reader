'use client';

import React, { useEffect, useState } from 'react';

interface Props {
  onBack: () => void;
  onOpen: () => void;
  articleId: string; 
}

interface Paragraph {
  text: string;
  audio: string;
  task_id: string;
}

interface ArticleData {
  id: string;
  title: string;
  paragraphs: Paragraph[];
}

export default function ConvertedScreen({ onBack, onOpen, articleId }: Props) {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/article/${articleId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load article (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setArticle(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? 'Unknown error');
        setLoading(false);
      });
  }, [articleId]);

  if (!articleId) {
    return (
      <div className="text-center text-red-500 p-6">
        No article ID provided.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-inkBlack text-center mb-4">
        Converted Article
      </h2>

      {loading && <p className="text-center text-slateViolet">Loading...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {article && (
        <div className="bg-lilacMist p-6 rounded-2xl shadow-md space-y-4">
          <h3 className="text-xl font-semibold text-inkBlack">{article.title}</h3>

          <div className="space-y-4">
            {article.paragraphs.map((p, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-4 shadow-sm border border-slateViolet/20"
              >
                <div className="text-xs text-slateViolet mb-2">
                  Paragraph {idx + 1}
                </div>

                <p className="text-inkBlack whitespace-pre-wrap mb-3">{p.text}</p>

                {p.audio ? (
                  <audio controls className="w-full">
                    <source src={p.audio} />
                  </audio>
                ) : (
                  <div className="text-sm text-slateViolet">No audio available.</div>
                )}

                {p.task_id ? (
                  <div className="mt-2 text-xs text-slateViolet">
                    Task: {p.task_id}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpen}
              className="bg-forestMoss hover:bg-duskBlue text-inkBlack px-6 py-2 rounded-lg shadow-sm font-medium transition-all duration-200"
            >
              Open Reader
            </button>
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={onBack}
          className="mt-4 bg-duskBlue hover:bg-skyFade text-inkBlack px-6 py-2 rounded-lg shadow-sm font-medium transition-all duration-200"
        >
          ⬅ Back
        </button>
      </div>
    </div>
  );
}
