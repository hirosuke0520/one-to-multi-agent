"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useContentGenerator } from '../hooks/useContentGenerator';
import { SourceForm } from '../components/SourceForm';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { Sidebar } from '../components/Sidebar';
import { ThreadView } from '../components/ThreadView';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  } = useContentGenerator();

  const handleNewChat = () => {
    setSelectedThreadId(null);
    resetForm();
    router.push('/');
    setIsSidebarOpen(false); // Close mobile sidebar
  };

  const handleThreadSelect = (threadId: string | null) => {
    setSelectedThreadId(threadId);
    if (threadId) {
      router.push(`/?thread=${threadId}`);
    } else {
      router.push('/');
    }
    setIsSidebarOpen(false); // Close mobile sidebar
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        selectedThreadId={selectedThreadId}
        onThreadSelect={handleThreadSelect}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-0">
        {/* Mobile Header with Hamburger Menu */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
            aria-label="メニューを開く"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {selectedThreadId ? 'スレッド' : 'One to Multi Agent'}
          </h1>
        </div>
        {selectedThreadId ? (
          <ThreadView threadId={selectedThreadId} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
              <header className="text-center mb-6 md:mb-8 hidden md:block">
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
