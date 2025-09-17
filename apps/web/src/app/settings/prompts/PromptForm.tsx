'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Platform = 'twitter' | 'instagram' | 'tiktok' | 'threads' | 'youtube' | 'blog';

interface Prompts {
  [key: string]: string;
}

interface UserSettings {
  globalCharacterPrompt?: string;
}

const platformLabels: Record<Platform, string> = {
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  threads: 'Threads',
  youtube: 'YouTube',
  blog: 'ブログ'
};

interface PromptFormProps {
  initialPrompts: Prompts;
  initialUserSettings: UserSettings;
  token: string;
  isOnboarding?: boolean;
}

export function PromptForm({ initialPrompts, initialUserSettings, token, isOnboarding = false }: PromptFormProps) {
  const router = useRouter();

  // 開発モード用: ローカルストレージから設定を復元
  const getInitialPrompts = () => {
    if (!token && typeof window !== 'undefined') {
      const stored = localStorage.getItem('dev_prompts');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // パースエラーの場合は初期値を使用
        }
      }
    }
    return initialPrompts;
  };

  const getInitialUserSettings = () => {
    if (!token && typeof window !== 'undefined') {
      const stored = localStorage.getItem('dev_user_settings');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // パースエラーの場合は初期値を使用
        }
      }
    }
    return initialUserSettings;
  };

  const [prompts, setPrompts] = useState<Prompts>(getInitialPrompts);
  const [editingPrompts, setEditingPrompts] = useState<Prompts>(getInitialPrompts);
  const [userSettings, setUserSettings] = useState<UserSettings>(getInitialUserSettings);
  const [editingUserSettings, setEditingUserSettings] = useState<UserSettings>(getInitialUserSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'character' | 'platforms'>('character');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const trimmedGlobalPrompt = (editingUserSettings.globalCharacterPrompt || '').trim();
      const activePlatformPrompts = Object.values(editingPrompts).filter(prompt => (prompt || '').trim().length > 0);

      if (isOnboarding) {
        if (trimmedGlobalPrompt.length === 0) {
          setMessage({ type: 'error', text: 'キャラクタープロンプトを入力してください。' });
          setSaving(false);
          return;
        }
        if (activePlatformPrompts.length === 0) {
          setMessage({ type: 'error', text: '少なくとも1つの媒体プロンプトを入力してください。' });
          setSaving(false);
          return;
        }
      }

      // 開発用: 認証なしでローカルストレージ保存
      if (!token) {
        // ローカルストレージに保存
        localStorage.setItem('dev_user_settings', JSON.stringify(editingUserSettings));
        localStorage.setItem('dev_prompts', JSON.stringify(editingPrompts));

        // ローカル状態のみ更新（API呼び出しをスキップ）
        setUserSettings(editingUserSettings);
        setPrompts(editingPrompts);
        setIsEditing(false);
        setMessage({ type: 'success', text: '設定を保存しました（開発モード）' });
        setSaving(false);
        return;
      }

      // 本番用: API保存（将来有効化）
      // キャラクター設定とプロンプトを並列で保存
      const promises: Promise<Response>[] = [];

      // キャラクター設定の保存
      const shouldSaveCharacter = isOnboarding || activeTab === 'character' || isEditing;
      if (shouldSaveCharacter) {
        promises.push(
          fetch(`${apiUrl}/user-settings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(editingUserSettings)
          })
        );
      }

      // プラットフォーム別プロンプトの保存
      const shouldSavePrompts = isOnboarding || activeTab === 'platforms' || isEditing;
      if (shouldSavePrompts) {
        promises.push(
          fetch(`${apiUrl}/prompts/batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ prompts: editingPrompts })
          })
        );
      }

      const responses = await Promise.all(promises);

      // レスポンスチェック
      for (const response of responses) {
        if (!response.ok) {
          throw new Error('Failed to save settings');
        }
      }

      setUserSettings(editingUserSettings);
      setPrompts(editingPrompts);
      setIsEditing(false);
      setMessage({ type: 'success', text: isOnboarding ? '設定を保存しました。コンテンツ作成画面へ移動します。' : '設定を保存しました' });
      router.refresh();

      if (isOnboarding) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: '設定の保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('全てのプロンプトをデフォルトに戻しますか？')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // 開発用: 認証なしでローカルリセットのみ行う
      if (!token) {
        // ローカルストレージをクリア
        localStorage.removeItem('dev_prompts');
        localStorage.removeItem('dev_user_settings');

        const emptyPrompts = {};
        const emptyUserSettings = {};

        setEditingPrompts(emptyPrompts);
        setPrompts(emptyPrompts);
        setEditingUserSettings(emptyUserSettings);
        setUserSettings(emptyUserSettings);
        setIsEditing(false);
        setMessage({ type: 'success', text: 'プロンプトをデフォルトに戻しました（開発モード）' });
        setSaving(false);
        return;
      }

      // 本番用: API呼び出し
      const response = await fetch(`${apiUrl}/prompts`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reset prompts');
      }

      setIsEditing(false);
      setMessage({ type: 'success', text: 'プロンプトをデフォルトに戻しました' });
      router.refresh();
    } catch (error) {
      console.error('Failed to reset prompts:', error);
      setMessage({ type: 'error', text: 'プロンプトのリセットに失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingPrompts(prompts);
    setEditingUserSettings(userSettings);
    setIsEditing(false);
  };

  const handlePromptChange = (platform: Platform, value: string) => {
    setEditingPrompts(prev => ({ ...prev, [platform]: value }));
    setIsEditing(true);
  };

  const handleCharacterPromptChange = (value: string) => {
    setEditingUserSettings(prev => ({ ...prev, globalCharacterPrompt: value }));
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      {isOnboarding && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-900">
          <h2 className="text-lg font-semibold mb-2">初回セットアップ</h2>
          <p className="text-sm">
            保存したプロンプトはコンテンツ生成に利用されます。キャラクタープロンプトと少なくとも1つの媒体プロンプトを設定し、保存するとコンテンツ作成画面へ移動します。
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => window.history.back()}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="戻る"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">プロンプト設定</h2>
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            デフォルトに戻す
          </button>
        </div>

        {/* タブメニュー */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('character')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'character'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              キャラクター設定
            </button>
            <button
              onClick={() => setActiveTab('platforms')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'platforms'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              媒体別プロンプト
            </button>
          </nav>
        </div>

        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* キャラクター設定タブ */}
        {activeTab === 'character' && (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <label
                htmlFor="global-character-prompt"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                グローバルキャラクタープロンプト
              </label>
              <textarea
                id="global-character-prompt"
                value={editingUserSettings.globalCharacterPrompt || ''}
                onChange={(e) => handleCharacterPromptChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={5}
                placeholder="あなたのキャラクター（人格・トーン・専門性など）を定義してください。この設定は全ての媒体での生成に共通して適用されます。"
              />
              <p className="text-xs text-gray-500 mt-2">
                全ての媒体でのコンテンツ生成に共通して適用されるキャラクター設定です。あなたの人格、トーン、専門性などを記述してください。
              </p>
            </div>
          </div>
        )}

        {/* 媒体別プロンプトタブ */}
        {activeTab === 'platforms' && (
          <div className="space-y-4">
            {(Object.keys(platformLabels) as Platform[]).map((platform) => (
              <div key={platform} className="border border-gray-200 rounded-lg p-4">
                <label
                  htmlFor={`prompt-${platform}`}
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {platformLabels[platform]}
                </label>
                <textarea
                  id={`prompt-${platform}`}
                  value={editingPrompts[platform] || ''}
                  onChange={(e) => handlePromptChange(platform, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder={`${platformLabels[platform]}用のプロンプトを入力してください`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
          {isEditing && (
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">使い方</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <div>
            <p className="font-medium">キャラクター設定</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>全ての媒体に共通して適用されるあなたのキャラクター（人格・トーン・専門性など）を設定</li>
              <li>コンテンツ生成時、このキャラクター設定が最初に適用されます</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">媒体別プロンプト</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>各プラットフォーム特有の投稿形式や制約に対応するプロンプト</li>
              <li>キャラクター設定の後に適用され、媒体ごとの最適化を行います</li>
              <li>空の場合はデフォルトのプロンプトが使用されます</li>
            </ul>
          </div>
          <p className="text-xs text-blue-600 bg-blue-100 rounded px-2 py-1">
            「デフォルトに戻す」をクリックすると、全ての設定がリセットされます
          </p>
        </div>
      </div>
    </div>
  );
}
