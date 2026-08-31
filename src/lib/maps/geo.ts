export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function calculateStraightLineDistance(
  from: Coordinates,
  to: Coordinates,
): number {
  const radiusKm = 6_371;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = radians(to.latitude - from.latitude);
  const deltaLongitude = radians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildGoogleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

export function buildWazeUrl(latitude: number, longitude: number) {
  return `https://www.waze.com/ul?ll=${encodeURIComponent(`${latitude},${longitude}`)}&navigate=yes`;
}
