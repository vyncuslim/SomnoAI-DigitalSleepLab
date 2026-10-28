import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { trackPageView } from './services/analytics';
import { Language } from './types';
import { LanguageProvider } from './context/LanguageProvider';
import { ContentProtection } from './components/ContentProtection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AnalyticsProvider } from './components/AnalyticsProvider';
import RootLayout from './components/RootLayout';
import Watermark from './components/Watermark';
import { BLOG_POSTS, RESEARCH_ARTICLES } from './data/mockData';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { SchemaMarkup } from './components/SchemaMarkup';
import { AuthCallback } from './components/AuthCallback';

// Lazy load components with retry for chunk loading errors
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assume that the error was caused by the routing to a new version of the app
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        return { default: () => null }; // Return a dummy component while reloading
      }
      throw error;
    }
  });

const PasswordReset = lazyWithRetry(() => import('./pages/PasswordReset').then(module => ({ default: module.PasswordReset })));
const UserSettings = lazyWithRetry(() => import('./pages/UserSettings').then(module => ({ default: module.UserSettings })));
const PersonalChat = lazyWithRetry(() => import('./components/PersonalChat').then(module => ({ default: module.PersonalChat })));
const Auth = lazyWithRetry(() => import('./components/Auth').then(module => ({ default: module.Auth })));
const Dashboard = lazyWithRetry(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const AdminView = lazyWithRetry(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const UserProfile = lazyWithRetry(() => import('./components/Placeholders').then(module => ({ default: module.UserProfile })));
const FeedbackView = lazyWithRetry(() => import('./components/Placeholders').then(module => ({ default: module.FeedbackView })));
const LandingPage = lazyWithRetry(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const About = lazyWithRetry(() => import('./pages/About').then(module => ({ default: module.About })));
const Product = lazyWithRetry(() => import('./pages/Product').then(module => ({ default: module.Product })));
const HowItWorks = lazyWithRetry(() => import('./pages/HowItWorks').then(module => ({ default: module.HowItWorks })));
const Features = lazyWithRetry(() => import('./pages/Features').then(module => ({ default: module.Features })));
const Research = lazyWithRetry(() => import('./pages/Research').then(module => ({ default: module.Research })));
const Science = lazyWithRetry(() => import('./pages/Science').then(module => ({ default: module.Science })));
const Founder = lazyWithRetry(() => import('./pages/Founder').then(module => ({ default: module.Founder })));
const FAQ = lazyWithRetry(() => import('./pages/FAQ').then(module => ({ default: module.FAQ })));
const Status = lazyWithRetry(() => import('./pages/Status').then(module => ({ default: module.Status })));
const Contact = lazyWithRetry(() => import('./pages/Contact').then(module => ({ default: module.Contact })));
const LegalHub = lazyWithRetry(() => import('./pages/LegalHub').then(module => ({ default: module.LegalHub })));
const MediaResources = lazyWithRetry(() => import('./pages/MediaResources').then(module => ({ default: module.MediaResources })));
const DynamicPage = lazyWithRetry(() => import('./pages/DynamicPage').then(module => ({ default: module.DynamicPage })));
const LegalContact = lazyWithRetry(() => import('./pages/LegalContact').then(module => ({ default: module.LegalContact })));
const Atlas = lazyWithRetry(() => import('./pages/Atlas').then(module => ({ default: module.Atlas })));
const Dreams = lazyWithRetry(() => import('./pages/Dreams').then(module => ({ default: module.Dreams })));
const Voice = lazyWithRetry(() => import('./pages/Voice').then(module => ({ default: module.Voice })));
const GenericFeature = lazyWithRetry(() => import('./pages/GenericFeature').then(module => ({ default: module.GenericFeature })));
const Trials = lazyWithRetry(() => import('./pages/Trials').then(module => ({ default: module.Trials })));
// const DiaryView = lazyWithRetry(() => import('./components/Placeholders').then(module => ({ default: module.DiaryView })));
import { BlogPostView } from './components/BlogPostView';
import { ArticleView } from './components/ArticleView';

const BlogHub = lazyWithRetry(() => import('./pages/BlogHub').then(module => ({ default: module.BlogHub })));
const NewsHub = lazyWithRetry(() => import('./pages/NewsHub').then(module => ({ default: module.NewsHub })));
const ChangelogView = lazyWithRetry(() => import('./components/Placeholders').then(module => ({ default: module.ChangelogView })));
const SupportView = lazyWithRetry(() => import('./components/SupportView').then(module => ({ default: module.SupportView })));
const FounderDashboardPage = lazyWithRetry(() => import('./pages/FounderDashboardPage').then(module => ({ default: module.FounderDashboardPage })));
const SearchHub = lazyWithRetry(() => import('./components/SearchHub').then(module => ({ default: module.SearchHub })));
const BlockedView = lazyWithRetry(() => import('./components/BlockedView').then(module => ({ default: module.BlockedView })));
const LogoOnly = lazyWithRetry(() => import('./pages/LogoOnly'));
const VerifyEmail = lazyWithRetry(() => import('./pages/VerifyEmail').then(module => ({ default: module.VerifyEmail })));
const AISleepCoach = lazyWithRetry(() => import('./components/AISleepCoach').then(module => ({ default: module.AISleepCoach })));
const AIHub = lazyWithRetry(() => import('./pages/AIHub').then(module => ({ default: module.AIHub })));
const BugBounty = lazyWithRetry(() => import('./pages/security/BugBounty').then(module => ({ default: module.BugBounty })));
const SecurityChallenge2026 = lazyWithRetry(() => import('./pages/SecurityChallenge2026').then(module => ({ default: module.SecurityChallenge2026 })));
const HallOfFame = lazyWithRetry(() => import('./pages/security/HallOfFame').then(module => ({ default: module.HallOfFame })));
const VerifyCertificate = lazyWithRetry(() => import('./pages/security/VerifyCertificate').then(module => ({ default: module.VerifyCertificate })));
const ResearcherProfile = lazyWithRetry(() => import('./pages/security/ResearcherProfile').then(module => ({ default: module.ResearcherProfile })));
const SecurityAdminDashboard = lazyWithRetry(() => import('./pages/admin/Dashboard').then(module => ({ default: module.AdminDashboard })));

// Initial Data
// const INITIAL_SLEEP_DATA: SleepRecord = {
//   id: 'rec_7892345610',
//   date: new Date().toISOString(),
//   score: 85,
//   heartRate: {
//     resting: 58,
//     min: 52,
//     max: 110,
//     average: 65,
//     history: []
//   },
//   deepRatio: 0.18,
//   remRatio: 0.22,
//   totalDuration: 460, // minutes
//   efficiency: 0.92,
//   stages: [],
//   aiInsights: [
//     "Deep sleep duration is within optimal range.",
//     "REM cycles show good consistency.",
//     "Resting heart rate is excellent."
//   ]
// };

const BlogPostWrapper: React.FC<{ lang: Language }> = ({ lang }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = BLOG_POSTS.find(p => p.slug === slug);
  const langPrefix = lang === 'zh' ? '/cn' : '/en';

  if (!post) {
    return <div className="min-h-screen flex items-center justify-center text-white">Post not found</div>;
  }

  return <BlogPostView post={post} lang={lang} onBack={() => navigate(`${langPrefix}/blog`)} />;
};

const ArticleWrapper: React.FC<{ lang: Language }> = ({ lang }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const article = RESEARCH_ARTICLES.find(a => a.slug === slug);
  const langPrefix = lang === 'zh' ? '/cn' : '/en';

  if (!article) {
    return <div className="min-h-screen flex items-center justify-center text-white">Article not found</div>;
  }

  return <ArticleView article={article} lang={lang} onBack={() => navigate(`${langPrefix}/news`)} />;
};


interface AppRoutesProps {
  lang: Language;
  setLang: (lang: Language) => void;
  handleNavigate: (path: string) => void;
}

import { AdminSecurityWrapper } from './components/AdminSecurityWrapper';

const AdminRoutes: React.FC<Pick<AppRoutesProps, 'lang'>> = ({ lang }) => {
  const navigate = useNavigate();
  const handleBack = () => navigate(-1);
  const langPrefix = lang === 'zh' ? '/cn' : '/en';

  return (
    <AdminSecurityWrapper>
      <Suspense fallback={
        <div className="min-h-screen bg-[#01040a] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-8"></div>
          <div className="text-white text-lg font-medium animate-pulse uppercase tracking-widest">Accessing Secure Admin Terminal...</div>
        </div>
      }>
        <Routes>
          <Route path="admin" element={
            <ProtectedRoute adminOnly lang={lang}>
              <AdminView lang={lang} onBack={handleBack} />
            </ProtectedRoute>
          } />
          <Route path="founder-dashboard" element={
            <ProtectedRoute adminOnly lang={lang}>
              <FounderDashboardPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to={`${langPrefix}/admin`} replace />} />
        </Routes>
      </Suspense>
    </AdminSecurityWrapper>
  );
};

const AppRoutes: React.FC<AppRoutesProps> = ({
  lang,
  setLang,
  handleNavigate,
}) => {
  const navigate = useNavigate();
  const { isBlocked, blockedReason, blockCode, user } = useAuth();
  const langPrefix = lang === 'zh' ? '/cn' : '/en';

  const handleBack = () => navigate(-1);

  useEffect(() => {
    if (isBlocked) {
      console.warn(`[SECURITY] Access blocked for user: ${user?.email || 'Anonymous'}. Reason: ${blockedReason || 'N/A'}. Code: ${blockCode || 'N/A'}`);
    }
  }, [isBlocked, blockedReason, blockCode, user]);

  if (isBlocked) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#01040a]" />}>
        <BlockedView reason={blockedReason} blockCode={blockCode} />
      </Suspense>
    );
  }

  return (
    <React.Fragment>
    <Suspense fallback={
      <div className="min-h-screen bg-[#01040a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <div className="max-w-md text-slate-400 text-sm space-y-4 animate-pulse">
          <h2 className="text-white text-lg font-medium">Loading SomnoAI Digital Sleep Lab</h2>
          <p>Preparing your advanced AI-powered sleep analysis platform...</p>
          <p className="text-xs text-slate-500">SomnoAI Digital Sleep Lab provides personalized sleep coaching, comprehensive tracking, and actionable insights based on your unique sleep patterns. Whether you struggle with insomnia, sleep apnea symptoms, or just want to optimize your daily energy levels, SomnoAI Digital Sleep Lab is your personal digital sleep clinic.</p>
        </div>
      </div>
    }>
    <Routes>
      {/* Public Routes */}
      <Route index element={<LandingPage lang={lang} onLanguageChange={setLang} onNavigate={handleNavigate} />} />
      <Route path="auth" element={<Auth lang={lang} />} />
      <Route path="auth/login" element={<Auth lang={lang} initialView="login" />} />
      <Route path="auth/signin" element={<Auth lang={lang} initialView="login" />} />
      <Route path="auth/signup" element={<Auth lang={lang} initialView="signup" />} />
      <Route path="auth/verify-email" element={<VerifyEmail />} />
      <Route path="auth/callback" element={<AuthCallback />} />
      <Route path="auth/reset-password" element={<PasswordReset />} />
      <Route path="login" element={<Navigate to={`${langPrefix}/auth/login`} replace />} />
      <Route path="signup" element={<Navigate to={`${langPrefix}/auth/signup`} replace />} />
      <Route path="auth/verify" element={<AuthCallback />} />
      <Route path="auth/freeze" element={<DynamicPage lang={lang} type="account-blocking" />} />
      <Route path="about" element={<About lang={lang} />} />
      <Route path="product" element={<Product lang={lang} />} />
      <Route path="how-it-works" element={<HowItWorks lang={lang} />} />
      <Route path="features" element={<Features lang={lang} />} />
      <Route path="research" element={<Research lang={lang} />} />
      <Route path="science" element={<Science lang={lang} />} />
      <Route path="founder" element={<Founder lang={lang} />} />
      <Route path="contact" element={<Contact lang={lang} />} />
      <Route path="faq" element={<FAQ lang={lang} />} />
      <Route path="status" element={<Status lang={lang} />} />
      <Route path="search" element={<SearchHub />} />
      <Route path="logo" element={<LogoOnly />} />
      <Route path="ai-coach" element={<AISleepCoach />} />
      <Route path="ai-hub" element={
        <ProtectedRoute lang={lang}>
          <AIHub />
        </ProtectedRoute>
      } />
      
      {/* Security Challenge 2026 — preview, no testing authorization */}
      <Route path="security-challenge-2026" element={<SecurityChallenge2026 lang={lang} />} />
      <Route path="security/challenge-2026" element={<Navigate to="/security-challenge-2026" replace />} />
      
      {/* Security Recognition */}
      <Route path="security/bug-bounty" element={<BugBounty />} />
      <Route path="security/hall-of-fame" element={<HallOfFame />} />
      <Route path="security/verify/:certId" element={<VerifyCertificate />} />
      <Route path="security/researcher/:id" element={<ResearcherProfile />} />
      <Route path="admin/dashboard" element={<SecurityAdminDashboard />} />
      <Route path="security/verify" element={<VerifyCertificate />} />
      
      {/* Blog & News */}
      <Route path="blog" element={<BlogHub lang={lang} onSelectPost={(post: any) => navigate(`${langPrefix}/blog/${post.slug}`)} />} />
      <Route path="blog/:slug" element={<BlogPostWrapper lang={lang} />} />
      <Route path="news" element={<NewsHub lang={lang} onSelectArticle={(article: any) => navigate(`${langPrefix}/news/${article.slug}`)} />} />
      <Route path="news/:slug" element={<ArticleWrapper lang={lang} />} />
      <Route path="changelog" element={<ChangelogView lang={lang} onBack={handleBack} />} />

      {/* Legal & Support */}
      <Route path="legal" element={<LegalHub lang={lang} />} />
      <Route path="media" element={<MediaResources lang={lang} />} />
      <Route path="legal/privacy-policy" element={<DynamicPage lang={lang} type="privacy-policy" />} />
      <Route path="legal/terms-of-service" element={<DynamicPage lang={lang} type="terms-of-service" />} />
      <Route path="legal/cookies" element={<DynamicPage lang={lang} type="cookies" />} />
      <Route path="legal/cookie-policy" element={<Navigate to={`${langPrefix}/legal/cookies`} replace />} />
      <Route path="legal/medical-disclaimer" element={<DynamicPage lang={lang} type="medical-disclaimer" />} />
      <Route path="legal/data-handling" element={<DynamicPage lang={lang} type="data-handling" />} />
      <Route path="legal/contact" element={<LegalContact lang={lang} />} />
      <Route path="legal/data-processing" element={<Navigate to={`${langPrefix}/legal/data-handling`} replace />} />
      <Route path="legal/security" element={<DynamicPage lang={lang} type="security" />} />
      <Route path="legal/acceptable-use" element={<DynamicPage lang={lang} type="acceptable-use" />} />
      <Route path="legal/ai-disclaimer" element={<DynamicPage lang={lang} type="ai-disclaimer" />} />
      <Route path="legal/abuse-policy" element={<DynamicPage lang={lang} type="abuse-policy" />} />
      <Route path="legal/account-blocking" element={<DynamicPage lang={lang} type="account-blocking" />} />
      <Route path="legal/policy-framework" element={<DynamicPage lang={lang} type="policy-framework" />} />
      <Route path="legal/open-source" element={<DynamicPage lang={lang} type="open-source" />} />
      <Route path="legal/:type" element={<DynamicPage lang={lang} />} />
      <Route path="privacy" element={<Navigate to={`${langPrefix}/legal/privacy-policy`} replace />} />
      <Route path="terms" element={<Navigate to={`${langPrefix}/legal/terms-of-service`} replace />} />
      <Route path="policy" element={<Navigate to={`${langPrefix}/legal/policy-framework`} replace />} />
      <Route path="opensource" element={<Navigate to={`${langPrefix}/legal/open-source`} replace />} />
      <Route path="support" element={<SupportView lang={lang} />} />
      <Route path="report-abuse" element={<Navigate to={`${langPrefix}/legal/abuse-policy`} replace />} />

      {/* Protected Routes */}
      <Route path="dashboard" element={
        <ProtectedRoute lang={lang}>
          <Dashboard lang={lang} />
        </ProtectedRoute>
      } />
      <Route path="settings" element={
        <ProtectedRoute lang={lang}>
          <UserSettings />
        </ProtectedRoute>
      } />
      <Route path="profile" element={
        <ProtectedRoute lang={lang}>
          <UserProfile lang={lang} onBack={handleBack} />
        </ProtectedRoute>
      } />

      <Route path="feedback" element={
        <ProtectedRoute lang={lang}>
          <FeedbackView lang={lang} onBack={handleBack} />
        </ProtectedRoute>
      } />
      <Route path="experiment" element={
        <ProtectedRoute lang={lang}>
          <Trials lang={lang} onBack={handleBack} />
        </ProtectedRoute>
      } />
      <Route path="atlas" element={
        <ProtectedRoute lang={lang}>
          <Atlas lang={lang} onBack={handleBack} />
        </ProtectedRoute>
      } />
      <Route path="dreams" element={
        <ProtectedRoute lang={lang}>
          <Dreams lang={lang} onBack={handleBack} />
        </ProtectedRoute>
      } />
      <Route path="voice" element={
        <ProtectedRoute lang={lang}>
          <Voice lang={lang} onBack={handleBack} />
        </ProtectedRoute>
      } />
      <Route path="journal" element={
        <ProtectedRoute lang={lang}>
          <GenericFeature lang={lang} onBack={handleBack} title={lang === 'zh' ? '日志' : 'Log'} description={lang === 'zh' ? '这里是睡眠日志。' : 'Welcome to your sleep log.'} />
        </ProtectedRoute>
      } />
      <Route path="personal-chat" element={
        <ProtectedRoute lang={lang}>
          <PersonalChat />
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </React.Fragment>
  );
};

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  // Derive language from URL
  const lang: Language = location.pathname.startsWith('/cn') ? 'zh' : 'en';
  
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  const handleLanguageChange = (newLang: Language) => {
    const currentPath = window.location.pathname;
    const pathWithoutLang = currentPath.replace(/^\/(cn|en)/, '') || '/';
    const targetLang = newLang === 'zh' ? 'cn' : 'en';
    navigate(`/${targetLang}${pathWithoutLang === '/' ? '' : pathWithoutLang}`);
  };

  const handleNavigate = (path: string) => {
    // If it's a relative path (no leading slash), prefix it with current language
    if (!path.startsWith('/') && !path.startsWith('http')) {
      const prefix = lang === 'zh' ? '/cn' : '/en';
      navigate(`${prefix}/${path}`);
    } else if (path.startsWith('/') && !path.startsWith('/en') && !path.startsWith('/cn')) {
      // If it's an absolute path but missing language prefix, add it
      const prefix = lang === 'zh' ? '/cn' : '/en';
      navigate(`${prefix}${path}`);
    } else {
      navigate(path);
    }
  };

  const handleLogout = async () => {
    await signOut();
    const prefix = lang === 'zh' ? '/cn' : '/en';
    navigate(prefix);
  };

  const isAuthPage = location.pathname.includes('/auth');
  const isAdminPage = location.pathname.includes('/admin') || location.pathname.includes('/founder-dashboard');
  const showNavbar = !isAuthPage && !isAdminPage;

  const getActiveView = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'home';
    if (parts.length === 1 && (parts[0] === 'en' || parts[0] === 'cn')) return 'home';
    return parts[parts.length - 1];
  };

  const activeView = getActiveView();
  const canonicalUrl = location.pathname.includes('security-challenge-2026')
    ? 'https://vynalthai.com/security-challenge-2026'
    : `https://sleepsomno.com${location.pathname}`;

  // Paths that should NOT be indexed by search engines
  const sensitivePaths = [
    '/auth',
    '/dashboard',
    '/admin',
    '/settings',
    '/profile',
    '/feedback',
    '/experiment',
    '/atlas',
    '/dreams',
    '/voice',
    '/journal',
    '/personal-chat',
    '/founder-dashboard',
    '/search'
  ];

  const isSensitivePath = sensitivePaths.some(path => location.pathname.includes(path));

  const content = (
    <LanguageProvider lang={lang} setLang={handleLanguageChange}>
      {/^\/(cn|en)(\/|$)/.test(location.pathname) ? (
        <Routes>
          <Route path="/cn/*" element={isAdminPage ? <AdminRoutes lang="zh" /> : <AppRoutes lang="zh" setLang={handleLanguageChange} handleNavigate={handleNavigate} />} />
          <Route path="/en/*" element={isAdminPage ? <AdminRoutes lang="en" /> : <AppRoutes lang="en" setLang={handleLanguageChange} handleNavigate={handleNavigate} />} />
        </Routes>
      ) : (
        isAdminPage ? <AdminRoutes lang="en" /> : <AppRoutes lang="en" setLang={handleLanguageChange} handleNavigate={handleNavigate} />
      )}
    </LanguageProvider>
  );

  return (
    <ErrorBoundary lang={lang}>
      <Helmet>
        <link rel="canonical" href={canonicalUrl} />
        {isSensitivePath && <meta name="robots" content="noindex, nofollow" />}
      </Helmet>
      {!isAdminPage && <Watermark />}
      {isAdminPage ? (
        <div className="min-h-screen bg-[#01040a] text-slate-200">
          {content}
        </div>
      ) : (
        <ContentProtection>
          <div>
            <RootLayout 
              lang={lang} 
              activeView={activeView} 
              onNavigate={handleNavigate} 
              onLanguageChange={handleLanguageChange}
              isAuthenticated={!!user}
              onLogout={handleLogout}
              showNavbar={showNavbar}
            >
              <SchemaMarkup />
              
              {!isSupabaseConfigured && (
                <div className="fixed top-0 left-0 right-0 bg-rose-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-2 text-center z-[9999] shadow-xl">
                  ⚠️ Supabase Configuration Missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.
                </div>
              )}
              
              {content}
            </RootLayout>
          </div>
        </ContentProtection>
      )}
    </ErrorBoundary>
  );
};

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <AnalyticsProvider>
            <AppContent />
          </AnalyticsProvider>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
