import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ApiItem {
  [key: string]: string;
}

const FALLBACK_PRICES = [
  { type: "Bạc 999", buy: "3.020", sell: "3.120", unit: "triệu đồng/lượng" },
];

function formatPrice(raw: string): string {
  const num = parseInt(raw, 10);
  if (isNaN(num)) return raw;
  return num.toLocaleString("vi-VN");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const response = await fetch("https://vangmlc.vn/includes/view/api_proxy.php", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://vangmlc.vn/",
      },
    });

    if (!response.ok) throw new Error(`API HTTP ${response.status}`);
    const text = await response.text();
    const apiData: ApiItem[] = JSON.parse(text);

    // Build value map
    const valueMap: Record<string, string> = {};
    for (const item of apiData) {
      const key = Object.keys(item)[0];
      const val = Object.values(item)[0] as string;
      valueMap[key] = val;
    }

    // Row 4 = Bạc (silver)
    const buyRaw = valueMap["r4c1"] || "0";
    const sellRaw = valueMap["r4c2"] || "0";

    const prices = [
      {
        type: "Bạc 999",
        buy: formatPrice(buyRaw),
        sell: formatPrice(sellRaw),
        unit: "nghìn đồng/chỉ",
      },
    ];

    console.log(`Fetched silver price: buy=${buyRaw}, sell=${sellRaw}`);

    return new Response(
      JSON.stringify({
        prices,
        updatedAt: new Date().toISOString(),
        source: "live",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
