export interface Coordinates {
  latitude: number;
  longitude: number;
}

function validCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function coordinatesFromMatch(match: RegExpMatchArray | null) {
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return validCoordinates(latitude, longitude) ? { latitude, longitude } : null;
}

export function parseCoordinatesInput(value: string): Coordinates | null {
  const normalized = value.trim();
  const direct = coordinatesFromMatch(
    normalized.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/),
  );
  if (direct) return direct;

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const isGoogleMaps =
    host === "maps.google.com" ||
    host === "maps.app.goo.gl" ||
    host.endsWith(".google.com") ||
    host.endsWith(".google.com.br");
  if (!isGoogleMaps) return null;

  const pathCoordinates = coordinatesFromMatch(
    decodeURIComponent(url.pathname).match(
      /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
    ),
  );
  if (pathCoordinates) return pathCoordinates;

  const dataCoordinates = coordinatesFromMatch(
    decodeURIComponent(`${url.pathname}${url.search}`).match(
      /!3d(-?\d{1,2}(?:\.\d+)?).*?!4d(-?\d{1,3}(?:\.\d+)?)/,
    ),
  );
  if (dataCoordinates) return dataCoordinates;

  const query = url.searchParams.get("query") ?? url.searchParams.get("q");
  return query
    ? coordinatesFromMatch(
        query.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/),
      )
    : null;
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
