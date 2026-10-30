// Shared look for every chart: one blue series, thin bars with rounded tops,
// 2px lines over a faint wash, and hairline gridlines that stay in the
// background. Values and labels use the page's text colours, never the series
// colour, so they stay readable.

export const CHART_COLOURS = Object.freeze({
  series: "#2a78d6",
  seriesWash: "rgba(42, 120, 214, 0.1)",
  reference: "#4d4c48",
  grid: "#e9e8e2",
  axis: "#c3c2b7",
  text: "#4d4c48",
  ink: "#1d1c1a",
});

export function isChartLibraryLoaded() {
  return typeof window.Chart !== "undefined";
}

export function applyChartDefaults() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 12;
  Chart.defaults.color = CHART_COLOURS.text;
  Chart.defaults.borderColor = CHART_COLOURS.grid;
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.animation = reduceMotion ? false : { duration: 250 };
  // Every chart has a single series, named by its title, so a legend box
  // would only repeat the title.
  Chart.defaults.plugins.legend.display = false;
  Object.assign(Chart.defaults.plugins.tooltip, {
    backgroundColor: "#ffffff",
    borderColor: "#e1e0d9",
    borderWidth: 1,
    titleColor: CHART_COLOURS.text,
    titleFont: { weight: "normal" },
    bodyColor: CHART_COLOURS.ink,
    bodyFont: { weight: "bold" },
    padding: 10,
    displayColors: false,
  });
}

export function barDataset(values) {
  return {
    data: values,
    backgroundColor: CHART_COLOURS.series,
    hoverBackgroundColor: "#1c5cab",
    borderRadius: 4,
    maxBarThickness: 24,
  };
}

export function lineDataset(values) {
  return {
    data: values,
    borderColor: CHART_COLOURS.series,
    backgroundColor: CHART_COLOURS.seriesWash,
    borderWidth: 2,
    fill: true,
    tension: 0,
    pointRadius: 0,
    pointHoverRadius: 4,
    pointHitRadius: 12,
  };
}

export function countAxis() {
  return {
    beginAtZero: true,
    ticks: { precision: 0 },
    grid: { color: CHART_COLOURS.grid },
    border: { display: false },
  };
}

// Labels stay horizontal; on narrow charts some are skipped instead of tilted.
export function categoryAxis() {
  return {
    grid: { display: false },
    border: { color: CHART_COLOURS.axis },
    ticks: { maxRotation: 0, autoSkipPadding: 12 },
  };
}
