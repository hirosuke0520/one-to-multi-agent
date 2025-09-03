"use client";

import { useSidebar } from "../contexts/SidebarContext";

export function HeaderMenuButton() {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3 md:hidden"
      aria-label="メニューを開く"
      onClick={toggleSidebar}
    >
      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}