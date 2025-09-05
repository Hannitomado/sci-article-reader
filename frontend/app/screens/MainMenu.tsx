'use client';

import React from 'react';
import Link from 'next/link';

type Props = {
  onNavigate: (screen: string) => void;
};

export default function MainMenu({ onNavigate }: Props) {
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-3xl font-bold text-teal-700 mb-6">Choose Your Adventure</h2>
      <div className="flex flex-col gap-4 items-center">
        <button
          onClick={() => onNavigate('upload')}
          className="w-full max-w-xs bg-pink-100 hover:bg-pink-200 text-teal-900 font-semibold py-3 px-6 rounded-xl shadow-md transition-all duration-200"
        >
          Upload New Text
        </button>

        <Link
          href="/converted"
          className="w-full max-w-xs bg-yellow-100 hover:bg-yellow-200 text-teal-900 font-semibold py-3 px-6 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center"
        >
          Converted Articles
        </Link>

        <button
          onClick={() => onNavigate('delete')}
          className="w-full max-w-xs bg-teal-100 hover:bg-teal-200 text-teal-900 font-semibold py-3 px-6 rounded-xl shadow-md transition-all duration-200"
        >
          Delete Files
        </button>
      </div>
    </div>
  );
}
