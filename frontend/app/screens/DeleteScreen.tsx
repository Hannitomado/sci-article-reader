'use client';

import React, { useEffect, useState } from 'react';

interface Props {
  onBack: () => void;
}

interface Article {
  id: string;
  title: string;
}

export default function DeleteScreen({ onBack }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:8080/api/articles')
      .then((res) => res.json())
      .then(setArticles)
      .catch(() => setMessage('Failed to load articles.'));
  }, []);

  const handleDelete = () => {
    if (!selectedId) return;

    fetch(`http://localhost:8080/api/article/${selectedId}`, {
      method: 'DELETE',
    })
      .then(() => {
        setArticles((prev) => prev.filter((a) => a.id !== selectedId));
        setMessage('File deleted successfully.');
        setSelectedId(null);
      })
      .catch(() => setMessage('Error deleting file.'));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-teal-700 text-center mb-4">Manage Your Files</h2>

      {articles.length > 0 ? (
        <div className="bg-pink-50 p-4 rounded-xl shadow-md text-slate-800">
          <label className="block mb-2 font-medium">Select a file to delete:</label>
          <select
            onChange={(e) => setSelectedId(e.target.value)}
            value={selectedId || ''}
            className="w-full p-2 mb-4 rounded-md border border-slate-300"
          >
            <option value="" disabled>Select an article</option>
            {articles.map((article) => (
              <option key={article.id} value={article.id}>
                {article.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleDelete}
            disabled={!selectedId}
            className="bg-red-100 hover:bg-red-200 text-red-900 font-medium px-5 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            Confirm Delete
          </button>
        </div>
      ) : (
        <p className="text-center text-slate-600">{message || 'No articles found.'}</p>
      )}

      <div className="text-center">
        <button
          onClick={onBack}
          className="mt-6 bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2 rounded-lg shadow-sm font-medium"
        >
          ⬅ Back
        </button>
      </div>
    </div>
  );
}
