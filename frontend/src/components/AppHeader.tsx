import React from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, User } from 'lucide-react';

export default function AppHeader() {
  const { identity, clear, loginStatus } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const shortPrincipal = identity
    ? identity.getPrincipal().toString().slice(0, 8) + '...'
    : null;

  return (
    <header className="app-header sticky top-0 z-50 flex items-center justify-between px-4 py-2 border-b border-neon-green/20">
      <div className="flex items-center gap-2">
        <img
          src="/assets/generated/app-wordmark.dim_600x120.png"
          alt="CryptoSMC Pro"
          className="h-8 object-contain"
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="text-neon-green font-bold text-lg tracking-widest font-mono hidden-when-img-loads">
          CryptoSMC Pro
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isAuthenticated && (
          <>
            <div className="flex items-center gap-1 text-xs text-neon-blue/80 bg-neon-blue/10 px-2 py-1 rounded-full border border-neon-blue/20">
              <User size={10} />
              <span className="font-mono">{shortPrincipal}</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loginStatus === 'logging-in'}
              className="flex items-center gap-1 text-xs text-neon-red/80 hover:text-neon-red transition-colors px-2 py-1 rounded-full border border-neon-red/20 hover:border-neon-red/50"
            >
              <LogOut size={12} />
              <span>Logout</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
