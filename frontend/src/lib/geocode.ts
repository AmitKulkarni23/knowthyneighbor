type GeoResult = { lat: number; lng: number } | null;

export async function geocodeZip(zip: string): Promise<GeoResult> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=US&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'KnowThyNeighbor/1.0 (neighborhood dining app)',
        },
      }
    );
    if (!resp.ok) return null;
    const results = await resp.json();
    const match = results?.[0];
    if (!match?.lat || !match?.lon) return null;
    return { lat: parseFloat(match.lat), lng: parseFloat(match.lon) };
  } catch {
    return null;
  }
}
