"use client";

import { useState } from "react";

export default function Home() {
  const [sourceType, setSourceType] = useState<"text" | "audio" | "video">("text");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [editableContent, setEditableContent] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  const handleTargetToggle = (target: string) => {
    setTargets(prev => 
      prev.includes(target) 
        ? prev.filter(t => t !== target)
        : [...prev, target]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    setResults(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
      
      let response: Response;
      
      if (sourceType === "text") {
        // Text content - send as JSON
        const payload = {
          sourceType,
          content,
          targets,
          profile: {
            tone: "conversational",
            audience: "general",
            purpose: "inform"
          }
        };

        response = await fetch(`${apiUrl}/orchestrator/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Audio/Video content - send as FormData
        if (!file) {
          throw new Error("ファイルが選択されていません");
        }
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sourceType", sourceType);
        formData.append("targets", JSON.stringify(targets));
        formData.append("profile", JSON.stringify({
          tone: "conversational",
          audience: "general",
          purpose: "inform"
        }));

        response = await fetch(`${apiUrl}/orchestrator/process`, {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setJobId(data.jobId);
        // Poll for results
        pollForResults(data.jobId);
      } else {
        throw new Error(data.error || "Failed to start processing");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setIsProcessing(false);
    }
  };

  const pollForResults = async (jobId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const response = await fetch(`${apiUrl}/jobs/${jobId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch job status");
        }

        const jobData = await response.json();
        
        if (jobData.success && jobData.job.status === "completed") {
          // Get results
          const resultsResponse = await fetch(`${apiUrl}/jobs/${jobId}/results`);
          if (resultsResponse.ok) {
            const resultsData = await resultsResponse.json();
            if (resultsData.success) {
              setResults(resultsData.results);
              // Initialize editable content from platform results
              const initialEditableContent: Record<string, any> = {};
              if (resultsData.results?.platformResults) {
                resultsData.results.platformResults.forEach((platformResult: any) => {
                  if (platformResult.success && platformResult.content) {
                    // プラットフォーム固有の内容をそのまま保存
                    initialEditableContent[platformResult.platform] = { ...platformResult.content.content };
                  }
                });
              }
              setEditableContent(initialEditableContent);
            }
          }
          setIsProcessing(false);
        } else if (jobData.success && jobData.job.status === "failed") {
          setError(jobData.job.error || "Job failed");
          setIsProcessing(false);
        } else if (attempts >= maxAttempts) {
          setError("Timeout: Job took too long to complete");
          setIsProcessing(false);
        } else {
          // Continue polling
          setTimeout(poll, 10000); // Poll every 10 seconds
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check job status");
        setIsProcessing(false);
      }
    };

    poll();
  };

  const handlePublish = async (platform: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
      const contentData = editableContent[platform];
      
      if (!contentData) {
        alert("コンテンツが見つかりません");
        return;
      }

      // Find the original content data for metadata
      const platformResult = results?.platformResults?.find((r: any) => r.platform === platform);
      if (!platformResult?.content) {
        alert("元のコンテンツデータが見つかりません");
        return;
      }

      // Create platform-specific content structure based on the edited content
      const publishPayload = {
        platform: platform,
        content: {
          ...platformResult.content.content, // Original platform content structure
          ...contentData // Merge with edited content
        }
      };

      const response = await fetch(`${apiUrl}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(publishPayload),
      });

      if (!response.ok) {
        throw new Error(`投稿に失敗しました: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert(`${platform} への投稿が完了しました！`);
      } else {
        throw new Error(data.error || "投稿に失敗しました");
      }
    } catch (err) {
      console.error("Publish error:", err);
      alert(err instanceof Error ? err.message : "投稿中にエラーが発生しました");
    }
  };

  // プラットフォーム別のコンテンツ表示・編集コンポーネント
  const renderPlatformContent = (platform: string, content: any) => {
    const editable = editableContent[platform] || content;

    switch (platform) {
      case 'threads':
        return renderThreadsContent(editable);
      case 'twitter':
        return renderTwitterContent(editable);
      case 'youtube':
        return renderYouTubeContent(editable);
      case 'wordpress':
        return renderWordPressContent(editable);
      case 'instagram':
        return renderInstagramContent(editable);
      case 'tiktok':
        return renderTikTokContent(editable);
      default:
        return renderDefaultContent(editable);
    }
  };

  const renderThreadsContent = (content: any) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Threads投稿内容
        </label>
        <textarea
          value={content.text || ''}
          onChange={(e) => updateEditableContent('threads', 'text', e.target.value)}
          rows={6}
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Threads投稿内容..."
        />
        <div className="mt-1 text-sm text-gray-500">
          文字数: {(content.text || '').length} (制限なし)
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ハッシュタグ
        </label>
        <input
          type="text"
          value={(content.hashtags || []).join(', ')}
          onChange={(e) => updateEditableContent('threads', 'hashtags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="ハッシュタグをカンマ区切りで入力"
        />
      </div>
    </div>
  );

  const renderTwitterContent = (content: any) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ツイート内容
        </label>
        <textarea
          value={content.text || ''}
          onChange={(e) => updateEditableContent('twitter', 'text', e.target.value)}
          rows={4}
          maxLength={140}
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="ツイート内容（140文字以内）..."
        />
        <div className="mt-1 text-sm text-gray-500">
          文字数: {(content.text || '').length}/140
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ハッシュタグ（2-3個推奨）
        </label>
        <input
          type="text"
          value={(content.hashtags || []).join(', ')}
          onChange={(e) => updateEditableContent('twitter', 'hashtags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="ハッシュタグをカンマ区切りで入力"
        />
      </div>
    </div>
  );

  const renderYouTubeContent = (content: any) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          動画タイトル
        </label>
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => updateEditableContent('youtube', 'title', e.target.value)}
          maxLength={60}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="YouTubeタイトル（60文字以内推奨）"
        />
        <div className="mt-1 text-sm text-gray-500">
          文字数: {(content.title || '').length}/60
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          動画説明（概要欄）
        </label>
        <textarea
          value={content.description || ''}
          onChange={(e) => updateEditableContent('youtube', 'description', e.target.value)}
          rows={8}
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="動画の詳細説明..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          チャプター
        </label>
        <div className="space-y-2">
          {(content.chapters || []).map((chapter: any, i: number) => (
            <div key={i} className="flex space-x-2">
              <input
                type="text"
                value={chapter.time || ''}
                onChange={(e) => updateChapter('youtube', i, 'time', e.target.value)}
                className="w-20 p-2 border border-gray-300 rounded-md text-sm"
                placeholder="00:00"
              />
              <input
                type="text"
                value={chapter.title || ''}
                onChange={(e) => updateChapter('youtube', i, 'title', e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                placeholder="チャプタータイトル"
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ハッシュタグ
        </label>
        <input
          type="text"
          value={(content.hashtags || []).join(', ')}
          onChange={(e) => updateEditableContent('youtube', 'hashtags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="ハッシュタグをカンマ区切りで入力"
        />
      </div>
    </div>
  );

  const renderWordPressContent = (content: any) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          記事タイトル
        </label>
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => updateEditableContent('wordpress', 'title', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="記事タイトル"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          記事抜粋
        </label>
        <textarea
          value={content.excerpt || ''}
          onChange={(e) => updateEditableContent('wordpress', 'excerpt', e.target.value)}
          rows={3}
          maxLength={160}
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="記事の抜粋（160文字以内）"
        />
        <div className="mt-1 text-sm text-gray-500">
          文字数: {(content.excerpt || '').length}/160
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          記事本文（Markdown）
        </label>
        <textarea
          value={content.content || ''}
          onChange={(e) => updateEditableContent('wordpress', 'content', e.target.value)}
          rows={12}
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="# 見出し&#10;&#10;本文内容..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            カテゴリ
          </label>
          <input
            type="text"
            value={(content.categories || []).join(', ')}
            onChange={(e) => updateEditableContent('wordpress', 'categories', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="カテゴリをカンマ区切りで入力"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            タグ
          </label>
          <input
            type="text"
            value={(content.tags || []).join(', ')}
            onChange={(e) => updateEditableContent('wordpress', 'tags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="タグをカンマ区切りで入力"
          />
        </div>
      </div>
    </div>
  );

  const renderInstagramContent = (content: any) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          キャプション
        </label>
        <textarea
          value={content.caption || ''}
          onChange={(e) => updateEditableContent('instagram', 'caption', e.target.value)}
          rows={8}
          maxLength={2200}
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Instagram キャプション..."
        />
        <div className="mt-1 text-sm text-gray-500">
          文字数: {(content.caption || '').length}/2200
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ハッシュタグ（最大30個）
        </label>
        <textarea
          value={(content.hashtags || []).join(' #')}
          onChange={(e) => updateEditableContent('instagram', 'hashtags', e.target.value.split('#').map(t => t.trim()).filter(t => t))}
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="#ハッシュタグ1 #ハッシュタグ2..."
        />
      </div>
    </div>
  );

  const renderTikTokContent = (content: any) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          キャプション
        </label>
        <textarea
          value={content.caption || ''}
          onChange={(e) => updateEditableContent('tiktok', 'caption', e.target.value)}
          rows={4}
          maxLength={300}
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="TikTok キャプション（300文字以内）..."
        />
        <div className="mt-1 text-sm text-gray-500">
          文字数: {(content.caption || '').length}/300
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ハッシュタグ
        </label>
        <input
          type="text"
          value={(content.hashtags || []).join(', ')}
          onChange={(e) => updateEditableContent('tiktok', 'hashtags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="ハッシュタグをカンマ区切りで入力"
        />
      </div>
    </div>
  );

  const renderDefaultContent = (content: any) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          コンテンツ
        </label>
        <textarea
          value={content.text || content.caption || ''}
          onChange={(e) => updateEditableContent('default', 'text', e.target.value)}
          rows={6}
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="コンテンツ内容..."
        />
      </div>
    </div>
  );

  // ヘルパー関数
  const updateEditableContent = (platform: string, field: string, value: any) => {
    setEditableContent(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
  };

  const updateChapter = (platform: string, index: number, field: string, value: string) => {
    setEditableContent(prev => {
      const chapters = [...(prev[platform]?.chapters || [])];
      chapters[index] = {
        ...chapters[index],
        [field]: value
      };
      return {
        ...prev,
        [platform]: {
          ...prev[platform],
          chapters
        }
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            One to Multi Agent
          </h1>
          <p className="text-gray-600">
            1つのソースから複数プラットフォーム向けのコンテンツを自動生成
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source Type Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">入力タイプを選択</h2>
            <div className="flex space-x-4">
              {[
                { value: "text", label: "テキスト" },
                { value: "audio", label: "音声" },
                { value: "video", label: "動画" }
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    value={option.value}
                    checked={sourceType === option.value}
                    onChange={(e) => setSourceType(e.target.value as any)}
                    className="mr-2"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Content Input */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">コンテンツ入力</h2>
            {sourceType === "text" ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="コンテンツのテキストを入力してください..."
                className="w-full h-40 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            ) : (
              <input
                type="file"
                accept={sourceType === "audio" ? "audio/*" : "video/*"}
                onChange={handleFileChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            )}
          </div>

          {/* Target Platform Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">投稿先プラットフォーム</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { id: "threads", name: "Threads", description: "Meta Threads" },
                { id: "wordpress", name: "WordPress", description: "自社メディア" },
                { id: "youtube", name: "YouTube", description: "動画プラットフォーム" },
                { id: "twitter", name: "X (Twitter)", description: "短文SNS" },
                { id: "instagram", name: "Instagram", description: "画像・動画SNS" },
                { id: "tiktok", name: "TikTok", description: "短尺動画" }
              ].map((platform) => (
                <label
                  key={platform.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    targets.includes(platform.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={targets.includes(platform.id)}
                    onChange={() => handleTargetToggle(platform.id)}
                    className="sr-only"
                  />
                  <div className="text-sm font-medium">{platform.name}</div>
                  <div className="text-xs text-gray-600">{platform.description}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isProcessing || targets.length === 0 || (!content && !file)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? "処理中..." : "コンテンツを生成"}
            </button>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-800">
                <strong>エラー:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && jobId && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <div className="text-blue-800">
                コンテンツを処理中です... (Job ID: {jobId})
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">生成結果</h2>
            
            {/* Source Text Display */}
            {results.sourceText && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">入力されたコンテンツ</h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="text-gray-800 whitespace-pre-wrap">{results.sourceText}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Platform-Specific Generated Content */}
            {results.platformResults && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">プラットフォーム別コンテンツ</h3>
                {results.platformResults.map((result: any, i: number) => (
                  <div key={i} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium capitalize">{result.platform}</h4>
                      {result.success && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          生成完了
                        </span>
                      )}
                    </div>
                    
                    {result.success && result.content ? (
                      <div className="space-y-4">
                        {/* Platform-Specific Content Rendering */}
                        {renderPlatformContent(result.platform, result.content.content)}

                        {/* Platform Info */}
                        <div className="bg-gray-50 p-3 rounded-md">
                          <div className="text-sm text-gray-600 space-y-1">
                            <div><strong>プラットフォーム:</strong> {result.content.content.platform}</div>
                            <div><strong>生成時刻:</strong> {new Date(result.content.metadata?.generatedAt).toLocaleString('ja-JP')}</div>
                            <div><strong>AI:</strong> {result.content.metadata?.aiUsed || 'unknown'}</div>
                          </div>
                        </div>

                        {/* Publish Button */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => handlePublish(result.platform)}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                          >
                            {result.platform} に投稿
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-800">
                        <strong>エラー:</strong> {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
