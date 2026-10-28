import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock3,
  Gift, Globe2, LockKeyhole, Mail, ShieldCheck, Sparkles, Target,
  XCircle
} from 'lucide-react';
import { Language } from '../types';

interface SecurityChallenge2026Props {
  lang: Language;
}

const sponsorLogo = 'https://iconlogovector.com/uploads/images/2024/10/lg-6718f5df478ee-xyz-Domain-TLD.webp';

export const SecurityChallenge2026: React.FC<SecurityChallenge2026Props> = ({ lang }) => {
  const zh = lang === 'zh';
  const c = zh ? {
    label: '2026 年安全研究挑战 · 官方活动预告',
    planned: '活动计划：2026 年 11 月 10 日 — 12 月 10 日',
    status: '预告阶段 · 尚未开放授权测试',
    heading: '让每一次发现，',
    headingAccent: '都让互联网更安全。',
    intro: 'Vynalth AI Security Challenge 2026 邀请负责任的安全研究员，在正式公布的授权范围内帮助我们发现和修复真实漏洞。优秀报告有机会获得来自合作伙伴的实际奖品。',
    ctaRewards: '探索已确认奖品',
    ctaRules: '了解参与规则',
    sponsorLabel: '已确认域名赞助商',
    sponsorIntro: 'Gen.xyz 已为本次活动正式提供免费首年 .xyz 域名注册权益。',
    sponsorHeadline: '20 个免费 .xyz 域名',
    sponsorSmall: '首年注册费由 Gen.xyz 赞助 · 仅限符合条件的普通 .xyz 域名',
    expires: '兑换截止：2027 年 1 月 31 日',
    sponsorNote: '奖品总量共 20 个。代码仅向获选参与者私下发放，不会公开展示。次年续费及其他服务费用不在免费赞助范围内。',
    sponsorDetails: '了解赞助商',
    rewardsTitle: '真正的奖品。更多可能。',
    rewardsDesc: '只公布已经确认的权益；其他奖品在获得品牌书面批准之前不会被承诺。',
    confirmed: '已确认',
    pending: '正在争取 · 未获批准',
    domains: '首年免费域名',
    domainsDesc: '完成审核并符合获奖资格的参与者，可能获得一个普通 .xyz 域名的首年免费注册资格，名额有限。',
    future1: '开发工具订阅',
    future1Desc: '编程 IDE、开发者软件许可证与订阅权益。',
    future2: '隐私和安全工具',
    future2Desc: 'VPN、密码管理器及其他安全工具权益。',
    future3: '科技实体礼品',
    future3Desc: '硬件、周边和技术礼品；仅在赞助确认后开放。',
    howTitle: '挑战将如何进行',
    steps: [
      ['01', '等待授权范围', '正式开放之前不会授权任何攻击性安全测试。'],
      ['02', '遵守安全测试规则', '仅在公开列出的资产与限制内进行非破坏性验证。'],
      ['03', '私密报告发现', '提供复现步骤、影响说明和最小化概念验证，不公开利用细节。'],
      ['04', '验证后评估奖励', '依据影响、原创性和规则审核，不保证每份报告都能获奖。']
    ],
    boundaries: '安全边界',
    noPermission: '本页面不是渗透测试授权。',
    noPermissionDesc: '目前尚未发布可测试资产清单、开始授权通知或完整奖励条款。请勿因为看到本页面就对 Vynalth AI 或任何第三方系统进行攻击测试。',
    excluded: '禁止：DDoS / 拒绝服务、社会工程、未经同意获取用户数据、账号接管、数据破坏、暴力破解、第三方资产测试、超出授权范围的扫描。',
    canDo: '如发现安全问题，可先联系组织者咨询负责任披露方式；勿发送凭据、密钥或他人私人数据。',
    next: '想了解正式开放时间？',
    nextDesc: '活动规则、范围及私密漏洞提交方式将在正式开始前公布。届时将提供明确的参与流程。',
    contact: '向活动团队咨询',
    terms: '奖品以赞助方兑换条件、库存及获奖审核为准。Vynalth AI 不提供现金赏金。其他正在洽谈的品牌并非已确认赞助商。',
    organizer: '活动主办方',
    sponsorFooter: '域名奖品赞助商',
    home: '返回首页'
  } : {
    label: '2026 security research challenge · Official preview',
    planned: 'Planned: November 10 — December 10, 2026',
    status: 'Preview only · Testing is not yet authorized',
    heading: 'Find what we missed.',
    headingAccent: 'Help make the internet safer.',
    intro: 'Vynalth AI Security Challenge 2026 will invite responsible security researchers to help identify and resolve genuine vulnerabilities within a clearly published, authorized scope. Eligible, validated reports may earn real partner-provided rewards.',
    ctaRewards: 'Explore confirmed rewards',
    ctaRules: 'See the safety rules',
    sponsorLabel: 'Confirmed domain sponsor',
    sponsorIntro: 'Gen.xyz has officially provided first-year .xyz domain registrations for this event.',
    sponsorHeadline: '20 free .xyz domains',
    sponsorSmall: 'First-year registration sponsored by Gen.xyz · Eligible standard-priced .xyz names only',
    expires: 'Redeem by January 31, 2027',
    sponsorNote: '20 domains total. The redemption code will be provided privately to selected eligible recipients, never published on this page. Renewal and other services are not covered.',
    sponsorDetails: 'Meet the sponsor',
    rewardsTitle: 'Real rewards. More to come.',
    rewardsDesc: 'We only guarantee benefits confirmed in writing. Other rewards are proposals until sponsors approve them.',
    confirmed: 'Confirmed',
    pending: 'Exploring · Not yet approved',
    domains: 'Free first-year domains',
    domainsDesc: 'Eligible participants with validated submissions may be selected to receive a standard-priced .xyz domain with the first year free, subject to limited availability.',
    future1: 'Developer subscriptions',
    future1Desc: 'Developer IDEs, software licenses and productivity subscriptions.',
    future2: 'Privacy & security tools',
    future2Desc: 'VPN, password managers and other security-focused services.',
    future3: 'Technology merchandise',
    future3Desc: 'Hardware, branded items and developer gear if sponsorship is confirmed.',
    howTitle: 'How the challenge will work',
    steps: [
      ['01', 'Wait for an explicit scope', 'No offensive security testing is authorized before the official opening notice.'],
      ['02', 'Stay within safety rules', 'Use non-destructive validation on expressly listed assets only.'],
      ['03', 'Report privately', 'Submit reproduction steps, impact and a minimal proof of concept. Never publish exploit details.'],
      ['04', 'Receive a reviewed decision', 'Reward eligibility depends on severity, originality and the published rules. Not every report will qualify.']
    ],
    boundaries: 'Safety boundaries',
    noPermission: 'This page is not permission to perform penetration testing.',
    noPermissionDesc: 'An authorized asset list, start notice and full reward terms have not yet been published. Do not attack Vynalth AI or any third-party system based on this announcement.',
    excluded: 'Not permitted: DDoS or disruption, social engineering, unauthorized access to user information, account takeover, data destruction, brute force, third-party testing or scanning outside scope.',
    canDo: 'For responsible-disclosure questions, contact the organizer. Do not email credentials, private data or secret keys.',
    next: 'Want to know when it opens?',
    nextDesc: 'Testing scope, safe-harbor rules and a private reporting process will be published before launch.',
    contact: 'Contact the organizers',
    terms: 'Prizes are subject to sponsor redemption terms, available inventory and report review. No cash bounty is offered. Brands under discussion are not confirmed sponsors.',
    organizer: 'Organized by',
    sponsorFooter: 'Domain prize sponsor',
    home: 'Back to home'
  };

  const aspirationalRewards = [
    { icon: Sparkles, title: c.future1, desc: c.future1Desc },
    { icon: LockKeyhole, title: c.future2, desc: c.future2Desc },
    { icon: Gift, title: c.future3, desc: c.future3Desc }
  ];

  return (
    <div className="relative isolate mx-auto max-w-6xl overflow-hidden pb-14 text-white">
      <Helmet>
        <title>Vynalth AI Security Challenge 2026 | Official Event Preview</title>
        <meta name="description" content="Explore the Vynalth AI Security Challenge 2026. Gen.xyz has sponsored 20 free first-year .xyz domains, with more prizes under discussion. Testing not yet authorized." />
        <link rel="canonical" href="https://vynalthai.com/security-challenge-2026" />
      </Helmet>
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[110px]" />

      <section className="mx-auto max-w-5xl pb-16 pt-7 text-center sm:pt-12">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-2 text-xs font-semibold tracking-wide text-indigo-200">
          <ShieldCheck size={15} aria-hidden="true" /> {c.label}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-2"><CalendarDays size={14} aria-hidden="true" /> {c.planned}</span>
          <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-amber-200">{c.status}</span>
        </div>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
          Vynalth AI<br /><span className="bg-gradient-to-r from-white via-indigo-200 to-sky-300 bg-clip-text text-transparent">Security Challenge 2026</span>
        </h1>
        <p className="mt-7 text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">{c.heading}<br className="hidden sm:block" /> <span className="text-indigo-300">{c.headingAccent}</span></p>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-400">{c.intro}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#rewards" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-indigo-100">{c.ctaRewards}<ArrowRight size={16} aria-hidden="true"/></a>
          <a href="#safety" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">{c.ctaRules}</a>
        </div>
      </section>

      <section id="rewards" className="scroll-mt-32">
        <div className="overflow-hidden rounded-[28px] border border-indigo-400/25 bg-gradient-to-br from-indigo-500/15 via-slate-900/80 to-slate-950 p-6 sm:p-9">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[.16em] text-indigo-200">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-emerald-300"><CheckCircle2 size={14} aria-hidden="true"/>{c.confirmed}</span>
                {c.sponsorLabel}
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">{c.sponsorHeadline}</h2>
              <p className="mt-4 text-base text-slate-300">{c.sponsorIntro}</p>
              <p className="mt-3 text-sm text-slate-400">{c.sponsorSmall}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-indigo-200"><Clock3 size={15} aria-hidden="true" />{c.expires}</p>
            </div>
            <a href="https://gen.xyz/" target="_blank" rel="noopener noreferrer" aria-label="Visit Gen.xyz, confirmed domain sponsor" className="flex shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white p-6 transition-transform hover:-translate-y-1">
              <img src={sponsorLogo} alt=".xyz domain registry logo" className="h-28 w-28 object-contain" loading="lazy" width="112" height="112" />
            </a>
          </div>
          <div className="mt-7 flex flex-col justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
            <p className="max-w-3xl text-sm leading-6 text-slate-400">{c.sponsorNote}</p>
            <a href="https://gen.xyz/" target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-200 hover:text-white">{c.sponsorDetails}<ArrowUpRight size={16} aria-hidden="true"/></a>
          </div>
        </div>

        <div className="mt-14 mb-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">{c.rewardsTitle}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{c.rewardsDesc}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[.06] p-6">
            <div className="flex items-center justify-between gap-3"><Globe2 size={26} className="text-emerald-300" aria-hidden="true"/><span className="text-xs font-medium text-emerald-300">{c.confirmed}</span></div>
            <h3 className="mt-5 text-xl font-semibold">{c.domains}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-400">{c.domainsDesc}</p>
          </article>
          <div className="grid gap-4">
            {aspirationalRewards.map((item) => (
              <article key={item.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <item.icon size={22} className="mt-1 shrink-0 text-slate-400" aria-hidden="true"/>
                <div><div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-200">{c.pending}</div><h3 className="text-base font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{item.desc}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">{c.howTitle}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {c.steps.map(([number, title, desc]) => (
            <div key={number} className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
              <span className="text-sm font-semibold text-indigo-300">{number}</span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="safety" className="mt-16 scroll-mt-32 rounded-3xl border border-amber-400/20 bg-amber-400/[.045] p-6 sm:p-9">
        <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-amber-200"><Target size={18} aria-hidden="true" />{c.boundaries}</div>
        <h2 className="mt-5 text-xl font-semibold sm:text-2xl">{c.noPermission}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">{c.noPermissionDesc}</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-rose-400/15 bg-black/20 p-4"><XCircle size={19} className="mt-1 shrink-0 text-rose-300" aria-hidden="true"/><p className="text-sm leading-7 text-slate-400">{c.excluded}</p></div>
          <div className="flex items-start gap-3 rounded-xl border border-emerald-400/15 bg-black/20 p-4"><ShieldCheck size={19} className="mt-1 shrink-0 text-emerald-300" aria-hidden="true"/><p className="text-sm leading-7 text-slate-400">{c.canDo}</p></div>
        </div>
      </section>

      <section className="mt-14 flex flex-col items-start justify-between gap-6 rounded-3xl border border-white/10 bg-gradient-to-r from-white/[.06] to-transparent p-7 sm:flex-row sm:items-center sm:p-10">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold">{c.next}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">{c.nextDesc}</p>
        </div>
        <a href="mailto:hello@vyncuslim.com?subject=Vynalth%20AI%20Security%20Challenge%202026" className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"><Mail size={16} aria-hidden="true"/>{c.contact}</a>
      </section>
      <p className="mt-8 text-xs leading-6 text-slate-500">{c.terms}</p>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-slate-500">
        <span>{c.organizer}: <span className="text-slate-200">Vynalth AI</span> · {c.sponsorFooter}: <a className="text-indigo-300 hover:underline" href="https://gen.xyz/" rel="noopener noreferrer" target="_blank">Gen.xyz</a></span>
        <Link to={zh ? '/cn' : '/en'} className="inline-flex items-center gap-2 text-slate-300 hover:text-white">{c.home}<ArrowRight size={14} aria-hidden="true"/></Link>
      </div>
    </div>
  );
};

export default SecurityChallenge2026;
