import { supabase, supabaseUrl } from './supabase';
import { Platform, Linking } from 'react-native';

export type PlanType = 'free' | 'pro' | 'teams';
export type BillingCycle = 'monthly' | 'annual';

export const PLAN_LIMITS = {
  free: { items: 100, ai_queries_per_day: 5, label: 'Free' },
  pro: { items: Infinity, ai_queries_per_day: 100, label: 'Pro' },
  teams: { items: Infinity, ai_queries_per_day: 500, label: 'Teams' },
};

export const PLAN_PRICES = {
  pro: { monthly: 9.99, annual: 99.99 },
  teams: { monthly: 29.99, annual: 299.99 },
};

export async function createCheckoutSession(
  plan: PlanType,
  billingCycle: BillingCycle
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { url: null, error: 'Not authenticated' };

    const appUrl = Platform.OS === 'web' ? window.location.origin : 'memark://';

    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        plan,
        billing_cycle: billingCycle,
        success_url: Platform.OS === 'web'
          ? `${appUrl}/subscription-success`
          : `${appUrl}subscription-success`,
        cancel_url: Platform.OS === 'web'
          ? `${appUrl}/`
          : `${appUrl}`,
      }),
    });

    const data = await response.json();

    if (data.setup_required) {
      return { url: null, error: 'payment_not_configured' };
    }

    if (data.error) {
      return { url: null, error: data.error };
    }

    return { url: data.url, error: null };
  } catch (err: any) {
    return { url: null, error: err.message };
  }
}

export async function openCheckout(plan: PlanType, billingCycle: BillingCycle): Promise<{ error: string | null }> {
  const { url, error } = await createCheckoutSession(plan, billingCycle);

  if (error === 'payment_not_configured') {
    return { error: 'payment_not_configured' };
  }

  if (error || !url) {
    return { error: error || 'Failed to create checkout session' };
  }

  await Linking.openURL(url);
  return { error: null };
}

export function isPaidPlan(planType: string): boolean {
  return planType === 'pro' || planType === 'premium' || planType === 'teams';
}

export function isAtItemLimit(planType: string, itemCount: number): boolean {
  const limit = PLAN_LIMITS[planType as PlanType]?.items ?? PLAN_LIMITS.free.items;
  return itemCount >= limit;
}

export function getItemLimitPercent(planType: string, itemCount: number): number {
  const limit = PLAN_LIMITS[planType as PlanType]?.items ?? PLAN_LIMITS.free.items;
  if (limit === Infinity) return 0;
  return Math.min(100, Math.round((itemCount / limit) * 100));
}
