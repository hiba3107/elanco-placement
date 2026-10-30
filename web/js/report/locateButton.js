import { formatNumber } from "../format.js";
import { currentPosition, isFarAway, nearestCity } from "./location.js";

const button = document.getElementById("report-locate");
const status = document.getElementById("report-locate-status");
const citySelect = document.getElementById("report-location");

function showStatus(message, tone = "info") {
  status.className = `mt-2 text-sm ${tone === "warning" ? "text-warning" : "text-ink-soft"}`;
  status.textContent = message;
}

export function clearLocateStatus() {
  status.textContent = "";
}

// "Use my location" chooses the nearest tracked city. A city a long way off
// is still chosen, with a warning to check it.
export function initLocateButton(cities, { onCityChosen }) {
  button.addEventListener("click", async () => {
    button.disabled = true;
    showStatus("Finding your location…");
    try {
      const { city, distance } = nearestCity(await currentPosition(), cities);
      citySelect.value = city.name;
      onCityChosen();
      const kilometres = formatNumber(Math.round(distance));
      if (isFarAway(distance)) {
        showStatus(
          `The nearest city we track is ${city.name}, about ${kilometres} km away. Please check this is right.`,
          "warning",
        );
      } else {
        showStatus(`Chose ${city.name}, the nearest city we track (about ${kilometres} km away).`);
      }
    } catch (error) {
      showStatus(error.message, "warning");
    } finally {
      button.disabled = false;
    }
  });
}
