const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Guards ids that get interpolated into PostgREST filter strings (e.g. `.or()`)
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
