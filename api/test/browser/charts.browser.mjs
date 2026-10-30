import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

// Real Chromium, real Chart.js. Run with: npm run test:browser
// (needs a Chromium for Playwright: npx playwright install chromium)

const require = createRequire(import.meta.url);
const { startTestApp } = require("../support/testApp.js");
const { createPng } = require("../support/images.js");

const NODE_MODULES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../node_modules",
);

// The page loads these from CDNs; the same files from npm keep the test
// offline, and their integrity hashes still match.
const CDN_FILES = {
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css": ["leaflet/dist/leaflet.css", "text/css"],
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js": ["leaflet/dist/leaflet.js", "text/javascript"],
  "https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js": [
    "chart.js/dist/chart.umd.min.js",
    "text/javascript",
  ],
  "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3/dist/index.global.js": [
    "@tailwindcss/browser/dist/index.global.js",
    "text/javascript",
  ],
};

// A Windows laptop at 125% display scaling, as in the bug report.
const BASE_SCALE = 1.25;
const VIEWPORT = { width: 1280, height: 800 };

describe("charts after a browser zoom (real Chromium)", { timeout: 120_000 }, () => {
  let app;
  let browser;
  let page;
  let cdp;
  const pageErrors = [];

  async function zoomTo(zoom) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: Math.round(VIEWPORT.width / zoom),
      height: Math.round(VIEWPORT.height / zoom),
      deviceScaleFactor: BASE_SCALE * zoom,
      mobile: false,
    });
    await page.waitForTimeout(40);
  }

  function liveChart(id) {
    return page.evaluate((selector) => {
      const canvas = document.querySelector(selector);
      const chart = window.Chart.getChart(canvas);
      return {
        type: chart?.config.type,
        labels: chart?.data.labels,
        chartPixelRatio: chart?.currentDevicePixelRatio,
        pagePixelRatio: window.devicePixelRatio,
        pixels: canvas.toDataURL(),
      };
    }, `#${id} canvas`);
  }

  async function waitForRedraw(id, previousPixels) {
    await page.waitForFunction(
      ({ selector, previous }) => document.querySelector(selector).toDataURL() !== previous,
      { selector: `#${id} canvas`, previous: previousPixels },
      { timeout: 5000 },
    );
  }

  before(async () => {
    app = await startTestApp();
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: BASE_SCALE,
      reducedMotion: "no-preference",
    });
    const tile = createPng(256, 256);
    await context.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith(app.baseUrl)) {
        return route.continue();
      }
      if (CDN_FILES[url]) {
        const [file, contentType] = CDN_FILES[url];
        return route.fulfill({ path: path.join(NODE_MODULES, file), contentType });
      }
      if (url.startsWith("https://tile.openstreetmap.org/")) {
        return route.fulfill({ body: tile, contentType: "image/png" });
      }
      return route.abort();
    });
    page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    cdp = await context.newCDPSession(page);
    await page.goto(`${app.baseUrl}/#trends`);
    await page.waitForFunction(() => {
      const canvas = document.querySelector("#area-chart canvas");
      return window.Chart?.getChart(canvas)?.data.labels.length > 0;
    });
  });

  after(async () => {
    await browser?.close();
    await app?.close();
  });

  it("redraws every toggle after a pinch-zoom with the pointer on a chart", async () => {
    // A trackpad pinch leaves the pointer resting on the chart, hovering a bar.
    await page.locator("#trends").scrollIntoViewIfNeeded();
    const box = await page.locator("#area-chart canvas").boundingBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.6);
    await page.waitForTimeout(300);
    for (const zoom of [1.1, 1.25, 1.5, 1.75, 1.5, 1.25, 1.1, 1]) {
      await zoomTo(zoom);
    }
    await page.waitForTimeout(600);

    const toggles = [
      ["UK regions", "area-chart", "bar"],
      ["Year", "trend-chart", "bar"],
      ["Cities", "area-chart", "bar"],
      ["Week", "trend-chart", "line"],
      ["Month", "trend-chart", "line"],
    ];
    for (const [label, id, type] of toggles) {
      const before = await liveChart(id);
      await page.locator("#trends label", { hasText: label }).click();
      await waitForRedraw(id, before.pixels);
      const after = await liveChart(id);
      assert.equal(after.type, type, `${label}: chart type`);
      assert.notDeepEqual(after.labels, before.labels, `${label}: chart data`);
      assert.equal(after.chartPixelRatio, after.pagePixelRatio, `${label}: sized for this zoom`);
    }
    assert.deepEqual(pageErrors, []);
  });

  it("keeps the seasonal chart drawing after the same zoom", async () => {
    const box = await page.locator("#seasonal-chart canvas").boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8);
    for (const zoom of [1.25, 1.5, 1]) {
      await zoomTo(zoom);
    }
    const before = await liveChart("seasonal-chart");
    await page.locator("#seasonal-city").selectOption("Leeds");
    await waitForRedraw("seasonal-chart", before.pixels);
    assert.deepEqual(pageErrors, []);
  });
});
