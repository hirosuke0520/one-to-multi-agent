'use client';

import { useState, useEffect } from 'react';

type Platform = 'twitter' | 'instagram' | 'tiktok' | 'threads' | 'youtube' | 'blog';

export interface TempPrompt {
  platform: Platform;
  prompt: string;
}

interface TempPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  platforms: string[];
  onSave: (prompts: TempPrompt[]) => void;
  onSaveToDb?: (prompts: TempPrompt[]) => Promise<void>;
  initialPrompts?: TempPrompt[];
}

const platformLabels: Record<Platform, string> = {
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  threads: 'Threads',
  youtube: 'YouTube',
  blog: 'ブログ'
};

export function TempPromptModal({
  isOpen,
  onClose,
  platforms,
  onSave,
  onSaveToDb,
  initialPrompts = []
}: TempPromptModalProps) {
  const [tempPrompts, setTempPrompts] = useState<TempPrompt[]>([]);
  const [isSavingToDb, setIsSavingToDb] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // モーダルが開かれた時、選択されたプラットフォームに対応するプロンプトを初期化
      const newPrompts: TempPrompt[] = platforms
        .filter(p => ['twitter', 'instagram', 'tiktok', 'threads', 'youtube', 'blog'].includes(p))
        .map(platform => {
          const existingPrompt = initialPrompts.find(p => p.platform === platform);
          return {
            platform: platform as Platform,
            prompt: existingPrompt?.prompt || ''
          };
        });
      setTempPrompts(newPrompts);
    }
  }, [isOpen, platforms, initialPrompts]);

  const handlePromptChange = (platform: Platform, prompt: string) => {
    setTempPrompts(prev => 
      prev.map(p => 
        p.platform === platform ? { ...p, prompt } : p
      )
    );
  };

  const handleSave = () => {
    // 空でないプロンプトのみを保存
    const validPrompts = tempPrompts.filter(p => p.prompt.trim().length > 0);
    onSave(validPrompts);
    onClose();
  };

  const handleClear = () => {
    setTempPrompts(prev => prev.map(p => ({ ...p, prompt: '' })));
  };

  const handleSaveToDb = async () => {
    if (!onSaveToDb) return;

    setIsSavingToDb(true);
    try {
      const validPrompts = tempPrompts.filter(p => p.prompt.trim().length > 0);
      await onSaveToDb(validPrompts);
      onClose();
    } catch (error) {
      console.error('Failed to save prompts to database:', error);
      // エラーハンドリング（必要に応じてtoastやalertを表示）
    } finally {
      setIsSavingToDb(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            一時プロンプト設定
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="space-y-2">
              <p className="text-sm text-blue-800">
                <strong>一時プロンプト</strong>: 今回のコンテンツ生成のみに適用されます（保存されません）
              </p>
              <p className="text-sm text-blue-700">
                <strong>DBに保存</strong>: プロンプトを永続的に保存し、今後のコンテンツ生成で利用できます
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {tempPrompts.map((tempPrompt) => (
              <div key={tempPrompt.platform} className="border border-gray-200 rounded-lg p-4">
                <label
                  htmlFor={`temp-prompt-${tempPrompt.platform}`}
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {platformLabels[tempPrompt.platform]}
                </label>
                <textarea
                  id={`temp-prompt-${tempPrompt.platform}`}
                  value={tempPrompt.prompt}
                  onChange={(e) => handlePromptChange(tempPrompt.platform, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder={`${platformLabels[tempPrompt.platform]}向けの一時的な追加指示を入力（任意）`}
                />
              </div>
            ))}
          </div>

          {tempPrompts.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              対象となるプラットフォームが選択されていません。
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
          >
            すべてクリア
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              一時適用
            </button>
            {onSaveToDb && (
              <button
                onClick={handleSaveToDb}
                disabled={isSavingToDb}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
              >
                {isSavingToDb ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>保存中...</span>
                  </div>
                ) : (
                  'DBに保存'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}