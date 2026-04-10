import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Info, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/useLanguage';

// --- Grid Background ---
export const GridBackground: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute inset-0 opacity-[0.03]" 
         style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    <div className="absolute inset-0 bg-gradient-to-b from-[#01040a] via-transparent to-[#01040a]" />
    <div className="absolute top-0 left-0 w-full h-px dashed-line opacity-10" />
    <div className="absolute bottom-0 left-0 w-full h-px dashed-line opacity-10" />
    <div className="absolute top-0 left-0 h-full w-px dashed-line-v opacity-10" />
    <div className="absolute top-0 right-0 h-full w-px dashed-line-v opacity-10" />
  </div>
);

// --- Telemetry Stream ---
export const TelemetryStream: React.FC = () => {
  const [data, setData] = useState<number[]>(Array.from({ length: 20 }, () => Math.random() * 100));
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => [...prev.slice(1), Math.random() * 100]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-end gap-1 h-12 px-4 py-2 bg-black/40 border border-white/5 rounded-xl overflow-hidden relative group">
      <div className="absolute top-1 left-2 micro-label opacity-30 group-hover:opacity-60 transition-opacity">LIVE_TELEMETRY</div>
      {data.map((val, i) => (
        <motion.div 
          key={i}
          initial={false}
          animate={{ height: `${val}%` }}
          className="w-1 bg-indigo-500/40 rounded-full"
        />
      ))}
      <div className="absolute inset-0 data-stream opacity-5" />
    </div>
  );
};

import { trackEvent } from '../../services/analytics';

