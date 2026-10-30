// "Use my location": finds the nearest of the tracked cities on the device.
// The position itself is never sent anywhere.

const EARTH_RADIUS_KM = 6371;
const FAR_AWAY_KM = 150;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Distance over the Earth's surface between two points (the haversine formula).
export function distanceKm(from, to) {
  const latitudeChange = toRadians(to.lat - from.lat);
  const longitudeChange = toRadians(to.lng - from.lng);
  const a =
    Math.sin(latitudeChange / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(longitudeChange / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function nearestCity(position, cities) {
  return cities
    .map((city) => ({ city, distance: distanceKm(position, city) }))
    .reduce((closest, candidate) => (candidate.distance < closest.distance ? candidate : closest));
}

export function isFarAway(distance) {
  return distance > FAR_AWAY_KM;
}

const POSITION_ERRORS = {
  1: "Location access was turned off for this site. Please choose a city from the list.",
  2: "Your location isn't available right now. Please choose a city from the list.",
  3: "Finding your location took too long. Please choose a city from the list.",
};

export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error("This browser can't share its location. Please choose a city from the list."),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(new Error(POSITION_ERRORS[error.code] ?? POSITION_ERRORS[2])),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  });
}
