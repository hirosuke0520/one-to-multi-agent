import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '../../auth';
import HomeContent from './HomeContent';

async function fetchPromptSetupCompleted(userId: string): Promise<boolean> {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://api:8787';

  try {
    const response = await fetch(`${apiUrl}/auth/user/${userId}`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      console.warn('Failed to check prompt setup status:', response.statusText);
      return true; // 失敗時はブロックしない
    }

    const data = await response.json();
    return !!data.promptSetupCompleted;
  } catch (error) {
    console.error('Error checking prompt setup status:', error);
    return true; // 失敗時はブロックしない
  }
}

export default async function Home() {
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    console.warn('Authentication error, continuing with no session:', error);
    session = null;
  }

  if (session?.user?.id) {
    const completed = await fetchPromptSetupCompleted(session.user.id);
    if (!completed) {
      redirect('/settings/prompts?onboarding=1');
    }
  }
  
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
