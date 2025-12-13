'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ConvertedPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params?.id as string;

  useEffect(() => {
    if (!articleId) return;
    router.replace(`/converted/${articleId}/reader`);
  }, [articleId, router]);

  return (
    <div className="p-6 text-slateViolet">
      Opening reader…
    </div>
  );
}
