import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

import type { Stock } from '../../types';

interface MainLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  watchlistCount?: number;
  searchResults?: Stock[];
  onSearch?: (query: string) => void;
  onSelectStock?: (symbol: string) => void;
}

export function MainLayout({
  children,
  activeTab,
  onTabChange,
  watchlistCount,
  searchResults,
  onSearch,
  onSelectStock,
}: MainLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header onSearch={onSearch} searchResults={searchResults} onSelectStock={onSelectStock} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          watchlistCount={watchlistCount}
        />
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}