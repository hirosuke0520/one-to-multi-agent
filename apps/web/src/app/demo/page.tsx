'use client';

import { useState } from 'react';
import { HistoryPromptModal } from '@/components/HistoryPromptModal';
import { TempPromptModal } from '@/components/TempPromptModal';

const platformLabels = {
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  threads: 'Threads',
  youtube: 'YouTube',
  blog: 'ブログ'
};

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'character' | 'platforms'>('character');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTempModal, setShowTempModal] = useState(false);
  const [globalCharacterPrompt, setGlobalCharacterPrompt] = useState(
    'あなたは親しみやすく、創造性豊かなコンテンツクリエイターです。読者・視聴者に価値のある情報を分かりやすく、魅力的に伝えることを心がけています。'
  );

  const [prompts, setPrompts] = useState({
    twitter: 'X(Twitter)向けの短く魅力的な投稿を作成してください。280文字以内でインパクトのある内容にしてください。',
    instagram: 'Instagram向けの視覚的に魅力的なキャプションを作成してください。ハッシュタグも含めて2200文字以内でお願いします。',
    tiktok: 'TikTok向けのトレンドを意識した短い動画説明を作成してください。若者に響く内容にしてください。',
    threads: 'Threads向けの会話を促すような投稿を作成してください。コミュニティ感を大切にした内容でお願いします。',
    youtube: 'YouTube向けの魅力的なタイトルと説明文を作成してください。SEOを意識した内容でお願いします。',
    blog: 'ブログ記事向けの詳細で価値のあるコンテンツを作成してください。読者にとって有益な情報を提供してください。'
  });

  const demoPromptInfo = {
    characterPrompt: globalCharacterPrompt,
    platformPrompt: prompts.twitter,
    generationPrompt: `${globalCharacterPrompt}\n\n${prompts.twitter}\n\n今回の追加指示: デモ用のサンプルコンテンツを生成してください。`
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">プロンプト設定画面デモ</h1>

        {/* タブ切り替え */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('character')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'character'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                キャラクター設定
              </button>
              <button
                onClick={() => setActiveTab('platforms')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'platforms'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                プラットフォーム別プロンプト
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'character' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="globalCharacterPrompt" className="block text-sm font-medium text-gray-700 mb-2">
                    グローバルキャラクタープロンプト
                  </label>
                  <textarea
                    id="globalCharacterPrompt"
                    value={globalCharacterPrompt}
                    onChange={(e) => setGlobalCharacterPrompt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={6}
                    placeholder="全プラットフォーム共通のキャラクター設定を入力してください"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    このプロンプトは全てのプラットフォームのコンテンツ生成で使用されます。
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'platforms' && (
              <div className="space-y-6">
                {Object.entries(platformLabels).map(([platform, label]) => (
                  <div key={platform}>
                    <label htmlFor={platform} className="block text-sm font-medium text-gray-700 mb-2">
                      {label}
                    </label>
                    <textarea
                      id={platform}
                      value={prompts[platform as keyof typeof prompts]}
                      onChange={(e) => setPrompts(prev => ({ ...prev, [platform]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder={`${label}向けのプロンプトを入力してください`}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
              <div className="space-x-4">
                <button
                  onClick={() => setShowTempModal(true)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  一時プロンプト設定
                </button>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  履歴プロンプト表示
                </button>
              </div>
              <div className="space-x-3">
                <button className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  キャンセル
                </button>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* デモ説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-900 mb-2">実装された機能</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✅ グローバルキャラクター設定（全プラットフォーム共通）</li>
            <li>✅ プラットフォーム別プロンプト設定</li>
            <li>✅ 一時プロンプト機能（セッションのみ）</li>
            <li>✅ プロンプト履歴表示とコピー機能</li>
            <li>✅ レスポンシブデザイン対応</li>
          </ul>
        </div>
      </div>

      {/* モーダル */}
      <HistoryPromptModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        platform="twitter"
        prompts={demoPromptInfo}
      />

      <TempPromptModal
        isOpen={showTempModal}
        onClose={() => setShowTempModal(false)}
        platforms={['twitter', 'instagram', 'tiktok']}
        onSave={(tempPrompts) => {
          console.log('一時プロンプト保存:', tempPrompts);
          setShowTempModal(false);
        }}
      />
    </div>
  );
}