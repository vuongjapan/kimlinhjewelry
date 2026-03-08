import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WorldSilverData {
  price: string;
  change: string;
  unit: string;
  vndPerOunce: string;
  updatedAt: string;
  source: string;
}

const CAFEF_URL = "https://cafef.vn/du-lieu/gia-bac-hom-nay/the-gioi.chn";
const CACHE_TTL = 5 * 60 * 1000;

let cache: WorldSilverData | null = null;
let cacheTimestamp = 0;
let fetchInProgress = false;

async function fetchFromCafeF(): Promise<WorldSilverData> {
  const resp = await fetch(CAFEF_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    },
  });

  if (!resp.ok) throw new Error(`CafeF returned ${resp.status}`);
  const html = await resp.text();

  // Extract price from: id="price_silver_world_price_price">84.476</div>
  const priceMatch = html.match(/id="price_silver_world_price_price"[^>]*>([\d.,]+)<\/div>/);
  const price = priceMatch?.[1] || "";

  // Extract change from: id="price_silver_world_change">0 (0%)</div>
  const changeMatch = html.match(/id="price_silver_world_change"[^>]*>([^<]+)<\/div>/);
  const change = changeMatch?.[1]?.trim() || "0 (0%)";

  // Extract VND per ounce: "1 Ounce = 2,212,426 VNĐ"
  const vndMatch = html.match(/1 Ounce\s*=\s*([\d.,]+)\s*VNĐ/);
  const vndPerOunce = vndMatch?.[1] || "";

  if (!price) throw new Error("Could not extract silver price from CafeF");

  return {
    price,
    change,
    unit: "USD/Ounce",
    vndPerOunce,
    updatedAt: new Date().toISOString(),
    source: "live",
  };
}

function triggerBackgroundRefresh() {
  if (fetchInProgress) return;
  fetchInProgress = true;
  fetchFromCafeF()
    .then(data => { cache = data; cacheTimestamp = Date.now(); })
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
    const data = await fetchFromCafeF();
    cache = data;
    cacheTimestamp = Date.now();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching world silver price:", error);
    return new Response(
      JSON.stringify({ error: "Không thể tải giá bạc thế giới" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
