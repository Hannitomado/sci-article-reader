'use client';

import React, { useState } from 'react';

interface Props {
  onBack: () => void;
}

export default function UploadScreen({ onBack }: Props) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    setIsLoading(true);
    setMessage('');

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    } else if (text.trim()) {
      const blob = new Blob([text], { type: 'text/plain' });
      formData.append('file', new File([blob], 'raw.txt'));
    } else {
      setMessage('Please provide a file or raw text.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:8080/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setMessage('Upload successful! Redirecting...');
        setText('');
        setFile(null);
        // Redirect to the converted article using the returned id
        window.location.href = `/converted/${data.id}`;
      } else {
        setMessage(data.detail || 'Upload failed.');
      }
    } catch (error) {
      setMessage('An error occurred during upload.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-inkBlack mb-4 text-center">Upload Text</h2>

      <textarea
        placeholder="Paste your raw text here..."
        className="w-full h-40 p-4 rounded-xl border border-coralGlow bg-lavenderHaze text-inkBlack focus:outline-none focus:ring-2 focus:ring-coralGlow"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex items-center gap-4">
        <input
          type="file"
          accept=".txt,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block text-sm text-slateViolet file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-skyFade file:text-inkBlack hover:file:bg-duskBlue"
        />
      </div>

      <div className="flex gap-4 mt-4 items-center">
        <button
          onClick={handleUpload}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 bg-coralGlow hover:bg-skyFade text-inkBlack font-semibold px-6 py-2 rounded-xl shadow-md transition-all duration-200"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-inkBlack"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
              Uploading...
            </>
          ) : (
            'Submit'
          )}
        </button>

        <button
          onClick={onBack}
          className="bg-duskBlue hover:bg-skyFade text-inkBlack font-semibold px-6 py-2 rounded-xl shadow-sm transition-all duration-200"
        >
          ⬅ Back
        </button>
      </div>

      {message && <p className="text-center text-inkBlack mt-4">{message}</p>}
    </div>
  );
}
