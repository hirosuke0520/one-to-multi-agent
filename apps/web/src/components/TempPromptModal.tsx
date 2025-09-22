'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// type Platform = 'twitter' | 'instagram' | 'tiktok' | 'threads' | 'youtube' | 'blog';

interface TempPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlatforms: string[];
  onSavePrompts: (prompts: Record<string, string>) => void;
  initialPrompts: Record<string, string>;
  token: string;
}

const platformLabels: Record<string, string> = {
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  threads: 'Threads',
  youtube: 'YouTube',
  wordpress: 'WordPress（ブログ）'
};

const platformMapping: Record<string, string> = {
  wordpress: 'blog'
};

export function TempPromptModal({
  isOpen,
  onClose,
  selectedPlatforms,
  onSavePrompts,
  initialPrompts,
  token
}: TempPromptModalProps) {
  const [tempPrompts, setTempPrompts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  // プラットフォームIDを正規化（wordpress -> blog）
  const normalizedPlatforms = useMemo(() =>
    selectedPlatforms.map(p => platformMapping[p] || p),
    [selectedPlatforms]
  );


  useEffect(() => {
    if (isOpen) {
      // 初期プロンプトを設定
      const initial: Record<string, string> = {};
      normalizedPlatforms.forEach(platform => {
        initial[platform] = initialPrompts[platform] || '';
      });
      setTempPrompts(initial);

    }
  }, [isOpen, normalizedPlatforms, initialPrompts]);

  const handlePromptChange = (platform: string, value: string) => {
    setTempPrompts(prev => ({ ...prev, [platform]: value }));
  };

  const handleSaveToDatabase = async () => {
    setLoading(true);
    try {
      // データベースに保存
      const response = await fetch(`${apiUrl}/prompts/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompts: tempPrompts })
      });

      if (!response.ok) {
        throw new Error('Failed to save prompts to database');
      }

      // 一時プロンプトとしても設定
      onSavePrompts(tempPrompts);
      onClose();
    } catch (error) {
      console.error('Error saving prompts to database:', error);
      alert('プロンプトの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUseForGeneration = () => {
    // 今回の生成にのみ使用
    onSavePrompts(tempPrompts);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            一時プロンプト設定
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {normalizedPlatforms.map((platform) => {
              const displayPlatform = Object.keys(platformMapping).find(key => platformMapping[key] === platform) || platform;
              const label = platformLabels[displayPlatform] || displayPlatform;

              return (
                <div key={platform} className="border border-gray-200 rounded-lg p-4">
                  <label
                    htmlFor={`temp-prompt-${platform}`}
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {label}
                  </label>
                  <textarea
                    id={`temp-prompt-${platform}`}
                    value={tempPrompts[platform] || ''}
                    onChange={(e) => handlePromptChange(platform, e.target.value)}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 bg-white text-black"
                    style={{
                      minHeight: '100px',
                      lineHeight: '1.5',
                      color: '#000000 !important',
                      backgroundColor: '#ffffff !important',
                      fontSize: '16px',
                      fontFamily: 'Arial, sans-serif'
                    }}
                    rows={4}
                    placeholder={`${label}用のプロンプトを入力してください (空の場合はデフォルトプロンプトが使用されます)`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleUseForGeneration}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              今回の生成に使用
            </button>
            <button
              onClick={handleSaveToDatabase}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  保存中...
                </>
              ) : (
                '設定を保存して使用'
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            ※「今回の生成に使用」は一時的に使用し、「設定を保存して使用」はデータベースに保存して今後も使用します
          </p>
        </div>
      </div>
    </div>
  );
}