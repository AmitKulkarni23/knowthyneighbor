// Partner invite links carry a secret in the path (/join/<coupleId>/<inviteCode>).
// Strip it from anything sent to Sentry: event URLs, breadcrumbs, transaction data.
const INVITE_PATH_RE = /(\/join\/[^/?#"\s]+\/)(?!\[)[^/?#"\s\\]+/g;

export function scrubInviteCodes<T>(payload: T): T {
  if (payload == null) return payload;
  const json = JSON.stringify(payload);
  if (!json.includes('/join/')) return payload;
  return JSON.parse(json.replace(INVITE_PATH_RE, '$1[redacted]')) as T;
}
