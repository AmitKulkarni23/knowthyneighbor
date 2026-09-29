import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_URL = "https://api.resend.com/emails";
const APP_URL = "https://www.nextdoorish.com";
const FROM_EMAIL = "KnowThyNeighbor <noreply@nextdoorish.com>";

Deno.serve(async (req) => {
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
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response("Invalid token", { status: 401 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const record = payload.record;
  if (!record) {
    return new Response("Missing record in payload", { status: 400 });
  }

  const { requester_couple_id, host_couple_id, message } = record;

  // Verify caller belongs to the requester couple
  const { data: callerCouple } = await supabaseAdmin
    .from("couples")
    .select("id")
    .eq("id", requester_couple_id)
    .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
    .single();
  if (!callerCouple) {
    return new Response("Not authorized for this couple", { status: 403 });
  }

  // Fetch requester and host couple info in parallel
  const [requesterResult, hostResult] = await Promise.all([
    supabaseAdmin
      .from("couples")
      .select("couple_name")
      .eq("id", requester_couple_id)
      .single(),
    supabaseAdmin
      .from("couples")
      .select("couple_name, partner_1_id, partner_2_id")
      .eq("id", host_couple_id)
      .single(),
  ]);

  if (requesterResult.error) {
    console.error("Failed to fetch requester couple:", requesterResult.error);
    return new Response("Requester couple not found", { status: 404 });
  }

  if (hostResult.error) {
    console.error("Failed to fetch host couple:", hostResult.error);
    return new Response("Host couple not found", { status: 404 });
  }

  const requesterName = requesterResult.data.couple_name;
  const { partner_1_id, partner_2_id } = hostResult.data;

  // Collect host partner emails from auth.users
  const partnerIds = [partner_1_id, partner_2_id].filter(Boolean);
  const emailResults = await Promise.all(
    partnerIds.map((id) => supabaseAdmin.auth.admin.getUserById(id)),
  );

  const recipientEmails = emailResults
    .filter((r) => !r.error && r.data?.user?.email)
    .map((r) => r.data.user.email!);

  if (recipientEmails.length === 0) {
    console.error("No valid email addresses found for host couple");
    return new Response("No recipient emails", { status: 404 });
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
    console.error("Resend API errors:", errorBodies);
    return new Response("Some emails failed to send", { status: 502 });
  }

  return new Response(JSON.stringify({ sent: recipientEmails.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

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
          <h1 style="margin:0 0 8px;font-size:28px;color:#2B4570;font-family:Georgia,serif;font-weight:normal;">KnowThyNeighbor</h1>
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
        &copy; KnowThyNeighbor &mdash; nextdoorish.com
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
    .replace(/"/g, "&quot;");
}
