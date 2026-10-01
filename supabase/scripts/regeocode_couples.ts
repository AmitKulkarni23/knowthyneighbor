// One-off fix: couples created before geocodeZip passed the country were geocoded to
// whichever country Nominatim matched first (US 92129 landed in Lithuania). This
// re-geocodes every couple with its country and snaps free-text countries
// ("United STates") onto the COUNTRIES list. Dry run unless --apply is passed.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun supabase/scripts/regeocode_couples.ts [--apply]
//
// Local: SUPABASE_URL=http://127.0.0.1:54321, key from `supabase status`.
import { COUNTRIES } from '../../frontend/src/lib/countries';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
const apply = process.argv.includes('--apply');
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

type Row = { id: string; couple_name: string | null; zip_code: string; city: string | null; state: string | null; country: string | null };

const res = await fetch(`${url}/rest/v1/couples?select=id,couple_name,zip_code,city,state,country`, { headers });
if (!res.ok) throw new Error(`Load failed: ${res.status} ${await res.text()}`);
const rows: Row[] = await res.json();

async function nominatim(params: string) {
  // Nominatim usage policy: identify yourself, max 1 request/second
  await Bun.sleep(1100);
  const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}&format=json&limit=1`, {
    headers: { 'User-Agent': 'nextdoorish-regeocode/1.0' },
  });
  const [hit] = r.ok ? await r.json() : [];
  return hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null;
}

for (const row of rows) {
  const country = COUNTRIES.find((c) => c.toLowerCase() === row.country?.trim().toLowerCase());
  const label = `${row.couple_name ?? row.id} (${row.zip_code}, ${row.country})`;
  if (!country) {
    console.log(`SKIP  ${label}: country not in COUNTRIES, fix by hand`);
    continue;
  }
  const geo =
    (row.zip_code && (await nominatim(`postalcode=${encodeURIComponent(row.zip_code)}&country=${encodeURIComponent(country)}`))) ||
    (await nominatim(`q=${encodeURIComponent([row.city, row.state, country].filter(Boolean).join(', '))}`));
  if (!geo) {
    console.log(`SKIP  ${label}: no geocode result`);
    continue;
  }
  console.log(`${apply ? 'FIX ' : 'WOULD'} ${label} -> ${country} POINT(${geo.lng} ${geo.lat})`);
  if (!apply) continue;
  const patch = await fetch(`${url}/rest/v1/couples?id=eq.${row.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ country, location: `POINT(${geo.lng} ${geo.lat})` }),
  });
  if (!patch.ok) console.log(`  FAILED: ${patch.status} ${await patch.text()}`);
}
