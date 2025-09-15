'use client';

import React, { useEffect, useState } from 'react';

interface Props {
  onBack: () => void;
  onOpen: () => void;
  articleId: string; // <-- REQUIRED to load the correct file
}

interface Paragraph {
  text: string;
  audio: string;
  task_id: string;
}

interface ArticleData {
  title: string;
  paragraphs: Paragraph[];
}

export default function ConvertedScreen({ onBack, onOpen, articleId }: Props) {
  const [data, setData] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!articleId) {
      setError('No article ID provided.');
      setLoading(false);
      return;
    }
    fetch(`http://localhost:8080/api/article/${articleId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((json) => {
        if (!json.paragraphs) {
          throw new Error("Invalid response: no 'paragraphs'");
        }
        setData(json);
      })
      .catch((err) => setError('Failed to load cleaned data.'))
      .finally(() => setLoading(false));
  }, [articleId]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-inkBlack text-center mb-4">Converted Articles</h2>

      {loading && <p className="text-center text-slateViolet">Loading...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {data && (
        <div className="bg-lilacMist text-inkBlack p-4 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold mb-2">{data.title}</h3>
          <p className="text-sm text-slateViolet mb-2">
            {data.paragraphs.length} paragraphs available
          </p>

          <button
            onClick={onOpen}
            className="bg-coralGlow hover:bg-skyFade text-inkBlack px-5 py-2 rounded-lg font-semibold transition-all duration-200"
          >
            Open Reader View
          </button>
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
