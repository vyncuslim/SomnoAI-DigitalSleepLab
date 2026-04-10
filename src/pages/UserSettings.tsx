import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import { SecuritySettings } from '../components/SecuritySettings';
import { TwoFactorAuth } from '../components/TwoFactorAuth';
import { User, Shield, Settings, Bell, Lock, Camera, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/useLanguage';
import { trackEvent } from '../services/analytics';
import { logError } from '../services/supabaseService';

export const UserSettings: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage('');
      
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      setMessage(t('settings.avatarUpdated') || 'Profile picture updated successfully!');
      trackEvent('avatar_upload', 'profile', 'success');
      refreshProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setMessage((t('settings.avatarUpdateError') || 'Error updating profile picture: ') + (error.message || 'Unknown error'));
      logError(profile?.id, error, 'Avatar Upload');
      trackEvent('avatar_upload', 'profile', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const formData = new FormData(e.target as HTMLFormElement);
    const fullName = formData.get('fullName') as string;
    const preferredNotificationEmail = formData.get('preferredNotificationEmail') as string;
    const loginAlertsEnabled = formData.get('loginAlertsEnabled') === 'on';

    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: fullName,
        preferred_notification_email: preferredNotificationEmail || null,
        login_alerts_enabled: loginAlertsEnabled
      })
      .eq('id', profile.id);

    if (error) {
      setMessage(t('settings.profileUpdateError') + error.message);
    } else {
      setMessage(t('settings.profileUpdated'));
      refreshProfile();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t('settings.title')}</h1>
          <p className="text-slate-400 text-sm">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-slate-900/50 border border-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <User className="w-4 h-4" />
          {t('settings.profile')}
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Lock className="w-4 h-4" />
          {t('settings.security')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'profile' && (
          <div className="p-8 bg-slate-900/40 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                <Settings className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">{t('settings.profileInfo')}</h2>
            </div>

            <div className="flex items-center gap-6 mb-8 p-6 bg-white/5 rounded-3xl border border-white/10">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 border-2 border-indigo-500/30 group-hover:border-indigo-500 transition-all duration-300">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-500/10 text-indigo-400">
                      <User size={40} />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 rounded-xl cursor-pointer hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/40 group-hover:scale-110">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{profile?.full_name || t('settings.anonymousUser')}</h3>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1">{profile?.role || 'User'}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">{t('auth.fullName')}</label>
                  <input
                    name="fullName"
                    defaultValue={profile?.full_name}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder={t('auth.fullNamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">{t('auth.email')}</label>
                  <input
                    disabled
                    value={profile?.email}
                    className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Preferred Notification Email</label>
                  <input
                    name="preferredNotificationEmail"
                    type="email"
                    defaultValue={profile?.preferred_notification_email}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="Optional: Email for notifications"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                  <div className="space-y-0.5">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Login Alerts</label>
                    <p className="text-[10px] text-slate-400">Receive email alerts for new device logins</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="loginAlertsEnabled" 
                      defaultChecked={profile?.login_alerts_enabled !== false} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {loading ? t('settings.savingChanges') : t('settings.saveChanges')}
                </button>
              </div>

              {message && (
                <div className={`p-4 rounded-xl text-xs font-medium ${message.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {message}
                </div>
              )}
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="p-8 bg-slate-900/40 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-xl space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">{t('settings.securityPrivacy')}</h2>
            </div>

            <SecuritySettings />
            
            <div className="mt-8 space-y-8">
              <TwoFactorAuth />
            </div>

            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-500">
                <Bell className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-widest">{t('settings.securityTip')}</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('settings.securityTipDesc')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
