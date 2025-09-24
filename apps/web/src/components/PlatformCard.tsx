"use client";

import { useState } from 'react';
import { PlatformResult } from '../hooks/useContentGenerator';
import { EditableContent } from './EditableContent';
import {
  PlatformContent,
  ThreadsContent,
  TwitterContent,
  YouTubeContent,
  WordPressContent,
  InstagramContent,
  TikTokContent,
} from '@one-to-multi-agent/core';

interface PlatformCardProps {
  result: PlatformResult;
  editableContent?: Partial<PlatformContent>;
  updateEditableContent: (platform: string, field: string, value: string | string[]) => void;
}

const ensureStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
};

const formatHashtags = (values: string[]): string => {
  if (!values.length) return '';
  const formatted = values
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    .filter(Boolean);
  return formatted.length ? formatted.join(' ') : '';
};

const formatContentForCopy = (platform: string, content: Partial<PlatformContent> | undefined): string => {
  if (!content) return '';

  const normalizedPlatform = platform === 'blog' ? 'wordpress' : platform;

  switch (normalizedPlatform) {
    case 'twitter': {
      const twitterContent = content as Partial<TwitterContent>;
      const parts = [twitterContent.text?.trim()].filter(Boolean);
      const hashtags = formatHashtags(ensureStringArray(twitterContent.hashtags));
      if (hashtags) parts.push(hashtags);
      return parts.join('\n\n');
    }
    case 'threads': {
      const threadsContent = content as Partial<ThreadsContent>;
      const parts = [threadsContent.text?.trim()].filter(Boolean);
      const hashtags = formatHashtags(ensureStringArray(threadsContent.hashtags));
      if (hashtags) parts.push(hashtags);
      return parts.join('\n\n');
    }
    case 'instagram': {
      const instagramContent = content as Partial<InstagramContent>;
      const lines: string[] = [];
      if (instagramContent.caption) lines.push(instagramContent.caption.trim());
      const hashtags = formatHashtags(ensureStringArray(instagramContent.hashtags));
      if (hashtags) lines.push(`ハッシュタグ: ${hashtags}`);
      if (instagramContent.altText) lines.push(`ALTテキスト: ${instagramContent.altText.trim()}`);
      return lines.join('\n\n');
    }
    case 'tiktok': {
      const tiktokContent = content as Partial<TikTokContent>;
      const lines: string[] = [];
      if (tiktokContent.caption) lines.push(tiktokContent.caption.trim());
      const hashtags = formatHashtags(ensureStringArray(tiktokContent.hashtags));
      if (hashtags) lines.push(`ハッシュタグ: ${hashtags}`);
      const effects = ensureStringArray(tiktokContent.effects);
      if (effects.length) lines.push(`推奨エフェクト: ${effects.join(', ')}`);
      return lines.join('\n\n');
    }
    case 'youtube': {
      const youtubeContent = content as Partial<YouTubeContent>;
      const lines: string[] = [];
      if (youtubeContent.title) lines.push(`タイトル: ${youtubeContent.title.trim()}`);
      if (youtubeContent.description) lines.push(`説明文:\n${youtubeContent.description.trim()}`);
      if (youtubeContent.script) lines.push(`台本:\n${youtubeContent.script.trim()}`);
      if (youtubeContent.chapters && youtubeContent.chapters.length) {
        const chapterLines = youtubeContent.chapters
          .map((chapter) => `- ${chapter.time || ''} ${chapter.title || ''}`.trim())
          .filter(Boolean);
        if (chapterLines.length) {
          lines.push(['チャプター:', ...chapterLines].join('\n'));
        }
      }
      const hashtags = formatHashtags(ensureStringArray(youtubeContent.hashtags));
      if (hashtags) lines.push(`ハッシュタグ: ${hashtags}`);
      return lines.join('\n\n');
    }
    case 'wordpress': {
      const wordpressContent = content as Partial<WordPressContent>;
      const lines: string[] = [];
      if (wordpressContent.title) lines.push(`タイトル: ${wordpressContent.title.trim()}`);
      if (wordpressContent.excerpt) lines.push(`抜粋:\n${wordpressContent.excerpt.trim()}`);
      if (wordpressContent.content) lines.push(`本文:\n${wordpressContent.content.trim()}`);
      const categories = ensureStringArray(wordpressContent.categories);
      if (categories.length) lines.push(`カテゴリ: ${categories.join(', ')}`);
      const tags = ensureStringArray(wordpressContent.tags);
      if (tags.length) lines.push(`タグ: ${tags.join(', ')}`);
      if (wordpressContent.seoTitle) lines.push(`SEOタイトル: ${wordpressContent.seoTitle.trim()}`);
      if (wordpressContent.metaDescription) {
        lines.push(`メタディスクリプション:\n${wordpressContent.metaDescription.trim()}`);
      }
      return lines.join('\n\n');
    }
    default:
      return JSON.stringify(content, null, 2);
  }
};

const copyTextToClipboard = async (text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export const PlatformCard = ({ result, editableContent, updateEditableContent }: PlatformCardProps) => {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const mergedContent: Partial<PlatformContent> = {
    ...(result.content?.content as Partial<PlatformContent> | undefined ?? {}),
    ...(editableContent ?? {}),
  };

  const handleCopy = async () => {
    try {
      const textToCopy = formatContentForCopy(result.platform, mergedContent);

      if (!textToCopy) {
        setCopyStatus('コピーする内容がありません');
        return;
      }

      await copyTextToClipboard(textToCopy);
      setCopyStatus('コピーしました');
    } catch (error) {
      console.error('Failed to copy content:', error);
      setCopyStatus('コピーに失敗しました');
    } finally {
      setTimeout(() => setCopyStatus(null), 2500);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-base md:text-lg font-medium capitalize">{result.platform}</h3>
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
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleCopy}
              className="px-4 md:px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm md:text-base transition-colors"
            >
              作成したテキストをコピー
            </button>
            {copyStatus && (
              <span className="text-xs text-gray-600">{copyStatus}</span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-red-700">{result.error}</p>
      )}
    </div>
  );
};
