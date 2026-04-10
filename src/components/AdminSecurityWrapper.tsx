import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import { motion } from 'motion/react';
import { Shield, Key, Fingerprint, ShieldCheck, AlertTriangle } from 'lucide-react';

interface AdminSecurityWrapperProps {
  children: React.ReactNode;
}

export const AdminSecurityWrapper: React.FC<AdminSecurityWrapperProps> = ({ children }) => {
  const { user, isAdmin: authIsAdmin, authenticated: authAuthenticated, isAdminAuthenticated, setIsAdminAuthenticated, signOut, loading } = useAuth();
  
  // Defensive checks with default values
  const isAdmin = authIsAdmin ?? false;
  const authenticated = authAuthenticated ?? false;

  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);

  useEffect(() => {
    // Log security status for debugging
    console.log(`AdminSecurityWrapper: isAdmin=${isAdmin} authenticated=${authenticated}`);

    if (isAdmin && !isAdminAuthenticated) {
      addTerminalLine('SYSTEM_BOOT: Initializing secure admin environment...');
      addTerminalLine('ENCRYPTION: AES-256-GCM active.');
      addTerminalLine('FIREWALL: Deep packet inspection enabled.');
      addTerminalLine('AUTH_REQUIRED: Secondary administrative credentials required.');
    }
  }, [isAdmin, isAdminAuthenticated]);

  const addTerminalLine = (line: string) => {
    setTerminalLines(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`].slice(-5));
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#01040a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <div className="text-emerald-500 text-lg font-mono animate-pulse uppercase tracking-widest">Initializing Secure Environment...</div>
      </div>
    );
  }

  // If not an admin, let ProtectedRoute handle the redirection
  if (!isAdmin) {
    return <>{children}</>;
  }

  // If already authenticated with the secondary admin password
  if (isAdminAuthenticated) {
    return <>{children}</>;
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    addTerminalLine(`AUTH_ATTEMPT: User ${user?.email} requesting access...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/verify-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ password, mfaToken })
      });

      const result = await response.json();

      if (result.success) {
        addTerminalLine('AUTH_SUCCESS: Identity verified. Granting access...');
        setTimeout(() => {
          setIsAdminAuthenticated(true);
          setIsProcessing(false);
        }, 1000);
      } else if (result.error === 'MFA_REQUIRED') {
        addTerminalLine('MFA_REQUIRED: Multi-factor authentication token required.');
        setShowMfa(true);
        setIsProcessing(false);
      } else {
        addTerminalLine(`AUTH_FAILURE: ${result.message || 'Invalid credentials'}. Security event logged.`);
        setError(result.error || 'INVALID_ADMIN_CREDENTIALS');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Admin auth error:', err);
      addTerminalLine('AUTH_ERROR: System communication failure.');
      setError('SYSTEM_ERROR');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#01040a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-4">
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Security Protocol</h1>
          <p className="text-xs text-slate-500 mt-2">Administrative access requires secondary verification</p>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Admin Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-slate-700 focus:border-emerald-500/50 focus:outline-none transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {showMfa && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">MFA Token</label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-slate-700 focus:border-emerald-500/50 focus:outline-none transition-all text-sm"
                      placeholder="000000"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-3 text-rose-400 text-xs">
                <AlertTriangle size={14} />
                <span>{error === 'INVALID_ADMIN_CREDENTIALS' ? 'Access Denied: Invalid Credentials' : 'System Error: Authentication Failed'}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={14} />
                  Verify Identity
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 p-4 bg-black/40 border border-white/5 rounded-xl font-mono text-[10px] text-emerald-500/60 space-y-1">
          {terminalLines.map((line, i) => (
            <div key={i} className="flex gap-2">
              <span className="opacity-40">[{i}]</span>
              <span>{line.split('] ')[1]}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => signOut()}
          className="mt-8 text-slate-500 hover:text-white text-[10px] uppercase tracking-widest transition-colors mx-auto block"
        >
          Logout Session
        </button>
      </div>
    </div>
  );
};
