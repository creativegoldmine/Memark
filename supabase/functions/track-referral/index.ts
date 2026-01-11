import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ReferralRequest {
  referrer_user_id: string;
  new_user_id?: string;
  action: 'track' | 'complete';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { referrer_user_id, new_user_id, action }: ReferralRequest = await req.json();

    if (!referrer_user_id) {
      throw new Error('Referrer user ID is required');
    }

    if (action === 'track') {
      const referralCode = generateReferralCode();

      const { data: referral, error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_user_id,
          referral_code: referralCode,
          status: 'pending',
          reward_amount: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          referral,
          message: 'Referral tracked',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (action === 'complete') {
      if (!new_user_id) {
        throw new Error('New user ID is required for completion');
      }

      const { data: pendingReferrals } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', referrer_user_id)
        .eq('status', 'pending')
        .is('referred_user_id', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!pendingReferrals || pendingReferrals.length === 0) {
        throw new Error('No pending referral found');
      }

      const referral = pendingReferrals[0];

      const rewardAmount = 30;

      const { data: updatedReferral, error: updateError } = await supabase
        .from('referrals')
        .update({
          referred_user_id: new_user_id,
          status: 'completed',
          reward_amount: rewardAmount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', referral.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      const { data: referrerProfile } = await supabase
        .from('users')
        .select('plan_type')
        .eq('id', referrer_user_id)
        .single();

      if (referrerProfile?.plan_type === 'pro' || referrerProfile?.plan_type === 'premium') {
        const { error: rewardError } = await supabase
          .from('referrals')
          .update({ status: 'rewarded' })
          .eq('id', referral.id);

        if (rewardError) {
          console.error('Failed to mark as rewarded:', rewardError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          referral: updatedReferral,
          reward_amount: rewardAmount,
          message: `Referral completed! ${referrerProfile?.plan_type === 'pro' ? 'Reward credited.' : 'Upgrade to Pro to claim rewards.'}`,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in track-referral:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
