import { formatNumber } from "../format.js";

// Shared look for every chart: one blue series, thin bars with rounded tops,
// 2px lines over a faint wash, and hairline gridlines that stay in the
// background. Values and labels use the page's text colours, never the series
// colour, so they stay readable.

const CHART_COLOURS = Object.freeze({
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

// Writes each bar's value just past its end, so horizontal bar charts can be
// read without hovering. Turned on per chart with plugins.barValueLabels.
const barValueLabels = {
  id: "barValueLabels",
  defaults: { display: false },
  afterDatasetsDraw(chart, args, options) {
    if (!options.display) {
      return;
    }
    const { ctx } = chart;
    const values = chart.data.datasets[0].data;
    ctx.save();
    ctx.fillStyle = CHART_COLOURS.ink;
    ctx.font = `600 12px ${Chart.defaults.font.family}`;
    ctx.textBaseline = "middle";
    chart.getDatasetMeta(0).data.forEach((bar, index) => {
      ctx.fillText(formatNumber(values[index]), bar.x + 6, bar.y);
    });
    ctx.restore();
  },
};

// Draws a labelled horizontal line, such as the average month on the
// seasonal chart. Turned on per chart with plugins.referenceLine.
const referenceLine = {
  id: "referenceLine",
  defaults: { value: null, label: "" },
  afterDatasetsDraw(chart, args, options) {
    if (options.value === null) {
      return;
    }
    const { ctx, chartArea, scales } = chart;
    const y = scales.y.getPixelForValue(options.value);
    ctx.save();
    ctx.strokeStyle = CHART_COLOURS.reference;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();
    // The label gets a white backing so it stays readable where it crosses a bar.
    ctx.font = `600 12px ${Chart.defaults.font.family}`;
    const width = ctx.measureText(options.label).width;
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.fillRect(chartArea.right - width - 6, y - 20, width + 6, 16);
    ctx.fillStyle = CHART_COLOURS.reference;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(options.label, chartArea.right - 3, y - 6);
    ctx.restore();
  },
};

export function registerChartPlugins() {
  Chart.register(barValueLabels, referenceLine);
}
