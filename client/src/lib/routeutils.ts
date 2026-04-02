export function calculateRouteMiles(stops: any[]) {
  if (!stops || stops.length < 2) return 0;

  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3959; // millas

  let total = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];

    if (!a.latitude || !a.longitude || !b.latitude || !b.longitude) continue;

    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);

    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.latitude)) *
        Math.cos(toRad(b.latitude)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

    total += R * c;
  }

  return total;
}
