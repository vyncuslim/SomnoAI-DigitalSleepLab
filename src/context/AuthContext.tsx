import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { analyticsService } from '../services/analyticsService';
import { supabase } from '../services/supabaseService';

interface AuthContextType {
  user: User | null;
  profile: any;
  loading: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  blockCode?: string;
  isAdmin: boolean;
  isOwner: boolean;
  isSuperOwner: boolean;
  isVerified: boolean;
  isPinVerified: boolean;
  isPinBlocked: boolean;
  hasPinSet: boolean;
  is2FAVerified: boolean;
  has2FAEnabled: boolean;
  isAdminAuthenticated: boolean;
  authenticated: boolean;
  setIsPinVerified: (verified: boolean) => void;
  setIs2FAVerified: (verified: boolean) => void;
  setIsAdminAuthenticated: (authenticated: boolean) => void;
  verifyPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<{ recoveryKey: string }>;
  resetPinWithRecoveryKey: (recoveryKey: string, newPin: string) => Promise<boolean>;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isBlocked: false,
  isAdmin: false,
  isOwner: false,
  isSuperOwner: false,
  isVerified: false,
  isPinVerified: false,
  isPinBlocked: false,
  hasPinSet: false,
  is2FAVerified: false,
  has2FAEnabled: false,
  isAdminAuthenticated: false,
  authenticated: false,
  setIsPinVerified: () => {},
  setIs2FAVerified: () => {},
  setIsAdminAuthenticated: () => {},
  verifyPin: async () => false,
  setPin: async () => ({ recoveryKey: '' }),
  resetPinWithRecoveryKey: async () => false,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  resendVerificationEmail: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [is2FAVerified, setIs2FAVerified] = useState(() => {
    return sessionStorage.getItem('is2FAVerified') === 'true';
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('isAdminAuthenticated') === 'true';
  });
  const [isPinBlocked, setIsPinBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | undefined>();
  const [blockCode, setBlockCode] = useState<string | undefined>();

  // Role mapping for specific users
  const ADMIN_EMAILS = [
    'mingjun983@gmail.com',
    'jacobhiijieen@outlook.com',
    'dyl.tang@student.powiis.edu.my',
    'mgj.guo@student.powiis.edu.my',
    'vyncuslim121@gmail.com'
  ];
  const OWNER_EMAILS = [
    'jce.hii@student.powiis.edu.my',
    'damoclestang@gmail.com'
  ];
  const SUPER_OWNER_EMAILS = [
    'ongyuze1401@gmail.com'
  ];

  const isAdmin = !!(
    profile?.role === 'admin' || 
    profile?.role === 'owner' || 
    profile?.is_super_owner ||
    (user?.email && (
      ADMIN_EMAILS.includes(user.email) || 
      OWNER_EMAILS.includes(user.email) || 
      SUPER_OWNER_EMAILS.includes(user.email)
    ))
  );
  
  const isOwner = !!(
    profile?.role === 'owner' || 
    profile?.is_super_owner ||
    (user?.email && (
      OWNER_EMAILS.includes(user.email) || 
      SUPER_OWNER_EMAILS.includes(user.email)
    ))
  );
  
  const isSuperOwner = !!(
    profile?.is_super_owner || 
    (user?.email && SUPER_OWNER_EMAILS.includes(user.email))
  );

  const isVerified = !!user?.email_confirmed_at;
  const hasPinSet = !!profile?.has_pin_set;
  const has2FAEnabled = !!profile?.two_fa_enabled;
  const authenticated = !!user;

  const handleSetIs2FAVerified = (verified: boolean) => {
    setIs2FAVerified(verified);
    if (verified) {
      sessionStorage.setItem('is2FAVerified', 'true');
    } else {
      sessionStorage.removeItem('is2FAVerified');
    }
  };

  const handleSetIsAdminAuthenticated = (authenticated: boolean) => {
    setIsAdminAuthenticated(authenticated);
    if (authenticated) {
      sessionStorage.setItem('isAdminAuthenticated', 'true');
    } else {
      sessionStorage.removeItem('isAdminAuthenticated');
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
        analyticsService.trackVisit(session.user.id);
      } else {
        setIsBlocked(false);
        setBlockedReason(undefined);
        setBlockCode(undefined);
        setLoading(false);
        analyticsService.trackVisit();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
        if (event === 'SIGNED_IN') {
          analyticsService.trackVisit(session.user.id);
        }
      } else {
        setProfile(null);
        setIsBlocked(false);
        setBlockedReason(undefined);
        setBlockCode(undefined);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      console.log(`[AUTH] Fetching profile for ${userId} (${userEmail || 'no email'})`);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_super_owner, is_blocked, blocked_reason, block_code, subscription_plan, subscription_status, two_fa_enabled, has_pin_set, failed_pin_attempts, pin_blocked_until, login_alert_enabled, login_alert_mode, preferred_notification_email')
        .eq('id', userId)
        .single();
      
      if (data) {
        // No need for virtual field anymore as we fetch has_pin_set
      }
      
      console.log(`[AUTH] Profile fetched for ${userId}:`, data);
      
      if (error) {
        console.error('[AUTH] Supabase error fetching profile:', error);
        throw error;
      }
      
      // Super owner bypass - ensure they are never blocked
      const currentEmail = userEmail || user?.email || data?.email;
      const isSuperOwner = currentEmail === 'ongyuze1401@gmail.com' || 
                           currentEmail === 'admin@sleepsomno.com' ||
                           data?.is_super_owner === true ||
                           data?.role === 'super_owner' ||
                           data?.role === 'owner';
      const blockedStatus = isSuperOwner ? false : !!data?.is_blocked;
      
      console.log(`[AUTH] Profile data for ${userId}:`, { 
        is_blocked: data?.is_blocked, 
        isSuperOwner, 
        blockedStatus,
        email: currentEmail,
        role: data?.role
      });

      setProfile(data);
      setIsBlocked(blockedStatus);
      setBlockedReason(data?.blocked_reason || undefined);
      setBlockCode(data?.block_code || undefined);
      
      if (blockedStatus) {
        console.warn(`[AUTH] User ${userId} is blocked. Reason: ${data?.blocked_reason || 'N/A'}`);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Reset blocked status on error to be safe, or keep it false if it was false
      setIsBlocked(false);
      setBlockedReason(undefined);
      setBlockCode(undefined);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string) => {
    // Placeholder sign in
    console.log('Sign in with', email);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsPinVerified(false);
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    if (isPinBlocked) return false;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/pin/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ pin })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[AUTH] Non-JSON response from PIN verify:', text);
        return false;
      }

      const result = await response.json();
      
      if (result.success) {
        setIsPinVerified(true);
        await refreshProfile();
        return true;
      } else {
        if (result.error === 'PIN_BLOCKED') {
          setIsPinBlocked(true);
        }
        await refreshProfile();
        return false;
      }
    } catch (err) {
      console.error('PIN verification error:', err);
      return false;
    }
  };

  const setPin = async (pin: string): Promise<{ recoveryKey: string }> => {
    if (!user) throw new Error('User not authenticated');
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/pin/setup', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ pin })
    });

    let result;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      console.error('[AUTH] Non-JSON response from PIN setup:', text);
      throw new Error(`Server error (${response.status}). Please try again in a few seconds.`);
    }

    if (!result.success) throw new Error(result.message || 'Failed to set PIN');
    
    await refreshProfile();
    setIsPinBlocked(false);
    return { recoveryKey: result.recoveryKey };
  };

  const resetPinWithRecoveryKey = async (recoveryKey: string, newPin: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/pin/reset', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ recoveryKey, newPin })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[AUTH] Non-JSON response from PIN reset:', text);
        return false;
      }

      const result = await response.json();
      if (result.success) {
        await refreshProfile();
        setIsPinVerified(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('PIN reset error:', err);
      return false;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verify`,
      },
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, isBlocked, blockedReason, blockCode, 
      isAdmin, isOwner, isSuperOwner, isVerified, isPinVerified, isPinBlocked, hasPinSet,
      is2FAVerified, has2FAEnabled, isAdminAuthenticated, authenticated,
      setIs2FAVerified: handleSetIs2FAVerified,
      setIsPinVerified, setIsAdminAuthenticated: handleSetIsAdminAuthenticated,
      verifyPin, setPin, resetPinWithRecoveryKey,
      signIn, signOut, refreshProfile, resendVerificationEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
