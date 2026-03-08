import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import heroImage from '@/assets/hero-jewelry.jpg';

const HeroSection = () => {
  const { data: subtitleSetting } = useQuery({
    queryKey: ['hero-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'hero_subtitle')
        .maybeSingle();
      return data;
    },
    staleTime: 60000,
  });

  const subtitle = (subtitleSetting?.value as any)?.text || 'Tiệm vàng gia đình uy tín';

  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Trang sức vàng Kim Linh"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background" />
      </div>
      
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in">
        <p className="text-sm md:text-base tracking-[0.3em] uppercase text-muted-foreground mb-4 font-body">
          {subtitle}
        </p>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-semibold mb-6 gold-text leading-tight">
          Kim Linh Jewelry
        </h1>
        <p className="text-base md:text-lg text-foreground/80 font-body max-w-xl mx-auto leading-relaxed mb-8">
          Uy tín – Minh bạch – Tận tâm. Chuyên vàng tây theo mẫu, phù hợp đeo hàng ngày.
          Giá cập nhật theo thị trường, tư vấn rõ ràng, không ép mua.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#gia-vang" className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground font-body font-medium hover:bg-primary/90 transition-colors">
            Xem giá vàng
          </a>
          <a href="#san-pham" className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-border bg-card/50 backdrop-blur-sm text-foreground font-body font-medium hover:bg-card transition-colors">
            Xem sản phẩm
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
