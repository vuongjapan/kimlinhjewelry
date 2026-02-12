import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Row mapping from vangmlc.vn API:
// r1 = Nhẫn Ép Vỉ (Vàng ta), r2 = Trang Sức, r3 = Vàng Tây 10K, r4 = Bạc
// Values are in nghìn đồng / chỉ (e.g., 16500 = 16.500 nghìn đồng)

interface ApiItem {
  [key: string]: string;
}

const ROW_CONFIG = [
  { row: 1, type: "Nhẫn Ép Vỉ 9999", category: "Vàng ta" },
  { row: 2, type: "Trang Sức Vàng", category: "Trang sức" },
  { row: 3, type: "Vàng Tây 10K", category: "Vàng tây" },
  { row: 4, type: "Bạc", category: "Bạc" },
];

const FALLBACK_PRICES = [
  { type: "Nhẫn Ép Vỉ 9999", buy: "16.500", sell: "16.750", category: "Vàng ta" },
  { type: "Trang Sức Vàng", buy: "16.450", sell: "16.700", category: "Trang sức" },
  { type: "Vàng Tây 10K", buy: "6.380", sell: "7.500", category: "Vàng tây" },
  { type: "Bạc", buy: "160", sell: "260", category: "Bạc" },
];

function formatPrice(raw: string): string {
  const num = parseInt(raw, 10);
  if (isNaN(num)) return raw;
  // Format with dots as thousand separator: 16500 -> "16.500"
  return num.toLocaleString("vi-VN");
}

function adjustBuyPrice(rawValue: string, adjustAmount: number): string {
  const num = parseInt(rawValue, 10);
  if (isNaN(num)) return rawValue;
  const adjusted = num + adjustAmount;
  return adjusted > 0 ? String(adjusted) : rawValue;
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

    // Build a map: { r1c1: "16500", r1c2: "16750", ... }
    const valueMap: Record<string, string> = {};
    for (const item of apiData) {
      const key = Object.keys(item)[0];
      const val = Object.values(item)[0] as string;
      valueMap[key] = val;
    }

    const prices = ROW_CONFIG
      .map(cfg => {
        let buyRaw = valueMap[`r${cfg.row}c1`] || "0";
        const sellRaw = valueMap[`r${cfg.row}c2`] || "0";

        // Adjust vàng tây buy price: -300 (nghìn đồng)
        if (cfg.category === "Vàng tây") {
          buyRaw = adjustBuyPrice(buyRaw, -300);
        }

        return {
          type: cfg.type,
          buy: formatPrice(buyRaw),
          sell: formatPrice(sellRaw),
          category: cfg.category,
        };
      });

    console.log(`Fetched ${prices.length} gold prices from API`);

    return new Response(
      JSON.stringify({
        prices,
        updatedAt: new Date().toISOString(),
        source: "live",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching gold prices:", error);
    return new Response(
      JSON.stringify({
        prices: FALLBACK_PRICES,
        updatedAt: new Date().toISOString(),
        source: "reference",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
