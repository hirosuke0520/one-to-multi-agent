"use client";

import { PlatformResult } from '../hooks/useContentGenerator';
import { EditableContent } from './EditableContent';
import { PlatformContent } from '@one-to-multi-agent/core';

interface PlatformCardProps {
  result: PlatformResult;
  editableContent: Partial<PlatformContent>;
  updateEditableContent: (platform: string, field: string, value: string | string[]) => void;
  handlePublish: (platform: string) => void;
}

export const PlatformCard = ({ result, editableContent, updateEditableContent, handlePublish }: PlatformCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium capitalize">{result.platform}</h3>
        {result.success ? (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">成功</span>
        ) : (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">失敗</span>
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
            <button onClick={() => handlePublish(result.platform)} className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
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