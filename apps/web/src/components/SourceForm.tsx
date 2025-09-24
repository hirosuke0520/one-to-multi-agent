"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useSession } from "next-auth/react";
import { TempPromptModal } from "./TempPromptModal";

interface SourceFormProps {
  sourceType: "text" | "audio" | "video";
  setSourceType: (value: "text" | "audio" | "video") => void;
  content: string;
  setContent: (value: string) => void;
  setFile: (file: File | null) => void;
  targets: string[];
  setTargets: (value: string[]) => void;
  isProcessing: boolean;
  handleSubmit: (e: FormEvent, customPrompts?: Record<string, string>) => void;
  isAuthenticated?: boolean;
  tempPrompts?: Record<string, string>;
  modifiedPrompts?: Record<string, boolean>;
  onTempPromptsChange?: (prompts: Record<string, string>) => void;
}

const platformOptions = [
  { id: "threads", name: "Threads" },
  { id: "wordpress", name: "WordPress" },
  { id: "youtube", name: "YouTube" },
  { id: "twitter", name: "X (Twitter)" },
  { id: "instagram", name: "Instagram" },
  { id: "tiktok", name: "TikTok" },
];

export const SourceForm = ({
  sourceType,
  setSourceType,
  content,
  setContent,
  setFile,
  targets,
  setTargets,
  isProcessing,
  handleSubmit,
  tempPrompts = {},
  modifiedPrompts = {},
  onTempPromptsChange,
}: SourceFormProps) => {
  const { data: session } = useSession();
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  const normalizePlatformId = (platform: string) =>
    platform === "wordpress" ? "blog" : platform;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleTargetToggle = (target: string) => {
    setTargets(
      targets.includes(target)
        ? targets.filter((t) => t !== target)
        : [...targets, target]
    );
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, tempPrompts)} className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">
          1. 入力タイプを選択
        </h2>
        <div className="flex space-x-4">
          <label className="text-gray-300">
            <input
              type="radio"
              value="text"
              checked={sourceType === "text"}
              onChange={() => setSourceType("text")}
              className="mr-2 accent-blue-500"
            />
            テキスト
          </label>
          <label className="text-gray-300">
            <input
              type="radio"
              value="audio"
              checked={sourceType === "audio"}
              onChange={() => setSourceType("audio")}
              className="mr-2 accent-blue-500"
            />
            音声
          </label>
          <label className="text-gray-300">
            <input
              type="radio"
              value="video"
              checked={sourceType === "video"}
              onChange={() => setSourceType("video")}
              className="mr-2 accent-blue-500"
            />
            動画
          </label>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">
          2. コンテンツ入力
        </h2>
        {sourceType === "text" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="コンテンツのテキストを入力してください..."
            className="w-full h-40 p-3 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          />
        ) : (
          <input
            type="file"
            accept={sourceType === "audio" ? "audio/*" : "video/*"}
            onChange={handleFileChange}
            className="w-full p-3 border border-gray-600 rounded-md bg-gray-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            required
          />
        )}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">3. 投稿先を選択</h2>
          {targets.length > 0 && session?.user?.id && (
            <button
              type="button"
              onClick={() => {
                setIsPromptModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              一時プロンプト設定
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {platformOptions.map((platform) => (
            <label
              key={platform.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                targets.includes(platform.id)
                  ? "border-blue-500 bg-blue-900 bg-opacity-50"
                  : "border-gray-600 bg-gray-750"
              }`}
            >
              <input
                type="checkbox"
                checked={targets.includes(platform.id)}
                onChange={() => handleTargetToggle(platform.id)}
                className="sr-only"
              />
              <span className="font-medium text-white">{platform.name}</span>
              {(modifiedPrompts[platform.id] ||
                modifiedPrompts[normalizePlatformId(platform.id)]) && (
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 text-xs bg-green-600 text-green-100 rounded">
                    一時プロンプト設定済み
                  </span>
                </div>
              )}
            </label>
          ))}
        </div>
        {targets.length === 0 && (
          <p className="text-sm text-gray-400 mt-4">
            投稿先を選択すると、一時プロンプト設定ボタンが表示されます
          </p>
        )}
      </div>

      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isProcessing}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-500 cursor-pointer transition-colors"
        >
          {isProcessing ? "処理中..." : "コンテンツを生成"}
        </button>
      </div>

      {/* 一時プロンプト設定モーダル */}
      {session?.user?.id && (
        <TempPromptModal
          isOpen={isPromptModalOpen}
          onClose={() => setIsPromptModalOpen(false)}
          selectedPlatforms={targets}
          onSavePrompts={(prompts) => {
            if (onTempPromptsChange) {
              onTempPromptsChange(prompts);
            }
          }}
          initialPrompts={tempPrompts}
          token={session.user.id}
        />
      )}
    </form>
  );
};
