import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  showText?: boolean;
  lang?: 'en' | 'zh';
  code?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "", showText = true, code }) => {
  return (
    <Link to="/" className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${className}`}>
      <div className="relative w-10 h-10 flex-shrink-0">
        <img 
          src="/logo_512.png" 
          alt="SomnoAI Digital Sleep Lab Logo" 
          className="w-full h-full object-contain rounded-xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none" />
        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {showText && (
        <div className="flex flex-col min-w-fit">
          <span className="text-xl font-black italic tracking-tighter text-white leading-none whitespace-nowrap">
            SOMNO<span className="text-indigo-500">AI</span>
          </span>
          <span className="text-[8px] text-slate-500 font-bold tracking-[0.2em] uppercase leading-none mt-1">
            Digital Sleep Lab
          </span>
          {code && (
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] italic mt-1">
              {code}
            </span>
          )}
        </div>
      )}
    </Link>
  );
};
