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
      <h2 className="text-3xl font-bold text-inkBlack text-center mb-4">Reader View</h2>

      {error && <p className="text-center text-red-500">{error}</p>}
      {!data && !error && <p className="text-center text-slateViolet">Loading...</p>}

      {data?.paragraphs.map((para, i) => (
        <div
          key={i}
          className={`p-4 rounded-xl shadow-sm transition-all duration-200 ${
            currentIndex === i ? 'bg-coralGlow' : 'bg-lilacMist'
          }`}
        >
          <p className="text-inkBlack mb-2">{para.text}</p>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => handlePlay(i, para.audio)}
              className="bg-skyFade hover:bg-duskBlue text-inkBlack px-4 py-1 rounded-lg font-medium"
            >
              Play
            </button>
            <input
              type="text"
              placeholder="Add a note..."
              value={notes[i] || ''}
              onChange={(e) => handleNoteChange(i, e.target.value)}
              className="flex-1 border border-slateViolet rounded-md px-3 py-1 text-inkBlack focus:outline-none focus:ring-2 focus:ring-coralGlow"
            />
          </div>
        </div>
      ))}

      <div className="text-center mt-6">
        <button
          onClick={onBack}
          className="bg-duskBlue hover:bg-skyFade text-inkBlack px-6 py-2 rounded-lg shadow-sm font-medium"
        >
          ⬅ Back
        </button>
      </div>
    </div>
  );
}
