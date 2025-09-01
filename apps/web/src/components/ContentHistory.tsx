"use client";

import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/config';

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
  userId?: string;
}

interface ContentHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContentHistory({ isOpen, onClose }: ContentHistoryProps) {
  const [history, setHistory] = useState<ContentMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
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
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
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

  const getPlatformDisplay = (platform: string) => {
    const platformMap: Record<string, string> = {
      'threads': 'Threads',
      'twitter': 'Twitter',
      'instagram': 'Instagram',
      'wordpress': 'WordPress',
      'youtube': 'YouTube'
    };
    return platformMap[platform] || platform;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">コンテンツ生成履歴</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">履歴を読み込み中...</p>
            </div>
          )}

          {error && (
            <div className="p-6 bg-red-50 border-l-4 border-red-400">
              <p className="text-red-700">エラー: {error}</p>
              <button
                onClick={fetchHistory}
                className="mt-2 text-red-600 hover:text-red-800 underline"
              >
                再試行
              </button>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              まだコンテンツ生成履歴がありません
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="p-6 space-y-4">
              {history.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {getSourceTypeDisplay(item.sourceType)}
                      </span>
                      {item.originalFileName && (
                        <span className="text-sm text-gray-600">
                          {item.originalFileName}
                        </span>
                      )}
                      {item.duration && (
                        <span className="text-sm text-gray-500">
                          ({formatDuration(item.duration)})
                        </span>
                      )}
                      {item.size && (
                        <span className="text-sm text-gray-500">
                          {formatFileSize(item.size)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  {/* Preview data */}
                  {item.previewData && (
                    <div className="mb-3">
                      {item.sourceType === 'video' && 'thumbnailUrl' in item.previewData && (
                        <div className="mb-2">
                          <img
                            src={item.previewData.thumbnailUrl}
                            alt="Video thumbnail"
                            className="w-32 h-24 object-cover rounded"
                          />
                        </div>
                      )}
                      
                      {item.sourceType === 'audio' && 'waveform' in item.previewData && (
                        <div className="mb-2">
                          <div className="flex items-end h-12 space-x-1 bg-gray-100 p-2 rounded">
                            {item.previewData.waveform.slice(0, 50).map((point, index) => (
                              <div
                                key={index}
                                className="bg-blue-500 flex-1 rounded-sm"
                                style={{ height: `${Math.max(2, point * 40)}px` }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {item.previewData.transcript && (
                        <p className="text-sm text-gray-700 italic">
                          "{item.previewData.transcript}..."
                        </p>
                      )}
                    </div>
                  )}

                  {/* Generated content */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-800">生成されたコンテンツ:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {item.generatedContent.map((content, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-blue-700">
                              {getPlatformDisplay(content.platform)}
                            </span>
                          </div>
                          
                          {content.title && (
                            <div className="mb-1">
                              <span className="text-xs text-gray-500">タイトル: </span>
                              <span className="text-sm">{content.title}</span>
                            </div>
                          )}
                          
                          {content.content && (
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {content.content}
                            </p>
                          )}
                          
                          {content.hashtags && content.hashtags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {content.hashtags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="text-xs text-blue-600"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}