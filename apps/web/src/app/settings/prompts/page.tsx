import { auth } from '../../../../auth';
import { CombinedPromptForm } from './CombinedPromptForm';
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

async function fetchGlobalCharacterPrompt(token: string): Promise<string> {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://api:8787';

  try {
    const response = await fetch(`${apiUrl}/user-settings/global-character-prompt`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Failed to fetch global character prompt:', response.status);
      return 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。';
    }

    const data = await response.json();
    return data.globalCharacterPrompt || 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。';
  } catch (error) {
    console.error('Error fetching global character prompt:', error);
    return 'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。';
  }
}

export default async function PromptsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/');
  }

  const token = session.user.id;

  if (!token) {
    console.error('No user ID found in session');
    redirect('/');
  }

  const prompts = await fetchPrompts(token);
  const combinedPrompts = await fetchCombinedPrompts(token);
  const globalCharacterPrompt = await fetchGlobalCharacterPrompt(token);

  return (
    <div className="flex-1 py-4 md:py-8 bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-8">
        <CombinedPromptForm
          initialPrompts={prompts}
          combinedPrompts={combinedPrompts}
          initialCharacterPrompt={globalCharacterPrompt}
          token={token}
        />
      </div>
    </div>
  );
}