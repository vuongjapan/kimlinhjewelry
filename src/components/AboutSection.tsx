import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, Award, Image as ImageIcon } from 'lucide-react';

const iconMap: Record<number, React.ReactNode> = {
  0: <Store className="w-5 h-5 text-primary" />,
  1: <Award className="w-5 h-5 text-primary" />,
};

const AboutSection = () => {
  const { data: sections, isLoading: loadingSections } = useQuery({
    queryKey: ['about-sections'],
    queryFn: async () => {
      const { data } = await supabase
        .from('about_sections')
        .select('*')
        .order('sort_order');
      return data || [];
    },
  });

  const { data: images, isLoading: loadingImages } = useQuery({
    queryKey: ['about-images'],
    queryFn: async () => {
      const { data } = await supabase
        .from('about_images')
        .select('*')
        .order('sort_order');
      return data || [];
    },
  });

  const loading = loadingSections || loadingImages;

  return (
    <section id="gioi-thieu" className="section-padding bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">
            Về chúng tôi
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-semibold gold-text">
            Giới Thiệu Về Kim Linh Jewelry
          </h2>
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-8">
            {sections?.map((section, i) => {
              const sectionImages = images?.filter((img) => img.section_id === section.id) || [];
              return (
                <div key={section.id} className="glass-card p-6 md:p-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-2.5 rounded-lg bg-primary/10 mt-0.5">
                      {iconMap[i] || <Store className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-lg text-foreground mb-3">
                        {section.title}
                      </h3>
                      <p className="text-sm text-muted-foreground font-body leading-relaxed whitespace-pre-line">
                        {section.content}
                      </p>
                    </div>
                  </div>

                  {sectionImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
                      {sectionImages.map((img) => (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-[4/3] bg-secondary/50">
                          <img
                            src={img.image_url}
                            alt={img.caption || section.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          {img.caption && (
                            <div className="absolute bottom-0 inset-x-0 bg-foreground/60 backdrop-blur-sm px-2 py-1">
                              <p className="text-xs text-background font-body truncate">{img.caption}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {(!sections || sections.length === 0) && (
              <p className="text-center text-muted-foreground font-body py-8">
                Nội dung đang được cập nhật...
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default AboutSection;
