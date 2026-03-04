import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const InvestmentKnowledge = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['knowledge-articles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('knowledge_articles')
        .select('*')
        .eq('is_published', true)
        .order('sort_order');
      return data || [];
    },
  });

  return (
    <section id="kien-thuc" className="section-padding bg-card">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-2 font-body">Tham khảo</p>
          <h2 className="text-3xl md:text-4xl font-display font-semibold gold-text">
            Kiến Thức Đầu Tư Vàng
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {articles?.map((article) => (
              <div key={article.id} className="glass-card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-primary/10 mt-0.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-2">{article.title}</h3>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{article.summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-6 font-body">
          Nội dung mang tính tham khảo, không phải tư vấn tài chính • Cập nhật: {new Date().toLocaleDateString('vi-VN')}
        </p>
      </div>
    </section>
  );
};

export default InvestmentKnowledge;
