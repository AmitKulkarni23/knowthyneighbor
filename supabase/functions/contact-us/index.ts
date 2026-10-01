import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const RESEND_API_URL = "https://api.resend.com/emails";
const APP_URL = "https://www.nextdoorish.com";
const FROM_EMAIL = "Nextdoorish <noreply@nextdoorish.com>";
const CONTACT_EMAIL = Deno.env.get("CONTACT_EMAIL") ?? "potterboy232@gmail.com";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  `${APP_URL},https://nextdoorish.com,http://localhost:3000,http://127.0.0.1:3000`)
  .split(",").map((o) => o.trim()).filter(Boolean);

const MAX_NAME_LEN = 100;
const MAX_EMAIL_LEN = 254;
const MAX_MESSAGE_LEN = 2000;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : APP_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  let response: Response;
  try {
    response = await handle(req);
  } catch (err) {
    console.error("contact-us crashed", err instanceof Error ? err.stack : err);
    response = new Response(JSON.stringify({ error: "Failed to send message" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  for (const [key, value] of Object.entries(corsHeaders(req))) {
    response.headers.set(key, value);
  }
  return response;
});

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not set");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  const message = typeof payload?.message === "string" ? payload.message.trim() : "";

  if (!name || name.length > MAX_NAME_LEN) {
    return new Response(JSON.stringify({ error: "Name is required (max 100 characters)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!email || email.length > MAX_EMAIL_LEN || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "A valid email address is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!message || message.length > MAX_MESSAGE_LEN) {
    return new Response(JSON.stringify({ error: "Message is required (max 2000 characters)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit (trigger on contact_messages) before spending Resend quota
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;
  const { error: limitError } = await supabaseAdmin.from("contact_messages").insert({ ip, email });
  if (limitError) {
    const limited = limitError.code === "P0001";
    if (!limited) console.error("contact_messages insert failed", limitError.code, limitError.message);
    return new Response(JSON.stringify({ error: limited ? limitError.message : "Failed to send message" }), {
      status: limited ? 429 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const subject = `[Nextdoorish Contact] Message from ${escapeHtml(name)}`;
  const html = buildEmailHtml(name, email, message);

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: CONTACT_EMAIL,
      reply_to: email,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend API error", res.status, body);
    return new Response(JSON.stringify({ error: "Failed to send message" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function buildEmailHtml(name: string, email: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#C4A366;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0" style="background-color:#FDF8ED;box-shadow:2px 3px 8px rgba(60,40,20,0.18);max-width:100%;">
        <tr><td style="padding:48px 36px 36px;">
          <h1 style="margin:0 0 8px;font-size:24px;color:#2B4570;font-family:Georgia,serif;font-weight:normal;">New Contact Message</h1>
          <p style="margin:16px 0 8px;font-size:14px;color:#3D5A8A;"><strong>From:</strong> ${escapeHtml(name)}</p>
          <p style="margin:0 0 16px;font-size:14px;color:#3D5A8A;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}" style="color:#CC4433;">${escapeHtml(email)}</a></p>
          <div style="margin:16px 0;padding:16px;background:#F5EDD6;border-left:3px solid #CC4433;font-size:15px;color:#2B4570;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>
          <p style="margin:24px 0 0;font-size:12px;color:#3D5A8A;">You can reply directly to this email to respond to ${escapeHtml(name)}.</p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#F0E8D5;text-align:center;">
        &copy; Nextdoorish Contact Form
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
