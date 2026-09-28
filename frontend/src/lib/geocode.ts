type GeoResult = { lat: number; lng: number } | null;

export async function geocodeZip(zip: string): Promise<GeoResult> {
  try {
    const resp = await fetch(
      `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(zip)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`
    );
    if (!resp.ok) return null;
    const json = await resp.json();
    const match = json?.result?.addressMatches?.[0];
    if (!match?.coordinates) return null;
    return { lat: match.coordinates.y, lng: match.coordinates.x };
  } catch {
    return null;
  }
}
