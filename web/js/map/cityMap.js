import { addLegend } from "./legend.js";
import {
  describeMarker,
  markerBody,
  markerClasses,
  markerSize,
  tooltipContent,
} from "./markers.js";

const UK_BOUNDS = [
  [49.9, -8.2],
  [58.7, 1.9],
];
// Extra room at the bottom keeps markers clear of the attribution line.
const FIT_PADDING = { paddingTopLeft: [28, 28], paddingBottomRight: [28, 52] };
// OpenStreetMap's own tile server. Its usage policy allows light use like this
// app's, provided the attribution below is shown.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function isMapLibraryLoaded() {
  return typeof window.L !== "undefined";
}

/**
 * The Leaflet map with one marker per city. Markers are keyboard
 * accessible: Tab moves between them and Enter opens a city's details.
 * The view is fitted to the cities themselves rather than the whole UK, so
 * the markers spread out as far as the box allows. onTileError fires once if
 * the background map cannot be downloaded; the markers still work without it.
 */
export function createCityMap(element, { cities, onSelect, onTileError }) {
  const cityBounds = L.latLngBounds(cities.map((city) => [city.lat, city.lng]));
  const map = L.map(element, {
    minZoom: 5,
    maxZoom: 12,
    zoomSnap: 0.5,
    maxBounds: L.latLngBounds(UK_BOUNDS).pad(0.5),
    // Scrolling the page should scroll the page, not zoom the map; on phones,
    // one finger scrolls the page and two fingers move the map.
    scrollWheelZoom: false,
    dragging: !L.Browser.mobile,
  });
  map.fitBounds(cityBounds, FIT_PADDING);

  // The map's box changes size after load (styles arrive a moment later) and
  // between phone and desktop layouts. Leaflet has to be told, and until the
  // visitor moves the map themselves, the whole UK is fitted again.
  let refitOnResize = true;
  for (const type of ["pointerdown", "wheel", "keydown"]) {
    element.addEventListener(type, () => (refitOnResize = false), { once: true, passive: true });
  }
  new ResizeObserver(() => {
    map.invalidateSize();
    if (refitOnResize) {
      map.fitBounds(cityBounds, FIT_PADDING);
    }
  }).observe(element);

  const tiles = L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    maxZoom: 19,
  }).addTo(map);
  tiles.once("tileerror", onTileError);

  addLegend(map);
  const markerLayer = L.layerGroup().addTo(map);
  const markersByCity = new Map();
  let selectedCity = null;

  function addMarker(summary, largestTotal) {
    const size = markerSize(summary.total, largestTotal);
    const marker = L.marker([summary.lat, summary.lng], {
      icon: L.divIcon({
        className: markerClasses(summary, summary.location === selectedCity),
        html: markerBody(summary),
        iconSize: [size, size],
      }),
      keyboard: true,
      riseOnHover: true,
    });
    marker.bindTooltip(tooltipContent(summary), {
      direction: "top",
      offset: [0, -size / 2],
      className: "city-tooltip",
    });
    marker.on("click", () => onSelect(summary.location));
    marker.on("add", () => {
      const icon = marker.getElement();
      icon.setAttribute("role", "button");
      icon.setAttribute("aria-label", describeMarker(summary));
      icon.addEventListener("focus", () => marker.openTooltip());
      icon.addEventListener("blur", () => marker.closeTooltip());
      // Leaflet's own Enter handling only opens popups, so the button keys
      // are wired up here: Enter or Space opens the city, as on any button.
      icon.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(summary.location);
        }
      });
    });
    marker.addTo(markerLayer);
    markersByCity.set(summary.location, { marker, summary });
  }

  function render(locations) {
    markerLayer.clearLayers();
    markersByCity.clear();
    const largestTotal = Math.max(1, ...locations.map((summary) => summary.total));
    locations.forEach((summary) => addMarker(summary, largestTotal));
  }

  function setSelected(city) {
    selectedCity = city;
    for (const [name, { marker }] of markersByCity) {
      marker.getElement()?.classList.toggle("city-marker--selected", name === city);
      marker.setZIndexOffset(name === city ? 1000 : 0);
    }
  }

  function focusCity(city) {
    markersByCity.get(city)?.marker.getElement()?.focus();
  }

  return { render, setSelected, focusCity };
}
