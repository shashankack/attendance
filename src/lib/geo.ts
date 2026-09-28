const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function distanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const fromLat = toRadians(fromLatitude);
  const toLat = toRadians(toLatitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}
