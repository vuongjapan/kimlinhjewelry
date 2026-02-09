import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import WorldGoldPrice from '@/components/WorldGoldPrice';
import DomesticGoldPrice from '@/components/DomesticGoldPrice';
import SilverPrice from '@/components/SilverPrice';
import ProductShowcase from '@/components/ProductShowcase';
import InvestmentKnowledge from '@/components/InvestmentKnowledge';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import FloatingButtons from '@/components/FloatingButtons';
import AIChatWidget from '@/components/AIChatWidget';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <WorldGoldPrice />
        <DomesticGoldPrice />
        <SilverPrice />
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
