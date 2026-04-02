export function calculateRouteMiles(stops: any[]) {
  if (!Array.isArray(stops) || stops.length < 2) return 0;

  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 3959; // Earth's radius in miles

  let total = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];

    const lat1 = Number(a?.latitude ?? 0);
    const lng1 = Number(a?.longitude ?? 0);
    const lat2 = Number(b?.latitude ?? 0);
    const lng2 = Number(b?.longitude ?? 0);

    if (!lat1 || !lng1 || !lat2 || !lng2) continue;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const haversine =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    total += R * c;
  }

  return total;
}
