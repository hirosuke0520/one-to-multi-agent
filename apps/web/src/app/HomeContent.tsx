"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useContentGenerator } from "../hooks/useContentGenerator";
import { SourceForm } from "../components/SourceForm";
import { ResultsDisplay } from "../components/ResultsDisplay";
import { Sidebar } from "../components/Sidebar";
import { ThreadView } from "../components/ThreadView";
import { useSidebar } from "../contexts/SidebarContext";
import { getApiUrl } from "../lib/config";

interface HomeContentProps {
  token?: string;
  isAuthenticated?: boolean;
}

export default function HomeContent({
  token,
  isAuthenticated,
}: HomeContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [tempPrompts, setTempPrompts] = useState<Record<string, string>>({});
  const [userPrompts, setUserPrompts] = useState<Record<string, string>>({});
  const [modifiedPrompts, setModifiedPrompts] = useState<
    Record<string, boolean>
  >({});
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const { isSidebarOpen, closeSidebar } = useSidebar();

  useEffect(() => {
    const threadId = searchParams.get("thread");
    setSelectedThreadId(threadId);
  }, [searchParams]);

  // Fetch user's combined prompts when component mounts
  useEffect(() => {
    if (token && !selectedThreadId) {
      fetchUserPrompts();
    }
  }, [token, selectedThreadId]);

  const fetchUserPrompts = async () => {
    if (!token) return;

    setLoadingPrompts(true);
    try {
      const response = await fetch(`${getApiUrl()}/prompts/combined`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserPrompts(data.prompts || {});
        // Initialize tempPrompts with user's prompts
        setTempPrompts(data.prompts || {});
      }
    } catch (error) {
      console.error("Failed to fetch user prompts:", error);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const {
    sourceType,
    setSourceType,
    content,
    setContent,
    setFile,
    targets,
    setTargets,
    isProcessing,
    results,
    editableContent,
    error,
    handleSubmit,
    updateEditableContent,
    resetForm,
  } = useContentGenerator(token);

  const handleNewChat = () => {
    setSelectedThreadId(null);
    resetForm();
    setTempPrompts({});
    setModifiedPrompts({});
    router.push("/");
    closeSidebar(); // Close mobile sidebar
  };

  const handleThreadSelect = (threadId: string | null) => {
    setSelectedThreadId(threadId);
    if (threadId) {
      router.push(`/?thread=${threadId}`);
    } else {
      router.push("/");
    }
    closeSidebar(); // Close mobile sidebar
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        selectedThreadId={selectedThreadId}
        onThreadSelect={handleThreadSelect}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isAuthenticated={isAuthenticated}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-0">
        {selectedThreadId ? (
          <ThreadView threadId={selectedThreadId} token={token} />
        ) : (
          <div className="flex-1 py-4 md:py-8">
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
              <header className="mb-6 md:mb-8 text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  One to Multi Agent
                </h1>
                <p className="text-gray-300 text-sm md:text-base">
                  1つのソースから複数プラットフォーム向けのコンテンツを自動生成
                </p>
              </header>

              <SourceForm
                sourceType={sourceType}
                setSourceType={setSourceType}
                content={content}
                setContent={setContent}
                setFile={setFile}
                targets={targets}
                setTargets={setTargets}
                isProcessing={isProcessing}
                handleSubmit={(e, customPrompts) => {
                  // 完全なプロンプト（API取得したもの + カスタム）を送信
                  const finalPrompts: Record<string, string> = {};

                  targets.forEach((target) => {
                    const normalizedTarget =
                      target === "wordpress" ? "blog" : target;

                    // customPromptsが指定されている場合はそれを優先
                    if (customPrompts && customPrompts[normalizedTarget]) {
                      finalPrompts[normalizedTarget] =
                        customPrompts[normalizedTarget];
                    } else if (customPrompts && customPrompts[target]) {
                      finalPrompts[normalizedTarget] = customPrompts[target];
                    } else {
                      // カスタムがない場合はAPIから取得した完全なプロンプトを使用
                      if (userPrompts[normalizedTarget]) {
                        finalPrompts[normalizedTarget] =
                          userPrompts[normalizedTarget];
                      } else if (userPrompts[target]) {
                        finalPrompts[normalizedTarget] = userPrompts[target];
                      }
                    }
                  });

                  handleSubmit(e, finalPrompts);
                }}
                isAuthenticated={isAuthenticated}
                tempPrompts={tempPrompts}
                modifiedPrompts={modifiedPrompts}
                onTempPromptsChange={(prompts) => {
                  setTempPrompts((prev) => ({ ...prev, ...prompts }));
                  // 初期値と比較して変更されたプロンプトをマーク
                  const modified: Record<string, boolean> = {};
                  Object.keys(prompts).forEach((platform) => {
                    const normalizedPlatform =
                      platform === "wordpress" ? "blog" : platform;
                    const originalPrompt =
                      userPrompts[normalizedPlatform] ||
                      userPrompts[platform] ||
                      "";
                    const newPrompt = prompts[platform] || "";
                    modified[platform] = originalPrompt !== newPrompt;
                  });
                  setModifiedPrompts((prev) => ({ ...prev, ...modified }));
                }}
              />

              {isProcessing && !results && (
                <div className="mt-4 md:mt-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="mt-2 text-blue-300 text-sm md:text-base">
                    コンテンツを処理中です...
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 md:mt-6 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded relative text-sm md:text-base">
                  <strong>エラー:</strong> {error}
                </div>
              )}

              <ResultsDisplay
                results={results}
                editableContent={editableContent}
                updateEditableContent={updateEditableContent}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
