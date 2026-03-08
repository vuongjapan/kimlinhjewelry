import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const AdminHeroEditor = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [subtitle, setSubtitle] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['hero-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'hero_subtitle')
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (data) setSubtitle((data.value as any)?.text || '');
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { key: 'hero_subtitle', value: { text: subtitle } };
      if (data) {
        const { error } = await supabase.from('site_settings').update({ value: { text: subtitle } }).eq('key', 'hero_subtitle');
        if (error) throw error;
      } else {
        const { error } = await supabase.from('site_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Đã lưu tiêu đề' });
      qc.invalidateQueries({ queryKey: ['hero-settings'] });
    },
    onError: (e: any) => toast({ title: 'Lỗi', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Đang tải...</p>;

  return (
    <div>
      <h2 className="text-xl font-display font-semibold mb-4">Chỉnh sửa Hero Banner</h2>
      <div className="glass-card p-4 space-y-4 max-w-lg">
        <div>
          <Label className="font-body text-xs">Tiêu đề phụ (dòng trên "Kim Linh Jewelry")</Label>
          <Input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Tiệm vàng gia đình uy tín"
          />
          <p className="text-xs text-muted-foreground mt-1">Mặc định: "Tiệm vàng gia đình uy tín"</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} size="sm">
          <Save className="w-4 h-4 mr-1" />Lưu
        </Button>
      </div>
    </div>
  );
};

export default AdminHeroEditor;
