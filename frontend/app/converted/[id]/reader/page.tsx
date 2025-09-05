'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReaderScreen from './../../../screens/ReaderScreen'; // Adjust path if needed

export default function ReaderPage() {
  const params = useParams();
  const articleId = params?.id as string;

  if (!articleId) {
    return <div className="text-center text-red-600 mt-10">Invalid article SID.</div>;
  }

  return (
    <>    
    <button
        onClick={() => window.history.back()}
        className="mb-6 bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2 rounded-lg shadow-sm font-medium transition-all duration-200"
    >
        ⬅ Back
    </button>
    <ReaderScreen
        articleId={articleId}
        onBack={() => window.history.back()}
    />
    <div className="text-center mt-4">
      <Link href={`/converted/${articleId}/reader`} className="text-blue-600 hover:underline">
        Open Reader View
      </Link>
    </div>
    </>
  );
}
