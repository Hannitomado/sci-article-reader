'use client';

import { useState } from 'react';

type Props = {
  onBack: () => void;
};

export default function UploadScreen({ onBack }: Props) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const primaryBtn =
    'inline-flex items-center justify-center rounded-2xl border border-[color:var(--border)] ' +
    'px-6 py-3 min-h-[44px] text-sm sm:text-base font-semibold ' +
    'bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] ' +
    'hover:bg-[color:color-mix(in_srgb,var(--surface)_96%,transparent)] ' +
    // hardware feel
    'shadow-sm active:shadow-none active:translate-y-[1px] ' +
    'transition-[transform,box-shadow,background-color] duration-75 ' +
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]';

  const secondaryBtn =
    'inline-flex items-center justify-center rounded-2xl border border-[color:var(--border)] ' +
    'px-5 py-2.5 text-sm font-medium ' +
    'bg-[color:color-mix(in_srgb,var(--surface)_84%,transparent)] ' +
    'hover:bg-[color:color-mix(in_srgb,var(--surface)_90%,transparent)] ' +
    'active:translate-y-[1px] transition';

  async function handleSubmit() {
    if (!text && !file) return;

    setLoading(true);

    const formData = new FormData();
    if (text) formData.append('text', text);
    if (file) formData.append('file', file);

    try {
      const res = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed (${res.status})`);
      }

      // Backend handles redirect or navigation
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Upload Text
        </h2>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          Paste text or select a file to begin.
        </p>
      </div>

      <div className="flex flex-col gap-4 items-center">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste raw text here…"
          className="w-full max-w-lg min-h-[140px] rounded-xl border border-[color:var(--border)] p-3 text-sm bg-transparent focus:outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
        />

        <label className="w-full max-w-lg text-sm text-left">
          <input
            type="file"
            className="block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="flex justify-center gap-4 pt-2">
        <button
          onClick={handleSubmit}
          className={primaryBtn}
          disabled={loading}
          aria-disabled={loading}
          style={loading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
        >
          {loading ? 'Submitting…' : 'Submit'}
        </button>

        <button onClick={onBack} className={secondaryBtn}>
          Back
        </button>
      </div>

      {loading && (
        <div className="pt-2 text-xs sm:text-sm text-[color:var(--text-tertiary)]">
          Processing text…
        </div>
      )}
    </div>
  );
}
