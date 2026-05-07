import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { buy_price, sell_price } = await req.json()

    // Validate
    if (!buy_price || !sell_price) {
      return new Response(JSON.stringify({ error: 'Missing prices' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (buy_price < 5000 || sell_price < 5000 || buy_price > 200000 || sell_price > 200000) {
      return new Response(JSON.stringify({ error: 'Price out of range' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (sell_price < buy_price) {
      return new Response(JSON.stringify({ error: 'Sell must be >= buy' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0] // HH:MM:SS
    const hour = now.getHours()
    const isAfterHours = hour >= 17

    // Check if same price already saved (dedup)
    const { data: latest } = await supabase
      .from('gold_price_history')
      .select('buy_price, sell_price')
      .eq('date', dateStr)
      .order('time', { ascending: false })
      .limit(1)

    if (latest && latest.length > 0) {
      if (Number(latest[0].buy_price) === buy_price && Number(latest[0].sell_price) === sell_price) {
        return new Response(JSON.stringify({ status: 'skipped', reason: 'no_change' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Check if first point of the day
    const { count } = await supabase
      .from('gold_price_history')
      .select('id', { count: 'exact', head: true })
      .eq('date', dateStr)

    const isOpen = (count ?? 0) === 0

    // Mark previous is_close as false
    if (!isOpen) {
      await supabase
        .from('gold_price_history')
        .update({ is_close: false })
        .eq('date', dateStr)
        .eq('is_close', true)
    }

    // Insert new point
    await supabase.from('gold_price_history').insert({
      date: dateStr,
      time: timeStr,
      buy_price,
      sell_price,
      is_open: isOpen,
      is_close: !isAfterHours, // only mark close if during business hours
      is_after_hours: isAfterHours,
    })

    // Upsert daily summary
    const { data: existing } = await supabase
      .from('gold_daily_summary')
      .select('*')
      .eq('date', dateStr)
      .maybeSingle()

    if (!existing) {
      await supabase.from('gold_daily_summary').insert({
        date: dateStr,
        open_buy: buy_price,
        open_sell: sell_price,
        close_buy: buy_price,
        close_sell: sell_price,
        high_buy: buy_price,
        low_buy: buy_price,
        change_buy: 0,
        change_pct: 0,
        point_count: 1,
      })
    } else {
      const changeBuy = buy_price - Number(existing.open_buy)
      const changePct = Number(existing.open_buy) > 0
        ? (changeBuy / Number(existing.open_buy)) * 100 : 0

      await supabase.from('gold_daily_summary').update({
        close_buy: buy_price,
        close_sell: sell_price,
        high_buy: Math.max(Number(existing.high_buy), buy_price),
        low_buy: Math.min(Number(existing.low_buy), buy_price),
        change_buy: changeBuy,
        change_pct: Math.round(changePct * 100) / 100,
        point_count: Number(existing.point_count) + 1,
        updated_at: now.toISOString(),
      }).eq('date', dateStr)
    }

    // Cleanup old data (> 366 days)
    await supabase.rpc('cleanup_old_gold_data')

    return new Response(JSON.stringify({ status: 'saved' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})