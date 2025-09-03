"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useContentGenerator } from '../hooks/useContentGenerator';
import { SourceForm } from '../components/SourceForm';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { Sidebar } from '../components/Sidebar';
import { ThreadView } from '../components/ThreadView';
import { useSidebar } from '../contexts/SidebarContext';

interface HomeContentProps {
  userId?: string;
}

export default function HomeContent({ userId }: HomeContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const { isSidebarOpen, closeSidebar } = useSidebar();

  useEffect(() => {
    const threadId = searchParams.get('thread');
    setSelectedThreadId(threadId);
  }, [searchParams]);
  
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
    handlePublish,
    updateEditableContent,
    resetForm,
  } = useContentGenerator(userId);

  const handleNewChat = () => {
    setSelectedThreadId(null);
    resetForm();
    router.push('/');
    closeSidebar(); // Close mobile sidebar
  };

  const handleThreadSelect = (threadId: string | null) => {
    setSelectedThreadId(threadId);
    if (threadId) {
      router.push(`/?thread=${threadId}`);
    } else {
      router.push('/');
    }
    closeSidebar(); // Close mobile sidebar
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        selectedThreadId={selectedThreadId}
        onThreadSelect={handleThreadSelect}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-0">
        {selectedThreadId ? (
          <ThreadView threadId={selectedThreadId} userId={userId} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
              <header className="mb-6 md:mb-8 text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  One to Multi Agent
                </h1>
                <p className="text-gray-600 text-sm md:text-base">
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
                handleSubmit={handleSubmit}
              />

              {isProcessing && !results && (
                <div className="mt-4 md:mt-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-blue-800 text-sm md:text-base">コンテンツを処理中です...</p>
                </div>
              )}

              {error && (
                <div className="mt-4 md:mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm md:text-base">
                  <strong>エラー:</strong> {error}
                </div>
              )}

              <ResultsDisplay 
                results={results} 
                editableContent={editableContent} 
                updateEditableContent={updateEditableContent}
                handlePublish={handlePublish}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}