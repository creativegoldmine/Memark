import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractionResult {
  full_text: string;
  word_count: number;
  reading_time_minutes: number;
}

const BLOCKED_TAGS = ["script", "style", "noscript", "iframe", "nav", "footer", "header", "aside", "form", "svg"];
const AVG_WPM = 225;

function stripTags(html: string): string {
  let out = html;
  for (const tag of BLOCKED_TAGS) {
    const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi");
    out = out.replace(re, " ");
  }
  out = out.replace(/<!--[\s\S]*?-->/g, " ");
  return out;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function extractMainContent(html: string): string {
  const cleaned = stripTags(html);

  const articleMatch =
    cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
    cleaned.match(/<div[^>]+(?:class|id)=["'][^"']*(?:article|post|content|entry|story)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  const source = articleMatch ? articleMatch[1] : cleaned;

  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pRegex.exec(source)) !== null) {
    const textOnly = m[1].replace(/<[^>]+>/g, "").trim();
    const decoded = decodeEntities(textOnly).replace(/\s+/g, " ").trim();
    if (decoded.length >= 40) {
      paragraphs.push(decoded);
    }
  }

  if (paragraphs.length < 3) {
    const rawText = decodeEntities(source.replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    return rawText.slice(0, 50000);
  }

  return paragraphs.join("\n\n").slice(0, 50000);
}

function summarizeExtraction(full_text: string): ExtractionResult {
  const word_count = full_text ? full_text.split(/\s+/).filter(Boolean).length : 0;
  const reading_time_minutes = Math.max(1, Math.round(word_count / AVG_WPM));
  return { full_text, word_count, reading_time_minutes };
}

async function fetchAndExtract(url: string): Promise<ExtractionResult | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MemarkReader/1.0; +https://memark.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;

    const html = await res.text();
    const body = extractMainContent(html);
    if (!body || body.length < 200) return null;
    return summarizeExtraction(body);
  } catch (err) {
    console.error("extract error", err);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { item_id, url } = body as { item_id?: string; url?: string };

    if (!item_id && !url) {
      return new Response(JSON.stringify({ error: "item_id or url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    let targetUrl = url;
    let existingItem: { id: string; raw_content: string | null; user_id: string } | null = null;

    if (item_id) {
      const { data: itemRow, error: itemErr } = await admin
        .from("items")
        .select("id, raw_content, user_id")
        .eq("id", item_id)
        .maybeSingle();

      if (itemErr || !itemRow) {
        return new Response(JSON.stringify({ error: "Item not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (itemRow.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      existingItem = itemRow;
      if (!targetUrl && itemRow.raw_content) {
        const m = itemRow.raw_content.match(/https?:\/\/[^\s]+/);
        targetUrl = m ? m[0] : itemRow.raw_content;
      }
    }

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "No URL to extract" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = await fetchAndExtract(targetUrl);

    if (existingItem) {
      if (extracted) {
        await admin
          .from("items")
          .update({
            full_text: extracted.full_text,
            word_count: extracted.word_count,
            reading_time_minutes: extracted.reading_time_minutes,
            extraction_status: "success",
            extracted_at: new Date().toISOString(),
          })
          .eq("id", existingItem.id);
      } else {
        await admin
          .from("items")
          .update({
            extraction_status: "failed",
            extracted_at: new Date().toISOString(),
          })
          .eq("id", existingItem.id);
      }
    }

    if (!extracted) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not extract readable content" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, ...extracted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("extract-article-content fatal", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
