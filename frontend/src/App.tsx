import React, { useState } from 'react';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import MarketTab from './pages/MarketTab';
import AITradeTab from './pages/AITradeTab';
import SearchTab from './pages/SearchTab';
import PreferencesTab from './pages/PreferencesTab';
import { Toaster } from '@/components/ui/sonner';

type TabId = 'market' | 'ai-trade' | 'search' | 'preferences';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('market');

  const renderTab = () => {
    switch (activeTab) {
      case 'market': return <MarketTab />;
      case 'ai-trade': return <AITradeTab />;
      case 'search': return <SearchTab />;
      case 'preferences': return <PreferencesTab />;
      default: return <MarketTab />;
    }
  };

  return (
    <div className="app-root flex flex-col h-screen max-w-lg mx-auto relative overflow-hidden">
      <AppHeader />
      <main className="flex-1 overflow-hidden flex flex-col" style={{ paddingBottom: '64px' }}>
        <div className="flex-1 overflow-hidden flex flex-col h-full">
          {renderTab()}
        </div>
      </main>
      <BottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as TabId)} />
      <Toaster theme="dark" position="top-center" />
    </div>
  );
}
