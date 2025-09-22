"use client";

import { PlatformCard } from './PlatformCard';
import { JobResults } from '../hooks/useContentGenerator';
import { PlatformContent } from '@one-to-multi-agent/core';

interface ResultsDisplayProps {
  results: JobResults | null;
  editableContent: Record<string, Partial<PlatformContent>>;
  updateEditableContent: (platform: string, field: string, value: string | string[]) => void;
}

export const ResultsDisplay = ({ results, editableContent, updateEditableContent }: ResultsDisplayProps) => {
  if (!results) return null;

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">生成結果</h2>
      {results.platformResults.map((result, i) => (
        <PlatformCard 
          key={i} 
          result={result} 
          editableContent={editableContent[result.platform]} 
          updateEditableContent={updateEditableContent}
        />
      ))}
    </div>
  );
};
