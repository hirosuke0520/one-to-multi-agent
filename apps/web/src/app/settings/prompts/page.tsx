import { auth } from '@/../../auth';
import { cookies } from 'next/headers';
import { PromptForm } from './PromptForm';
import { redirect } from 'next/navigation';

interface Prompts {
  [key: string]: string;
}

async function fetchPrompts(token: string): Promise<Prompts> {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://api:8787';
  
  try {
    const response = await fetch(`${apiUrl}/prompts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Failed to fetch prompts:', response.status);
      return {};
    }

    const data = await response.json();
    return data.prompts || {};
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return {};
  }
}

export default async function PromptsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/');
  }

  // JWTトークンを取得
  const cookieStore = await cookies();
  const token = cookieStore.get('authjs.session-token')?.value || 
                cookieStore.get('__Secure-authjs.session-token')?.value || '';

  const prompts = await fetchPrompts(token);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PromptForm initialPrompts={prompts} token={token} />
    </div>
  );
}