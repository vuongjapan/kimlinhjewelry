import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MapPin } from 'lucide-react';

const DEFAULT_URL = "https://www.google.com/maps/embed?pb=!1m17!1m11!1m3!1d197.94451420253608!2d105.89203095785983!3d19.735471219530424!2m2!1f31.72056854010132!2f0!3m2!1i1024!2i768!4f35!3m3!1m2!1s0x3136513908f2170b%3A0xc43b5d87000233d2!2zNTAgTmd1eeG7hW4gVGjhu4sgTWluaCBLaGFpLCBQLiBC4bqvYyBTxqFuLCBT4bqnbSBTxqFuLCBUaGFuaCBIw7NhLCBWaeG7h3QgTmFt!5e1!3m2!1svi!2sjp!4v1772501812841!5m2!1svi!2sjp";

const useMapUrl = () => useQuery({
  queryKey: ['map-url'],
  queryFn: async () => {
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'map_location').single();
    return (data?.value as any)?.embed_url || DEFAULT_URL;
  },
  staleTime: 5 * 60 * 1000,
});

const AdminMapEditor = () => {
  const { data: savedUrl } = useMapUrl();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [url, setUrl] = useState(DEFAULT_URL);

  useEffect(() => {
    if (savedUrl) setUrl(savedUrl);
  }, [savedUrl]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('site_settings')
        .update({ value: { embed_url: url } as any, updated_at: new Date().toISOString() })
        .eq('key', 'map_location');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-url'] });
      toast({ title: 'Đã cập nhật bản đồ' });
    },
    onError: (err: any) => toast({ title: 'Lỗi', description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-semibold flex items-center gap-2">
        <MapPin className="w-5 h-5" /> Cài đặt bản đồ
      </h2>
      <p className="text-sm text-muted-foreground font-body">
        Dán link nhúng Google Maps (embed URL) vào ô bên dưới. Lấy từ Google Maps → Chia sẻ → Nhúng bản đồ.
      </p>
      <div>
        <Label className="font-body text-xs">Google Maps Embed URL</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." />
      </div>
      <div className="w-full h-[350px] rounded-lg overflow-hidden border border-border">
        <iframe src={url} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" title="Preview" />
      </div>
      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Lưu</Button>
      </div>
    </div>
  );
};

export default AdminMapEditor;
