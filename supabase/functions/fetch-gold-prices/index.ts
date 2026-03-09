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

// No fallback prices — return error if API fails

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
    let apiData: ApiItem[] | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        const response = await fetch("https://vangmlc.vn/includes/view/api_proxy.php", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
            "Referer": "https://vangmlc.vn/",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) throw new Error(`API HTTP ${response.status}`);
        const text = await response.text();
        apiData = JSON.parse(text);
        break;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.warn(`Attempt ${attempt + 1} failed:`, lastError.message);
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }

    if (!apiData) throw lastError || new Error("All retries failed");

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

        const buyNum = parseInt(buyRaw, 10);
        const sellNum = parseInt(sellRaw, 10);

        return {
          type: cfg.type,
          buy: (isNaN(buyNum) || buyNum <= 0) ? "Đang cập nhật" : formatPrice(buyRaw),
          sell: (isNaN(sellNum) || sellNum <= 0) ? "Đang cập nhật" : formatPrice(sellRaw),
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
        error: "Không thể tải giá vàng từ nguồn",
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
