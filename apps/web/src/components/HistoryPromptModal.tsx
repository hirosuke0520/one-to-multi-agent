'use client';

import { useState } from 'react';

export interface PromptInfo {
  characterPrompt?: string;
  platformPrompt?: string;
  generationPrompt?: string;
}

interface HistoryPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  prompts: PromptInfo;
}

const platformLabels: Record<string, string> = {
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  threads: 'Threads',
  youtube: 'YouTube',
  blog: 'ブログ',
  wordpress: 'WordPress'
};

export function HistoryPromptModal({ isOpen, onClose, platform, prompts }: HistoryPromptModalProps) {
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(type);
      setTimeout(() => setCopiedPrompt(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!isOpen) return null;

  const platformName = platformLabels[platform] || platform;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            使用プロンプト - {platformName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-150px)] space-y-6">
          {/* キャラクタープロンプト */}
          {prompts.characterPrompt && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  キャラクタープロンプト
                </h3>
                <button
                  onClick={() => copyToClipboard(prompts.characterPrompt!, 'character')}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-300 rounded hover:bg-blue-50"
                >
                  {copiedPrompt === 'character' ? 'コピー済み!' : 'コピー'}
                </button>
              </div>
              <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded border">
                <pre className="whitespace-pre-wrap font-sans">{prompts.characterPrompt}</pre>
              </div>
            </div>
          )}

          {/* 媒体別プロンプト */}
          {prompts.platformPrompt && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {platformName}向けプロンプト
                </h3>
                <button
                  onClick={() => copyToClipboard(prompts.platformPrompt!, 'platform')}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-300 rounded hover:bg-blue-50"
                >
                  {copiedPrompt === 'platform' ? 'コピー済み!' : 'コピー'}
                </button>
              </div>
              <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded border">
                <pre className="whitespace-pre-wrap font-sans">{prompts.platformPrompt}</pre>
              </div>
            </div>
          )}

          {/* 生成時プロンプト（一時プロンプトを含む統合プロンプト） */}
          {prompts.generationPrompt && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  実際の生成プロンプト
                </h3>
                <button
                  onClick={() => copyToClipboard(prompts.generationPrompt!, 'generation')}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-300 rounded hover:bg-blue-50"
                >
                  {copiedPrompt === 'generation' ? 'コピー済み!' : 'コピー'}
                </button>
              </div>
              <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded border">
                <pre className="whitespace-pre-wrap font-sans">{prompts.generationPrompt}</pre>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                キャラクター設定、媒体別設定、一時プロンプトが統合された実際にAIに送信されたプロンプトです。
              </p>
            </div>
          )}

          {/* プロンプト情報がない場合 */}
          {!prompts.characterPrompt && !prompts.platformPrompt && !prompts.generationPrompt && (
            <div className="text-center text-gray-500 py-8">
              このコンテンツに関するプロンプト情報は保存されていません。
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}