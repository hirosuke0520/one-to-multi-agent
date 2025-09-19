'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CharacterPromptFormProps {
  initialPrompt: string;
  token: string;
}

export function CharacterPromptForm({ initialPrompt, token }: CharacterPromptFormProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [editingPrompt, setEditingPrompt] = useState(initialPrompt);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/user-settings/global-character-prompt`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: editingPrompt })
      });

      if (!response.ok) {
        throw new Error('Failed to save global character prompt');
      }

      const data = await response.json();
      setPrompt(data.globalCharacterPrompt);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'キャラクタープロンプトを保存しました' });
      router.refresh();
    } catch (error) {
      console.error('Failed to save global character prompt:', error);
      setMessage({ type: 'error', text: 'キャラクタープロンプトの保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('キャラクタープロンプトをデフォルトに戻しますか？')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiUrl}/user-settings/global-character-prompt`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reset global character prompt');
      }

      const data = await response.json();
      setPrompt(data.globalCharacterPrompt);
      setEditingPrompt(data.globalCharacterPrompt);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'キャラクタープロンプトをデフォルトに戻しました' });
      router.refresh();
    } catch (error) {
      console.error('Failed to reset global character prompt:', error);
      setMessage({ type: 'error', text: 'キャラクタープロンプトのリセットに失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingPrompt(prompt);
    setIsEditing(false);
  };

  const handlePromptChange = (value: string) => {
    setEditingPrompt(value);
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-400">キャラクター設定</h2>
          <button
            onClick={handleReset}
            className="text-sm text-gray-400 hover:text-gray-200 underline"
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
          <div>
            <label
              htmlFor="global-character-prompt"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              全プラットフォーム共通キャラクタープロンプト
            </label>
            <p className="text-sm text-gray-400 mb-3">
              このプロンプトは全てのSNSプラットフォームでのコンテンツ生成時に共通して使用されます。あなたのキャラクターやトーン、目的を設定してください。
            </p>
            <textarea
              id="global-character-prompt"
              value={editingPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={6}
              placeholder="例：あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。"
              maxLength={5000}
            />
            <div className="flex justify-between mt-2">
              <p className="text-xs text-gray-500">
                最大5000文字まで入力できます
              </p>
              <p className="text-xs text-gray-500">
                {editingPrompt.length}/5000
              </p>
            </div>
          </div>
        </div>

        {isEditing && (
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
              disabled={saving || editingPrompt.length > 5000}
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
        <h3 className="font-semibold text-blue-400 mb-2">キャラクタープロンプトとは？</h3>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>全てのプラットフォームで共通して使用される基本的なキャラクター設定です</li>
          <li>あなたの口調、専門分野、目的、価値観などを設定してください</li>
          <li>各プラットフォーム専用のプロンプトと組み合わせて使用されます</li>
          <li>一貫性のあるブランディングとコンテンツ作成に役立ちます</li>
        </ul>
      </div>
    </div>
  );
}