"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getApiUrl } from '../lib/config';

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

interface HistoryContextType {
  history: ContentMetadata[];
  isLoading: boolean;
  error: string | null;
  fetchHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

interface HistoryProviderProps {
  children: ReactNode;
  userId?: string;
}

export function HistoryProvider({ children, userId }: HistoryProviderProps) {
  const [history, setHistory] = useState<ContentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (isLoading) return;
    
    // ログインしていない場合は履歴を取得しない
    if (!userId) {
      setHistory([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const url = `${getApiUrl()}/history?userId=${encodeURIComponent(userId)}`;
      
      const response = await fetch(url, {
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
      console.error('Failed to fetch history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userId]);

  const refreshHistory = useCallback(async () => {
    // ログインしていない場合は履歴を取得しない
    if (!userId) {
      setHistory([]);
      return;
    }
    
    // Force refresh without checking isLoading
    setIsLoading(true);
    setError(null);

    try {
      const url = `${getApiUrl()}/history?userId=${encodeURIComponent(userId)}`;
      
      const response = await fetch(url, {
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
      console.error('Failed to refresh history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return (
    <HistoryContext.Provider value={{ history, isLoading, error, fetchHistory, refreshHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}
