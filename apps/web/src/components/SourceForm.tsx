"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { TempPromptModal, TempPrompt } from "./TempPromptModal";

interface SourceFormProps {
  sourceType: "text" | "audio" | "video";
  setSourceType: (value: "text" | "audio" | "video") => void;
  content: string;
  setContent: (value: string) => void;
  setFile: (file: File | null) => void;
  targets: string[];
  setTargets: (value: string[]) => void;
  isProcessing: boolean;
  handleSubmit: (e: FormEvent) => void;
  tempPrompts?: TempPrompt[];
  onTempPromptsChange?: (prompts: TempPrompt[]) => void;
}

const platformOptions = [
  { id: "threads", name: "Threads", icon: "🧵", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { id: "wordpress", name: "WordPress", icon: "📝", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "youtube", name: "YouTube", icon: "📺", color: "bg-red-50 border-red-200 text-red-700" },
  { id: "twitter", name: "X (Twitter)", icon: "🐦", color: "bg-gray-50 border-gray-200 text-gray-700" },
  { id: "instagram", name: "Instagram", icon: "📸", color: "bg-pink-50 border-pink-200 text-pink-700" },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "bg-black-50 border-gray-200 text-gray-700" },
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
  tempPrompts = [],
  onTempPromptsChange,
}: SourceFormProps) => {
  const router = useRouter();
  const [isTempPromptModalOpen, setIsTempPromptModalOpen] = useState(false);

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

  const handleTempPromptsChange = (prompts: TempPrompt[]) => {
    if (onTempPromptsChange) {
      onTempPromptsChange(prompts);
    }
  };

  const handleSavePromptsToDb = async (prompts: TempPrompt[]) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

      for (const prompt of prompts) {
        const response = await fetch(`${apiUrl}/user-settings/prompts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: prompt.platform,
            prompt: prompt.prompt,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save prompt for ${prompt.platform}`);
        }
      }

      // 成功した場合、一時プロンプトも適用
      handleTempPromptsChange(prompts);
    } catch (error) {
      console.error('Error saving prompts to database:', error);
      throw error;
    }
  };

  const activeTempPrompts = tempPrompts.filter(p => targets.includes(p.platform));
  const hasTempPrompts = activeTempPrompts.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 font-inter">
      <div className="bg-gray-900 rounded-2xl shadow-sm border border-gray-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-bold text-sm">1</span>
          </div>
          <h2 className="text-xl font-semibold text-white">入力タイプを選択</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { value: "text", label: "テキスト", icon: "📝", desc: "記事やメモから生成" },
            { value: "audio", label: "音声", icon: "🎙️", desc: "音声ファイルから生成" },
            { value: "video", label: "動画", icon: "🎬", desc: "動画ファイルから生成" }
          ].map((type) => (
            <label key={type.value} className="cursor-pointer">
              <input
                type="radio"
                value={type.value}
                checked={sourceType === type.value}
                onChange={() => setSourceType(type.value as "text" | "audio" | "video")}
                className="sr-only"
              />
              <div className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                sourceType === type.value
                  ? 'border-blue-500 bg-white shadow-md'
                  : 'border-gray-600 bg-white hover:border-gray-500'
              }`}>
                <div className="text-center">
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-medium text-gray-900 mb-1">{type.label}</div>
                  <div className="text-sm text-gray-500">{type.desc}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl shadow-sm border border-gray-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-green-600 font-bold text-sm">2</span>
          </div>
          <h2 className="text-xl font-semibold text-white">コンテンツ入力</h2>
        </div>
        {sourceType === "text" ? (
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="生成したいコンテンツの元となるテキストを入力してください...&#10;&#10;例：&#10;・ブログ記事の概要&#10;・イベントの告知内容&#10;・商品の紹介文"
              className="w-full h-48 p-4 border-2 border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors resize-none bg-gray-800 text-white placeholder-gray-400 font-jetbrains-mono"
              required
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              {content.length}/5000
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-gray-500 transition-colors bg-gray-800">
            <input
              type="file"
              accept={sourceType === "audio" ? "audio/*" : "video/*"}
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              required
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  {sourceType === "audio" ? "🎙️" : "🎬"}
                </div>
                <div>
                  <div className="text-lg font-medium text-white mb-1">
                    {sourceType === "audio" ? "音声" : "動画"}ファイルをアップロード
                  </div>
                  <div className="text-sm text-gray-400">
                    クリックしてファイルを選択するか、ドラッグ&ドロップ
                  </div>
                </div>
              </div>
            </label>
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-2xl shadow-sm border border-gray-700 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold text-sm">3</span>
            </div>
            <h2 className="text-xl font-semibold text-white">投稿先を選択</h2>
          </div>
          {targets.length > 0 && (
            <button
              type="button"
              onClick={() => setIsTempPromptModalOpen(true)}
              className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors relative border border-blue-200"
            >
              📝 一時プロンプト設定
              {hasTempPrompts && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
                  {activeTempPrompts.length}
                </span>
              )}
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {platformOptions.map((platform) => (
            <label
              key={platform.id}
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                targets.includes(platform.id)
                  ? "border-blue-500 bg-white shadow-md"
                  : "border-gray-600 bg-white hover:border-gray-500"
              }`}
            >
              <input
                type="checkbox"
                checked={targets.includes(platform.id)}
                onChange={() => handleTargetToggle(platform.id)}
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <span className="text-xl">{platform.icon}</span>
                <span className="font-medium text-gray-900">{platform.name}</span>
              </div>
              {targets.includes(platform.id) && (
                <div className="mt-2 flex items-center gap-1 text-blue-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">選択済み</span>
                </div>
              )}
            </label>
          ))}
        </div>

        {hasTempPrompts && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">📝 一時プロンプト設定済み</h4>
            <div className="space-y-1">
              {activeTempPrompts.map((prompt) => {
                const platformName = platformOptions.find(p => p.id === prompt.platform)?.name || prompt.platform;
                const truncatedPrompt = prompt.prompt.length > 50
                  ? `${prompt.prompt.substring(0, 50)}...`
                  : prompt.prompt;

                return (
                  <div key={prompt.platform} className="text-sm text-blue-800">
                    <span className="font-medium">{platformName}:</span>
                    <span className="ml-2">{truncatedPrompt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isProcessing || targets.length === 0 || (!content && sourceType === "text")}
          className="relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center gap-3">
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>AI生成中...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>コンテンツを生成</span>
              </>
            )}
          </div>
          {!isProcessing && targets.length === 0 && (
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-red-500">
              投稿先を選択してください
            </div>
          )}
        </button>
      </div>

      {/* 一時プロンプト設定モーダル */}
      <TempPromptModal
        isOpen={isTempPromptModalOpen}
        onClose={() => setIsTempPromptModalOpen(false)}
        platforms={targets}
        onSave={handleTempPromptsChange}
        onSaveToDb={handleSavePromptsToDb}
        initialPrompts={tempPrompts}
      />
    </form>
  );
};
