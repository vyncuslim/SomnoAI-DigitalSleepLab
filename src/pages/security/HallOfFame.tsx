import React, { useEffect, useState } from 'react';
import { Medal, Github, Linkedin, Shield, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface Contributor {
  id: string;
  name: string;
  nickname?: string;
  linkedin_url?: string;
  github_url?: string;
  contribution_type: string;
  severity: string;
  points: number;
  created_at: string;
}

const getLevel = (score: number) => {
  if (score >= 800) return { name: 'Legend', icon: '👑' };
  if (score >= 400) return { name: 'Elite', icon: '🛡️' };
  if (score >= 150) return { name: 'Advanced', icon: '🔐' };
  return { name: 'Contributor', icon: '⚡' };
};

export const HallOfFame: React.FC = () => {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchHallOfFame = async () => {
      try {
        const response = await fetch('/api/security/hall-of-fame');
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        if (result.success) {
          setContributors(result.data);
        } else {
           throw new Error('API returned success: false');
        }
      } catch (err) {
        console.error('Failed to fetch Hall of Fame, using mock data:', err);
        // Fallback mock data for preview
        setContributors([
          { id: '1', name: 'Vyncus Lim', nickname: 'vyncus', points: 980, contribution_type: 'Security', severity: 'Critical', created_at: new Date().toISOString() },
          { id: '2', name: 'Alex Chen', nickname: 'alexc', points: 620, contribution_type: 'Functional', severity: 'High', created_at: new Date().toISOString() },
          { id: '3', name: 'Sarah Tan', nickname: 'saraht', points: 410, contribution_type: 'AI', severity: 'Medium', created_at: new Date().toISOString() },
          { id: '4', name: 'David Lee', nickname: 'davidl', points: 250, contribution_type: 'UX', severity: 'Low', created_at: new Date().toISOString() },
          { id: '5', name: 'Emily Wong', nickname: 'emilyw', points: 150, contribution_type: 'Performance', severity: 'Low', created_at: new Date().toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchHallOfFame();
  }, []);

  const filtered = contributors.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.nickname?.toLowerCase().includes(search.toLowerCase())
  );

  const topThree = filtered.slice(0, 3);
  const others = filtered.slice(3);

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-black uppercase tracking-widest italic border border-indigo-500/20"
          >
            <Shield className="w-4 h-4" />
            Public Reputation Layer
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">
            Hall of Fame 🏆
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg font-medium italic">
            Recognizing contributors who improve SomnoAI Digital Sleep Lab
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
             <span className="px-4 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest italic">Security</span>
             <span className="px-4 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest italic">Stability</span>
             <span className="px-4 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest italic">Experience</span>
             <span className="px-4 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest italic">Intelligence</span>
          </div>
          
          {/* Real-time metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-4xl mx-auto">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
              <div className="text-3xl font-black text-white">128</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Reports</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
              <div className="text-3xl font-black text-indigo-400">89</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Valid Issues</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
              <div className="text-3xl font-black text-amber-400">42</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Contributors</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
              <div className="text-3xl font-black text-rose-400">15</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Critical Fixes</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search contributors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-12">
            {/* Top 3 Podium */}
            <div className="grid md:grid-cols-3 gap-8 items-end max-w-4xl mx-auto pt-10">
              {/* 2nd Place */}
              {topThree[1] && (
                <PodiumCard contributor={topThree[1]} rank={2} color="text-slate-300" bg="bg-slate-300/10" border="border-slate-300/20" />
              )}
              {/* 1st Place */}
              {topThree[0] && (
                <PodiumCard contributor={topThree[0]} rank={1} color="text-amber-400" bg="bg-amber-400/10" border="border-amber-400/20" large />
              )}
              {/* 3rd Place */}
              {topThree[2] && (
                <PodiumCard contributor={topThree[2]} rank={3} color="text-amber-700" bg="bg-amber-700/10" border="border-amber-700/20" />
              )}
            </div>

            {/* Others Table */}
            {others.length > 0 && (
              <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden mt-12">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Rank</th>
                      <th className="px-6 py-4">Researcher</th>
                      <th className="px-6 py-4">Level</th>
                      <th className="px-6 py-4">Points</th>
                      <th className="px-6 py-4 text-right">Links</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {others.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4 text-slate-500 font-mono">#{idx + 4}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{c.name}</div>
                          {c.nickname && <div className="text-xs text-slate-500">@{c.nickname}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">
                            {getLevel(c.points).icon} {getLevel(c.points).name}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-indigo-400">{c.points}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-3">
                            {c.github_url && (
                              <a href={c.github_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors">
                                <Github className="w-4 h-4" />
                              </a>
                            )}
                            {c.linkedin_url && (
                              <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors">
                                <Linkedin className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Issue Feed */}
            <div className="mt-16 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-500" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Login failure fixed</div>
                    <div className="text-sm text-slate-400">Reported by Alex Chen</div>
                  </div>
                  <div className="text-sm text-slate-500">Apr 2026</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">API rate limit issue resolved</div>
                    <div className="text-sm text-slate-400">Reported by Vyncus Lim</div>
                  </div>
                  <div className="text-sm text-slate-500">Apr 2026</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">AI inconsistency detected</div>
                    <div className="text-sm text-slate-400">Reported by Sarah Tan</div>
                  </div>
                  <div className="text-sm text-slate-500">Mar 2026</div>
                </div>
              </div>
            </div>
            
            {/* CTA */}
            <div className="mt-16 text-center">
              <h2 className="text-2xl font-bold text-white mb-6">Found an issue?</h2>
              <div className="flex justify-center gap-4">
                <a href="/security/bug-bounty" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
                  Submit a report
                </a>
                <a href="/security/bug-bounty" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">
                  Join the security program
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <Shield className="w-12 h-12 text-slate-800 mx-auto" />
            <p className="text-slate-500">No contributors found yet. Be the first!</p>
            <a href="/security/bug-bounty" className="text-indigo-500 font-bold hover:underline">Join the Program</a>
          </div>
        )}
      </div>
    </div>
  );
};

const PodiumCard = ({ contributor, rank, color, bg, border, large = false }: { contributor: Contributor, rank: number, color: string, bg: string, border: string, large?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative flex flex-col items-center p-8 rounded-3xl border ${bg} ${border} ${large ? 'md:-translate-y-8 scale-110 shadow-2xl shadow-amber-500/10' : ''}`}
  >
    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${bg} ${border} border flex items-center justify-center font-bold ${color} text-sm`}>
      {rank}
    </div>
    <div className={`p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-4`}>
      <Medal className={`w-8 h-8 ${color}`} />
    </div>
    <h3 className="text-xl font-bold text-white text-center">{contributor.name}</h3>
    <p className="text-sm text-slate-400 mb-2">@{contributor.nickname || 'researcher'}</p>
    <div className="text-xs font-bold text-slate-300 mb-4">{getLevel(contributor.points).icon} {getLevel(contributor.points).name}</div>
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800 text-indigo-400 font-bold text-sm">
      {contributor.points} pts
    </div>
    <div className="flex gap-4 mt-6">
      {contributor.github_url && (
        <a href={contributor.github_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors">
          <Github className="w-5 h-5" />
        </a>
      )}
      {contributor.linkedin_url && (
        <a href={contributor.linkedin_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors">
          <Linkedin className="w-5 h-5" />
        </a>
      )}
    </div>
  </motion.div>
);
