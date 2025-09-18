'use client';

import { useRouter } from 'next/navigation';
import ArticleListScreen from '../screens/ArticleListScreen';

export default function ConvertedListPage() {
  const router = useRouter();
  const handleBack = () => {
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push('/');
      }
    } catch {
      router.push('/');
    }
  };

  return (
    <>
      <ArticleListScreen onBack={handleBack} />
      <div className="text-center mt-6">
        <button
          onClick={handleBack}
          className="px-6 py-2 rounded-lg border text-inkBlack dark:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inkBlack/30 dark:focus-visible:ring-foreground/30 min-h-[44px] min-w-[44px]"
          aria-label="Back"
        >
          Back
        </button>
      </div>
    </>
  );
}

