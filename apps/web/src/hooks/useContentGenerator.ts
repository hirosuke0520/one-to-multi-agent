"use client";

import { useState } from 'react';
import { PlatformContent } from '@one-to-multi-agent/core';
import { getApiUrl } from '../lib/config';
import { useHistory } from '../contexts/HistoryContext';

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

export const useContentGenerator = (userId?: string) => {
  const [sourceType, setSourceType] = useState<'text' | 'audio' | 'video'>('text');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<JobResults | null>(null);
  const [editableContent, setEditableContent] = useState<Record<string, Partial<PlatformContent>>>({});
  const [error, setError] = useState<string | null>(null);
  const { refreshHistory } = useHistory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    setResults(null);
    setEditableContent({});

    try {
      const apiUrl = getApiUrl();
      let response: Response;

      if (sourceType === 'text') {
        response = await fetch(`${apiUrl}/orchestrator/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sourceType, 
            content, 
            targets,
            userId
          }),
        });
      } else {
        if (!file) throw new Error('File not selected');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sourceType', sourceType);
        formData.append('targets', JSON.stringify(targets));
        if (userId) {
          formData.append('userId', userId);
        }
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
    const apiUrl = getApiUrl();
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
    const apiUrl = getApiUrl();
    
    // Since all jobs now share the same jobId, fetch results only once
    const uniqueJobIds = [...new Set(jobs.map(job => job.jobId))];
    
    if (uniqueJobIds.length === 1) {
      // Single job with multiple platforms
      try {
        const res = await fetch(`${apiUrl}/jobs/${uniqueJobIds[0]}/results`);
        if (!res.ok) {
          const platformResults: PlatformResult[] = jobs.map(job => ({ 
            platform: job.platform, 
            success: false, 
            error: 'Failed to fetch results' 
          }));
          const finalResults: JobResults = { sourceText: content || file?.name || '', platformResults };
          setResults(finalResults);
          setIsProcessing(false);
          return;
        }
        
        const data = await res.json();
        if (data.success && data.results && data.results.platformResults) {
          const finalResults: JobResults = { 
            sourceText: data.results.sourceText || content || file?.name || '', 
            platformResults: data.results.platformResults 
          };
          setResults(finalResults);

          const initialEditableContent: Record<string, Partial<PlatformContent>> = {};
          data.results.platformResults.forEach((result: PlatformResult) => {
            if (result.success && result.content) {
              initialEditableContent[result.platform] = { ...result.content.content };
            }
          });
          setEditableContent(initialEditableContent);
          
          // Refresh history after successful content generation
          // Longer delay for video processing
          const delay = sourceType === 'video' ? 5000 : 1000;
          setTimeout(() => {
            refreshHistory();
          }, delay); // Delay to ensure database is updated
        } else {
          const platformResults: PlatformResult[] = jobs.map(job => ({ 
            platform: job.platform, 
            success: false, 
            error: data.error || 'Unknown error' 
          }));
          const finalResults: JobResults = { sourceText: content || file?.name || '', platformResults };
          setResults(finalResults);
        }
      } catch {
        const platformResults: PlatformResult[] = jobs.map(job => ({ 
          platform: job.platform, 
          success: false, 
          error: 'Failed to fetch results' 
        }));
        const finalResults: JobResults = { sourceText: content || file?.name || '', platformResults };
        setResults(finalResults);
      }
    } else {
      // Fallback: multiple separate jobs (old behavior)
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
      
      // Refresh history after successful content generation  
      if (platformResults.some(r => r.success)) {
        // Longer delay for video processing
        const delay = sourceType === 'video' ? 5000 : 1000;
        setTimeout(() => {
          refreshHistory();
        }, delay); // Delay to ensure database is updated
      }
    }
    
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

  const resetForm = () => {
    setSourceType('text');
    setContent('');
    setFile(null);
    setTargets([]);
    setIsProcessing(false);
    setResults(null);
    setEditableContent({});
    setError(null);
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
    resetForm,
  };
};
