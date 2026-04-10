import { UAParser } from 'ua-parser-js';
import { supabase } from './supabaseService';

const API_URL = '/api';

export const notificationService = {
  sendLoginNotification: async (email: string, userId: string) => {
    try {
      const parser = new UAParser();
      const result = parser.getResult();
      const device = `${result.browser?.name || 'Unknown Browser'} on ${result.os?.name || 'Unknown OS'} (${result.device?.type || 'desktop'})`;
      const time = new Date().toISOString();
      
      // Fetch user preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, preferred_notification_email, login_alerts_enabled')
        .eq('id', userId)
        .single();
      
      const user_name = profile?.full_name || 'User';
      const notificationEmail = profile?.preferred_notification_email || email;
      const loginAlertsEnabled = profile?.login_alerts_enabled !== false;

      if (!loginAlertsEnabled) {
        console.log('Login alerts disabled for user');
        return;
      }

      // Check for existing logins to see if this is "new"
      const { data: existingLogins } = await supabase
        .from('logins')
        .select('device_info')
        .eq('user_id', userId)
        .eq('device_info', device)
        .limit(1);

      const isNewDevice = !existingLogins || existingLogins.length === 0;

      // Record this login via backend to capture IP
      const recordResponse = await fetch(`${API_URL}/auth/record-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email,
          role: profile?.role || 'user',
          user_name,
          device
        }),
      });

      let ip = 'Unknown';
      if (recordResponse.ok) {
        const recordData = await recordResponse.json();
        ip = recordData.ip || 'Unknown';
      }

      if (isNewDevice) {
        await fetch(`${API_URL}/notify-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: notificationEmail,
            user_name,
            device,
            time,
            userId,
            location: `IP: ${ip}`
          }),
        });
        console.log('New login notification sent');
      }
    } catch (error) {
      console.error('Failed to send login notification:', error);
    }
  },

  sendContactMessage: async (data: { subject: string; email: string; message: string }) => {
    try {
      const response = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to send contact message:', error);
      throw error;
    }
  },

  verifyContactMessage: async (email: string, code: string) => {
    try {
      const response = await fetch(`${API_URL}/contact/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to verify contact message:', error);
      throw error;
    }
  }
};
