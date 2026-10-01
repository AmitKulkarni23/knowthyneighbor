import { logger } from '@/lib/logger';

export type GeoResult = { lat: number; lng: number; city: string | null; state: string | null } | null;

function parseGeoResult(match: any): GeoResult {
  if (!match?.lat || !match?.lon) return null;
  const addr = match.address ?? {};
  const city = addr.city ?? addr.town ?? addr.village ?? null;
  const state = addr.state ?? null;
  return { lat: parseFloat(match.lat), lng: parseFloat(match.lon), city, state };
}

// Always pass the country: postal codes repeat across countries (US 92129 is also a
// Lithuanian postcode), and Nominatim returns the first match worldwide without it.
export async function geocodeZip(zip: string, country: string): Promise<GeoResult> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=${encodeURIComponent(country)}&format=json&addressdetails=1&limit=1`
    );
    if (!resp.ok) {
      logger.warn('geocodeZip: Nominatim returned non-OK', { zip, country, status: resp.status });
      return null;
    }
    const results = await resp.json();
    return parseGeoResult(results?.[0]);
  } catch (err) {
    logger.error('geocodeZip: network error', { zip, country, error: err });
    return null;
  }
}

export async function geocodeLocation(input: string): Promise<GeoResult> {
  const trimmed = input.trim();
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&addressdetails=1&limit=1`
    );
    if (!resp.ok) {
      logger.warn('geocodeLocation: Nominatim returned non-OK', { input: trimmed, status: resp.status });
      return null;
    }
    const results = await resp.json();
    return parseGeoResult(results?.[0]);
  } catch (err) {
    logger.error('geocodeLocation: network error', { input: trimmed, error: err });
    return null;
  }
}
