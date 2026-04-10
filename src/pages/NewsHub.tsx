import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Calendar, ArrowRight, ExternalLink } from 'lucide-react';
import { MarketingPageTemplate } from '../components/ui/MarketingPageTemplate';
import { Section, InlineCTA } from '../components/ui/Components';
import { Language } from '../services/i18n';

interface NewsHubProps {
  lang: Language;
  onSelectArticle: (article: any) => void;
}

const NewsCard: React.FC<{ item: any; idx: number; isZh: boolean; onSelect: (item: any) => void }> = ({ item, idx, isZh, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div 
      layout
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className="hardware-panel p-6 flex flex-col gap-4 cursor-pointer hover:border-indigo-500/50 transition-all group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-5">
          <div className="hardware-label text-[8px] mt-1 opacity-50 shrink-0">NEWS_{idx + 1}</div>
          <div>
            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight italic group-hover:text-indigo-400 transition-colors">
              {item.title}
            </h3>
            <div className="flex items-center gap-3">
              <Calendar size={10} className="text-indigo-500/50" />
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic">{item.date}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="p-1.5 rounded-lg bg-white/5 text-slate-500 group-hover:text-indigo-400 transition-colors"
          >
            <ChevronDown size={14} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-white/5 mt-2">
              <p className="text-slate-400 text-xs leading-relaxed mb-6 font-medium">
                {item.details || (isZh ? "关于此公告的更多详细信息即将推出。我们正在不断努力为您带来睡眠科学和人工智能领域的最新更新。" : "More details about this announcement are coming soon. We are constantly working to bring you the latest updates in sleep science and AI.")}
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(item);
                  }}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors group/link"
                >
                  {isZh ? "阅读全文" : "Read Full Article"}
                  <ArrowRight size={12} className="group-hover/link:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {isZh ? "分享" : "Share"}
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
    </motion.div>
  );
};

