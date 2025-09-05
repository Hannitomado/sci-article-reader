'use client';

import React, { useEffect, useState } from 'react';

interface Props {
  onBack: () => void;
  articleId: string;
}

interface Paragraph {
  text: string;
  audio: string;
  task_id?: string;
}

export default function ReaderScreen({ onBack, articleId }: Props) {
  const [data, setData] = useState<{ title: string; paragraphs: Paragraph[] } | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState<{ [key: number]: string }>({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`http://localhost:8080/api/article/${articleId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.paragraphs) {
          throw new Error("Invalid response: missing paragraphs");
        }
        setData(json);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load article.');
      });
  }, [articleId]);

  const handlePlay = (index: number, audioFile: string) => {
    const audio = new Audio(`http://localhost:8080/static/${audioFile}`);
    audio.play();
    setCurrentIndex(index);
  };

  const handleNoteChange = (index: number, note: string) => {
    setNotes((prev) => ({ ...prev, [index]: note }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-teal-700 text-center mb-4">Reader View</h2>

      {error && <p className="text-center text-red-500">{error}</p>}
      {!data && !error && <p className="text-center text-slate-700">Loading...</p>}

      {data?.paragraphs.map((para, i) => (
        <div
          key={i}
          className={`p-4 rounded-xl shadow-sm transition-all duration-200 ${
            currentIndex === i ? 'bg-pink-100' : 'bg-yellow-50'
          }`}
        >
          <p className="text-slate-800 mb-2">{para.text}</p>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => handlePlay(i, para.audio)}
              className="bg-teal-100 hover:bg-teal-200 text-teal-900 px-4 py-1 rounded-lg font-medium"
            >
              Play
            </button>
            <input
              type="text"
              placeholder="Add a note..."
              value={notes[i] || ''}
              onChange={(e) => handleNoteChange(i, e.target.value)}
              className="flex-1 border border-slate-300 rounded-md px-3 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
        </div>
      ))}

      <div className="text-center mt-6">
        <button
          onClick={onBack}
          className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2 rounded-lg shadow-sm font-medium"
        >
          ⬅ Back
        </button>
      </div>
    </div>
  );
}
