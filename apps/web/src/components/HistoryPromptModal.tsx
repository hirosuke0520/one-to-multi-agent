'use client';

import { useState, useEffect } from 'react';

interface HistoryPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  platforms: string[];
  token: string;
}

interface HistoryPrompt {
  platform: string;
  generationPrompt?: string;
  globalCharacterPrompt?: string;
  platformPrompt?: string;
  combinedPrompt?: string;
  customPrompt?: string;
}

const platformLabels: Record<string, string> = {
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  threads: 'Threads',
  youtube: 'YouTube',
  wordpress: 'WordPress（ブログ）',
  blog: 'ブログ'
};

export function HistoryPromptModal({
  isOpen,
  onClose,
  threadId,
  platforms,
  token
}: HistoryPromptModalProps) {
  const [prompts, setPrompts] = useState<HistoryPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  useEffect(() => {
    if (isOpen) {
      fetchHistoryPrompts();
    }
  }, [isOpen, threadId]);

  const fetchHistoryPrompts = async () => {
    setLoading(true);
    setError(null);

    try {
      // 履歴データからプロンプト情報を取得
      const response = await fetch(`${apiUrl}/history/${threadId}/prompts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        // APIエンドポイントが存在しない場合は、デフォルトメッセージを表示
        if (response.status === 404) {
          setPrompts(platforms.map(platform => ({
            platform,
            generationPrompt: '履歴からプロンプト情報を取得できませんでした。この機能は今後のバージョンで利用可能になります。'
          })));
        } else {
          throw new Error('Failed to fetch history prompts');
        }
      } else {
        const data = await response.json();
        if (data.success === false) {
          throw new Error(data.error || 'Failed to fetch history prompts');
        }
        setPrompts(data.prompts || []);
      }
    } catch (error) {
      console.error('Error fetching history prompts:', error);
      // エラー時はプレースホルダーメッセージを表示
      setPrompts(platforms.map(platform => ({
        platform,
        generationPrompt: '履歴からプロンプト情報を取得できませんでした。'
      })));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotification(`${label}をコピーしました`);
      setTimeout(() => setCopyNotification(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            使用されたプロンプト
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
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">プロンプト情報を取得中...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              {prompts.map((promptData) => {
                const label = platformLabels[promptData.platform] || promptData.platform;

                return (
                  <div key={promptData.platform} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">{label}</h3>

                    {promptData.generationPrompt ? (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              生成時に使用されたプロンプト
                            </label>
                            <button
                              onClick={() => copyToClipboard(promptData.generationPrompt!, `${label}のプロンプト`)}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              コピー
                            </button>
                          </div>
                          <textarea
                            value={promptData.generationPrompt}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 resize-none focus:outline-none"
                            rows={6}
                          />
                        </div>

                        {promptData.globalCharacterPrompt && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                グローバルキャラクタープロンプト
                              </label>
                              <button
                                onClick={() => copyToClipboard(promptData.globalCharacterPrompt!, 'グローバルキャラクタープロンプト')}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                コピー
                              </button>
                            </div>
                            <textarea
                              value={promptData.globalCharacterPrompt}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 resize-none focus:outline-none"
                              rows={3}
                            />
                          </div>
                        )}

                        {promptData.platformPrompt && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                プラットフォーム固有プロンプト
                              </label>
                              <button
                                onClick={() => copyToClipboard(promptData.platformPrompt!, 'プラットフォーム固有プロンプト')}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                コピー
                              </button>
                            </div>
                            <textarea
                              value={promptData.platformPrompt}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 resize-none focus:outline-none"
                              rows={3}
                            />
                          </div>
                        )}

                        {promptData.customPrompt && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                一時プロンプト
                              </label>
                              <button
                                onClick={() => copyToClipboard(promptData.customPrompt!, '一時プロンプト')}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                コピー
                              </button>
                            </div>
                            <textarea
                              value={promptData.customPrompt}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 resize-none focus:outline-none"
                              rows={3}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        このプラットフォームのプロンプト情報は利用できません。
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              ※ プロンプト情報は生成時のスナップショットです
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>

        {/* Copy notification */}
        {copyNotification && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-60">
            {copyNotification}
          </div>
        )}
      </div>
    </div>
  );
}
