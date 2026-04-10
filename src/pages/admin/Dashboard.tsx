import React, { useState, useEffect } from 'react';
import { Shield, Users, FileText, Settings, Award, AlertTriangle, CheckCircle, XCircle, Activity, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('reports');
  const [filterType, setFilterType] = useState('all');
  const [stats, setStats] = useState({
    totalReports: 0,
    pending: 0,
    validated: 0,
    rejected: 0
  });
  const [topContributor, setTopContributor] = useState<{ full_name: string, score: number } | null>(null);

  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => {
    fetchReports();
    fetchTopContributor();
  }, []);

  const fetchTopContributor = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/top-contributor', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const result = await response.json();
      if (result.success) setTopContributor(result.data);
    } catch (error) {
      console.error('Error fetching top contributor:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/security/admin/reports', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const json = await res.json();
      
      if (json.success) {
        const reports = json.data;
        setPendingReports(reports.filter((r: any) => r.status === 'pending'));
        
        // Calculate stats
        const validated = reports.filter((r: any) => r.status === 'validated');
        const rejected = reports.filter((r: any) => r.status === 'rejected');
        
        setStats({
          totalReports: reports.length,
          pending: reports.filter((r: any) => r.status === 'pending').length,
          validated: validated.length,
          rejected: rejected.length
        });
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  };

  const filteredReports = filterType === 'all' 
    ? pendingReports 
    : pendingReports.filter(r => r.type === filterType);

  const handleAcceptAISuggestion = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const updates = {
        type: selectedReport.ai_suggested_type,
        severity: selectedReport.ai_suggested_severity
      };

      const res = await fetch('/api/security/admin/reports/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ report_id: id, updates })
      });
      
      if (res.ok) {
        setSelectedReport({
          ...selectedReport,
          ...updates
        });
        setPendingReports(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      }
    } catch (error) {
      console.error('Failed to accept AI suggestion:', error);
    }
  };

  const handleApprove = async (id: string, severity: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/security/admin/reports/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ report_id: id, severity })
      });
      
      if (res.ok) {
        setPendingReports(prev => prev.filter(r => r.id !== id));
        setStats(prev => ({ ...prev, pending: prev.pending - 1, validated: prev.validated + 1 }));
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Failed to approve report:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/security/admin/reports/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ report_id: id })
      });
      
      if (res.ok) {
        setPendingReports(prev => prev.filter(r => r.id !== id));
        setStats(prev => ({ ...prev, pending: prev.pending - 1, rejected: prev.rejected + 1 }));
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Failed to reject report:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex pt-16">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-black text-white italic tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" />
            SDSL Admin
          </h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-400 border border-transparent'}`}
          >
            <Activity className="w-5 h-5" />
            Dashboard
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'reports' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-400 border border-transparent'}`}
          >
            <FileText className="w-5 h-5" />
            Reports
            {stats.pending > 0 && (
              <span className="ml-auto bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.pending}
              </span>
            )}
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-400 border border-transparent'}`}
          >
            <Users className="w-5 h-5" />
            Users
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('certificates')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'certificates' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-400 border border-transparent'}`}
          >
            <Award className="w-5 h-5" />
            Certificates
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-400 border border-transparent'}`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </motion.button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <motion.div whileHover={{ y: -5 }} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Reports</div>
              <div className="text-3xl font-black text-white">{stats.totalReports}</div>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Pending</div>
              <div className="text-3xl font-black text-amber-400">{stats.pending}</div>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Validated</div>
              <div className="text-3xl font-black text-emerald-400">{stats.validated}</div>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Rejected</div>
              <div className="text-3xl font-black text-rose-400">{stats.rejected}</div>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Top Contributor</div>
              <div className="text-xl font-bold text-indigo-400 truncate">
                {topContributor ? `${topContributor.full_name} (${topContributor.score} pts)` : 'None'}
              </div>
            </motion.div>
          </div>

          {/* Reports View */}
          {activeTab === 'reports' && (
            <div className="flex gap-8 h-[600px]">
              {/* Report List */}
              <div className="w-1/3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
                  <h3 className="font-bold text-white">Pending Reports</h3>
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-lg px-2 py-1"
                  >
                    <option value="all">All Types</option>
                    <option value="security">Security</option>
                    <option value="functional">Functional</option>
                    <option value="ai">AI</option>
                    <option value="ux">UX</option>
                    <option value="performance">Performance</option>
                  </select>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-3">
                  {filteredReports.map(report => (
                    <motion.div 
                      whileHover={{ x: 5 }}
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-4 rounded-xl border cursor-pointer transition-colors ${selectedReport?.id === report.id ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-white truncate pr-4">{report.title}</h4>
                        {report.type === 'security' ? (
                          <Shield className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                          <Activity className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{report.profiles?.full_name || report.profiles?.email || 'Anonymous'}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs uppercase font-bold">{report.type}</span>
                      </div>
                    </motion.div>
                  ))}
                  {pendingReports.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      No pending reports.
                    </div>
                  )}
                </div>
              </div>

              {/* Report Details */}
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                {selectedReport ? (
                  <>
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                      <div>
                        <div className="text-sm text-slate-400 font-mono mb-1">{selectedReport.id}</div>
                        <h2 className="text-2xl font-bold text-white">{selectedReport.title}</h2>
                        <div className="text-slate-400 mt-1">Reported by <span className="text-indigo-400 font-medium">{selectedReport.profiles?.full_name || selectedReport.profiles?.email || 'Anonymous'}</span></div>
                      </div>
                      <div className="flex gap-3">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApprove(selectedReport.id, selectedReport.ai_suggested_severity || 'medium')}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleReject(selectedReport.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 font-bold rounded-xl transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </motion.button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto p-6 space-y-8">
                      
                      {/* AI Suggestion Box */}
                      <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-5 flex items-start gap-4">
                        <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                          <BrainCircuit className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-indigo-300 font-bold mb-2 flex items-center gap-2">
                            AI Analysis Suggestion
                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-xs font-mono">{selectedReport.ai_confidence}% Confidence</span>
                          </h4>
                          <div className="flex gap-4">
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-bold mb-1">Suggested Type</div>
                              <div className="text-white font-medium">{selectedReport.ai_suggested_type}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 uppercase font-bold mb-1">Suggested Severity</div>
                              <div className={`font-medium ${selectedReport.ai_suggested_severity === 'high' || selectedReport.ai_suggested_severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}`}>
                                {selectedReport.ai_suggested_severity}
                              </div>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleAcceptAISuggestion(selectedReport.id)}
                          className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 font-bold rounded-xl transition-colors text-sm"
                        >
                          Accept AI Suggestion
                        </button>
                      </div>

                      <div>
                        <h4 className="text-slate-400 font-bold uppercase text-sm mb-2">Description</h4>
                        <div className="bg-slate-950 p-4 rounded-xl text-slate-300 whitespace-pre-wrap">
                          {selectedReport.description}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-slate-400 font-bold uppercase text-sm mb-2">Steps to Reproduce</h4>
                        <div className="bg-slate-950 p-4 rounded-xl text-slate-300 whitespace-pre-wrap font-mono text-sm">
                          {selectedReport.steps}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-slate-400 font-bold uppercase text-sm mb-2">Expected Result</h4>
                          <div className="bg-slate-950 p-4 rounded-xl text-emerald-400/80">
                            {selectedReport.expected}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-slate-400 font-bold uppercase text-sm mb-2">Actual Result</h4>
                          <div className="bg-slate-950 p-4 rounded-xl text-rose-400/80">
                            {selectedReport.actual}
                          </div>
                        </div>
                      </div>

                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p>Select a report to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab !== 'reports' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Module Under Construction</h3>
              <p className="text-slate-400">The {activeTab} module is currently being built.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
