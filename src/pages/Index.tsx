import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import WorldGoldPrice from '@/components/WorldGoldPrice';
import DomesticPrices from '@/components/DomesticPrices';
import ProductShowcase from '@/components/ProductShowcase';
import InvestmentKnowledge from '@/components/InvestmentKnowledge';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import FloatingButtons from '@/components/FloatingButtons';
import AIChatWidget from '@/components/AIChatWidget';
import AboutSection from '@/components/AboutSection';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <WorldGoldPrice />
        <DomesticPrices />
        <ProductShowcase />
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
