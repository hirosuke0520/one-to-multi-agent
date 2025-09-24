"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getApiUrl } from "../lib/config";
import { PlatformContent as CorePlatformContent } from "@one-to-multi-agent/core";
import { PlatformCard } from "./PlatformCard";
import { PlatformResult } from "../hooks/useContentGenerator";
import { HistoryPromptModal } from "./HistoryPromptModal";

interface AudioPreview {
  duration: number;
  waveform: number[];
  transcript?: string;
}

interface VideoPreview {
  duration: number;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  transcript?: string;
}

interface PlatformContent {
  platform: string;
  title?: string;
  description?: string;
  content?: string;
  hashtags?: string[];
  script?: string;
  chapters?: Array<{ title: string; timestamp?: string }>;
}

interface ContentMetadata {
  id: string;
  sourceType: "text" | "audio" | "video";
  sourceText?: string; // User input text or transcribed text
  originalFileName?: string;
  duration?: number;
  size?: number;
  mimeType?: string;
  previewData?: AudioPreview | VideoPreview;
  generatedContent: PlatformContent[];
  createdAt: string;
}

interface ThreadViewProps {
  threadId: string;
  token?: string;
}

export function ThreadView({ threadId, token }: ThreadViewProps) {
  const { data: session } = useSession();
  const [thread, setThread] = useState<ContentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editableContent, setEditableContent] = useState<
    Record<string, Partial<CorePlatformContent>>
  >({});
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  const fetchThread = async () => {
    setLoading(true);
    setError(null);

    try {
      const authToken = session?.user?.id || token;
      if (!authToken) {
        throw new Error(
          "ユーザー情報が見つかりません。再ログインしてください。"
        );
      }

      const url = `${getApiUrl()}/history`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch thread");
      }

      const data = await response.json();
      const foundThread = data.data?.find(
        (item: ContentMetadata) => item.id === threadId
      );

      if (!foundThread) {
        throw new Error("Thread not found");
      }

      setThread(foundThread);

      // Initialize editable content from thread data
      const initialEditableContent: Record<
        string,
        Partial<CorePlatformContent>
      > = {};
      foundThread.generatedContent.forEach((content: PlatformContent) => {
        // Parse JSON content if it's stored as string
        let parsedContent;
        if (typeof content.content === "string") {
          try {
            parsedContent = JSON.parse(content.content);
          } catch (e) {
            console.error("Failed to parse content JSON for editing:", e);
            parsedContent = { content: content.content }; // fallback
          }
        } else {
          parsedContent = content.content || content;
        }
        initialEditableContent[content.platform] = parsedContent;
      });
      setEditableContent(initialEditableContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch thread");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, token, session?.user?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP");
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getSourceTypeDisplay = (sourceType: string) => {
    switch (sourceType) {
      case "text":
        return "テキスト";
      case "audio":
        return "音声";
      case "video":
        return "動画";
      default:
        return sourceType;
    }
  };

  const updateEditableContent = (
    platform: string,
    field: string,
    value: string | string[]
  ) => {
    setEditableContent((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  // Convert thread data to PlatformResult format for PlatformCard
  const getPlatformResults = (): PlatformResult[] => {
    if (!thread) return [];

    return thread.generatedContent.map((content: PlatformContent) => {
      // Parse JSON content if it's stored as string
      let parsedContent;
      if (typeof content.content === "string") {
        try {
          parsedContent = JSON.parse(content.content);
        } catch (e) {
          console.error("Failed to parse content JSON:", e);
          parsedContent = { content: content.content }; // fallback
        }
      } else {
        parsedContent = content.content || content;
      }

      return {
        platform: content.platform,
        success: true,
        content: {
          content: parsedContent as CorePlatformContent,
          metadata: {
            generatedAt: thread.createdAt,
            sourceType: thread.sourceType,
            platform: content.platform,
          },
        },
      };
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-2 text-gray-300">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400">エラー: {error}</p>
          <button
            onClick={fetchThread}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <p className="text-gray-300">スレッドが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Thread Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center space-x-2 md:space-x-3 mb-2 flex-wrap">
            <span className="px-2 md:px-3 py-1 bg-blue-900 text-blue-300 rounded-full text-xs md:text-sm">
              {getSourceTypeDisplay(thread.sourceType)}
            </span>
            <span className="text-xs md:text-sm text-gray-400">
              {formatDate(thread.createdAt)}
            </span>
          </div>

          {thread.originalFileName && (
            <div className="flex items-center space-x-2 text-xs md:text-sm text-gray-400 mb-2 flex-wrap">
              <span>📎 {thread.originalFileName}</span>
              {thread.duration && (
                <span>({formatDuration(thread.duration)})</span>
              )}
              {thread.size && <span>{formatFileSize(thread.size)}</span>}
            </div>
          )}
        </div>

        {/* Preview Data */}
        {(thread.sourceType === "video" ||
          thread.sourceType === "audio" ||
          thread.previewData) && (
          <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <h3 className="font-medium text-white mb-3">プレビュー</h3>

            {thread.sourceType === "video" && (
              <div className="mb-3">
                <video
                  controls
                  className="w-full max-w-2xl rounded-lg shadow-sm"
                  style={{ maxHeight: "500px", objectFit: "contain" }}
                  preload="metadata"
                  poster={
                    thread.previewData &&
                    "thumbnailUrl" in thread.previewData &&
                    thread.previewData.thumbnailUrl
                      ? thread.previewData.thumbnailUrl
                      : undefined
                  }
                >
                  <source
                    src={`${getApiUrl()}/video/${thread.id}`}
                    type="video/mp4"
                  />
                  お使いのブラウザは動画再生に対応していません。
                </video>
                {thread.previewData &&
                  "width" in thread.previewData &&
                  "height" in thread.previewData && (
                    <div className="mt-2 text-xs text-gray-400">
                      解像度: {thread.previewData.width} ×{" "}
                      {thread.previewData.height}
                    </div>
                  )}
              </div>
            )}

            {thread.sourceType === "audio" && (
              <div className="mb-3">
                <audio
                  controls
                  className="w-full max-w-md"
                  src={`${getApiUrl()}/audio/${thread.id}`}
                  preload="metadata"
                >
                  お使いのブラウザは音声再生に対応していません。
                </audio>
                {thread.previewData && "duration" in thread.previewData && (
                  <div className="mt-2 text-xs text-gray-400">
                    長さ: {formatDuration(thread.previewData.duration)}
                  </div>
                )}
              </div>
            )}

            {/* Preview Data that's not audio/video (e.g., waveform visualization for old records) */}
            {thread.previewData &&
              thread.sourceType !== "audio" &&
              thread.sourceType !== "video" && (
                <div className="text-sm text-gray-400">
                  Preview data available
                </div>
              )}
          </div>
        )}

        {/* Source Content Display - Only for text input */}
        {thread.sourceType === "text" && thread.sourceText && (
          <div className="mb-6 md:mb-8">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-3">
              入力テキスト
            </h3>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-300 whitespace-pre-wrap text-sm md:text-base leading-relaxed">
                {thread.sourceText}
              </p>
            </div>
          </div>
        )}

        {/* Generated Content */}
        <div className="mt-6 md:mt-8 space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              生成結果
            </h2>
            {token && session?.user?.id && (
              <button
                onClick={() => {
                  setIsPromptModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-900 text-blue-300 rounded-lg hover:bg-blue-800 transition-colors"
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                使用したプロンプトを表示
              </button>
            )}
          </div>
          {getPlatformResults().map((result, i) => (
            <PlatformCard
              key={i}
              result={result}
              editableContent={editableContent[result.platform]}
              updateEditableContent={updateEditableContent}
            />
          ))}
        </div>

        {/* 履歴プロンプト表示モーダル */}
        {token && session?.user?.id && (
          <HistoryPromptModal
            isOpen={isPromptModalOpen}
            onClose={() => setIsPromptModalOpen(false)}
            threadId={threadId}
            platforms={thread.generatedContent.map(
              (content) => content.platform
            )}
            token={session.user.id}
          />
        )}
      </div>
    </div>
  );
}
