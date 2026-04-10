import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, AlertCircle, Copy, Check, QrCode, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/useLanguage';
import { toast } from 'sonner';
import { handleFetchResponse } from '../lib/api';

export const TwoFactorAuth = () => {
  const { user, refreshProfile, setIs2FAVerified } = useAuth();
  const { t } = useLanguage();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<{ qrCodeDataURL: string; secret: string; recoveryCodes: string[] } | null>(null);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [user]);

  const fetchStatus = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('two_fa_enabled')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setIsEnabled(data.two_fa_enabled || false);
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await handleFetchResponse(res);
      setSetupData(data);
      setShowRecoveryCodes(false);
    } catch (error: any) {
      toast.error(error.message || t('settings.twoFactor.setupError') || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!token || token.length !== 6) {
      toast.error(t('settings.twoFactor.invalidCode'));
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/2fa/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ token })
      });
      await handleFetchResponse(res);
      
      toast.success(t('settings.twoFactor.enableSuccess'));
      setIsEnabled(true);
      setShowRecoveryCodes(true);
      setToken('');
      setIs2FAVerified(true);
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message || t('settings.twoFactor.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const downloadRecoveryCodes = () => {
    if (!setupData?.recoveryCodes) return;
    const content = `SomnoAI Digital Sleep Lab - 2FA Recovery Codes\n\n` +
      `Keep these codes in a safe place. Each code can only be used once.\n\n` +
      setupData.recoveryCodes.join('\n') +
      `\n\nGenerated on: ${new Date().toLocaleString()}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `somnoai-recovery-codes-${user?.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('settings.twoFactor.downloadCodes'));
  };

  const handleDisable = async () => {
    if (!token || token.length !== 6) {
      toast.error(t('settings.twoFactor.invalidCode'));
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ token })
      });
      await handleFetchResponse(res);
      
      toast.success(t('settings.twoFactor.disableSuccess'));
      setIsEnabled(false);
      setToken('');
      setIs2FAVerified(false);
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message || t('settings.twoFactor.disableSuccess'));
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t('settings.twoFactor.copied'));
    }
  };

  if (loading && !setupData) {
    return <div className="animate-pulse h-32 bg-slate-900/50 rounded-2xl border border-slate-800"></div>;
  }

  return (
    <div className="bg-slate-900/40 rounded-3xl border border-slate-800 overflow-hidden shadow-xl backdrop-blur-sm">
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl ${isEnabled ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
              {isEnabled ? <ShieldCheck className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {t('settings.twoFactor.title')}
                {isEnabled && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">ACTIVE</span>}
              </h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md">
                {isEnabled ? t('settings.twoFactor.enabled') : t('settings.twoFactor.subtitle')}
              </p>
            </div>
          </div>
          {!setupData && !isEnabled && (
            <button
              onClick={handleSetup}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 text-sm whitespace-nowrap flex items-center gap-2 group"
            >
              {t('settings.twoFactor.setup')}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {setupData && !isEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 pt-8 border-t border-slate-800 space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <QrCode size={16} />
                      {t('settings.twoFactor.setupTitle')}
                    </h4>
                    <ul className="space-y-4">
                      <li className="flex gap-3 text-sm text-slate-300">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
                        <p>{t('settings.twoFactor.setupStep1')}</p>
                      </li>
                      <li className="flex gap-3 text-sm text-slate-300">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
                        <p>{t('settings.twoFactor.setupStep2')}</p>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 block">
                      {t('settings.twoFactor.secretKey')}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-indigo-400 select-all overflow-hidden text-ellipsis">
                        {setupData.secret}
                      </div>
                      <button
                        onClick={copySecret}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700"
                      >
                        {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-white p-4 rounded-3xl shadow-2xl">
                      <img src={setupData.qrCodeDataURL} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                  </div>

                  <form 
                    className="w-full max-w-xs space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleConfirm();
                    }}
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold text-center block">
                        {t('settings.twoFactor.authenticatorCodePlaceholder')}
                      </label>
                      <input
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 text-center text-2xl font-mono text-white tracking-[0.5em] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setSetupData(null)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-xs uppercase tracking-widest"
                      >
                        {t('settings.twoFactor.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={loading || token.length !== 6}
                        className="flex-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 text-xs uppercase tracking-widest disabled:opacity-50"
                      >
                        {loading ? t('settings.twoFactor.verifying') : t('settings.twoFactor.verify')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {showRecoveryCodes && isEnabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 pt-8 border-t border-slate-800"
            >
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6 md:p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">{t('settings.twoFactor.recoveryCodesTitle')}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {t('settings.twoFactor.recoveryCodesDesc')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-8">
                  {setupData?.recoveryCodes.map((code, idx) => (
                    <div key={idx} className="bg-black/40 border border-white/5 p-3 rounded-xl font-mono text-xs text-amber-500/80 text-center tracking-wider">
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={downloadRecoveryCodes}
                    className="flex-1 px-6 py-4 bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-2xl hover:bg-amber-500/30 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Copy size={16} />
                    {t('settings.twoFactor.downloadCodes')}
                  </button>
                  <button
                    onClick={() => setShowRecoveryCodes(false)}
                    className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    {t('pinDone')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {isEnabled && !showRecoveryCodes && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 pt-8 border-t border-slate-800"
            >
              <form 
                className="max-w-xs space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleDisable();
                }}
              >
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                  {t('settings.twoFactor.disable')}
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 text-center text-xl font-mono text-white tracking-[0.5em] focus:outline-none focus:border-red-500/50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loading || token.length !== 6}
                    className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  >
                    {t('settings.twoFactor.disable')}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
