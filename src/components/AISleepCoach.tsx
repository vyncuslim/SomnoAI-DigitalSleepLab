import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseService';

export const AISleepCoach: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getAdvice = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setResponse(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Implement a 60-second client-side timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch('/api/ai/groq', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        let errorText = "";
        try {
          const text = await res.text();
          // If it's an HTML response (like Cloudflare 504), don't show the whole HTML
          if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
            errorText = `Server Error (${res.status}): The request timed out or the server is busy. Please try again in a moment.`;
          } else {
            try {
              const json = JSON.parse(text);
              errorText = json.message || json.error || `API Error: ${res.status}`;
            } catch {
              errorText = text.slice(0, 100) || `API Error: ${res.status}`;
            }
          }
        } catch {
          errorText = `API Error: ${res.status}`;
        }
        console.error('API Error:', res.status, errorText);
        throw new Error(errorText);
      }

      const data = await res.json();
      
      // SomnoAI Digital Sleep Lab response format handling
      if (data.reply) {
        setResponse(data.reply);
      } else if (data.error) {
        setResponse(`Error: ${data.error}`);
      } else {
        setResponse(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      if (err.name === 'AbortError') {
        setResponse('Error: The request timed out. Please try again.');
      } else {
        setResponse(`Failed to connect to the Sleep Coach: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-widest text-white">SomnoAI Digital Sleep Lab</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Powered by SomnoAI Digital Sleep Lab</p>
        </div>
      </div>

      <form 
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          getAdvice();
        }}
      >
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                getAdvice();
              }
            }}
            placeholder="Ask me anything about your sleep..."
            className="w-full p-4 pr-12 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none h-32 font-medium placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="absolute bottom-4 right-4 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>

        {response && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-indigo-500/5 rounded-xl border border-indigo-500/20 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3">Coach's Advice:</h3>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {response}
            </p>
          </motion.div>
        )}
      </form>
    </div>
  );
};
