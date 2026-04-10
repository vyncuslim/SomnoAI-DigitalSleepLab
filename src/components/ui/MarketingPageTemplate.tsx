import { FC, ReactNode } from 'react';
import { PageLayout } from './PageLayout';
import { Hero, GridBackground } from './Components';

interface MarketingPageTemplateProps {
  title: ReactNode;
  subtitle: string;
  ctaPrimary?: { text: string; link: string };
  ctaSecondary?: { text: string; link: string };
  ctaTertiary?: { text: string; link: string };
  children: ReactNode;
}

export const MarketingPageTemplate: FC<MarketingPageTemplateProps> = ({ title, subtitle, ctaPrimary, ctaSecondary, children }) => {
  return (
    <PageLayout>
      <div className="relative">
        <GridBackground />
        <Hero title={title} subtitle={subtitle} ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} />
        <div className="space-y-12 pb-12 relative z-10">
          {children}
        </div>
      </div>
    </PageLayout>
  );
};
