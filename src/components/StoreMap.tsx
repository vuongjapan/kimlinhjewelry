import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2 } from 'lucide-react';

const DEFAULT_URL = "https://www.google.com/maps/embed?pb=!1m17!1m11!1m3!1d197.94451420253608!2d105.89203095785983!3d19.735471219530424!2m2!1f31.72056854010132!2f0!3m2!1i1024!2i768!4f35!3m3!1m2!1s0x3136513908f2170b%3A0xc43b5d87000233d2!2zNTAgTmd1eeG7hW4gVGjhu4sgTWluaCBLaGFpLCBQLiBC4bqvYyBTxqFuLCBT4bqnbSBTxqFuLCBUaGFuaCBIw7NhLCBWaeG7h3QgTmFt!5e1!3m2!1svi!2sjp!4v1772501812841!5m2!1svi!2sjp";

const StoreMap = () => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const { data: url, isLoading: urlLoading } = useQuery({
    queryKey: ['map-url'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'map_location').single();
      return (data?.value as any)?.embed_url || DEFAULT_URL;
    },
    staleTime: 5 * 60 * 1000,
  });

  const iframeSrc = url || DEFAULT_URL;
  const showPlaceholder = urlLoading || (!mapLoaded && !mapError);

  return (
    <div className="w-full h-[350px] rounded-lg overflow-hidden border border-border relative bg-muted">
      {/* Loading / error placeholder */}
      {(showPlaceholder || mapError) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-muted">
          {mapError ? (
            <>
              <MapPin className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-body text-foreground font-medium">Không thể tải bản đồ</p>
              <p className="text-xs font-body text-muted-foreground">Kim Linh Jewelry – Sầm Sơn, Thanh Hóa</p>
              <a href="tel:0986617939" className="text-xs text-primary font-body hover:underline">📞 098 661 7939</a>
            </>
          ) : (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm font-body text-muted-foreground">Đang tải bản đồ cửa hàng...</p>
            </>
          )}
        </div>
      )}

      {/* Iframe – always render but hidden until loaded */}
      {!urlLoading && (
        <iframe
          src={iframeSrc}
          width="100%"
          height="100%"
          style={{ border: 0, opacity: mapLoaded && !mapError ? 1 : 0, transition: 'opacity 0.3s' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Kim Linh Jewelry – Sầm Sơn, Thanh Hóa"
          onLoad={() => setMapLoaded(true)}
          onError={() => setMapError(true)}
        />
      )}
    </div>
  );
};

export default StoreMap;
