import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_PRICES = [
  { type: "Vàng SJC 9999", buy: "95.500", sell: "97.500", category: "Vàng ta" },
  { type: "Vàng nhẫn 9999", buy: "95.000", sell: "96.800", category: "Vàng ta" },
  { type: "Vàng 24K (999.9)", buy: "95.000", sell: "96.500", category: "Vàng ta" },
  { type: "Vàng 18K (750)", buy: "70.900", sell: "73.000", category: "Vàng tây" },
  { type: "Vàng 14K (585)", buy: "55.200", sell: "57.500", category: "Vàng tây" },
  { type: "Vàng 10K (416)", buy: "39.200", sell: "41.500", category: "Vàng tây" },
  { type: "Trang sức vàng 18K", buy: "70.500", sell: "73.500", category: "Trang sức" },
  { type: "Trang sức vàng 14K", buy: "54.800", sell: "57.800", category: "Trang sức" },
];

const FALLBACK_WORLD = {
  price: 2935,
  change: 12.5,
  changePercent: 0.43,
  updatedAt: new Date().toISOString(),
};

function categorize(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("trang sức") || lower.includes("nữ trang")) return "Trang sức";
  if (lower.includes("tây") || lower.includes("18k") || lower.includes("14k") || lower.includes("10k") || lower.includes("750") || lower.includes("585") || lower.includes("416")) return "Vàng tây";
  return "Vàng ta";
}

function isVangTay(category: string): boolean {
  return category === "Vàng tây";
}

function cleanPrice(raw: string): string {
  const cleaned = raw.replace(/<[^>]*>/g, "").trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) return cleaned;
  const digits = cleaned.replace(/[^\d]/g, "");
  if (digits.length >= 4) {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  return cleaned;
}

