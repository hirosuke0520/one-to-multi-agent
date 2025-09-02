"use client";

import React, { useEffect } from 'react';
import { useHistory } from '../contexts/HistoryContext';

interface ContentMetadata {
  id: string;
  sourceType: 'text' | 'audio' | 'video';
  sourceText?: string;
  originalFileName?: string;
  duration?: number;
  size?: number;
  mimeType?: string;
  generatedContent: Array<{
    platform: string;
    title?: string;
    description?: string;
    content?: string;
    hashtags?: string[];
    script?: string;
    chapters?: Array<{ title: string; timestamp?: string }>;
  }>;
  createdAt: string;
}

interface SidebarProps {
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ selectedThreadId, onThreadSelect, onNewChat, isOpen, onClose }: SidebarProps) {
  const { history: threads, isLoading: loading, error, fetchHistory, refreshHistory } = useHistory();

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('ja-JP', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    }
  };

  const getThreadTitle = (thread: ContentMetadata) => {
    // Priority 1: For text input, use sourceText
    if (thread.sourceType === 'text' && thread.sourceText) {
      // Clean up JSON strings and extract meaningful text
      let text = thread.sourceText;
      
      // If it looks like JSON, try to parse and extract meaningful content
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          const parsed = JSON.parse(text);
          // Extract text from parsed JSON if it has content, title, or text fields
          text = parsed.content || parsed.title || parsed.text || text;
        } catch {
          // Not valid JSON or parsing failed, use as is
        }
      }
      
      // Remove excessive whitespace and trim
      text = text.replace(/\s+/g, ' ').trim();
      
      // Return first 40 characters
      if (text.length > 40) {
        return text.slice(0, 40) + '...';
      }
      return text;
    }
    
    // Priority 2: For audio/video, try to extract from the first generated content
    if ((thread.sourceType === 'audio' || thread.sourceType === 'video') && 
        thread.generatedContent && thread.generatedContent.length > 0) {
      
      // Get the first platform's content
      const firstContent = thread.generatedContent[0];
      
      // Try to extract meaningful text from content
      if (firstContent.content) {
        let text = '';
        
        // Handle different content formats
        if (typeof firstContent.content === 'string') {
          text = firstContent.content;
          
          // Try to parse if it's JSON string
          if (text.startsWith('{') || text.startsWith('[')) {
            try {
              const parsed = JSON.parse(text);
              text = parsed.content || parsed.primaryText || parsed.text || text;
            } catch {
              // Use as is if not valid JSON
            }
          }
        } else if (typeof firstContent.content === 'object') {
          // If content is an object, try to extract text
          const obj = firstContent.content as {
            content?: string;
            primaryText?: string;
            text?: string;
          };
          text = obj.content || obj.primaryText || obj.text || '';
        }
        
        if (text) {
          // Clean up and extract meaningful text
          text = text.replace(/\s+/g, ' ').trim();
          
          // Return first 40 characters
          if (text.length > 5) {
            return text.length > 40 ? text.slice(0, 40) + '...' : text;
          }
        }
      }
      
      // If no content found, try title
      if (firstContent.title && typeof firstContent.title === 'string' && firstContent.title.trim()) {
        const title = firstContent.title.trim();
        return title.length > 40 ? title.slice(0, 40) + '...' : title;
      }
    }
    
    // Priority 3: For audio/video without content, use original file name
    if ((thread.sourceType === 'audio' || thread.sourceType === 'video') && thread.originalFileName) {
      // Remove file extension and clean up
      const nameWithoutExt = thread.originalFileName.replace(/\.[^/.]+$/, '');
      if (nameWithoutExt.length > 30) {
        return nameWithoutExt.slice(0, 30) + '...';
      }
      return nameWithoutExt;
    }
    
    // Fallback: Use source type
    return `${getSourceTypeDisplay(thread.sourceType)}コンテンツ`;
  };

  // Remove unused function - getPlatformDisplay

  const getSourceTypeDisplay = (sourceType: string) => {
    switch (sourceType) {
      case 'text': return 'テキスト';
      case 'audio': return '音声';
      case 'video': return '動画';
      default: return sourceType;
    }
  };

  const handleThreadClick = (threadId: string) => {
    onThreadSelect(threadId);
    onClose(); // Close mobile sidebar after selection
  };

  const handleNewChatClick = () => {
    onNewChat();
    onClose(); // Close mobile sidebar after selection
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-gray-900 text-white h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        {/* Close button for mobile */}
        <div className="flex items-center justify-between mb-4 md:hidden">
          <span className="text-lg font-semibold">メニュー</span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <button
          onClick={handleNewChatClick}
          className="w-full flex items-center justify-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新しいコンテンツ生成
        </button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-center text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
            <p className="mt-2 text-sm">読み込み中...</p>
          </div>
        )}

        {error && (
          <div className="p-4">
            <p className="text-red-400 text-sm">エラー: {error}</p>
            <button
              onClick={refreshHistory}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm underline"
            >
              再試行
            </button>
          </div>
        )}

        {!loading && !error && threads.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            <p className="text-sm">まだコンテンツ履歴がありません</p>
          </div>
        )}

        {!loading && !error && threads.length > 0 && (
          <div className="py-2">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => handleThreadClick(thread.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors border-l-2 ${
                  selectedThreadId === thread.id
                    ? 'bg-gray-800 border-blue-500'
                    : 'border-transparent'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {getThreadTitle(thread)}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                        {getSourceTypeDisplay(thread.sourceType)}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {thread.generatedContent.length}件生成
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatDate(thread.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          One to Multi Agent
        </p>
      </div>
    </div>
    </>
  );
}