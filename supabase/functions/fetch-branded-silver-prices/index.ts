import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache: { data: any; timestamp: number } | null = null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check cache first
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify(cache.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service not configured' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Fetching branded silver prices from CafeF...');

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: "https://cafef.vn/du-lieu/gia-bac-hom-nay/trong-nuoc.chn",
        formats: ['extract'],
        extract: {
          prompt: 'Extract the domestic branded silver price table. For each row, extract: the silver brand/type name, buy price (giá mua), and sell price (giá bán). Include all brands like PNJ, SJC, Phú Quý, Bảo Tín Minh Châu, etc.',
          schema: {
            type: 'object',
            properties: {
              silverPrices: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', description: 'Silver brand/type name' },
                    buy: { type: 'string', description: 'Buy price' },
                    sell: { type: 'string', description: 'Sell price' },
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
      const errorText = await response.text();
      console.error('Firecrawl API error:', response.status, errorText);
      throw new Error(`Firecrawl API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Firecrawl response:', JSON.stringify(result).substring(0, 500));

    const prices = result.data?.extract?.silverPrices || result.extract?.silverPrices || [];
    
    if (prices.length === 0) {
      console.warn('No branded silver prices found in response');
      return new Response(
        JSON.stringify({ error: 'No price data available' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseData = {
      prices,
      updatedAt: new Date().toISOString(),
      source: 'live',
    };

    // Update cache
    cache = { data: responseData, timestamp: now };

    console.log(`Successfully fetched ${prices.length} branded silver prices`);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Error fetching branded silver prices:', error);
    
    // Return cached data if available
    if (cache) {
      console.log('Returning cached data due to error');
      return new Response(JSON.stringify({ ...cache.data, source: 'cache' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
