"use client";

import { useState } from "react";

export default function Home() {
  const [sourceType, setSourceType] = useState<"text" | "audio" | "video">("text");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTargetToggle = (target: string) => {
    setTargets(prev => 
      prev.includes(target) 
        ? prev.filter(t => t !== target)
        : [...prev, target]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // TODO: Implement API call to process content
    console.log({ sourceType, content, file, targets });
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            One to Multi Agent
          </h1>
          <p className="text-gray-600">
            1つのソースから複数プラットフォーム向けのコンテンツを自動生成
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source Type Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">入力タイプを選択</h2>
            <div className="flex space-x-4">
              {[
                { value: "text", label: "テキスト" },
                { value: "audio", label: "音声" },
                { value: "video", label: "動画" }
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    value={option.value}
                    checked={sourceType === option.value}
                    onChange={(e) => setSourceType(e.target.value as any)}
                    className="mr-2"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Content Input */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">コンテンツ入力</h2>
            {sourceType === "text" ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="コンテンツのテキストを入力してください..."
                className="w-full h-40 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            ) : (
              <input
                type="file"
                accept={sourceType === "audio" ? "audio/*" : "video/*"}
                onChange={handleFileChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            )}
          </div>

          {/* Target Platform Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">投稿先プラットフォーム</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { id: "threads", name: "Threads", description: "Meta Threads" },
                { id: "wordpress", name: "WordPress", description: "自社メディア" },
                { id: "youtube", name: "YouTube", description: "動画プラットフォーム" },
                { id: "twitter", name: "X (Twitter)", description: "短文SNS" },
                { id: "instagram", name: "Instagram", description: "画像・動画SNS" },
                { id: "tiktok", name: "TikTok", description: "短尺動画" }
              ].map((platform) => (
                <label
                  key={platform.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    targets.includes(platform.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={targets.includes(platform.id)}
                    onChange={() => handleTargetToggle(platform.id)}
                    className="sr-only"
                  />
                  <div className="text-sm font-medium">{platform.name}</div>
                  <div className="text-xs text-gray-600">{platform.description}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isProcessing || targets.length === 0 || (!content && !file)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? "処理中..." : "コンテンツを生成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
