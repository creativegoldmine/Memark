import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BLOCKED_TAGS = ["script", "style", "noscript", "iframe", "nav", "footer", "header", "aside", "form", "svg"];
const AVG_WPM = 225;

function stripTags(html: string): string {
  let out = html;
  for (const tag of BLOCKED_TAGS) {
    const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi");
    out = out.replace(re, " ");
  }
  return out.replace(/<!--[\s\S]*?-->/g, " ");
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function extractBody(html: string): string {
  const cleaned = stripTags(html);
  const m =
    cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const source = m ? m[1] : cleaned;

  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let x: RegExpExecArray | null;
  while ((x = pRegex.exec(source)) !== null) {
    const t = decodeEntities(x[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (t.length >= 40) paragraphs.push(t);
  }
  if (paragraphs.length < 3) {
    const raw = decodeEntities(source.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    return raw.slice(0, 50000);
  }
  return paragraphs.join("\n\n").slice(0, 50000);
}

function extractUrl(text: string | null): string | null {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const internalSecret = Deno.env.get("INTERNAL_WORKER_SECRET") || "";
    const providedSecret = req.headers.get("x-internal-secret") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const isServiceCall =
      authHeader === `Bearer ${serviceKey}` ||
      (internalSecret && providedSecret && providedSecret === internalSecret);

    if (!isServiceCall) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { item_id } = (await req.json().catch(() => ({}))) as { item_id?: string };
    if (!item_id) {
      return new Response(JSON.stringify({ error: "item_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: item } = await admin
      .from("items")
      .select("id, raw_content, og_url, platform_type")
      .eq("id", item_id)
      .maybeSingle();

    if (!item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (item.platform_type && ["youtube", "twitter", "instagram", "tiktok", "vimeo", "facebook"].includes(item.platform_type)) {
      await admin
        .from("items")
        .update({ extraction_status: "skipped", extracted_at: new Date().toISOString() })
        .eq("id", item_id);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUrl = item.og_url || extractUrl(item.raw_content);
    if (!targetUrl) {
      await admin
        .from("items")
        .update({ extraction_status: "skipped", extracted_at: new Date().toISOString() })
        .eq("id", item_id);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MemarkReader/1.0; +https://memark.app)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok || (!ct.includes("text/html") && !ct.includes("application/xhtml"))) {
        await admin
          .from("items")
          .update({ extraction_status: "failed", extracted_at: new Date().toISOString() })
          .eq("id", item_id);
        return new Response(JSON.stringify({ success: false }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const html = await res.text();
      const body = extractBody(html);

      if (!body || body.length < 200) {
        await admin
          .from("items")
          .update({ extraction_status: "failed", extracted_at: new Date().toISOString() })
          .eq("id", item_id);
        return new Response(JSON.stringify({ success: false }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const word_count = body.split(/\s+/).filter(Boolean).length;
      const reading_time_minutes = Math.max(1, Math.round(word_count / AVG_WPM));

      await admin
        .from("items")
        .update({
          full_text: body,
          word_count,
          reading_time_minutes,
          extraction_status: "success",
          extracted_at: new Date().toISOString(),
        })
        .eq("id", item_id);

      return new Response(
        JSON.stringify({ success: true, word_count, reading_time_minutes }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      await admin
        .from("items")
        .update({ extraction_status: "failed", extracted_at: new Date().toISOString() })
        .eq("id", item_id);
      return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
