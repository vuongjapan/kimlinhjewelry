import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SilverPriceItem {
  type: string;
  buy: string;
  sell: string;
}

interface CachedData {
  prices: SilverPriceItem[];
  updatedAt: string;
  source: string;
}

const FALLBACK_PRICES: SilverPriceItem[] = [
  { type: "Bạc miếng Phú Quý 999 1 lượng", buy: "3.180.000", sell: "3.280.000" },
  { type: "Bạc thỏi Phú Quý 999 5-10 lượng", buy: "3.180.000", sell: "3.280.000" },
  { type: "Bạc Sư Tử 999 - 1 lượng", buy: "3.200.000", sell: "3.290.000" },
];

const CAFEF_URL = "https://cafef.vn/du-lieu/gia-bac-hom-nay/trong-nuoc.chn";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache
let cache: CachedData | null = null;
let cacheTimestamp = 0;
let fetchInProgress = false;

function formatVND(value: string): string {
  const num = parseFloat(value.replace(/,/g, ''));
  if (isNaN(num)) return value;
  const dong = Math.round(num * 1_000_000);
  return dong.toLocaleString('vi-VN');
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
        prompt: 'Extract the domestic silver price table (bảng giá bạc trong nước). For each row extract the silver type name, buy price (giá mua), and sell price (giá bán). Return all rows.',
        schema: {
          type: 'object',
          properties: {
            silverPrices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  buy: { type: 'string' },
                  sell: { type: 'string' },
                },
                required: ['type', 'buy', 'sell'],
              },
            },
          },
          required: ['silverPrices'],
        },
      },
      waitFor: 10000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firecrawl error [${response.status}]: ${errText}`);
  }

  const result = await response.json();
  const extractData = result.data?.extract || result.extract;
  const rawPrices: SilverPriceItem[] = extractData?.silverPrices || [];

  if (rawPrices.length === 0) throw new Error('No prices extracted');

  const prices = rawPrices.map(p => ({
    type: p.type,
    buy: formatVND(p.buy),
    sell: formatVND(p.sell),
  }));

  return {
    prices,
    updatedAt: new Date().toISOString(),
    source: "live",
  };
}

// Background refresh - doesn't block the response
function triggerBackgroundRefresh() {
  if (fetchInProgress) return;
  fetchInProgress = true;

  fetchFromFirecrawl()
    .then(data => {
      cache = data;
      cacheTimestamp = Date.now();
      console.log(`Cache refreshed: ${data.prices.length} silver prices`);
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

  // If cache is fresh, return immediately
  if (cache && !cacheExpired) {
    return new Response(JSON.stringify(cache), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If cache exists but expired, return stale and refresh in background
  if (cache && cacheExpired) {
    triggerBackgroundRefresh();
    return new Response(JSON.stringify(cache), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // No cache at all - must fetch synchronously (first request)
  try {
    const data = await fetchFromFirecrawl();
    cache = data;
    cacheTimestamp = Date.now();
    fetchInProgress = false;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching silver prices:", error);
    return new Response(
      JSON.stringify({
        prices: FALLBACK_PRICES,
        updatedAt: new Date().toISOString(),
        source: "fallback",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
