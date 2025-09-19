import { auth } from '../../../../auth';
import { cookies } from 'next/headers';
import { PromptForm } from './PromptForm';
import { redirect } from 'next/navigation';

interface Prompts {
  [key: string]: string;
}

interface CombinedPrompts {
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

async function fetchCombinedPrompts(token: string): Promise<CombinedPrompts> {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://api:8787';

  try {
    const response = await fetch(`${apiUrl}/prompts/combined`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Failed to fetch combined prompts:', response.status);
      return {};
    }

    const data = await response.json();
    return data.prompts || {};
  } catch (error) {
    console.error('Error fetching combined prompts:', error);
    return {};
  }
}

export default async function PromptsPage() {
  // テスト用：認証チェックを一時的に無効化
  // const session = await auth();
  // if (!session?.user) {
  //   redirect('/');
  // }

  // テスト用ダミートークン
  const token = 'test-token';
  const prompts = await fetchPrompts(token);
  const combinedPrompts = await fetchCombinedPrompts(token);

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <PromptForm
          initialPrompts={prompts}
          combinedPrompts={combinedPrompts}
          token={token}
        />
      </div>
    </div>
  );
}