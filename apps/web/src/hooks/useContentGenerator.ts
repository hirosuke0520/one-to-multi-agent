"use client";

import { useState } from 'react';
import { PlatformContent } from '@one-to-multi-agent/core';

// Type definitions for API responses and states
export interface Job {
  jobId: string;
  platform: string;
}

export interface JobStatus {
  jobId: string;
  platform: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ContentMetadata {
  generatedAt: string;
  sourceType: 'text' | 'audio' | 'video';
  platform: string;
  [key: string]: unknown;
}

export interface PlatformResult {
  platform: string;
  success: boolean;
  content?: { content: PlatformContent; metadata: ContentMetadata };
  error?: string;
}

export interface JobResults {
  sourceText: string;
  platformResults: PlatformResult[];
}

export const useContentGenerator = () => {
  const [sourceType, setSourceType] = useState<'text' | 'audio' | 'video'>('text');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<JobResults | null>(null);
  const [editableContent, setEditableContent] = useState<Record<string, Partial<PlatformContent>>>({});
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    setResults(null);
    setEditableContent({});

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
      let response: Response;

      if (sourceType === 'text') {
        response = await fetch(`${apiUrl}/orchestrator/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceType, content, targets }),
        });
      } else {
        if (!file) throw new Error('File not selected');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sourceType', sourceType);
        formData.append('targets', JSON.stringify(targets));
        response = await fetch(`${apiUrl}/orchestrator/process`, {
          method: 'POST',
          body: formData,
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.jobs)) {
        pollForMultipleResults(data.jobs);
      } else {
        throw new Error(data.error || 'Failed to start processing');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsProcessing(false);
    }
  };

  const pollForMultipleResults = (jobs: Job[]) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
    const interval = setInterval(async () => {
      const statuses: JobStatus[] = await Promise.all(
        jobs.map(async (job) => {
          try {
            const res = await fetch(`${apiUrl}/jobs/${job.jobId}`);
            if (!res.ok) return { ...job, status: 'failed', error: 'Status check failed' };
            const data = await res.json();
            return { ...job, status: data.job.status, error: data.job.error };
          } catch {
            return { ...job, status: 'failed', error: 'Status check failed' };
          }
        })
      );

      const completedCount = statuses.filter((s) => s.status === 'completed' || s.status === 'failed').length;
      if (completedCount === jobs.length) {
        clearInterval(interval);
        fetchFinalResults(jobs);
      }
    }, 5000);
  };

  const fetchFinalResults = async (jobs: Job[]) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
    const platformResults: PlatformResult[] = await Promise.all(
      jobs.map(async (job) => {
        try {
          const res = await fetch(`${apiUrl}/jobs/${job.jobId}/results`);
          if (!res.ok) return { platform: job.platform, success: false, error: 'Failed to fetch results' };
          const data = await res.json();
          return data.success ? data.results.platformResults[0] : { platform: job.platform, success: false, error: data.error };
        } catch {
          return { platform: job.platform, success: false, error: 'Failed to fetch results' };
        }
      })
    );

    const finalResults: JobResults = { sourceText: content || file?.name || '', platformResults };
    setResults(finalResults);

    const initialEditableContent: Record<string, Partial<PlatformContent>> = {};
    platformResults.forEach((result) => {
      if (result.success && result.content) {
        initialEditableContent[result.platform] = { ...result.content.content };
      }
    });
    setEditableContent(initialEditableContent);
    setIsProcessing(false);
  };

  const handlePublish = async (platform: string) => {
    alert(`Publishing for ${platform}... (Not implemented)`);
  };

  const updateEditableContent = (platform: string, field: string, value: string | string[]) => {
    setEditableContent((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  return {
    sourceType,
    setSourceType,
    content,
    setContent,
    file,
    setFile,
    targets,
    setTargets,
    isProcessing,
    results,
    editableContent,
    error,
    handleSubmit,
    handlePublish,
    updateEditableContent,
  };
};
