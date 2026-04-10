import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { HardwareButton as Button } from './ui/Components';
import { toast } from 'react-hot-toast';
import { Loader2, FileKey, Upload, Download } from 'lucide-react';
import { handleFetchResponse } from '../lib/api';

interface UsbAuthProps {
  mode: 'bind' | 'unlock';
  onSuccess?: () => void;
}

export const UsbAuth: React.FC<UsbAuthProps> = ({ mode, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleBind = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch("/api/auth/usb-key/generate", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      
      const data = await handleFetchResponse(res);

      // Download key file
      const blob = new Blob([JSON.stringify(data.fileContent)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("USB key generated and downloaded!");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          
          const res = await fetch("/api/auth/usb-key/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(content)
          });
          
          const data = await handleFetchResponse(res);

          if (data.success && data.action_link) {
            toast.success("Authentication successful! Redirecting...");
            window.location.href = data.action_link;
          } else if (data.success && onSuccess) {
            toast.success("Authentication successful!");
            onSuccess();
          } else {
            throw new Error(data.message || 'Authentication failed');
          }
        } catch (error: any) {
          toast.error(error.message || "Invalid key file");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (error: any) {
      toast.error("Failed to read file");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {mode === 'bind' ? (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <FileKey className="w-4 h-4 text-emerald-400" />
            USB Key File Binding
          </h3>
          <p className="text-xs text-zinc-400">
            Generate and download a secret key file to use as your USB authentication key file.
          </p>
          <Button 
            onClick={handleBind} 
            disabled={loading}
            className="w-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Generate & Download Key
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <FileKey className="w-4 h-4 text-emerald-400" />
            Unlock with USB Key File
          </h3>
          <p className="text-xs text-emerald-400/80">
            Select your USB key file to unlock.
          </p>
          <label className="block w-full cursor-pointer">
            <div className="flex items-center justify-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-emerald-500/50 transition-colors">
              <Upload className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-300">Select Key File</span>
            </div>
            <input type="file" accept=".json" onChange={handleUnlock} className="hidden" disabled={loading} />
          </label>
        </div>
      )}
    </div>
  );
};
