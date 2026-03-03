import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_URL = "https://www.google.com/maps/embed?pb=!1m17!1m11!1m3!1d197.94451420253608!2d105.89203095785983!3d19.735471219530424!2m2!1f31.72056854010132!2f0!3m2!1i1024!2i768!4f35!3m3!1m2!1s0x3136513908f2170b%3A0xc43b5d87000233d2!2zNTAgTmd1eeG7hW4gVGjhu4sgTWluaCBLaGFpLCBQLiBC4bqvYyBTxqFuLCBT4bqnbSBTxqFuLCBUaGFuaCBIw7NhLCBWaeG7h3QgTmFt!5e1!3m2!1svi!2sjp!4v1772501812841!5m2!1svi!2sjp";

const StoreMap = () => {
  const { data: url } = useQuery({
    queryKey: ['map-url'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'map_location').single();
      return (data?.value as any)?.embed_url || DEFAULT_URL;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="w-full h-[350px] rounded-lg overflow-hidden border border-border">
      <iframe
        src={url || DEFAULT_URL}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Vàng Bạc Kim Linh - Google Maps"
      />
    </div>
  );
};

export default StoreMap;
