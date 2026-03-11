import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature',
};

async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const v1 = parts.find(p => p.startsWith('v1='))?.split('=')[1];
    if (!timestamp || !v1) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
    const computed = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computed === v1;
  } catch {
    return false;
  }
}

function getPlanFromPriceId(priceId: string): string {
  const proMonthly = Deno.env.get('STRIPE_PRICE_PRO_MONTHLY');
  const proAnnual = Deno.env.get('STRIPE_PRICE_PRO_ANNUAL');
  const teamsMonthly = Deno.env.get('STRIPE_PRICE_TEAMS_MONTHLY');

  if (priceId === proMonthly || priceId === proAnnual) return 'pro';
  if (priceId === teamsMonthly) return 'teams';
  return 'free';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    if (stripeWebhookSecret && signature) {
      const valid = await verifyStripeSignature(rawBody, signature, stripeWebhookSecret);
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const event = JSON.parse(rawBody);

    const { data: existing } = await supabase
      .from('stripe_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('stripe_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event,
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.subscription_data?.metadata?.supabase_user_id || session.metadata?.supabase_user_id;
        if (!userId) break;

        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
          headers: { 'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}` },
        });
        const sub = await subRes.json();
        const priceId = sub.items?.data?.[0]?.price?.id;
        const planType = getPlanFromPriceId(priceId);
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

        await supabase.from('users').update({
          plan_type: planType,
          stripe_subscription_id: session.subscription,
          stripe_price_id: priceId,
          subscription_status: sub.status,
          subscription_period_end: periodEnd,
        }).eq('id', userId);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', sub.customer)
          .maybeSingle();
        if (!user) break;

        const priceId = sub.items?.data?.[0]?.price?.id;
        const planType = sub.status === 'active' || sub.status === 'trialing'
          ? getPlanFromPriceId(priceId)
          : 'free';
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

        await supabase.from('users').update({
          plan_type: planType,
          stripe_price_id: priceId,
          subscription_status: sub.status,
          subscription_period_end: periodEnd,
        }).eq('id', user.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', sub.customer)
          .maybeSingle();
        if (!user) break;

        await supabase.from('users').update({
          plan_type: 'free',
          stripe_subscription_id: null,
          stripe_price_id: null,
          subscription_status: 'canceled',
          subscription_period_end: null,
        }).eq('id', user.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', invoice.customer)
          .maybeSingle();
        if (!user) break;

        await supabase.from('users').update({
          subscription_status: 'past_due',
        }).eq('id', user.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
