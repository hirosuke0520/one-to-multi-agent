'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { useSidebar } from '../../contexts/SidebarContext';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const router = useRouter();
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const handleNewChat = () => {
    setSelectedThreadId(null);
    router.push('/');
    closeSidebar();
  };

  const handleThreadSelect = (threadId: string | null) => {
    setSelectedThreadId(threadId);
    if (threadId) {
      router.push(`/?thread=${threadId}`);
    } else {
      router.push('/');
    }
    closeSidebar();
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
        isAuthenticated={true}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-0">
        {children}
      </div>
    </div>
  );
}