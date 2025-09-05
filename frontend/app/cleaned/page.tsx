'use client';

import { useEffect, useState } from 'react';

interface Paragraph {
  text: string;
  audio: string;
  task_id: string;
}

interface Article {
  title: string;
  paragraphs: Paragraph[];
}

export default function CleanedArticlePage() {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8080/api/cleaned-article')
      .then((res) => res.json())
      .then((data) => {
        console.log('Loaded cleaned article:', data);
        setArticle(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load article:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!article) return <div className="p-4">No article found</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">{article.title}</h1>

      {article.paragraphs.map((para, index) => (
        <div key={index} className="bg-white shadow p-4 rounded-lg space-y-2">
          <p className="text-gray-800 whitespace-pre-line">{para.text}</p>

          <audio controls className="w-full mt-2">
            <source
              src={`http://localhost:8080/static/${encodeURIComponent(para.audio)}`}
              type="audio/wav"
            />
            Your browser does not support the audio element.
          </audio>
        </div>
      ))}
    </div>
  );
}
