import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Logo } from './Logo';
import { supabase } from '../services/supabaseService';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    console.log('AuthCallback rendered, URL:', window.location.href);
    
    const checkSession = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const error_description = url.searchParams.get('error_description');
      
      console.log('AuthCallback checkSession', { code: code ? 'present' : 'missing', error, error_description });

      if (error) {
        console.error('OAuth error in callback:', error, error_description);
        if (window.opener) {
          window.opener.postMessage({ type: 'SUPABASE_AUTH_ERROR', error: error_description || error }, window.location.origin);
          setTimeout(() => window.close(), 2000);
        } else {
          navigate(`/auth/login?error=${encodeURIComponent(error_description || error)}`, { replace: true });
        }
        return;
      }
      
      if (code) {
        try {
          console.log('Exchanging code for session...');
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          console.log('Code exchange successful', { session: !!exchangeData.session });
        } catch (error) {
          console.error('Error exchanging code for session:', error);
        }
      }

      const { data, error: exchangeError } = await supabase.auth.getSession();
      
      if (data.session) {
        if (window.opener) {
          window.opener.postMessage({ 
            type: 'SUPABASE_AUTH_SUCCESS', 
            session: data.session 
          }, window.location.origin);
          // Give a small delay for the message to be sent before closing
          setTimeout(() => window.close(), 500);
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else if (exchangeError) {
        console.error('Session check error:', exchangeError);
      }
    };
    checkSession();

    if (user) {
      if (window.opener) {
        window.close();
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutReached(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (timeoutReached && !loading && !user) {
      if (window.opener) {
        window.close();
      } else {
        navigate('/auth/login?error=unverified', { replace: true });
      }
    }
  }, [timeoutReached, loading, user, navigate]);

  return (
    <div className="min-h-screen bg-[#01040a] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <Logo className="mx-auto scale-150" />
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full"
          ></motion.div>
        </div>
        <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.3em] animate-pulse">
          Verifying Identity...
        </p>
      </motion.div>
    </div>
  );
};
