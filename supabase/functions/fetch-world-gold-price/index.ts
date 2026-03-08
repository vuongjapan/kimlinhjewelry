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

async function fetchFromCafeF(): Promise<WorldGoldData> {
  const resp = await fetch(CAFEF_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    },
  });

  if (!resp.ok) throw new Error(`CafeF returned ${resp.status}`);
  const html = await resp.text();

  // Try multiple patterns for price extraction
  // Pattern 1: id="price_vang_dola">5,171.92</div>
  let priceMatch = html.match(/id=["']price_vang_dola["'][^>]*>([\d.,]+)</);
  // Pattern 2: class="price_vang_dola">
  if (!priceMatch) priceMatch = html.match(/class=["']price_vang_dola["'][^>]*>([\d.,]+)</);
  // Pattern 3: Look for the price near "Vàng / Đô la Mỹ"
  if (!priceMatch) priceMatch = html.match(/Vàng\s*\/\s*Đô la Mỹ[\s\S]{0,200}?([\d]{1,2}[,.][\d]{3}[,.]?\d*)/);
  
  const price = priceMatch?.[1] || "";
  console.log("Extracted price:", price, "from match:", priceMatch?.[0]?.substring(0, 100));

  // Extract change - look for change text near priceChange_vang_dola
  let change = "0 (0%)";
  const changeBlockMatch = html.match(/id=["']priceChange_vang_dola["'][\s\S]{0,500}/);
  if (changeBlockMatch) {
    // Look for numbers like "21.62 (0.42%)"
    const numMatch = changeBlockMatch[0].match(/([\d.]+)\s*\(([\d.]+)%\)/);
    if (numMatch) {
      change = `${numMatch[1]} (${numMatch[2]}%)`;
    }
    // Detect direction
    if (changeBlockMatch[0].includes('class="up"') || changeBlockMatch[0].includes("iconUp")) {
      change = "+" + change;
    } else if (changeBlockMatch[0].includes('class="down"') || changeBlockMatch[0].includes("iconDown")) {
      change = "-" + change;
    }
  }

  // Extract VND per ounce: "1 Ounce = 136.068.043 VNĐ"
  const vndMatch = html.match(/1 Ounce\s*=\s*([\d.,]+)\s*VNĐ/);
  const vndPerOunce = vndMatch?.[1] || "";

  if (!price) {
    console.error("Could not find price. HTML snippet:", html.substring(0, 2000));
    throw new Error("Could not extract gold price from CafeF");
  }

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
    const data = await fetchFromCafeF();
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