function adjustBuyPrice(priceStr: string, adjustKiloVND: number): string {
  // priceStr is like "71.200" (meaning 71,200 nghìn đồng)
  const num = parseFloat(priceStr.replace(/\./g, ""));
  if (isNaN(num)) return priceStr;
  const adjusted = num + adjustKiloVND; // adjustKiloVND is -300
  if (adjusted <= 0) return priceStr;
  return adjusted.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const response = await fetch("https://vangmlc.vn/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    // === Parse domestic gold prices ===
    const prices: Array<{ type: string; buy: string; sell: string; category: string }> = [];

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const rowContent = rowMatch[1];
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let tdMatch;
      while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
        cells.push(tdMatch[1].replace(/<[^>]*>/g, "").trim());
      }

      if (cells.length >= 3) {
        const name = cells[0];
        const val1 = cells[1];
        const val2 = cells.length >= 3 ? cells[2] : cells[1];

        const hasGoldKeyword = /vàng|sjc|9999|24k|18k|14k|10k|750|585|416|trang sức|nữ trang|tây/i.test(name);
        const hasNumbers = /\d/.test(val1) && /\d/.test(val2);

        if (hasGoldKeyword && hasNumbers && name.length > 2) {
          const category = categorize(name);
          let buyPrice = cleanPrice(val1);
          const sellPrice = cleanPrice(val2);

          // Adjust vàng tây buy price: -300 (nghìn đồng)
          if (isVangTay(category)) {
            buyPrice = adjustBuyPrice(buyPrice, -300);
          }

          prices.push({
            type: name,
            buy: buyPrice,
            sell: sellPrice,
            category,
          });
        }
      }
    }

    // === Parse world gold price (XAU/USD) ===
    let worldGold = { ...FALLBACK_WORLD };

    // Try to find XAU/USD price patterns in the HTML
    // Common patterns: "$2,935", "2935 USD", "2.935,50"
    const xauPatterns = [
      /XAU[^<]*?(\d{1,2}[.,]\d{3}(?:[.,]\d{1,2})?)\s*(?:USD|\$)/i,
      /(?:USD|\$)\s*(\d{1,2}[.,]\d{3}(?:[.,]\d{1,2})?)[^<]*?XAU/i,
      /(?:thế\s*giới|world|quốc\s*tế)[^<]*?(\d{1,2}[.,]\d{3}(?:[.,]\d{1,2})?)/i,
      /(\d{1,2}[.,]\d{3}(?:[.,]\d{1,2})?)[^<]*?(?:thế\s*giới|world|quốc\s*tế)/i,
      /gold[^<]*?(?:price|spot)[^<]*?(\d{1,2}[.,]\d{3}(?:[.,]\d{1,2})?)/i,
      /(?:giá\s*vàng\s*thế\s*giới|spot\s*gold)[^<]*?(\d{1,2}[.,]\d{3}(?:[.,]\d{1,2})?)/i,
    ];

    for (const pattern of xauPatterns) {
      const match = html.match(pattern);
      if (match) {
        // Parse the number - could be "2,935.50" or "2.935,50"
        let numStr = match[1];
        // Determine format
        if (numStr.includes(",") && numStr.includes(".")) {
          // If comma before dot: 2,935.50 (US format)
          if (numStr.indexOf(",") < numStr.indexOf(".")) {
            numStr = numStr.replace(/,/g, "");
          } else {
            // 2.935,50 (EU format)
            numStr = numStr.replace(/\./g, "").replace(",", ".");
          }
        } else if (numStr.includes(",")) {
          // Could be "2,935" (thousand sep) or "2935,50" (decimal)
          const parts = numStr.split(",");
          if (parts[1] && parts[1].length === 3) {
            numStr = numStr.replace(",", ""); // thousand separator
          } else {
            numStr = numStr.replace(",", "."); // decimal
          }
        } else if (numStr.includes(".")) {
          const parts = numStr.split(".");
          if (parts[1] && parts[1].length === 3) {
            numStr = numStr.replace(".", ""); // thousand separator
          }
          // else it's already a decimal
        }

        const parsed = parseFloat(numStr);
        if (parsed > 1000 && parsed < 50000) {
          worldGold.price = parsed;
          console.log(`Found world gold price: $${parsed}`);
          break;
        }
      }
    }

    // Try to find change/percent patterns
    const changePatterns = [
      /([+-]?\d+[.,]?\d*)\s*(?:\(([+-]?\d+[.,]?\d*)%?\))/,
      /(?:tăng|giảm|change)[^<]*?([+-]?\d+[.,]?\d*)/i,
    ];
    for (const pattern of changePatterns) {
      const match = html.match(pattern);
      if (match) {
        const ch = parseFloat(match[1].replace(",", "."));
        if (!isNaN(ch) && Math.abs(ch) < 500) {
          worldGold.change = ch;
          if (match[2]) {
            worldGold.changePercent = parseFloat(match[2].replace(",", "."));
          } else {
            worldGold.changePercent = worldGold.price > 0 ? parseFloat(((ch / worldGold.price) * 100).toFixed(2)) : 0;
          }
          break;
        }
      }
    }

    worldGold.updatedAt = new Date().toISOString();

    // Validate domestic prices
    const validPrices = prices.filter(p => {
      const buyNum = parseFloat(p.buy.replace(/\./g, ""));
      return buyNum > 1000;
    });

    const domesticPrices = validPrices.length >= 3 ? validPrices : FALLBACK_PRICES.map(p => {
      // Apply vàng tây adjustment to fallback too
      if (isVangTay(p.category)) {
        return { ...p, buy: adjustBuyPrice(p.buy, -300) };
      }
      return p;
    });

    console.log(`Scraped ${prices.length} raw, ${validPrices.length} valid domestic prices. World: $${worldGold.price}`);

    return new Response(
      JSON.stringify({
        prices: domesticPrices,
        worldGold,
        updatedAt: new Date().toISOString(),
        source: validPrices.length >= 3 ? "live" : "reference",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);

    const fallbackWithAdjust = FALLBACK_PRICES.map(p => {
      if (isVangTay(p.category)) {
        return { ...p, buy: adjustBuyPrice(p.buy, -300) };
      }
      return p;
    });

    return new Response(
      JSON.stringify({
        prices: fallbackWithAdjust,
        worldGold: FALLBACK_WORLD,
        updatedAt: new Date().toISOString(),
        source: "reference",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
