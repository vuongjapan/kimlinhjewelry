import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const response = await fetch(
      "https://cafef.vn/du-lieu/gia-bac-hom-nay/trong-nuoc.chn",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const prices: Array<{ type: string; buy: string; sell: string }> = [];

    const tableRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const rows = html.match(tableRegex) || [];

    for (const row of rows) {
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let match;
      while ((match = cellRegex.exec(row)) !== null) {
        cells.push(match[1].replace(/<[^>]*>/g, "").trim());
      }

      if (cells.length >= 3) {
        const name = cells[0];
        const buyPrice = cells[1];
        const sellPrice = cells[2];

        if (name && buyPrice && sellPrice && /\d/.test(buyPrice) && /\d/.test(sellPrice)) {
          prices.push({
            type: name,
            buy: buyPrice.replace(/[^\d.,]/g, ""),
            sell: sellPrice.replace(/[^\d.,]/g, ""),
          });
        }
      }
    }

    if (prices.length === 0) {
      const fallback = [
        { type: "Bạc 999", buy: "1.050", sell: "1.150" },
        { type: "Bạc 925 (Sterling)", buy: "980", sell: "1.080" },
        { type: "Bạc thỏi", buy: "1.020", sell: "1.120" },
      ];
      return new Response(
        JSON.stringify({ prices: fallback, updatedAt: new Date().toISOString(), source: "fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ prices, updatedAt: new Date().toISOString(), source: "live" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching silver prices:", error);
    const fallback = [
      { type: "Bạc 999", buy: "1.050", sell: "1.150" },
      { type: "Bạc 925 (Sterling)", buy: "980", sell: "1.080" },
      { type: "Bạc thỏi", buy: "1.020", sell: "1.120" },
    ];
    return new Response(
      JSON.stringify({ prices: fallback, updatedAt: new Date().toISOString(), source: "fallback" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
