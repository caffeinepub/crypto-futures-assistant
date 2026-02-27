import React from 'react';
import { BarChart2, Brain, Search, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'market', label: 'Market', icon: BarChart2 },
  { id: 'ai-trade', label: 'AI Trade', icon: Brain },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'preferences', label: 'Settings', icon: Settings },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neon-green/20 bg-surface/95 backdrop-blur-md">
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all duration-200 ${
                isActive
                  ? 'text-neon-green'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-neon-green/15' : ''
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? 'neon-glow-green-icon' : ''}
                />
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-wide ${
                  isActive ? 'text-neon-green' : ''
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
