import { currentPosition, isFarAway, nearestCity } from "../report/location.js";
import { selectedCityStore } from "../state.js";

// "Ticks near me" opens the city closest to the visitor. It reuses the report
// form's location code, so the position stays in the browser here too.

function describeNearest({ city, distance }) {
  const howFar = distance < 1 ? "less than 1 km" : `about ${Math.round(distance)} km`;
  if (isFarAway(distance)) {
    return `You seem to be outside the area this data covers. The nearest city we track is ${city.name}, ${howFar} away.`;
  }
  return `Your nearest city is ${city.name}, ${howFar} away.`;
}

export function initNearMe(button, status, locations) {
  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "Finding your nearest city…";
    try {
      const nearest = nearestCity(await currentPosition(), locations);
      status.textContent = describeNearest(nearest);
      selectedCityStore.set(nearest.city.name);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}
