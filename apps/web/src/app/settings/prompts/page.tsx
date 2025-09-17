import { auth } from '../../../../auth';
import { cookies } from 'next/headers';
import { PromptForm } from './PromptForm';
import { SignInButton } from '../../../components/SignInButton';

interface Prompts {
  [key: string]: string;
}

interface UserSettings {
  globalCharacterPrompt?: string;
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

async function fetchUserSettings(token: string): Promise<UserSettings> {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://api:8787';
  
  try {
    const response = await fetch(`${apiUrl}/user-settings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Failed to fetch user settings:', response.status);
      return {};
    }

    const data = await response.json();
    return data.userSettings || {};
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return {};
  }
}

interface PromptsPageProps {
  searchParams?: {
    onboarding?: string;
  };
}

export default async function PromptsPage({ searchParams }: PromptsPageProps) {
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    console.warn('Failed to load session on prompts page:', error);
    session = null;
  }

  const isOnboarding = searchParams?.onboarding === '1' || searchParams?.onboarding === 'true';

  if (!session?.user) {
    return (
      <div className="h-[calc(100vh-64px)] overflow-y-auto bg-gray-50">
        <div className="container mx-auto px-4 py-12 max-w-xl">
          <div className="bg-white rounded-lg shadow p-6 text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">プロンプト設定にはログインが必要です</h2>
            <p className="text-sm text-gray-600">
              Googleアカウントでログインすると、保存済みのプロンプトを管理できます。
            </p>
            <div className="flex justify-center">
              <SignInButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cookieStore = cookies();
  const token =
    cookieStore.get('authjs.session-token')?.value ||
    cookieStore.get('__Secure-authjs.session-token')?.value ||
    '';

  const [prompts, userSettings] = token
    ? await Promise.all([fetchPrompts(token), fetchUserSettings(token)])
    : [{}, {}];

  return (
    <div className="h-[calc(100vh-64px)] overflow-y-auto bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <PromptForm
          initialPrompts={prompts}
          initialUserSettings={userSettings}
          token={token}
          isOnboarding={isOnboarding}
        />
      </div>
    </div>
  );
}
