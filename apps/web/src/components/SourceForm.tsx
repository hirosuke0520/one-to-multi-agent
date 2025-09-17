"use client";

import { ChangeEvent, FormEvent } from "react";

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
}: SourceFormProps) => {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">1. 入力タイプを選択</h2>
        <div className="flex space-x-4">
          <label>
            <input
              type="radio"
              value="text"
              checked={sourceType === "text"}
              onChange={() => setSourceType("text")}
              className="mr-2"
            />
            テキスト
          </label>
          <label>
            <input
              type="radio"
              value="audio"
              checked={sourceType === "audio"}
              onChange={() => setSourceType("audio")}
              className="mr-2"
            />
            音声
          </label>
          <label>
            <input
              type="radio"
              value="video"
              checked={sourceType === "video"}
              onChange={() => setSourceType("video")}
              className="mr-2"
            />
            動画
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">2. コンテンツ入力</h2>
        {sourceType === "text" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="コンテンツのテキストを入力してください..."
            className="w-full h-40 p-3 border rounded-md"
            required
          />
        ) : (
          <input
            type="file"
            accept={sourceType === "audio" ? "audio/*" : "video/*"}
            onChange={handleFileChange}
            className="w-full p-3 border rounded-md"
            required
          />
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">3. 投稿先を選択</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {platformOptions.map((platform) => (
            <label
              key={platform.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                targets.includes(platform.id)
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              }`}
            >
              <input
                type="checkbox"
                checked={targets.includes(platform.id)}
                onChange={() => handleTargetToggle(platform.id)}
                className="sr-only"
              />
              <span className="font-medium">{platform.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isProcessing}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 cursor-pointer"
        >
          {isProcessing ? "処理中..." : "コンテンツを生成"}
        </button>
      </div>
    </form>
  );
};
