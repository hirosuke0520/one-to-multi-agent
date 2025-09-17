import { Suspense } from 'react';
import { auth } from '../../auth';
import HomeContent from './HomeContent';

export default async function Home() {
  const session = await auth();
  
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <HomeContent userId={session?.user?.id} isAuthenticated={!!session} />
    </Suspense>
  );
}