// --- Hero ---
export const Hero: React.FC<{ 
  title: React.ReactNode; 
  subtitle: string; 
  ctaPrimary?: { text: string; link: string }; 
  ctaSecondary?: { text: string; link: string };
}> = ({ title, subtitle, ctaPrimary, ctaSecondary }) => {
  const { langPrefix } = useLanguage();
  return (
    <div className="py-6 md:py-10 flex flex-col items-center text-center max-w-4xl mx-auto relative px-4 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <div className="mb-2">
          {title}
        </div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xs md:text-sm text-slate-400 mb-5 max-w-2xl mx-auto leading-relaxed"
        >
          {subtitle}
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center justify-center gap-3"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full">
            {ctaPrimary && (
              <Link 
                to={`${langPrefix}${ctaPrimary.link}`} 
                onClick={() => trackEvent('click_cta_primary', 'engagement', ctaPrimary.text)}
                className="group px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all flex items-center gap-2 w-full sm:w-auto justify-center text-[10px] uppercase tracking-wider"
              >
                {ctaPrimary.text} 
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            {ctaSecondary && (
              <Link 
                to={`${langPrefix}${ctaSecondary.link}`} 
                onClick={() => trackEvent('click_cta_secondary', 'engagement', ctaSecondary.text)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-all border border-white/10 w-full sm:w-auto justify-center text-[10px] uppercase tracking-wider backdrop-blur-sm"
              >
                {ctaSecondary.text}
              </Link>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// --- Hardware Widget ---
export const HardwareWidget: React.FC<{ label: string; value: string; unit?: string; icon?: React.ReactNode; status?: 'active' | 'idle' }> = ({ label, value, unit, icon, status = 'idle' }) => (
  <div className="p-4 hardware-panel relative overflow-hidden group bg-slate-900/60">
    <div className="scanline" />
    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    <div className="flex justify-between items-start mb-4">
      <div className="hardware-label flex items-center gap-2">
        <div className={`w-1 h-1 rounded-full ${status === 'active' ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1]' : 'bg-slate-700'}`} />
        {label}
      </div>
      <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest italic border ${status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
        {status === 'active' ? 'ONLINE' : 'IDLE'}
      </div>
    </div>
    <div className="flex items-baseline gap-2 relative z-10">
      <span className="text-4xl font-black italic tracking-tighter text-white group-hover:text-indigo-400 transition-colors duration-500">{value}</span>
      {unit && <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">{unit}</span>}
    </div>
    {icon && (
      <div className="absolute bottom-4 right-4 text-white/5 group-hover:text-indigo-500/20 transition-all duration-700 group-hover:scale-125 group-hover:rotate-6">
        {icon}
      </div>
    )}
    <div className="absolute bottom-0 left-0 w-full h-0.5 data-stream opacity-10" />
    <div className="absolute bottom-0 left-0 w-full h-0.5 dashed-line opacity-20" />
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
  </div>
);

// --- Section ---
export const Section: React.FC<{ title?: string; description?: string; children: React.ReactNode; className?: string; id?: string; moduleID?: string }> = ({ title, description, children, className = "", id, moduleID }) => (
  <section id={id} className={`py-6 md:py-10 relative ${className}`}>
    {(title || description) && (
      <div className="mb-6 max-w-4xl relative z-10">
        <div className="flex items-center gap-3 mb-2">
          {moduleID && <span className="micro-label opacity-40">MOD_ID: {moduleID}</span>}
          <div className="h-px w-6 bg-white/5" />
        </div>
        {title && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-1 bg-indigo-500 rounded-full" />
            <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-white leading-none">{title}</h2>
          </div>
        )}
        {description && <p className="text-xs text-slate-400 leading-relaxed border-l-2 border-indigo-500/20 pl-3">{description}</p>}
      </div>
    )}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  </section>
);

// --- Card ---
export const Card: React.FC<{ title: string; description: string; icon?: React.ReactNode; className?: string; children?: React.ReactNode; onClick?: () => void; label?: string }> = ({ title, description, icon, className = "", children, onClick, label }) => (
  <motion.div 
    whileHover={{ y: -1, scale: 1.002 }}
    onClick={onClick}
    className={`p-4 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/40 transition-all duration-500 relative group overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    
    {label && (
      <div className="absolute top-2 right-4 hardware-label opacity-30 group-hover:opacity-100 group-hover:text-indigo-400 transition-all duration-500 flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full bg-indigo-500 scale-0 group-hover:scale-100 transition-transform" />
        {label}
      </div>
    )}
    
    {icon && (
      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-white/5 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-all duration-500">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
      </div>
    )}
    
    <h3 className="text-sm font-bold uppercase tracking-tight text-white mb-1.5 group-hover:text-indigo-400 transition-colors duration-500">
      {title}
    </h3>
    
    <p className="text-slate-400 leading-relaxed mb-3 group-hover:text-slate-200 transition-colors duration-500 text-[10px]">
      {description}
    </p>
    
    {children}
  </motion.div>
);

// --- Accordion ---
export const Accordion: React.FC<{ items: { title: string; content: React.ReactNode }[] }> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="border border-white/5 rounded-2xl bg-slate-900/30 overflow-hidden">
          <button 
            className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
          >
            <span className="font-medium text-white">{item.title}</span>
            <ChevronDown size={20} className={`text-slate-400 transition-transform ${openIndex === idx ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {openIndex === idx && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="px-6 pb-5 text-slate-400 leading-relaxed"
              >
                {item.content}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

// --- Tabs ---
export const Tabs: React.FC<{ tabs: { id: string; label: string; content: React.ReactNode }[] }> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  return (
    <div>
      <div className="flex overflow-x-auto border-b border-white/10 mb-8 hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors relative ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        ))}
      </div>
      <div>
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
};

// --- Timeline ---
export const Timeline: React.FC<{ events: { date: string; title: string; description: string; tag?: string; icon?: React.ReactNode }[] }> = ({ events }) => (
  <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
    {events.map((event, idx) => (
      <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-slate-900 text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500/50 transition-colors shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_0_4px_#01040a]">
          {event.icon ? <div className="scale-75">{event.icon}</div> : <div className="w-2 h-2 bg-current rounded-full" />}
        </div>
        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <time className="text-sm font-mono text-indigo-400">{event.date}</time>
            {event.tag && <span className="px-2 py-1 rounded-md bg-white/5 text-xs font-medium text-slate-300">{event.tag}</span>}
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">{event.title}</h4>
          <p className="text-slate-400 text-sm leading-relaxed">{event.description}</p>
        </div>
      </div>
    ))}
  </div>
);

// --- Status Badge ---
export const StatusBadge: React.FC<{ status: 'operational' | 'degraded' | 'outage' }> = ({ status }) => {
  const config = {
    operational: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: CheckCircle2, text: 'Operational' },
    degraded: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: AlertCircle, text: 'Degraded Performance' },
    outage: { color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20', icon: AlertCircle, text: 'Major Outage' }
  };
  const { color, bg, border, icon: Icon, text } = config[status];
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${bg} ${color} border ${border}`}>
      <Icon size={16} /> {text}
    </div>
  );
};

// --- Alert Banner ---
export const AlertBanner: React.FC<{ type?: 'info' | 'warning'; title: string; children: React.ReactNode }> = ({ type = 'info', title, children }) => {
  const isWarning = type === 'warning';
  return (
    <div className={`p-6 rounded-2xl border flex gap-4 items-start ${isWarning ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200'}`}>
      <div className="shrink-0 mt-1">
        {isWarning ? <AlertCircle size={20} className="text-amber-400" /> : <Info size={20} className="text-indigo-400" />}
      </div>
      <div>
        <h4 className={`font-semibold mb-1 ${isWarning ? 'text-amber-400' : 'text-indigo-400'}`}>{title}</h4>
        <div className="text-sm opacity-80 leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

// --- Last Updated ---
export const LastUpdated: React.FC<{ date: string; version?: string }> = ({ date, version }) => (
  <div className="flex items-center gap-4 text-sm text-slate-500 font-mono mb-8 pb-8 border-b border-white/5">
    <span>Last updated: {date}</span>
    {version && (
      <>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span>Version {version}</span>
      </>
    )}
  </div>
);

// --- Breadcrumbs ---
export const Breadcrumbs: React.FC<{ items: { label: string; link?: string }[] }> = ({ items }) => {
  const { langPrefix } = useLanguage();
  return (
    <nav className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-8">
      <Link to={langPrefix} className="hover:text-white transition-colors">Home</Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={14} className="text-slate-700" />
          {item.link ? (
            <Link to={`${langPrefix}${item.link}`} className="hover:text-white transition-colors">{item.label}</Link>
          ) : (
            <span className="text-slate-300">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// --- Hardware Button ---
export const HardwareButton: React.FC<{ 
  children: React.ReactNode; 
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void; 
  href?: string; 
  className?: string; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
  icon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
}> = ({ children, onClick, href, className = "", variant = 'primary', disabled, icon, type = 'button' }) => {
  const baseStyles = "relative px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2.5 group/btn overflow-hidden";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_8px_24px_rgba(79,70,229,0.2)]",
    secondary: "bg-white text-black hover:scale-[1.01]",
    outline: "bg-white/5 hover:bg-white/10 border border-white/10 text-white",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white"
  };

  const content = (
    <>
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
      {icon}
      {children}
      <ChevronRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
    </>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={`${baseStyles} ${variants[variant]} ${className}`}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick as any} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${className} disabled:opacity-50`}>
      {content}
    </button>
  );
};

// --- Technical Label ---
export const TechnicalLabel: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = "" }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <span className="micro-label opacity-40">{label}</span>
    <span className="text-[10px] font-black text-white uppercase tracking-widest italic">{value}</span>
  </div>
);

// --- Inline CTA ---
export const InlineCTA: React.FC<{ text: string; link: string; icon?: React.ReactNode }> = ({ text, link, icon }) => {
  const { langPrefix } = useLanguage();
  return (
    <Link to={`${langPrefix}${link}`} className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors group">
      {text} {icon || <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
    </Link>
  );
};