export const NewsHub: React.FC<NewsHubProps> = ({ lang, onSelectArticle }) => {
  const isZh = lang === 'zh';

  const announcements = [
    {
      title: isZh ? "破坏与保护 AI 系统：白帽漏洞赏金会议" : "Breaking & Securing AI Systems: White Hat Bug Bounty Session",
      date: new Date().toISOString().split('T')[0],
      slug: "bug-bounty-program",
      details: isZh 
        ? "加入我们的安全专家团队，参加关于保护人工智能基础设施的现场会议。我们将讨论最新的威胁向量和防御策略。" 
        : "Join our team of security experts for a live session on securing AI infrastructure. We will discuss the latest threat vectors and defense strategies."
    },
    {
      title: isZh ? "平台更新：管理界面增强与安全修复" : "Platform Update: Admin UI Enhancements & Security Fixes",
      date: new Date().toISOString().split('T')[0],
      slug: "platform-update-admin-ui-security",
      details: isZh 
        ? "最新的平台更新引入了更直观的管理仪表盘和关键的安全补丁，以确保您的数据保持私密和安全。" 
        : "The latest platform update introduces a more intuitive admin dashboard and critical security patches to ensure your data remains private and secure."
    },
    {
      title: isZh ? "SomnoAI Digital Sleep Lab 宣布 Beta 访问计划" : "SomnoAI Digital Sleep Lab Announces Beta Access Program",
      date: "2024-05-01",
      slug: "beta-access-program",
      details: isZh 
        ? "我们很高兴地宣布我们的 Beta 访问计划。选定的用户将能够测试我们的最新功能并提供直接反馈。" 
        : "We are excited to announce our Beta Access Program. Selected users will be able to test our latest features and provide direct feedback."
    },
    {
      title: isZh ? "关于昼夜节律分析的新研究合作伙伴关系" : "New Research Partnership on Circadian Rhythm Analysis",
      date: "2024-04-15",
      slug: "research-partnership",
      details: isZh 
        ? "SomnoAI 已与领先的睡眠研究机构合作，深入研究昼夜节律及其对长期健康的影响。" 
        : "SomnoAI has partnered with leading sleep research institutions to dive deeper into circadian rhythms and their impact on long-term health."
    },
    {
      title: isZh ? "平台更新：增强的模式检测算法" : "Platform Update: Enhanced Pattern Detection Algorithms",
      date: "2024-03-28",
      slug: "platform-update-algorithms",
      details: isZh 
        ? "我们的数据科学家团队改进了我们的核心算法，现在可以更准确地识别复杂的睡眠模式。" 
        : "Our team of data scientists has refined our core algorithms, which can now identify complex sleep patterns with even greater accuracy."
    }
  ];

  return (
    <MarketingPageTemplate
      title={isZh ? "SomnoAI Digital Sleep Lab 新闻中心" : "SomnoAI Digital Sleep Lab Newsroom"}
      subtitle={isZh ? "官方公告、新闻稿和媒体报道。" : "Official announcements, press releases, and media coverage."}
      ctaPrimary={{ text: isZh ? "媒体资料包" : "Press Kit", link: "#press-kit" }}
      ctaSecondary={{ text: isZh ? "媒体联系" : "Media Contact", link: "/contact" }}
    >
      <Section title={isZh ? "最新公告" : "Latest Announcements"}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {announcements.map((item, idx) => (
            <NewsCard 
              key={idx} 
              item={item} 
              idx={idx} 
              isZh={isZh} 
              onSelect={onSelectArticle} 
            />
          ))}
        </div>
      </Section>

      <Section title={isZh ? "媒体资源" : "Media Resources"} id="press-kit">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="hardware-panel p-10 text-center cursor-pointer hover:border-indigo-500/50 transition-all group">
            <div className="hardware-label mb-6 opacity-50">ASSETS_01</div>
            <h4 className="text-xl font-black text-white mb-3 uppercase tracking-tight italic group-hover:text-indigo-400 transition-colors">
              {isZh ? "品牌资产" : "Brand Assets"}
            </h4>
            <p className="text-slate-500 text-[11px] font-medium uppercase tracking-wider italic">
              {isZh ? "徽标、颜色和指南。" : "Logos, colors, and guidelines."}
            </p>
          </div>
          <div className="hardware-panel p-10 text-center cursor-pointer hover:border-indigo-500/50 transition-all group">
            <div className="hardware-label mb-6 opacity-50">BIOS_02</div>
            <h4 className="text-xl font-black text-white mb-3 uppercase tracking-tight italic group-hover:text-indigo-400 transition-colors">
              {isZh ? "高管简介" : "Executive Bios"}
            </h4>
            <p className="text-slate-500 text-[11px] font-medium uppercase tracking-wider italic">
              {isZh ? "领导团队的背景信息。" : "Background information on leadership."}
            </p>
          </div>
          <div className="hardware-panel p-10 text-center cursor-pointer hover:border-indigo-500/50 transition-all group">
            <div className="hardware-label mb-6 opacity-50">FACTS_03</div>
            <h4 className="text-xl font-black text-white mb-3 uppercase tracking-tight italic group-hover:text-indigo-400 transition-colors">
              {isZh ? "情况说明书" : "Fact Sheet"}
            </h4>
            <p className="text-slate-500 text-[11px] font-medium uppercase tracking-wider italic">
              {isZh ? "关键统计数据和公司概览。" : "Key statistics and company overview."}
            </p>
          </div>
        </div>
      </Section>

      <div className="text-center pt-12 border-t border-white/5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <InlineCTA text={isZh ? "阅读博客" : "Read Blog"} link="/blog" />
          <span className="hidden sm:inline text-white/20">|</span>
          <InlineCTA text={isZh ? "RSS 订阅" : "RSS Feed"} link="/rss.xml" />
          <span className="hidden sm:inline text-white/20">|</span>
          <InlineCTA text={isZh ? "联系我们" : "Contact Us"} link="/contact" />
        </div>
      </div>
    </MarketingPageTemplate>
  );
};
