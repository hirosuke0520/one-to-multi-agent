"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Platform =
  | "twitter"
  | "instagram"
  | "tiktok"
  | "threads"
  | "youtube"
  | "blog";

interface Prompts {
  [key: string]: string;
}

const platformLabels: Record<Platform, string> = {
  twitter: "X (Twitter)",
  instagram: "Instagram",
  tiktok: "TikTok",
  threads: "Threads",
  youtube: "YouTube",
  blog: "WordPress",
};

const platformPlaceholders: Record<Platform, string> = {
  twitter:
    "Twitterに最適化されたコンテンツを生成してください。280文字以内で簡潔に、ハッシュタグを効果的に使用してください。",
  instagram:
    "Instagramに最適化された視覚的に魅力的なコンテンツを生成してください。ハッシュタグとエンゲージメントを重視してください。",
  tiktok:
    "TikTokに最適化されたバイラル性を意識したコンテンツを生成してください。トレンドとエンターテイメント性を重視してください。",
  threads:
    "Threadsに最適化された会話を促すコンテンツを生成してください。親しみやすくコミュニティ感を大切にしてください。",
  youtube:
    "YouTubeに最適化されたコンテンツを生成してください。視聴者維持率と検索最適化を意識してください。",
  blog: "WordPressに最適化されたSEOを意識した詳細なコンテンツを生成してください。読みやすさと価値提供を重視してください。",
};

interface CombinedPromptFormProps {
  initialPrompts: Prompts;
  initialCharacterPrompt: string;
  token: string;
}

