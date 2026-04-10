import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Award, Shield, Star } from 'lucide-react';
import { motion } from 'motion/react';

export const ResearcherProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [researcher, setResearcher] = useState<any>(null);

  useEffect(() => {
    fetchResearcher();
  }, [id]);

  const fetchResearcher = async () => {
    try {
      const res = await fetch(`/api/researcher/${id}`);
      const json = await res.json();
      if (json.success) setResearcher(json.data);
    } catch (error) {
      console.error('Failed to fetch researcher:', error);
    }
  };

  if (!researcher) return <div className="text-white p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-white">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold">
            {researcher.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{researcher.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-slate-400">
              <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> Level: {researcher.level}</span>
              <span className="flex items-center gap-1"><Star className="w-4 h-4" /> Score: {researcher.score}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-slate-400 font-bold mb-4">Achievements</h3>
          <div className="space-y-2">
            {researcher.certificates?.map((cert: any) => (
              <div key={cert.id} className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl">
                <Award className="w-5 h-5 text-amber-400" />
                <span>{cert.category} - {cert.level}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-slate-400 font-bold mb-4">Recent Reports</h3>
          <div className="space-y-3">
            {researcher.reports?.map((report: any) => (
              <div key={report.id} className="flex items-center justify-between bg-slate-800 p-4 rounded-xl">
                <div>
                  <div className="font-bold">{report.title}</div>
                  <div className="text-sm text-slate-400">{report.type}</div>
                </div>
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">{report.severity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
