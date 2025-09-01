"use client";

import { 
  PlatformContent,
  ThreadsContent,
  TwitterContent,
  YouTubeContent,
  WordPressContent,
  InstagramContent,
  TikTokContent
} from '@one-to-multi-agent/core';

// This type defines a function that can update a specific field of a specific platform's content.
export type UpdateFunction = <K extends keyof PlatformContent>(field: K, value: PlatformContent[K]) => void;

interface EditableContentProps {
  platform: string;
  content: Partial<PlatformContent>;
  updateEditableContent: (platform: string, field: string, value: string | string[]) => void;
}

export const EditableContent = ({ platform, content, updateEditableContent }: EditableContentProps) => {

  const handleChange = (field: string, value: string | string[]) => {
    updateEditableContent(platform, field, value);
  }

  switch (platform) {
    case 'threads':
      const threadsContent = content as Partial<ThreadsContent>;
      return (
        <textarea 
          value={threadsContent.text || ''} 
          onChange={(e) => handleChange('text', e.target.value)} 
          className="w-full p-2 border rounded h-24"
        />
      );
    case 'twitter':
      const twitterContent = content as Partial<TwitterContent>;
      return (
        <textarea 
          value={twitterContent.text || ''} 
          onChange={(e) => handleChange('text', e.target.value)} 
          className="w-full p-2 border rounded h-24" 
          maxLength={140} 
        />
      );
    case 'youtube':
        const youtubeContent = content as Partial<YouTubeContent>;
        return (
            <div className="space-y-2">
                <input type="text" value={youtubeContent.title || ''} onChange={(e) => handleChange('title', e.target.value)} className="w-full p-2 border rounded" placeholder="Title" />
                <textarea value={youtubeContent.description || ''} onChange={(e) => handleChange('description', e.target.value)} className="w-full p-2 border rounded h-24" placeholder="Description" />
            </div>
        );
    case 'wordpress':
        const wordpressContent = content as Partial<WordPressContent>;
        return (
            <div className="space-y-2">
                <input type="text" value={wordpressContent.title || ''} onChange={(e) => handleChange('title', e.target.value)} className="w-full p-2 border rounded" placeholder="Title" />
                <textarea value={wordpressContent.content || ''} onChange={(e) => handleChange('content', e.target.value)} className="w-full p-2 border rounded h-32" placeholder="Content" />
            </div>
        );
    case 'instagram':
        const instagramContent = content as Partial<InstagramContent>;
        return (
            <textarea 
              value={instagramContent.caption || ''} 
              onChange={(e) => handleChange('caption', e.target.value)} 
              className="w-full p-2 border rounded h-24"
            />
        );
    case 'tiktok':
        const tiktokContent = content as Partial<TikTokContent>;
        return (
            <textarea 
              value={tiktokContent.caption || ''} 
              onChange={(e) => handleChange('caption', e.target.value)} 
              className="w-full p-2 border rounded h-24"
            />
        );
    default:
      return <textarea value={JSON.stringify(content, null, 2)} readOnly className="w-full h-32 p-2 border rounded bg-gray-100" />;
  }
};