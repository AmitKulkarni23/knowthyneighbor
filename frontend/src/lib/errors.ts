// Turns Supabase/Postgres/network errors into messages safe to show users.
// Raw errors (constraint names, RLS policy text) go to Sentry via the logger, not the UI.

type ErrorLike = { message?: string; code?: string; status?: number } | null | undefined;

const GENERIC = 'Something went wrong. Please try again.';

// Unique constraints users can actually hit
const UNIQUE_MESSAGES: Record<string, string> = {
  uniq_join_requests_pending_pair: 'You already have a pending request with this couple.',
  uniq_couples_partner_1: 'You already have a couple profile.',
  uniq_couples_partner_2: 'You already belong to a couple profile.',
  profiles_pkey: 'You already have a profile on this account.',
  couple_blocks_pkey: 'You have already blocked this couple.',
  uniq_pending_partners_open: 'Your partner has already been invited.',
};

export function toUserMessage(error: ErrorLike): string | null {
  if (!error) return null;
  const message = error.message ?? '';

  if (/failed to fetch|networkerror|network request failed|fetch failed|load failed/i.test(message)) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (error.status === 401 || error.code === 'PGRST301' || /jwt expired/i.test(message)) {
    return 'Your session has expired. Please sign in again.';
  }
  if (error.status === 429 || /rate limit/i.test(message)) {
    return 'Too many attempts. Please wait a minute and try again.';
  }

  switch (error.code) {
    // RAISE EXCEPTION in our triggers/RPCs: these messages are written for users
    case 'P0001':
      return message || GENERIC;
    case '23505': {
      const constraint = Object.keys(UNIQUE_MESSAGES).find((name) => message.includes(name));
      return constraint ? UNIQUE_MESSAGES[constraint] : 'That already exists.';
    }
    case '23514':
    case '22001':
    case '22P02':
      return "Some of the details you entered aren't valid. Please check and try again.";
    case '42501':
      return "You don't have permission to do that.";
  }
  if (/row-level security/i.test(message)) return "You don't have permission to do that.";

  // Storage upload errors
  if (/maximum allowed size|payload too large/i.test(message)) return 'Photo must be under 5 MB.';
  if (/mime type/i.test(message)) return 'Photo must be a JPEG, PNG or WebP image.';

  return GENERIC;
}
