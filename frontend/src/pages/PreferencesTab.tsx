import React, { useState } from 'react';
import { Star, Trash2, Key, Bell, BellOff, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { useLocalLearning } from '../hooks/useLocalLearning';
import { storeCredentials, clearCredentials, getStoredCredentials } from '../lib/binance-auth';
import AuthGate from '../components/AuthGate';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const WHITELIST = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT',
  'XRPUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT',
];

const PNL_ALERTS_KEY = 'cryptosmc-pnl-alerts-enabled';

function loadPnlAlerts(): boolean {
  try {
    return localStorage.getItem(PNL_ALERTS_KEY) !== 'false';
  } catch {
    return true;
  }
}

export default function PreferencesTab() {
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { resetLocalLearning, getLog } = useLocalLearning();
  const [pnlAlerts, setPnlAlerts] = useState(loadPnlAlerts);
  const [resetDone, setResetDone] = useState(false);

  // API Key management
  const stored = getStoredCredentials();
  const [apiKey, setApiKey] = useState(stored?.apiKey ?? '');
  const [secretKey, setSecretKey] = useState(stored?.secretKey ?? '');
  const [showSecret, setShowSecret] = useState(false);
  const [credsSaved, setCredsSaved] = useState(!!stored);

  const log = getLog();
  const totalObservations = log.reduce((s, e) => s + e.occurrenceCount, 0);

  const handlePnlToggle = () => {
    const next = !pnlAlerts;
    setPnlAlerts(next);
    localStorage.setItem(PNL_ALERTS_KEY, String(next));
  };

  const handleSaveCredentials = () => {
    if (apiKey.trim() && secretKey.trim()) {
      storeCredentials(apiKey.trim(), secretKey.trim());
      setCredsSaved(true);
    }
  };

  const handleClearCredentials = () => {
    clearCredentials();
    setApiKey('');
    setSecretKey('');
    setCredsSaved(false);
  };

  const handleReset = () => {
    resetLocalLearning();
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-white/5">
        <div className="text-sm font-semibold text-foreground">Preferences</div>
        <div className="text-[10px] text-muted-foreground">Customize your experience</div>
      </div>

      <div className="flex-1 p-4 space-y-5">
        {/* Favorite Assets */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-yellow-400" />
            <span className="text-sm font-semibold text-foreground">Favorite Assets</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{favorites.length} selected</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Favorites appear first in AI Trade and receive a signal bonus.
          </div>
          <div className="grid grid-cols-2 gap-2">
            {WHITELIST.map(symbol => {
              const base = symbol.replace('USDT', '');
              const fav = isFavorite(symbol);
              return (
                <button
                  key={symbol}
                  onClick={() => toggleFavorite(symbol)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    fav
                      ? 'bg-yellow-400/15 border-yellow-400/50 text-yellow-400'
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/20'
                  }`}
                >
                  <Star size={12} className={fav ? 'fill-yellow-400' : ''} />
                  <span>{base}</span>
                  {fav && <Check size={11} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Local Learning Reset */}
        <section className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-neon-orange" />
            <span className="text-sm font-semibold text-foreground">Local Learning</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total observations</span>
              <span className="font-mono text-neon-purple">{totalObservations}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Symbols tracked</span>
              <span className="font-mono text-neon-purple">{new Set(log.map(e => e.symbol)).size}</span>
            </div>
          </div>

          {resetDone ? (
            <div className="flex items-center gap-2 text-neon-green text-sm py-2">
              <Check size={14} />
              <span>Local learning data cleared!</span>
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neon-red/40 bg-neon-red/10 text-neon-red text-sm font-semibold hover:bg-neon-red/20 transition-colors w-full justify-center">
                  <Trash2 size={14} />
                  Reset Local Learning Data
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-surface border-white/20">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Reset Local Learning?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This will permanently delete all {totalObservations} local pattern observations from your device.
                    Global learning data on the blockchain is not affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/10 border-white/20 text-foreground hover:bg-white/20">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-neon-red/20 border border-neon-red/50 text-neon-red hover:bg-neon-red/30"
                  >
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </section>

        {/* Binance API Key Management */}
        <section className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Key size={14} className="text-neon-blue" />
            <span className="text-sm font-semibold text-foreground">Binance API Keys</span>
          </div>
          <AuthGate message="Connect with Internet Identity to manage your Binance API keys">
            <div className="space-y-3">
              <div className="text-[11px] text-muted-foreground">
                Keys are stored only on your device (localStorage). Never sent to any server.
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="API Key"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue/50 font-mono"
                />
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    placeholder="Secret Key"
                    value={secretKey}
                    onChange={e => setSecretKey(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-blue/50 font-mono"
                  />
                  <button
                    onClick={() => setShowSecret(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCredentials}
                    disabled={!apiKey.trim() || !secretKey.trim()}
                    className="flex-1 py-2 rounded-lg bg-neon-blue/20 border border-neon-blue/40 text-neon-blue text-sm font-semibold hover:bg-neon-blue/30 transition-colors disabled:opacity-40"
                  >
                    {credsSaved ? 'Update Keys' : 'Save Keys'}
                  </button>
                  {credsSaved && (
                    <button
                      onClick={handleClearCredentials}
                      className="px-3 py-2 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-sm hover:bg-neon-red/20 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {credsSaved && (
                  <div className="flex items-center gap-1.5 text-[11px] text-neon-green">
                    <Check size={11} />
                    <span>API keys saved on device</span>
                  </div>
                )}
              </div>
            </div>
          </AuthGate>
        </section>

        {/* Visual Settings */}
        <section className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-neon-orange" />
            <span className="text-sm font-semibold text-foreground">Notifications</span>
          </div>
          <div className="flex items-center justify-between px-3 py-3 rounded-xl border border-white/10 bg-surface">
            <div>
              <div className="text-sm text-foreground">P&L Alerts</div>
              <div className="text-[10px] text-muted-foreground">Visual alerts for significant P&L changes</div>
            </div>
            <button
              onClick={handlePnlToggle}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                pnlAlerts ? 'bg-neon-green/40 border border-neon-green/60' : 'bg-white/10 border border-white/20'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                  pnlAlerts ? 'left-5 bg-neon-green' : 'left-0.5 bg-white/40'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-4 border-t border-white/5 text-center space-y-1">
          <div className="text-[10px] text-muted-foreground">
            Built with <span className="text-neon-red">♥</span> using{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'cryptosmc-pro')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-blue hover:text-neon-blue/80 transition-colors"
            >
              caffeine.ai
            </a>
          </div>
          <div className="text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} CryptoSMC Pro
          </div>
        </footer>
      </div>
    </div>
  );
}
