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
      
      const payload = {
        sourceType,
        content: sourceType === "text" ? content : undefined,
        targets,
        profile: {
          tone: "conversational",
          audience: "general",
          purpose: "inform"
        }
      };

      const response = await fetch(`${apiUrl}/orchestrator/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

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
            
            {/* Canonical Content */}
            {results.canonicalContent && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">元コンテンツ分析</h3>
                <div className="space-y-3">
                  <div>
                    <strong>タイトル:</strong> {results.canonicalContent.title}
                  </div>
                  <div>
                    <strong>要約:</strong> {results.canonicalContent.summary}
                  </div>
                  <div>
                    <strong>キーポイント:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      {results.canonicalContent.keyPoints?.map((point: string, i: number) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>トピック:</strong> {results.canonicalContent.topics?.join(", ")}
                  </div>
                </div>
              </div>
            )}

            {/* Platform Results */}
            {results.platformResults && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">プラットフォーム別結果</h3>
                {results.platformResults.map((result: any, i: number) => (
                  <div key={i} className={`rounded-lg shadow p-6 ${
                    result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-medium capitalize">{result.platform}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.success ? '成功' : '失敗'}
                      </span>
                    </div>
                    
                    {result.success ? (
                      <div className="space-y-3">
                        {result.result?.url && (
                          <div>
                            <strong>URL:</strong> 
                            <a href={result.result.url} target="_blank" rel="noopener noreferrer" 
                               className="text-blue-600 hover:underline ml-2">
                              {result.result.url}
                            </a>
                          </div>
                        )}
                        <div>
                          <strong>ステータス:</strong> {result.result?.status}
                        </div>
                        <div>
                          <strong>メッセージ:</strong> {result.result?.message}
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
