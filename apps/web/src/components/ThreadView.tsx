"use client";

import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/config';
import { PlatformContent as CorePlatformContent } from '@one-to-multi-agent/core';
import { PlatformCard } from './PlatformCard';
import { PlatformResult } from '../hooks/useContentGenerator';

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
  sourceType: 'text' | 'audio' | 'video';
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
}

export function ThreadView({ threadId }: ThreadViewProps) {
  const [thread, setThread] = useState<ContentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editableContent, setEditableContent] = useState<Record<string, Partial<CorePlatformContent>>>({});

  useEffect(() => {
    fetchThread();
  }, [threadId]);

  const fetchThread = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${getApiUrl()}/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch thread');
      }

      const data = await response.json();
      const foundThread = data.data?.find((item: ContentMetadata) => item.id === threadId);
      
      if (!foundThread) {
        throw new Error('Thread not found');
      }
      
      setThread(foundThread);
      
      // Initialize editable content from thread data
      const initialEditableContent: Record<string, Partial<CorePlatformContent>> = {};
      foundThread.generatedContent.forEach((content: any) => {
        // Parse JSON content if it's stored as string
        let parsedContent;
        if (typeof content.content === 'string') {
          try {
            parsedContent = JSON.parse(content.content);
          } catch (e) {
            console.error('Failed to parse content JSON for editing:', e);
            parsedContent = { content: content.content }; // fallback
          }
        } else {
          parsedContent = content.content || content;
        }
        initialEditableContent[content.platform] = parsedContent;
      });
      setEditableContent(initialEditableContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch thread');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getSourceTypeDisplay = (sourceType: string) => {
    switch (sourceType) {
      case 'text': return 'テキスト';
      case 'audio': return '音声';
      case 'video': return '動画';
      default: return sourceType;
    }
  };


  const updateEditableContent = (platform: string, field: string, value: string | string[]) => {
    setEditableContent((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  const handlePublish = async (platform: string) => {
    alert(`Publishing for ${platform}... (Not implemented)`);
  };

  // Convert thread data to PlatformResult format for PlatformCard
  const getPlatformResults = (): PlatformResult[] => {
    if (!thread) return [];
    
    return thread.generatedContent.map((content: any) => {
      // Parse JSON content if it's stored as string
      let parsedContent;
      if (typeof content.content === 'string') {
        try {
          parsedContent = JSON.parse(content.content);
        } catch (e) {
          console.error('Failed to parse content JSON:', e);
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
            platform: content.platform
          }
        }
      };
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">エラー: {error}</p>
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
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-600">スレッドが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Thread Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center space-x-2 md:space-x-3 mb-2 flex-wrap">
            <span className="px-2 md:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs md:text-sm">
              {getSourceTypeDisplay(thread.sourceType)}
            </span>
            <span className="text-xs md:text-sm text-gray-500">
              {formatDate(thread.createdAt)}
            </span>
          </div>
          
          {thread.originalFileName && (
            <div className="flex items-center space-x-2 text-xs md:text-sm text-gray-600 mb-2 flex-wrap">
              <span>📎 {thread.originalFileName}</span>
              {thread.duration && (
                <span>({formatDuration(thread.duration)})</span>
              )}
              {thread.size && (
                <span>{formatFileSize(thread.size)}</span>
              )}
            </div>
          )}
        </div>

        {/* Preview Data */}
        {thread.previewData && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-3">プレビュー</h3>
            
            {thread.sourceType === 'video' && 'thumbnailUrl' in thread.previewData && (
              <div className="mb-3">
                <img
                  src={thread.previewData.thumbnailUrl}
                  alt="Video thumbnail"
                  className="w-48 h-36 object-cover rounded"
                />
              </div>
            )}
            
            {thread.sourceType === 'audio' && 'waveform' in thread.previewData && (
              <div className="mb-3">
                <div className="flex items-end h-16 space-x-1 bg-white p-3 rounded border">
                  {thread.previewData.waveform.slice(0, 100).map((point, index) => (
                    <div
                      key={index}
                      className="bg-blue-500 flex-1 rounded-sm"
                      style={{ height: `${Math.max(2, point * 50)}px` }}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {thread.previewData.transcript && (
              <div className="text-sm text-gray-700 italic">
                <strong>転写:</strong> "{thread.previewData.transcript}..."
              </div>
            )}
          </div>
        )}

        {/* Generated Content */}
        <div className="mt-6 md:mt-8 space-y-4 md:space-y-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">生成結果</h2>
          {getPlatformResults().map((result, i) => (
            <PlatformCard 
              key={i} 
              result={result} 
              editableContent={editableContent[result.platform]} 
              updateEditableContent={updateEditableContent}
              handlePublish={handlePublish}
            />
          ))}
        </div>
      </div>
    </div>
  );
}