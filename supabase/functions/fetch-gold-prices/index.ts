import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_PRICES = [
  { type: "Vàng SJC 9999", buy: "95.500", sell: "97.500", category: "Vàng ta" },
  { type: "Vàng nhẫn 9999", buy: "95.000", sell: "96.800", category: "Vàng ta" },
  { type: "Vàng 24K (999.9)", buy: "95.000", sell: "96.500", category: "Vàng ta" },
  { type: "Vàng 18K (750)", buy: "71.200", sell: "73.000", category: "Vàng tây" },
  { type: "Vàng 14K (585)", buy: "55.500", sell: "57.500", category: "Vàng tây" },
  { type: "Vàng 10K (416)", buy: "39.500", sell: "41.500", category: "Vàng tây" },
  { type: "Trang sức vàng 18K", buy: "70.500", sell: "73.500", category: "Trang sức" },
  { type: "Trang sức vàng 14K", buy: "54.800", sell: "57.800", category: "Trang sức" },
];

function categorize(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("trang sức") || lower.includes("nữ trang")) return "Trang sức";
  if (lower.includes("tây") || lower.includes("18k") || lower.includes("14k") || lower.includes("10k")) return "Vàng tây";
  return "Vàng ta";
}

function cleanPrice(raw: string): string {
  // Remove HTML, keep digits, dots, commas
  const cleaned = raw.replace(/<[^>]*>/g, "").trim();
  // If it's already formatted like "95.500" keep it
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) return cleaned;
  // If it's just digits, format with dots
  const digits = cleaned.replace(/[^\d]/g, "");
  if (digits.length >= 4) {
    // Format as xxx.xxx
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  return cleaned;
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

    const prices: Array<{ type: string; buy: string; sell: string; category: string }> = [];

    // Try multiple parsing strategies
    // Strategy 1: Look for table rows with td cells
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

        // Check if this row has a gold-related name and numeric values
        const hasGoldKeyword = /vàng|sjc|9999|24k|18k|14k|10k|750|585|416|trang sức|nữ trang|tây/i.test(name);
        const hasNumbers = /\d/.test(val1) && /\d/.test(val2);

        if (hasGoldKeyword && hasNumbers && name.length > 2) {
          prices.push({
            type: name,
            buy: cleanPrice(val1),
            sell: cleanPrice(val2),
            category: categorize(name),
          });
        }
      }
    }

    // If we got valid prices with reasonable values, return them
    const validPrices = prices.filter(p => {
      const buyNum = parseFloat(p.buy.replace(/\./g, ""));
      return buyNum > 1000; // Gold prices should be at least in thousands
    });

    if (validPrices.length >= 3) {
      return new Response(
        JSON.stringify({ prices: validPrices, updatedAt: new Date().toISOString(), source: "live" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return fallback if scraped data is insufficient
    console.log(`Scraped ${prices.length} raw, ${validPrices.length} valid prices. Using fallback.`);
    return new Response(
      JSON.stringify({ prices: FALLBACK_PRICES, updatedAt: new Date().toISOString(), source: "reference" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ prices: FALLBACK_PRICES, updatedAt: new Date().toISOString(), source: "reference" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
