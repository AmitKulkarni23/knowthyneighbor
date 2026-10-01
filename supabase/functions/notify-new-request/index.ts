import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const RESEND_API_URL = "https://api.resend.com/emails";
const APP_URL = "https://www.nextdoorish.com";
const FROM_EMAIL = "Nextdoorish <noreply@nextdoorish.com>";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Only notify for requests created moments ago, so old rows can't be replayed
const MAX_REQUEST_AGE_MS = 10 * 60 * 1000;
// Browsers call this cross-origin via supabase.functions.invoke, which needs a CORS preflight
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  `${APP_URL},https://nextdoorish.com,http://localhost:3000,http://127.0.0.1:3000`)
  .split(",").map((o) => o.trim()).filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : APP_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// Called by the requester's browser right after inserting a join request.
// The email content comes only from the stored row; each request notifies at most once.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  let response: Response;
  try {
    response = await handle(req);
  } catch (err) {
    // Unexpected failure: log the full stack so it shows up in the function logs
    console.error("notify-new-request crashed", err instanceof Error ? err.stack : err);
    response = new Response("Notification failed", { status: 500 });
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
    return new Response("Server misconfigured", { status: 500 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify caller's JWT and extract user identity
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Missing authorization", { status: 401 });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return new Response("Invalid token", { status: 401 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const joinRequestId = payload?.join_request_id;
  if (typeof joinRequestId !== "string" || !UUID_RE.test(joinRequestId)) {
    return new Response("Invalid request", { status: 400 });
  }

  const { data: joinRequest, error: loadError } = await supabaseAdmin
    .from("join_requests")
    .select("id, requester_couple_id, host_couple_id, message, status, created_at, notified_at")
    .eq("id", joinRequestId)
    .maybeSingle();
  if (loadError) {
    console.error("Failed to load join request", joinRequestId, loadError);
    return new Response("Notification failed", { status: 500 });
  }

  const { data: callerCouple } = joinRequest
    ? await supabaseAdmin
      .from("couples")
      .select("id")
      .eq("id", joinRequest.requester_couple_id)
      .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
      .maybeSingle()
    : { data: null };

  const isFresh = joinRequest &&
    Date.now() - new Date(joinRequest.created_at).getTime() < MAX_REQUEST_AGE_MS;

  // One generic answer for every rejection, so this endpoint isn't an oracle
  if (!joinRequest || !callerCouple || joinRequest.status !== "pending" || joinRequest.notified_at || !isFresh) {
    return new Response("Request not eligible for notification", { status: 403 });
  }

  // Claim the notification atomically so concurrent calls send at most once
  const { data: claimed } = await supabaseAdmin
    .from("join_requests")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", joinRequest.id)
    .is("notified_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) {
    return new Response("Request not eligible for notification", { status: 403 });
  }

  const { message } = joinRequest;

  const [requesterResult, hostResult] = await Promise.all([
    supabaseAdmin
      .from("couples")
      .select("couple_name")
      .eq("id", joinRequest.requester_couple_id)
      .single(),
    supabaseAdmin
      .from("couples")
      .select("partner_1_id, partner_2_id")
      .eq("id", joinRequest.host_couple_id)
      .single(),
  ]);

  if (requesterResult.error || hostResult.error) {
    console.error("Failed to load couples for join request", joinRequest.id, requesterResult.error ?? hostResult.error);
    return new Response("Notification failed", { status: 500 });
  }

  const requesterName = requesterResult.data.couple_name ?? "A couple nearby";
  const { partner_1_id, partner_2_id } = hostResult.data;

  // Collect host partner emails from auth.users
  const partnerIds = [partner_1_id, partner_2_id].filter(Boolean);
  const emailResults = await Promise.all(
    partnerIds.map((id) => supabaseAdmin.auth.admin.getUserById(id)),
  );

  const recipientEmails = emailResults
    .map((r) => (r.error ? null : r.data.user?.email))
    .filter((email): email is string => Boolean(email));

  if (recipientEmails.length === 0) {
    console.error("No valid email addresses found for host couple");
    return new Response("Notification failed", { status: 500 });
  }

  const subject = `${requesterName} wants to connect with you!`;
  const html = buildEmailHtml(requesterName, message);

  // Send emails in parallel
  const sendResults = await Promise.all(
    recipientEmails.map((email) =>
      fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject,
          html,
        }),
      }),
    ),
  );

  const failures = sendResults.filter((r) => !r.ok);
  if (failures.length > 0) {
    const errorBodies = await Promise.all(failures.map((r) => r.text()));
    console.error("Resend API errors for join request", joinRequest.id, failures.map((r) => r.status), errorBodies);
    return new Response("Some emails failed to send", { status: 502 });
  }

  return new Response(JSON.stringify({ sent: recipientEmails.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function buildEmailHtml(
  requesterName: string,
  message: string | null,
): string {
  const messageBlock = message
    ? `<p style="margin:16px 0;padding:12px 16px;background:#FDF8ED;border-left:3px solid #CC4433;font-style:italic;">"${escapeHtml(message)}"</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#C4A366;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="440" cellpadding="0" cellspacing="0" style="background-color:#FDF8ED;box-shadow:2px 3px 8px rgba(60,40,20,0.18);max-width:100%;">
        <tr><td style="padding:48px 36px 36px;text-align:center;">
          <h1 style="margin:0 0 8px;font-size:28px;color:#2B4570;font-family:Georgia,serif;font-weight:normal;">Nextdoorish</h1>
          <p style="margin:0 0 24px;font-size:18px;color:#2B4570;line-height:1.6;">
            <strong>${escapeHtml(requesterName)}</strong> wants to connect with you!
          </p>
          ${messageBlock}
          <a href="${APP_URL}/requests"
             style="display:inline-block;margin:24px 0;padding:14px 36px;background-color:#CC4433;color:#FDF8ED;font-size:16px;font-weight:bold;text-decoration:none;text-transform:uppercase;letter-spacing:0.04em;font-family:Arial,Helvetica,sans-serif;">
            View Request
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#3D5A8A;">
            If you didn&rsquo;t expect this, you can safely ignore it.
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#F0E8D5;text-align:center;">
        &copy; Nextdoorish &mdash; nextdoorish.com
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
