import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/useLanguage';
import { Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

import { handleFetchResponse } from '../lib/api';

interface TwoFactorProtectionProps {
  children: React.ReactNode;
}

export const TwoFactorProtection: React.FC<TwoFactorProtectionProps> = ({ children }) => {
  const { user, loading, has2FAEnabled, is2FAVerified, setIs2FAVerified, signOut } = useAuth();
  const { t } = useLanguage();
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);

  // Reset verification state if user changes
  useEffect(() => {
    if (!user) {
      setIs2FAVerified(false);
    }
  }, [user, setIs2FAVerified]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#01040a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // If no user, or 2FA is not enabled, or already verified, render children
  if (!user || !has2FAEnabled || is2FAVerified) {
    return <>{children}</>;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || (useRecovery ? token.length < 8 : token.length !== 6)) {
      setError(useRecovery ? t('settings.twoFactor.recoveryCodePlaceholder') : t('settings.twoFactor.invalidCode'));
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const endpoint = useRecovery ? '/api/2fa/verify-recovery' : '/api/2fa/verify';
      const body = useRecovery ? { code: token } : { token };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(body)
      });

      await handleFetchResponse(res);

      setIs2FAVerified(true);
      toast.success(t('settings.twoFactor.enableSuccess'));
    } catch (err: any) {
      setError(err.message || t('settings.twoFactor.invalidCode'));
      toast.error(t('auth.pinRecoveryFailed'));
    } finally {
      setVerifying(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#01040a] p-4">
      <div className="w-full max-w-md bg-secondary/30 p-8 rounded-2xl border border-white/10 shadow-xl backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-primary/20 rounded-full">
              <Shield className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight italic">{t('settings.twoFactor.verificationRequired')}</h1>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-2">{t('auth.secureVerification')}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start text-red-400">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 text-center">
              {useRecovery 
                ? t('settings.twoFactor.recoveryCodePlaceholder') 
                : t('settings.twoFactor.enterCode')}
            </label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => {
                const val = e.target.value;
                if (useRecovery) {
                  setToken(val.toUpperCase());
                } else {
                  setToken(val.replace(/\D/g, '').slice(0, 6));
                }
              }}
              className={`block w-full px-4 py-4 text-center text-2xl font-mono border border-white/10 rounded-xl bg-background/50 text-foreground placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${!useRecovery ? 'tracking-[0.5em]' : 'tracking-widest'}`}
              placeholder={useRecovery ? "XXXX-XXXX" : "000000"}
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={verifying || (useRecovery ? token.length < 8 : token.length !== 6)}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {verifying ? t('settings.twoFactor.verifying') : t('settings.twoFactor.verifyBtn')}
          </button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <button
            onClick={() => {
              setUseRecovery(!useRecovery);
              setToken('');
              setError(null);
            }}
            className="text-sm text-primary hover:text-primary/80 transition-colors block w-full"
          >
            {useRecovery ? t('settings.twoFactor.useAuthenticator') : t('settings.twoFactor.useRecovery')}
          </button>
          
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {t('settings.twoFactor.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
};
