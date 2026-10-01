// Partner invite links carry a secret in the path (/join/<coupleId>/<inviteCode>).
// Strip it from anything sent to Sentry: event URLs, breadcrumbs, transaction data.
// The path also travels URL-encoded (login ?next=, magic-link redirect_to), so match
// `/`, `%2F` and double-encoded `%252F` separators.
const SEP = '(?:/|%2F|%252F)';
const INVITE_PATH_RE = new RegExp(`(join${SEP}[^/?#&%"\\s\\\\]+${SEP})(?!\\[)[^/?#&%"\\s\\\\]+`, 'gi');

export function scrubInviteCodes<T>(payload: T): T {
  if (payload == null) return payload;
  const json = JSON.stringify(payload);
  const scrubbed = json.replace(INVITE_PATH_RE, '$1[redacted]');
  return scrubbed === json ? payload : (JSON.parse(scrubbed) as T);
}
