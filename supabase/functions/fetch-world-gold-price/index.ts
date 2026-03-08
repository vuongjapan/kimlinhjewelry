import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WorldGoldData {
  price: string;
  change: string;
  unit: string;
  vndPerOunce: string;
  updatedAt: string;
  source: string;
}

const CAFEF_URL = "https://cafef.vn/du-lieu/gia-vang-hom-nay/the-gioi.chn";
const CACHE_TTL = 5 * 60 * 1000;

let cache: WorldGoldData | null = null;
let cacheTimestamp = 0;
let fetchInProgress = false;

async function fetchFromFirecrawl(): Promise<WorldGoldData> {
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
        prompt: 'Extract the world gold price (giá vàng thế giới/quốc tế). Find the XAU/USD spot price which should be around 2000-6000 USD/Ounce, the change amount and percentage, and the VND equivalent per ounce.',
        schema: {
          type: 'object',
          properties: {
            price: { type: 'string', description: 'Current gold price in USD per ounce, e.g. "5,171.92"' },
            change: { type: 'string', description: 'Change value and percent, e.g. "21.62 (0.42%)"' },
            direction: { type: 'string', description: 'up, down, or nochange' },
            vndPerOunce: { type: 'string', description: 'VND per ounce value, e.g. "136.068.043"' },
          },
          required: ['price'],
        },
      },
      waitFor: 8000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firecrawl error [${response.status}]: ${errText}`);
  }

  const result = await response.json();
  const extractData = result.data?.extract || result.extract;
  
  console.log("Firecrawl extract:", JSON.stringify(extractData));

  if (!extractData?.price) throw new Error('No gold price extracted');

  const direction = extractData.direction || 'nochange';
  let change = extractData.change || '0 (0%)';
  if (direction === 'up' && !change.startsWith('+')) {
    change = '+' + change;
  } else if (direction === 'down' && !change.startsWith('-')) {
    change = '-' + change;
  }

  return {
    price: extractData.price,
    change,
    unit: "USD/Ounce",
    vndPerOunce: extractData.vndPerOunce || '',
    updatedAt: new Date().toISOString(),
    source: "live",
  };
}

function triggerBackgroundRefresh() {
  if (fetchInProgress) return;
  fetchInProgress = true;
  fetchFromFirecrawl()
    .then(data => { cache = data; cacheTimestamp = Date.now(); console.log("Gold world cache refreshed:", data.price); })
    .catch(err => console.error("Background refresh failed:", err))
    .finally(() => { fetchInProgress = false; });
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
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching world gold price:", error);
    return new Response(
      JSON.stringify({ error: "Không thể tải giá vàng thế giới" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
