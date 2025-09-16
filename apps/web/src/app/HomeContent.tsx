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
  isAuthenticated?: boolean;
}

export default function HomeContent({ userId, isAuthenticated }: HomeContentProps) {
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
    tempPrompts,
    setTempPrompts,
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
    <div className="flex h-[calc(100vh-64px)] bg-black overflow-hidden">
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
          <ThreadView threadId={selectedThreadId} userId={userId} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
              <header className="mb-8 md:mb-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-blue-500 mb-4 font-inter">
                  One to Multi Agent
                </h1>
                <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-inter">
                  1つのソースから複数プラットフォーム向けの
                  <span className="font-semibold text-blue-400">高品質コンテンツ</span>を自動生成
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
                tempPrompts={tempPrompts}
                onTempPromptsChange={setTempPrompts}
                isProcessing={isProcessing}
                handleSubmit={handleSubmit}
              />

              {isProcessing && !results && (
                <div className="mt-4 md:mt-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-blue-400 text-sm md:text-base font-inter">コンテンツを処理中です...</p>
                </div>
              )}

              {error && (
                <div className="mt-4 md:mt-6 bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative text-sm md:text-base font-inter">
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