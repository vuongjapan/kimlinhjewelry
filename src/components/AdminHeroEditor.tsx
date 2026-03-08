import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const DEFAULTS = {
  subtitle: 'Tiệm vàng gia đình uy tín',
  title: 'Kim Linh Jewelry',
  description: 'Uy tín – Minh bạch – Tận tâm. Chuyên vàng tây theo mẫu, phù hợp đeo hàng ngày. Giá cập nhật theo thị trường, tư vấn rõ ràng, không ép mua.',
  btn1: 'Xem giá vàng',
  btn2: 'Xem sản phẩm',
};

const AdminHeroEditor = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(DEFAULTS);

  const { data, isLoading } = useQuery({
    queryKey: ['hero-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'hero_content')
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (data?.value) {
      const v = data.value as any;
      setForm({
        subtitle: v.subtitle || DEFAULTS.subtitle,
        title: v.title || DEFAULTS.title,
        description: v.description || DEFAULTS.description,
        btn1: v.btn1 || DEFAULTS.btn1,
        btn2: v.btn2 || DEFAULTS.btn2,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (data) {
        const { error } = await supabase.from('site_settings').update({ value: form as any }).eq('key', 'hero_content');
        if (error) throw error;
      } else {
        const { error } = await supabase.from('site_settings').insert({ key: 'hero_content', value: form as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Đã lưu nội dung Hero' });
      qc.invalidateQueries({ queryKey: ['hero-settings'] });
    },
    onError: (e: any) => toast({ title: 'Lỗi', description: e.message, variant: 'destructive' }),
  });

  const set = (key: keyof typeof DEFAULTS, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  if (isLoading) return <p className="text-muted-foreground text-sm py-8 text-center">Đang tải...</p>;

  return (
    <div>
      <h2 className="text-xl font-display font-semibold mb-4">Chỉnh sửa đầu trang (Hero)</h2>
      <div className="glass-card p-4 space-y-4 max-w-lg">
        <div>
          <Label className="font-body text-xs">Tiêu đề phụ (dòng nhỏ phía trên)</Label>
          <Input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder={DEFAULTS.subtitle} />
        </div>
        <div>
          <Label className="font-body text-xs">Tiêu đề chính</Label>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={DEFAULTS.title} />
        </div>
        <div>
          <Label className="font-body text-xs">Mô tả</Label>
          <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={DEFAULTS.description} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="font-body text-xs">Nút 1</Label>
            <Input value={form.btn1} onChange={(e) => set('btn1', e.target.value)} placeholder={DEFAULTS.btn1} />
          </div>
          <div>
            <Label className="font-body text-xs">Nút 2</Label>
            <Input value={form.btn2} onChange={(e) => set('btn2', e.target.value)} placeholder={DEFAULTS.btn2} />
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} size="sm">
          <Save className="w-4 h-4 mr-1" />Lưu
        </Button>
      </div>
    </div>
  );
};

export default AdminHeroEditor;
