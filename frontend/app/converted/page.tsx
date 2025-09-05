'use client';

import ArticleListScreen from '../screens/ArticleListScreen';

export default function ConvertedListPage() {
  return (
    <>
      <ArticleListScreen onBack={() => window.history.back()} />
      <div className="text-center mt-6">
        <button
          onClick={() => window.history.back()}
          className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2 rounded-lg shadow-sm font-medium transition-all duration-200"
        >
          ⬅ Back
        </button>
      </div>
    </>
  );
}