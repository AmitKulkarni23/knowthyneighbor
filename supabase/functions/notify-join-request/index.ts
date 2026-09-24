import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_URL = "https://api.resend.com/emails";
const APP_URL = "https://knowthyneighbor.app";
const FROM_EMAIL = "KnowThyNeighbor <notifications@knowthyneighbor.app>";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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

  const { requester_couple_id, host_couple_id, meal_type, message } = record;

  // Fetch requester and host couple info in parallel
  const [requesterResult, hostResult] = await Promise.all([
    supabase
      .from("couples")
      .select("couple_name")
      .eq("id", requester_couple_id)
      .single(),
    supabase
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
    partnerIds.map((id) => supabase.auth.admin.getUserById(id)),
  );

  const recipientEmails = emailResults
    .filter((r) => !r.error && r.data?.user?.email)
    .map((r) => r.data.user.email!);

  if (recipientEmails.length === 0) {
    console.error("No valid email addresses found for host couple");
    return new Response("No recipient emails", { status: 404 });
  }

  const subject = `${requesterName} wants to join you for ${meal_type}!`;
  const html = buildEmailHtml(requesterName, meal_type, message);

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
  mealType: string,
  message: string | null,
): string {
  const messageBlock = message
    ? `<p style="margin:16px 0;padding:12px 16px;background:#f9f7f4;border-left:3px solid #e8a87c;border-radius:4px;font-style:italic;">"${escapeHtml(message)}"</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;background:#ffffff;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;margin:0 0 8px;">You've got a ${escapeHtml(mealType)} invite!</h1>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">
      <strong>${escapeHtml(requesterName)}</strong> would love to share a ${escapeHtml(mealType)} with you.
    </p>
    ${messageBlock}
    <a href="${APP_URL}/requests"
       style="display:inline-block;margin:24px 0;padding:12px 24px;background:#e8a87c;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">
      View Request
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#999;">
      KnowThyNeighbor &mdash; real neighbors, real meals.
    </p>
  </div>
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
