/**
 * Keeps exactly one Chart.js chart on a canvas. A config of the same chart
 * type updates the chart in place; a different type replaces it. Before a
 * chart is built, any chart Chart.js still holds for the canvas is destroyed,
 * and a chart that failed to build is never kept, so a later update can never
 * go to a chart that is no longer on screen. ChartClass is Chart.js's Chart,
 * passed in so this can be tested without a browser.
 */
export function createChartHolder(canvas, ChartClass) {
  let chart = null;

  function isLive() {
    return chart !== null && ChartClass.getChart(canvas) === chart;
  }

  return {
    draw(config) {
      if (isLive() && chart.config.type === config.type) {
        chart.data = config.data;
        chart.options = config.options;
        chart.update();
        return chart;
      }
      ChartClass.getChart(canvas)?.destroy();
      chart = null;
      chart = new ChartClass(canvas, config);
      return chart;
    },
  };
}
