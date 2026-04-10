import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, MessageSquare, BarChart3, Brain, ArrowRight, Zap } from 'lucide-react';
import { Logo } from '../components/Logo';
import { PersonalChat } from '../components/PersonalChat';
import { AISleepCoach } from '../components/AISleepCoach';
import { GlassCard } from '../components/GlassCard';
import { getSleepRecommendation } from '../services/aiService';
import toast from 'react-hot-toast';

// SomnoAI Digital Sleep Lab Hub Page - Triggering rebuild
export const AIHub: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'coach' | 'analysis' | 'nexus'>('coach');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      // In a real app, we'd fetch actual user data here
      const mockData = "User sleeps 6 hours on average, wakes up twice at night, feels tired in the morning.";
      const result = await getSleepRecommendation(mockData);
      setAnalysisResult(result);
      toast.success("Analysis complete!");
    } catch (err) {
      toast.error("Failed to run analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  const tools = [
    { id: 'coach', name: 'SomnoAI Digital Sleep Lab Coach', icon: MessageSquare, desc: 'Chat with your personal SomnoAI Digital Sleep Lab sleep expert.', color: 'text-indigo-400' },
    { id: 'analysis', name: 'SomnoAI Digital Sleep Lab Deep Analysis', icon: BarChart3, desc: 'Get a scientific breakdown of your sleep patterns using SomnoAI Digital Sleep Lab.', color: 'text-emerald-400' },
    { id: 'nexus', name: 'SomnoAI Digital Sleep Lab Advice', icon: Brain, desc: 'Quick tips from SomnoAI Digital Sleep Lab model.', color: 'text-amber-400' },
  ];

  return (
    <div className="min-h-screen bg-[#01040a] pt-16 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Logo className="scale-110" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            SomnoAI Digital Sleep Lab Intelligence <span className="text-indigo-500">at Your Fingertips</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm">
            Experience the power of SomnoAI Digital Sleep Lab models working together to optimize your sleep and well-being.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-3">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as any)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-300 group ${
                  activeTool === tool.id
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className={`p-1.5 rounded-lg bg-white/5 ${tool.color}`}>
                    <tool.icon size={18} />
                  </div>
                  <span className="font-bold text-white text-sm">{tool.name}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {tool.desc}
                </p>
              </button>
            ))}

            <GlassCard className="p-3 mt-6 border-indigo-500/20">
              <div className="flex items-center gap-2 text-indigo-400 mb-1.5">
                <Zap size={14} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Pro Tip</span>
              </div>
              <p className="text-[9px] text-slate-400 leading-relaxed">
                Combine the Sleep Coach's empathy with Deep Analysis's precision for the best results.
              </p>
            </GlassCard>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTool === 'coach' && (
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                  <PersonalChat />
                </div>
              )}

              {activeTool === 'analysis' && (
                <GlassCard className="p-6">
                  <div className="max-w-2xl mx-auto text-center">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mx-auto mb-4">
                      <BarChart3 size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-3">SomnoAI Digital Sleep Lab Deep Analysis</h2>
                    <p className="text-slate-400 mb-6 text-sm">
                      Our SomnoAI Digital Sleep Lab powered engine will scan your entire sleep history to identify hidden trends and provide a comprehensive optimization plan.
                    </p>
                    
                    <button
                      onClick={runAnalysis}
                      disabled={analyzing}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 text-sm"
                    >
                      {analyzing ? 'Analyzing...' : 'Start Deep Analysis'}
                      <ArrowRight size={18} />
                    </button>

                    {analysisResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl text-left"
                      >
                        <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 text-sm">
                          <Sparkles size={14} />
                          Analysis Result
                        </h3>
                        <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                          {analysisResult}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </GlassCard>
              )}

              {activeTool === 'nexus' && (
                <AISleepCoach />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
