import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the URL from request or use localhost as default
    const { url } = await req.json().catch(() => ({ url: "http://localhost:3000" }));
    const appUrl = url || "http://localhost:3000";

    // Configure auth using management API
    const configResponse = await fetch(`${supabaseUrl}/auth/v1/admin/config`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
      },
      body: JSON.stringify({
        SITE_URL: appUrl,
        URI_ALLOW_LIST: `${appUrl},${appUrl}/*,http://localhost:3000,http://localhost:3000/*,https://*.bolt.new,https://*.bolt.new/*`,
        MAILER_AUTOCONFIRM: false,
        MAILER_OTP_EXP: 3600,
        SECURITY_REFRESH_TOKEN_REUSE_INTERVAL: 10,
      }),
    });

    if (!configResponse.ok) {
      const error = await configResponse.text();
      throw new Error(`Config update failed: ${error}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Auth URLs configured successfully",
        configuration: {
          siteUrl: appUrl,
          allowedUrls: [
            appUrl,
            "http://localhost:3000",
            "https://*.bolt.new"
          ],
          otpExpiry: "1 hour"
        }
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});