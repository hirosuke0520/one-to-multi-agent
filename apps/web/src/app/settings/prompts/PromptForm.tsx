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
  token: string;
}

export function PromptForm({ initialPrompts, token }: PromptFormProps) {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompts>(initialPrompts);
  const [editingPrompts, setEditingPrompts] = useState<Prompts>(initialPrompts);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">プロンプト設定</h2>
          <button
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            デフォルトに戻す
          </button>
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

        {isEditing && (
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">使い方</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>各プラットフォーム用のプロンプトをカスタマイズできます</li>
          <li>プロンプトは自動的にコンテンツ生成時に使用されます</li>
          <li>空のプロンプトの場合はデフォルトのプロンプトが使用されます</li>
          <li>「デフォルトに戻す」をクリックすると、全てのプロンプトがリセットされます</li>
        </ul>
      </div>
    </div>
  );
}