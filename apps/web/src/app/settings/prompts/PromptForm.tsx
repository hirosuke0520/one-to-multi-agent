'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Platform = 'twitter' | 'instagram' | 'tiktok' | 'threads' | 'youtube' | 'blog';

interface Prompts {
  [key: string]: string;
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
  combinedPrompts: Prompts;
  token: string;
}

export function PromptForm({ initialPrompts, combinedPrompts, token }: PromptFormProps) {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompts>(initialPrompts);
  const [editingPrompts, setEditingPrompts] = useState<Prompts>(initialPrompts);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCombined, setShowCombined] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/prompts/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompts: editingPrompts })
      });

      if (!response.ok) {
        throw new Error('Failed to save prompts');
      }
      
      setPrompts(editingPrompts);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'プロンプトを保存しました' });
      router.refresh();
    } catch (error) {
      console.error('Failed to save prompts:', error);
      setMessage({ type: 'error', text: 'プロンプトの保存に失敗しました' });
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
    setIsEditing(false);
  };

  const handlePromptChange = (platform: Platform, value: string) => {
    setEditingPrompts(prev => ({ ...prev, [platform]: value }));
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-400">プロンプト設定</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCombined(!showCombined)}
              className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                showCombined
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {showCombined ? '編集モード' : '統合プロンプト表示'}
            </button>
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-gray-200 underline"
            >
              デフォルトに戻す
            </button>
          </div>
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

        <div className="space-y-4">
          {(Object.keys(platformLabels) as Platform[]).map((platform) => (
            <div key={platform} className="border border-gray-600 rounded-lg p-4 bg-gray-800">
              <label
                htmlFor={`prompt-${platform}`}
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                {platformLabels[platform]}
                {showCombined && (
                  <span className="ml-2 text-xs text-blue-400">(統合プロンプト)</span>
                )}
              </label>
              <textarea
                id={`prompt-${platform}`}
                value={showCombined ? combinedPrompts[platform] || '' : editingPrompts[platform] || ''}
                onChange={!showCombined ? (e) => handlePromptChange(platform, e.target.value) : undefined}
                className={`w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  showCombined ? 'bg-gray-600' : ''
                }`}
                rows={showCombined ? 6 : 3}
                placeholder={
                  showCombined
                    ? 'キャラクタープロンプト + プラットフォーム固有プロンプトの統合表示'
                    : `${platformLabels[platform]}用のプロンプトを入力してください`
                }
                readOnly={showCombined}
              />
              {showCombined && (
                <p className="text-xs text-gray-400 mt-2">
                  ※ 実際の生成時に使用される統合プロンプトです（読み取り専用）
                </p>
              )}
            </div>
          ))}
        </div>

        {isEditing && !showCombined && (
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
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
        )}
      </div>

      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h3 className="font-semibold text-blue-400 mb-2">使い方</h3>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>各プラットフォーム用のプロンプトをカスタマイズできます</li>
          <li>「統合プロンプト表示」で実際の生成時に使用される完全なプロンプトを確認できます</li>
          <li>統合プロンプト = キャラクタープロンプト + プラットフォーム固有プロンプト</li>
          <li>空のプロンプトの場合はデフォルトのプロンプトが使用されます</li>
          <li>「デフォルトに戻す」をクリックすると、全てのプロンプトがリセットされます</li>
        </ul>
      </div>
    </div>
  );
}