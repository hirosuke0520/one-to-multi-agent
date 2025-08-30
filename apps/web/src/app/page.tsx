"use client";

import { useContentGenerator } from '../hooks/useContentGenerator';
import { SourceForm } from '../components/SourceForm';
import { ResultsDisplay } from '../components/ResultsDisplay';

export default function Home() {
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
  } = useContentGenerator();

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
          <div className="mt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-blue-800">コンテンツを処理中です...</p>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
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
  );
}
