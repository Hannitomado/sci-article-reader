'use client';

import React from 'react';
import Link from 'next/link';

type Props = {
  onNavigate: (screen: string) => void;
};

export default function MainMenu({ onNavigate }: Props) {
  const baseBtn = [
    'w-full max-w-xs',
    'inline-flex items-center justify-center',
    'rounded-2xl',
    'border border-[color:var(--border)]',
    'px-6 py-3 min-h-[44px]',
    'text-sm sm:text-base font-semibold',
    'bg-[color:color-mix(in_srgb,var(--surface)_86%,transparent)]',
    'hover:bg-[color:color-mix(in_srgb,var(--surface)_94%,transparent)]',
    'active:translate-y-[1px]',
    'transition',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]',
  ].join(' ');

  // Slightly stronger “primary” surface for the first action.
  const primaryBtn = baseBtn.replace(
    'var(--surface)_86%',
    'var(--surface)_92%'
  );

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Menu
        </h2>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          Choose a function.
        </p>
      </div>

      <div className="flex flex-col gap-4 items-center">
        <button onClick={() => onNavigate('upload')} className={primaryBtn}>
          Upload
        </button>

        <Link href="/converted" className={baseBtn}>
          Library
        </Link>

        <button onClick={() => onNavigate('delete')} className={baseBtn}>
          Delete
        </button>
      </div>
    </div>
  );
}
