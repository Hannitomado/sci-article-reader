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
        router.push('/?screen=main');
      }
    } catch {
      router.push('/?screen=main');
    }
  };

  return (
    <>
      <ArticleListScreen onBack={handleBack} />
    </>
  );
}
