import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import heroImage from '@/assets/hero-jewelry.jpg';

const DEFAULTS = {
  subtitle: 'Tiệm vàng gia đình uy tín',
  title: 'Kim Linh Jewelry',
  description: 'Uy tín – Minh bạch – Tận tâm. Chuyên vàng tây theo mẫu, phù hợp đeo hàng ngày. Giá cập nhật theo thị trường, tư vấn rõ ràng, không ép mua.',
  btn1: 'Xem giá vàng',
  btn2: 'Xem sản phẩm',
};

const HeroSection = () => {
  const { data } = useQuery({
    queryKey: ['hero-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'hero_content')
        .maybeSingle();
      return (data?.value as any) || {};
    },
    staleTime: 60000,
  });

  const v = (key: keyof typeof DEFAULTS) => data?.[key] || DEFAULTS[key];

  return (
    <section className="relative min-h-[45vh] md:min-h-[60vh] lg:min-h-[70vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Trang sức vàng Kim Linh" className="w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background" />
      </div>
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in">
        <p className="text-sm md:text-base tracking-[0.3em] uppercase text-muted-foreground mb-4 font-body">
          {v('subtitle')}
        </p>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-6 gold-text leading-tight drop-shadow-lg">
          {v('title')}
        </h1>
        <p className="text-base md:text-lg text-foreground/80 font-body max-w-xl mx-auto leading-relaxed mb-8">
          {v('description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#gia-vang" className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground font-body font-medium hover:bg-primary/90 transition-colors">
            {v('btn1')}
          </a>
          <a href="#san-pham" className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-border bg-card/50 backdrop-blur-sm text-foreground font-body font-medium hover:bg-card transition-colors">
            {v('btn2')}
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
