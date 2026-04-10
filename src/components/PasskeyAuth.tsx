import { useState } from 'react';
import { Fingerprint, Loader2, ShieldCheck } from 'lucide-react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { handleFetchResponse } from '../lib/api';

interface PasskeyAuthProps {
  mode: 'register' | 'login';
  onSuccess?: () => void;
}

export const PasskeyAuth = ({ mode, onSuccess }: PasskeyAuthProps) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const { user, refreshProfile } = useAuth();

  const handleRegister = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 1. Get registration options from server
      const optionsRes = await fetch('/api/webauthn/generate-registration-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const optionsData = await handleFetchResponse(optionsRes);

      // 2. Start browser registration
      const attestationResponse = await startRegistration(optionsData.options);

      // 3. Verify registration response on server
      const verifyRes = await fetch('/api/webauthn/verify-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          response: attestationResponse,
          challengeId: optionsData.challengeId
        })
      });
      
      const verification = await handleFetchResponse(verifyRes);

      if (verification.success) {
        toast.success('Passkey registered successfully!');
        await refreshProfile();
        onSuccess?.();
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      console.error('Passkey registration error:', error);
      toast.error(error.message || 'Failed to register passkey');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      // 1. Get authentication options from server
      // Note: For login, we might need the user's email or it could be a discoverable credential
      const optionsRes = await fetch('/api/webauthn/generate-authentication-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const optionsData = await handleFetchResponse(optionsRes);

      // 2. Start browser authentication
      const assertionResponse = await startAuthentication(optionsData.options);

      // 3. Verify authentication response on server
      const verifyRes = await fetch('/api/webauthn/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: assertionResponse,
          challengeId: optionsData.challengeId
        })
      });

      const verification = await handleFetchResponse(verifyRes);

      if (verification.success && verification.action_link) {
        toast.success('Authentication successful! Redirecting...');
        window.location.href = verification.action_link;
        onSuccess?.();
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error: any) {
      console.error('Passkey authentication error:', error);
      toast.error(error.message || 'Failed to login with passkey');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'register') {
    return (
      <div className="bg-secondary/30 p-6 rounded-xl border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Passkeys</h3>
              <p className="text-sm text-gray-400">Secure, passwordless login using your device's biometrics</p>
            </div>
          </div>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-sm font-medium flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            Register Passkey
          </button>
        </div>
        
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex items-start">
          <ShieldCheck className="w-5 h-5 text-indigo-400 mr-3 shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-200">
            <p className="font-medium mb-1">Why use passkeys?</p>
            <p>Passkeys are a safer and easier replacement for passwords. They use your device's screen lock (like Touch ID, Face ID, or PIN) to sign you in securely.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email for Passkey Login</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && email) {
              handleLogin();
            }
          }}
          placeholder="your@email.com"
          className="w-full px-4 py-3 bg-secondary/50 border border-white/10 rounded-2xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
        />
      </div>
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading || !email}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl hover:bg-indigo-600/30 transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Fingerprint size={20} />
            Sign in with Passkey
          </>
        )}
      </button>
    </div>
  );
};
