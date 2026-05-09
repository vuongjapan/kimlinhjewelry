import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import DomesticGoldPriceCard from '@/components/DomesticGoldPriceCard';
import Footer from '@/components/Footer';
import FloatingButtons from '@/components/FloatingButtons';

// Lazy load below-fold components
const AboutSection = lazy(() => import('@/components/AboutSection'));
const ProductShowcase = lazy(() => import('@/components/ProductShowcase'));
const GoldPriceChart = lazy(() => import('@/components/GoldPriceChart'));
const WorldGoldPrice = lazy(() => import('@/components/WorldGoldPrice'));
const WorldSilverPrice = lazy(() => import('@/components/WorldSilverPrice'));
const MarketAnalysis = lazy(() => import('@/components/MarketAnalysis'));
const DomesticSilverPriceCard = lazy(() => import('@/components/DomesticSilverPriceCard'));
const BrandedGoldPriceCard = lazy(() => import('@/components/BrandedGoldPriceCard'));
const InvestmentKnowledge = lazy(() => import('@/components/InvestmentKnowledge'));
const ContactSection = lazy(() => import('@/components/ContactSection'));
const AIChatWidget = lazy(() => import('@/components/AIChatWidget'));

const SectionFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    let tries = 0;
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (tries++ < 20) setTimeout(tryScroll, 200);
    };
    tryScroll();
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <DomesticGoldPriceCard />
        <Suspense fallback={<SectionFallback />}>
          <GoldPriceChart />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <AboutSection />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <ProductShowcase />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <WorldGoldPrice />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <WorldSilverPrice />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <MarketAnalysis />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <DomesticSilverPriceCard />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <BrandedGoldPriceCard />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <InvestmentKnowledge />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <ContactSection />
        </Suspense>
      </main>
      <Footer />
      <FloatingButtons />
      <Suspense fallback={null}>
        <AIChatWidget />
      </Suspense>
    </div>
  );
};

export default Index;
