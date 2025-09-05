'use client';

import { useParams } from 'next/navigation';
import ConvertedScreen from '../../screens/ConvertedScreen';

export default function ConvertedPage() {
  const params = useParams();
  const articleId = params?.id as string;

  return (
    <ConvertedScreen
      articleId={articleId}
      onBack={() => window.history.back()}
      onOpen={() => {
        window.location.href = `/converted/${articleId}/reader`;
      }}
    />
  );
}
