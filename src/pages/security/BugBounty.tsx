import React, { useState } from 'react';
import { Shield, Target, AlertTriangle, Mail, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';

export const BugBounty: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'security',
    description: '',
    steps: '',
    expected_result: '',
    actual_result: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please log in to submit a report.');
      }

      const res = await fetch('/api/security/report/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit report');
      }

      setSubmitSuccess(true);
      setFormData({
        title: '',
        type: 'security',
        description: '',
        steps: '',
        expected_result: '',
        actual_result: ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const sections = [
    {
      title: 'Program Overview',
      icon: Shield,
      content: 'SomnoAI Digital Sleep Lab is committed to ensuring the security and privacy of our users. We welcome security researchers to help us identify and fix vulnerabilities through our Responsible Disclosure Program.'
    },
    {
      title: 'Scope',
      icon: Target,
      content: 'Our scope includes the main website (sleepsomno.com), our API endpoints (/api/*), and our AI service integrations. Please avoid testing third-party services like Stripe or Google directly.'
    },
    {
      title: 'Rewards & Recognition',
      icon: CheckCircle2,
      content: 'We currently do not offer monetary rewards. However, we provide public recognition on our Hall of Fame, official contributor certificates, and early access to new features for top researchers.'
    }
  ];

  const categories = [
    'Authentication Bypass',
    'Broken Access Control',
    'Injection (SQL, Command, Prompt)',
    'XSS / CSRF',
    'Sensitive Data Exposure',
    'API Misconfiguration',
    'Business Logic Flaws'
  ];

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20"
          >
            <Shield className="w-3 h-3" />
            Responsible Disclosure
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Bug Bounty Program
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Help us build a more secure AI sleep ecosystem. We value your expertise and contribution.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4"
            >
              <div className="p-3 bg-indigo-500/10 rounded-xl w-fit">
                <section.icon className="w-6 h-6 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-white">{section.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{section.content}</p>
            </motion.div>
          ))}
        </div>

        <div className="p-8 bg-slate-900/50 rounded-3xl border border-slate-800 space-y-8">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h2 className="text-2xl font-bold text-white">Vulnerability Categories</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {categories.map((cat, idx) => (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                key={idx} 
                className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700"
              >
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-sm text-slate-300 font-medium">{cat}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-slate-900/50 rounded-3xl border border-slate-800 space-y-8">
          <div className="flex items-center gap-3">
            <Send className="w-6 h-6 text-indigo-500" />
            <h2 className="text-2xl font-bold text-white">Submit a Report</h2>
          </div>
          
          {submitSuccess ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-bold text-emerald-400">Report Submitted Successfully</h3>
              <p className="text-emerald-300/80">Thank you for helping secure SomnoAI Digital Sleep Lab. Our team will review your report shortly.</p>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSubmitSuccess(false)}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
              >
                Submit Another
              </motion.button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400">Title</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g., XSS in User Profile"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400">Category</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="security">Security Vulnerability</option>
                    <option value="functional">Functional Bug</option>
                    <option value="ai">AI Hallucination / Bypass</option>
                    <option value="ux">UX / UI Issue</option>
                    <option value="performance">Performance Issue</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">Description</label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the issue in detail..."
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">Steps to Reproduce</label>
                <textarea 
                  value={formData.steps}
                  onChange={e => setFormData({...formData, steps: e.target.value})}
                  placeholder="1. Go to...\n2. Click...\n3. Observe..."
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono text-sm"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400">Expected Result</label>
                  <textarea 
                    value={formData.expected_result}
                    onChange={e => setFormData({...formData, expected_result: e.target.value})}
                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400">Actual Result</label>
                  <textarea 
                    value={formData.actual_result}
                    onChange={e => setFormData({...formData, actual_result: e.target.value})}
                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </motion.button>
            </form>
          )}
        </div>

        <div className="p-8 bg-indigo-600 rounded-3xl text-white space-y-6">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6" />
            <h2 className="text-2xl font-bold">How to Submit</h2>
          </div>
          <p className="text-indigo-100">
            Please send your report to <span className="font-bold underline">security@sleepsomno.com</span> with a clear description, reproduction steps, and a PoC.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <h4 className="font-bold mb-1">Safe Harbor</h4>
              <p className="text-xs text-indigo-100">We promise not to take legal action if you follow our rules and don't harm users.</p>
            </div>
            <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <h4 className="font-bold mb-1">Response Time</h4>
              <p className="text-xs text-indigo-100">We aim to triage all reports within 48 hours and provide regular updates.</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href="/security/hall-of-fame"
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
          >
            View Hall of Fame
            <CheckCircle2 className="w-4 h-4" />
          </motion.a>
        </div>
      </div>
    </div>
  );
};
