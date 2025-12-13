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
    fetch('/api/articles')
      .then((res) => res.json())
      .then(setArticles)
      .catch(() => setMessage('Error loading files.'));
  }, []);

  const handleDelete = () => {
    if (!selectedId) return;

    setMessage('Deleting...');

    fetch(`/api/article/${selectedId}`, {
      method: 'DELETE',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Delete failed');
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
      <h2 className="text-3xl font-bold text-inkBlack text-center mb-4">
        Manage Your Files
      </h2>

      {articles.length > 0 ? (
        <div className="bg-lilacMist p-6 rounded-2xl shadow-md space-y-4">
          <p className="text-slateViolet text-sm">
            Select a file below to delete it.
          </p>

          <select
            className="w-full p-3 rounded-xl border border-slateViolet/30 bg-white text-inkBlack"
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="" disabled>
              Select an article...
            </option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title || a.id}
              </option>
            ))}
          </select>

          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={handleDelete}
              disabled={!selectedId}
              className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-6 py-2 rounded-lg shadow-sm font-medium transition-all duration-200"
            >
              Delete
            </button>

            <button
              onClick={onBack}
              className="bg-duskBlue hover:bg-skyFade text-inkBlack px-6 py-2 rounded-lg shadow-sm font-medium transition-all duration-200"
            >
              Back
            </button>
          </div>

          {message && (
            <p className="text-center text-sm text-slateViolet pt-2">{message}</p>
          )}
        </div>
      ) : (
        <p className="text-center text-slateViolet">No files found.</p>
      )}
    </div>
  );
}
