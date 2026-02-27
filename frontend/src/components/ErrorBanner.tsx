import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-red/40 bg-neon-red/10 text-neon-red">
      <AlertCircle size={16} className="flex-shrink-0" />
      <span className="text-sm flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-xs border border-neon-red/40 px-2 py-1 rounded-lg hover:bg-neon-red/20 transition-colors"
        >
          <RefreshCw size={11} />
          Retry
        </button>
      )}
    </div>
  );
}
