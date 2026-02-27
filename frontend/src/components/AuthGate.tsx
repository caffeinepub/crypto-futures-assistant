import React from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, LogIn, Loader2 } from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
  message?: string;
}

export default function AuthGate({ children, message }: AuthGateProps) {
  const { identity, login, clear, loginStatus, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: unknown) {
      const err = error as Error;
      if (err?.message === 'User is already authenticated') {
        await clear();
        queryClient.clear();
        setTimeout(() => login(), 300);
      }
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-neon-green" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 gap-4 rounded-xl border border-neon-blue/30 bg-neon-blue/5">
        <div className="w-12 h-12 rounded-full bg-neon-blue/20 border border-neon-blue/40 flex items-center justify-center">
          <Shield size={22} className="text-neon-blue" />
        </div>
        <div className="text-center">
          <div className="font-semibold text-foreground text-sm">Authentication Required</div>
          <div className="text-xs text-muted-foreground mt-1">
            {message || 'Connect with Internet Identity to access this feature'}
          </div>
        </div>
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neon-blue/20 border border-neon-blue/50 text-neon-blue font-semibold text-sm hover:bg-neon-blue/30 transition-all disabled:opacity-50"
        >
          {isLoggingIn ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LogIn size={14} />
          )}
          {isLoggingIn ? 'Connecting...' : 'Connect with Internet Identity'}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
