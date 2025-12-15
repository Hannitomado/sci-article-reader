'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  onBack: () => void;
};

type Article = {
  id: string;
  title: string;
};

export default function DeleteScreen({ onBack }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'deleting' | 'done' | 'error'>(
    'loading'
  );

  useEffect(() => {
    fetch('/api/articles')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load articles (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setArticles(Array.isArray(data) ? data : []);
        setStatus('idle');
      })
      .catch((e) => {
        console.error(e);
        setArticles([]);
        setStatus('error');
      });
  }, []);

  const selectedTitle = useMemo(() => {
    return articles.find((a) => a.id === selectedId)?.title ?? '';
  }, [articles, selectedId]);

  const secondaryBtn =
    'inline-flex items-center justify-center rounded-2xl border border-[color:var(--border)] ' +
    'px-5 py-2.5 text-sm font-medium ' +
    'bg-[color:color-mix(in_srgb,var(--surface)_84%,transparent)] ' +
    'hover:bg-[color:color-mix(in_srgb,var(--surface)_90%,transparent)] ' +
    'active:translate-y-[1px] transition ' +
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]';

  // “Danger” without looking like a web app:
  // muted red tint, same hardware press behaviour, no glow.
  const dangerBtn =
    'inline-flex items-center justify-center rounded-2xl border border-[color:color-mix(in_srgb,red_35%,var(--border))] ' +
    'px-6 py-3 min-h-[44px] text-sm sm:text-base font-semibold ' +
    'bg-[color:color-mix(in_srgb,red_12%,var(--surface))] ' +
    'hover:bg-[color:color-mix(in_srgb,red_18%,var(--surface))] ' +

    // hardware feel (same pattern as Start/Submit)
    'shadow-sm active:shadow-none active:translate-y-[1px] ' +
    'transition-[transform,box-shadow,background-color] duration-75 ' +

    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]';

  const canDelete = selectedId && status !== 'deleting';

  async function handleDelete() {
    if (!selectedId) return;

    setStatus('deleting');
    try {
      const res = await fetch(`/api/article/${selectedId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);

      // Remove from list locally
      setArticles((prev) => prev.filter((a) => a.id !== selectedId));
      setSelectedId('');
      setStatus('done');

      // Quietly return to idle after a moment
      setTimeout(() => setStatus('idle'), 900);
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  }

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Delete
        </h2>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          Select an article, then confirm deletion.
        </p>
      </div>

      <div className="flex flex-col gap-3 items-center">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full max-w-lg rounded-xl border border-[color:var(--border)] px-3 py-2.5 text-sm bg-transparent focus:outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
        >
          <option value="">Select an article…</option>
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>

        {selectedTitle ? (
          <div className="w-full max-w-lg text-left text-xs text-[color:var(--text-tertiary)]">
            Selected: <span className="font-medium">{selectedTitle}</span>
          </div>
        ) : (
          <div className="w-full max-w-lg text-left text-xs text-[color:var(--text-tertiary)]">
            No selection.
          </div>
        )}

        {status === 'error' ? (
          <div className="w-full max-w-lg text-left text-xs text-[color:var(--text-tertiary)]">
            Something went wrong. Try again.
          </div>
        ) : status === 'done' ? (
          <div className="w-full max-w-lg text-left text-xs text-[color:var(--text-tertiary)]">
            Deleted.
          </div>
        ) : null}
      </div>

      <div className="flex justify-center gap-4 pt-2">
        <button
          onClick={handleDelete}
          className={dangerBtn}
          disabled={!canDelete}
          aria-disabled={!canDelete}
          style={!canDelete ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
        >
          Delete
        </button>

        <button onClick={onBack} className={secondaryBtn}>
          Back
        </button>
      </div>
    </div>
  );
}
