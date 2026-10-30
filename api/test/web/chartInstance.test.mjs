import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { createChartHolder } from "../../../web/js/charts/chartInstance.js";

// A stand-in for Chart.js with the behaviour that matters here: one chart per
// canvas, "Canvas is already in use" if a second one is built, and getChart
// finding the chart that owns a canvas until it is destroyed.
class FakeChart {
  static charts = new Map();
  static failNext = false;

  static getChart(canvas) {
    return FakeChart.charts.get(canvas);
  }

  constructor(canvas, config) {
    if (FakeChart.charts.has(canvas)) {
      throw new Error("Canvas is already in use");
    }
    if (FakeChart.failNext) {
      FakeChart.failNext = false;
      throw new Error("Could not build the chart");
    }
    this.canvas = canvas;
    this.config = { type: config.type };
    this.data = config.data;
    this.updates = 0;
    FakeChart.charts.set(canvas, this);
  }

  update() {
    this.updates += 1;
  }

  destroy() {
    FakeChart.charts.delete(this.canvas);
  }
}

const config = (type, label) => ({ type, data: { labels: [label] }, options: {} });

describe("createChartHolder", () => {
  let canvas;
  let holder;

  beforeEach(() => {
    FakeChart.charts.clear();
    FakeChart.failNext = false;
    canvas = {};
    holder = createChartHolder(canvas, FakeChart);
  });

  it("updates the same chart in place when the type stays the same", () => {
    const first = holder.draw(config("line", "Jan"));
    const second = holder.draw(config("line", "Feb"));

    assert.equal(second, first);
    assert.equal(first.updates, 1);
    assert.deepEqual(FakeChart.getChart(canvas).data.labels, ["Feb"]);
  });

  it("destroys the old chart before building one of a new type", () => {
    const line = holder.draw(config("line", "Jan"));
    const bar = holder.draw(config("bar", "2024"));

    assert.notEqual(bar, line);
    assert.equal(FakeChart.getChart(canvas), bar);
  });

  it("never keeps a chart that failed to build, so the next view still appears", () => {
    holder.draw(config("line", "Jan"));
    FakeChart.failNext = true;
    assert.throws(() => holder.draw(config("bar", "2024")), /Could not build/);

    const next = holder.draw(config("line", "Week 1"));

    assert.equal(FakeChart.getChart(canvas), next);
    assert.deepEqual(next.data.labels, ["Week 1"]);
  });

  it("rebuilds instead of updating a chart that was destroyed elsewhere", () => {
    const first = holder.draw(config("line", "Jan"));
    first.destroy();

    const next = holder.draw(config("line", "Feb"));

    assert.notEqual(next, first);
    assert.equal(first.updates, 0);
    assert.equal(FakeChart.getChart(canvas), next);
  });

  it("clears a chart left on the canvas before building its own", () => {
    const leftover = new FakeChart(canvas, config("bar", "old"));

    const chart = holder.draw(config("line", "Jan"));

    assert.notEqual(chart, leftover);
    assert.equal(FakeChart.getChart(canvas), chart);
  });
});
