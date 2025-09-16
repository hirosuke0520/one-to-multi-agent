"use client";

import { PlatformResult } from '../hooks/useContentGenerator';
import { EditableContent } from './EditableContent';
import { PlatformContent } from '@one-to-multi-agent/core';

interface PromptInfo {
  characterPrompt?: string;
  platformPrompt?: string;
  generationPrompt?: string;
}

interface PlatformCardProps {
  result: PlatformResult;
  editableContent: Partial<PlatformContent>;
  updateEditableContent: (platform: string, field: string, value: string | string[]) => void;
  handlePublish: (platform: string) => void;
  prompts?: PromptInfo;
  onShowPrompts?: (platform: string, prompts: PromptInfo) => void;
}

export const PlatformCard = ({ result, editableContent, updateEditableContent, handlePublish, prompts, onShowPrompts }: PlatformCardProps) => {
  const handleShowPrompts = () => {
    if (onShowPrompts && prompts) {
      onShowPrompts(result.platform, prompts);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-base md:text-lg font-medium capitalize">{result.platform}</h3>
          {prompts && onShowPrompts && (
            <button
              onClick={handleShowPrompts}
              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-300 rounded hover:bg-blue-50"
              title="使用したプロンプトを表示"
            >
              📝
            </button>
          )}
        </div>
        {result.success ? (
          <span className="px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-green-100 text-green-800">成功</span>
        ) : (
          <span className="px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-red-100 text-red-800">失敗</span>
        )}
      </div>
      {result.success && result.content ? (
        <div className="space-y-4">
          <EditableContent 
            platform={result.platform} 
            content={editableContent || result.content.content}
            updateEditableContent={updateEditableContent}
          />
          <div className="flex justify-end">
            <button onClick={() => handlePublish(result.platform)} className="px-4 md:px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-sm md:text-base">
              {result.platform} に投稿
            </button>
          </div>
        </div>
      ) : (
        <p className="text-red-700">{result.error}</p>
      )}
    </div>
  );
};