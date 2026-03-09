import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import WorldGoldPrice from '@/components/WorldGoldPrice';
import WorldSilverPrice from '@/components/WorldSilverPrice';
import DomesticGoldPriceCard from '@/components/DomesticGoldPriceCard';
import DomesticSilverPriceCard from '@/components/DomesticSilverPriceCard';
import BrandedGoldPriceCard from '@/components/BrandedGoldPriceCard';
import ProductShowcase from '@/components/ProductShowcase';
import InvestmentKnowledge from '@/components/InvestmentKnowledge';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import FloatingButtons from '@/components/FloatingButtons';
import AIChatWidget from '@/components/AIChatWidget';
import AboutSection from '@/components/AboutSection';
import MarketAnalysis from '@/components/MarketAnalysis';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <DomesticGoldPriceCard />
        <AboutSection />
        <ProductShowcase />
        <WorldGoldPrice />
        <WorldSilverPrice />
        <MarketAnalysis />
        <DomesticSilverPriceCard />
        <BrandedGoldPriceCard />
        <InvestmentKnowledge />
        <ContactSection />
      </main>
      <Footer />
      <FloatingButtons />
      <AIChatWidget />
    </div>
  );
};

export default Index;
