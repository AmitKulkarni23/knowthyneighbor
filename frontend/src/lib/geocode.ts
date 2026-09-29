type GeoResult = { lat: number; lng: number; city: string | null; state: string | null } | null;

export async function geocodeZip(zip: string): Promise<GeoResult> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=US&format=json&addressdetails=1&limit=1`
    );
    if (!resp.ok) return null;
    const results = await resp.json();
    const match = results?.[0];
    if (!match?.lat || !match?.lon) return null;
    const addr = match.address ?? {};
    const city = addr.city ?? addr.town ?? addr.village ?? null;
    const state = addr.state ?? null;
    return { lat: parseFloat(match.lat), lng: parseFloat(match.lon), city, state };
  } catch {
    return null;
  }
}
