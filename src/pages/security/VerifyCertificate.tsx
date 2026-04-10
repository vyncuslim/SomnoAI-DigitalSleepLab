import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export const VerifyCertificate: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCert = async () => {
      try {
        const res = await fetch(`/api/security/verify-certificate/${certId}`);
        const json = await res.json();
        if (json.success) {
          setCert(json.data);
        } else {
          setError(json.message || 'Certificate not found');
        }
      } catch (err) {
        setError('Failed to verify certificate');
      } finally {
        setLoading(false);
      }
    };
    fetchCert();
  }, [certId]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 text-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Invalid Certificate</h2>
        <p className="text-slate-400">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4 flex items-center justify-center">
      <div className="max-w-2xl w-full p-8 bg-slate-900 rounded-3xl border border-slate-800 text-center space-y-6">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto" />
        <h2 className="text-3xl font-bold text-white">Certificate Verified</h2>
        <div className="space-y-4 text-left p-6 bg-slate-950 rounded-2xl border border-slate-800">
          <div className="flex justify-between">
            <span className="text-slate-400">Certificate ID:</span>
            <span className="text-white font-mono">{cert.cert_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Level:</span>
            <span className="text-indigo-400 font-bold">{cert.level}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Category:</span>
            <span className="text-white capitalize">{cert.category}</span>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-800">
          <p className="text-sm text-slate-500">Issued by SomnoAI Digital Sleep Lab</p>
        </div>
      </div>
    </div>
  );
};
