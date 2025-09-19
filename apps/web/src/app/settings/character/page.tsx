import { auth } from '../../../../auth';
import { cookies } from 'next/headers';
import { CharacterPromptForm } from './CharacterPromptForm';
import { redirect } from 'next/navigation';

interface UserSettings {
  globalCharacterPrompt: string;
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

export default async function CharacterPromptPage() {
  // テスト用：認証チェックを一時的に無効化
  // const session = await auth();
  // if (!session?.user) {
  //   redirect('/');
  // }

  // テスト用ダミートークン
  const token = 'test-token';
  const globalCharacterPrompt = await fetchGlobalCharacterPrompt(token);

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <CharacterPromptForm
          initialPrompt={globalCharacterPrompt}
          token={token}
        />
      </div>
    </div>
  );
}