export function CombinedPromptForm({
  initialPrompts,
  initialCharacterPrompt,
  token,
}: CombinedPromptFormProps) {
  const router = useRouter();

  // 媒体別プロンプト関連
  const [prompts, setPrompts] = useState<Prompts>(() => ({
    ...initialPrompts,
  }));
  const [editingPrompts, setEditingPrompts] = useState<Prompts>(() => ({
    ...initialPrompts,
  }));
  const [promptsSaving, setPromptsSaving] = useState(false);
  const [promptsMessage, setPromptsMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isEditingPrompts, setIsEditingPrompts] = useState(false);

  // キャラクタープロンプト関連
  const [characterPrompt, setCharacterPrompt] = useState(
    initialCharacterPrompt
  );
  const [editingCharacterPrompt, setEditingCharacterPrompt] = useState(
    initialCharacterPrompt
  );
  const [characterSaving, setCharacterSaving] = useState(false);
  const [characterMessage, setCharacterMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  useEffect(() => {
    setPrompts({ ...initialPrompts });
    setEditingPrompts({ ...initialPrompts });
    setIsEditingPrompts(false);
  }, [initialPrompts]);

  useEffect(() => {
    setCharacterPrompt(initialCharacterPrompt);
    setEditingCharacterPrompt(initialCharacterPrompt);
    setIsEditingCharacter(false);
  }, [initialCharacterPrompt]);

  // 媒体別プロンプト保存
  const handlePromptsSave = async () => {
    setPromptsSaving(true);
    setPromptsMessage(null);

    try {
      const response = await fetch(`${apiUrl}/prompts/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompts: editingPrompts }),
      });

      if (!response.ok) {
        throw new Error("Failed to save prompts");
      }

      setPrompts({ ...editingPrompts });
      setIsEditingPrompts(false);
      setPromptsMessage({
        type: "success",
        text: "媒体別プロンプトを保存しました",
      });
    } catch (error) {
      console.error("Failed to save prompts:", error);
      if (error instanceof Error && error.message.includes("fetch")) {
        setPromptsMessage({
          type: "error",
          text: "APIサーバーに接続できません。ローカル環境では正常です。",
        });
      } else {
        setPromptsMessage({
          type: "error",
          text: "媒体別プロンプトの保存に失敗しました",
        });
      }
    } finally {
      setPromptsSaving(false);
    }
  };

  // キャラクタープロンプト保存
  const handleCharacterSave = async () => {
    setCharacterSaving(true);
    setCharacterMessage(null);

    try {
      const response = await fetch(
        `${apiUrl}/user-settings/global-character-prompt`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ prompt: editingCharacterPrompt }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save global character prompt");
      }

      const data = await response.json();
      setCharacterPrompt(data.globalCharacterPrompt || editingCharacterPrompt);
      setIsEditingCharacter(false);
      setCharacterMessage({
        type: "success",
        text: "キャラクタープロンプトを保存しました",
      });
    } catch (error) {
      console.error("Failed to save global character prompt:", error);
      if (error instanceof Error && error.message.includes("fetch")) {
        setCharacterMessage({
          type: "error",
          text: "APIサーバーに接続できません。ローカル環境では正常です。",
        });
      } else {
        setCharacterMessage({
          type: "error",
          text: "キャラクタープロンプトの保存に失敗しました",
        });
      }
    } finally {
      setCharacterSaving(false);
    }
  };

  // 媒体別プロンプトリセット
  const handlePromptsReset = async () => {
    if (!confirm("全ての媒体別プロンプトをデフォルトに戻しますか？")) {
      return;
    }

    setPromptsSaving(true);
    setPromptsMessage(null);

    try {
      const response = await fetch(`${apiUrl}/prompts`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to reset prompts");
      }

      // ローカル状態を空にリセット（placeholderが表示される）
      setPrompts({});
      setEditingPrompts({});
      setIsEditingPrompts(false);
      setPromptsMessage({
        type: "success",
        text: "媒体別プロンプトをデフォルトに戻しました",
      });
    } catch (error) {
      console.error("Failed to reset prompts:", error);
      setPromptsMessage({
        type: "error",
        text: "媒体別プロンプトのリセットに失敗しました",
      });
    } finally {
      setPromptsSaving(false);
    }
  };

  // キャラクタープロンプトリセット
  const handleCharacterReset = async () => {
    if (!confirm("キャラクタープロンプトをデフォルトに戻しますか？")) {
      return;
    }

    setCharacterSaving(true);
    setCharacterMessage(null);

    try {
      const response = await fetch(
        `${apiUrl}/user-settings/global-character-prompt`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reset global character prompt");
      }

      const data = await response.json();
      setCharacterPrompt(data.globalCharacterPrompt);
      setEditingCharacterPrompt(data.globalCharacterPrompt);
      setIsEditingCharacter(false);
      setCharacterMessage({
        type: "success",
        text: "キャラクタープロンプトをデフォルトに戻しました",
      });
    } catch (error) {
      console.error("Failed to reset global character prompt:", error);
      setCharacterMessage({
        type: "error",
        text: "キャラクタープロンプトのリセットに失敗しました",
      });
    } finally {
      setCharacterSaving(false);
    }
  };

  const handlePromptsCancel = () => {
    setEditingPrompts({ ...prompts });
    setIsEditingPrompts(false);
  };

  const handleCharacterCancel = () => {
    setEditingCharacterPrompt(characterPrompt);
    setIsEditingCharacter(false);
  };

  const handlePromptChange = (platform: Platform, value: string) => {
    setEditingPrompts((prev) => ({ ...prev, [platform]: value }));
    setIsEditingPrompts(true);
  };

  const handleCharacterPromptChange = (value: string) => {
    setEditingCharacterPrompt(value);
    setIsEditingCharacter(true);
  };

  return (
    <div className="space-y-8">
      {/* ページヘッダーと戻るボタン */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">プロンプト設定</h1>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          コンテンツ作成に戻る
        </button>
      </div>

      {/* キャラクター設定セクション */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-400">キャラクター設定</h2>
          <button
            onClick={handleCharacterReset}
            className="text-sm text-gray-400 hover:text-gray-200 underline"
          >
            デフォルトに戻す
          </button>
        </div>

        {characterMessage && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              characterMessage.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {characterMessage.text}
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
              value={editingCharacterPrompt}
              onChange={(e) => handleCharacterPromptChange(e.target.value)}
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
                {editingCharacterPrompt.length}/5000
              </p>
            </div>
          </div>
        </div>

        {/* キャラクター保存ボタン - 常に表示 */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-700">
          {isEditingCharacter && (
            <button
              onClick={handleCharacterCancel}
              disabled={characterSaving}
              className="px-6 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
          )}
          <button
            onClick={handleCharacterSave}
            disabled={characterSaving || editingCharacterPrompt.length > 5000}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {characterSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              "キャラクタープロンプトを保存"
            )}
          </button>
        </div>
      </div>

      {/* 媒体別プロンプト設定セクション */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-400">
            媒体別プロンプト設定
          </h2>
          <button
            onClick={handlePromptsReset}
            className="text-sm text-gray-400 hover:text-gray-200 underline"
          >
            デフォルトに戻す
          </button>
        </div>

        {promptsMessage && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              promptsMessage.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {promptsMessage.text}
          </div>
        )}

        <div className="space-y-4">
          {(Object.keys(platformLabels) as Platform[]).map((platform) => (
            <div
              key={platform}
              className="border border-gray-600 rounded-lg p-4 bg-gray-800"
            >
              <label
                htmlFor={`prompt-${platform}`}
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                {platformLabels[platform]}
              </label>
              <textarea
                id={`prompt-${platform}`}
                value={editingPrompts[platform] || ""}
                onChange={(e) => handlePromptChange(platform, e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder={platformPlaceholders[platform]}
              />
            </div>
          ))}
        </div>

        {/* 媒体別プロンプト保存ボタン - 常に表示 */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-700">
          {isEditingPrompts && (
            <button
              onClick={handlePromptsCancel}
              disabled={promptsSaving}
              className="px-6 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
          )}
          <button
            onClick={handlePromptsSave}
            disabled={promptsSaving}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {promptsSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              "媒体別プロンプトを保存"
            )}
          </button>
        </div>
      </div>

      {/* 使い方説明 */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h3 className="font-semibold text-blue-400 mb-2">使い方</h3>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>
            <strong>キャラクター設定:</strong>{" "}
            全てのプラットフォームで共通して使用される基本的なキャラクター設定です
          </li>
          <li>
            <strong>媒体別プロンプト設定:</strong>{" "}
            各プラットフォーム用のプロンプトをカスタマイズできます
          </li>
          <li>
            実際のコンテンツ生成時は、キャラクタープロンプト +
            プラットフォーム固有プロンプトが統合されて使用されます
          </li>
          <li>空のプロンプトの場合はデフォルトのプロンプトが使用されます</li>
          <li>各セクションの保存ボタンは独立して動作します</li>
        </ul>
      </div>
    </div>
  );
}
