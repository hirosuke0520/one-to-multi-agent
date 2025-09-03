"use client";

import { useState } from "react";
import { LoginButtonClient } from "./LoginButtonClient";

interface HeaderClientProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function HeaderClient({ user }: HeaderClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <div className="bg-white border-b border-gray-200 p-4 h-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3 md:hidden"
              aria-label="メニューを開く"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              One to Multi Agent
            </h1>
          </div>
          <LoginButtonClient user={user} />
        </div>
      </div>
      
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
}