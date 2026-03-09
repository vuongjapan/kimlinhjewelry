import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GoldPriceItem {
  type: string;
  buy: string;
  sell: string;
}

interface CachedData {
  prices: GoldPriceItem[];
  updatedAt: string;
  source: string;
}

const CAFEF_URL = "https://cafef.vn/du-lieu/gia-vang-hom-nay/trong-nuoc.chn";
const CACHE_TTL = 5 * 60 * 1000;

let cache: CachedData | null = null;
let cacheTimestamp = 0;
let fetchInProgress = false;

function formatPrice(value: string): string {
  // CafeF returns prices like "182.00" (triệu đồng/lượng) or "1.820" for small units
  // We want to display as-is since they're already in triệu đồng format
  const cleaned = value.replace(/[^\d.,]/g, '').trim();
  return cleaned || value;
}

async function fetchFromFirecrawl(): Promise<CachedData> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured');

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: CAFEF_URL,
      formats: ['extract'],
      extract: {
        prompt: 'Extract the "Bảng giá vàng thương hiệu hôm nay" table (branded gold price table) for Hà Nội region. For each row extract: the gold type name (loại vàng), buy price (giá mua) as a number string like "182.00", and sell price (giá bán) as a number string like "185.00". Only include rows from the Hà Nội section. Do not include change values.',
        schema: {
          type: 'object',
          properties: {
            goldPrices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', description: 'Gold type name e.g. "Nhẫn ép vỉ Kim Gia Bảo"' },
                  buy: { type: 'string', description: 'Buy price e.g. "182.00"' },
                  sell: { type: 'string', description: 'Sell price e.g. "185.00"' },
                },
                required: ['type', 'buy', 'sell'],
              },
            },
          },
          required: ['goldPrices'],
        },
      },
      waitFor: 5000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firecrawl error [${response.status}]: ${errText}`);
  }

  const result = await response.json();
  const extractData = result.data?.extract || result.extract;
  const rawPrices: GoldPriceItem[] = extractData?.goldPrices || [];

  if (rawPrices.length === 0) throw new Error('No gold prices extracted');

  const prices = rawPrices.map(p => ({
    type: p.type,
    buy: formatPrice(p.buy),
    sell: formatPrice(p.sell),
  }));

  return {
    prices,
    updatedAt: new Date().toISOString(),
    source: "live",
  };
}

function triggerBackgroundRefresh() {
  if (fetchInProgress) return;
  fetchInProgress = true;

  fetchFromFirecrawl()
    .then(data => {
      cache = data;
      cacheTimestamp = Date.now();
      console.log(`Cache refreshed: ${data.prices.length} branded gold prices`);
    })
    .catch(err => {
      console.error('Background refresh failed:', err);
    })
    .finally(() => {
      fetchInProgress = false;
    });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const now = Date.now();
  const cacheExpired = now - cacheTimestamp > CACHE_TTL;

  if (cache && !cacheExpired) {
    return new Response(JSON.stringify(cache), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (cache && cacheExpired) {
    triggerBackgroundRefresh();
    return new Response(JSON.stringify(cache), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const data = await fetchFromFirecrawl();
    cache = data;
    cacheTimestamp = Date.now();
    fetchInProgress = false;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching branded gold prices:", error);
    return new Response(
      JSON.stringify({
        prices: [
          { type: "Vàng miếng SJC", buy: "182.00", sell: "185.00" },
          { type: "Nhẫn Trơn PNJ 999.9", buy: "180.90", sell: "183.90" },
        ],
        updatedAt: new Date().toISOString(),
        source: "fallback",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
