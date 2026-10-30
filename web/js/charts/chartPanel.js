import { h } from "../dom.js";
import { emptyState, errorState, loadingState, setRefreshing } from "../ui/status.js";
import { createChartHolder } from "./chartInstance.js";
import { isChartLibraryLoaded } from "./theme.js";

function buildTable({ caption, columns, rows }) {
  return h(
    "table",
    { class: "w-full text-left text-sm" },
    h("caption", { class: "sr-only" }, caption),
    h(
      "thead",
      {},
      h(
        "tr",
        { class: "border-b border-line" },
        columns.map((column, index) =>
          h(
            "th",
            { scope: "col", class: `py-1.5 pr-3 font-semibold ${index > 0 ? "text-right" : ""}` },
            column,
          ),
        ),
      ),
    ),
    h(
      "tbody",
      {},
      rows.map((row) =>
        h(
          "tr",
          { class: "border-b border-line last:border-0" },
          row.map((cell, index) =>
            h(
              index === 0 ? "th" : "td",
              {
                scope: index === 0 ? "row" : null,
                class: `py-1.5 pr-3 ${index > 0 ? "text-right tabular-nums" : "font-normal"}`,
              },
              cell,
            ),
          ),
        ),
      ),
    ),
  );
}

/**
 * A chart with all its states handled in one place:
 *   loading the first time   a spinner where the chart will go
 *   reloading                the previous chart stays, dimmed
 *   nothing to show          a message instead of an empty chart
 *   failed                   the error, with a "Try again" button
 * Every chart has a "Show as a table" twin with the same numbers, and a
 * text summary for screen readers. If Chart.js did not download, the table
 * is shown open instead, so the numbers are never lost.
 *
 * The caller supplies chartConfig(data), table(data) and summary(data), plus
 * isEmpty(data) and emptyMessage, and optionally caption(data) for a line of
 * text under the chart.
 */
export function createChartPanel(
  container,
  { height = "h-64", chartConfig, table, summary, caption, isEmpty, emptyMessage },
) {
  const canChart = isChartLibraryLoaded();
  const canvas = h("canvas", { role: "img" });
  const chartBox = h("div", { class: `relative ${height}` }, canvas);
  const status = h("div");
  const captionLine = h("p", { class: "mt-2 text-sm text-ink-soft" });
  // Long tables scroll inside this box, so it takes keyboard focus: arrow
  // keys can then scroll it without a mouse.
  const tableBody = h("div", {
    class: "mt-2 max-h-72 overflow-auto",
    tabindex: "0",
    role: "region",
  });
  const details = h(
    "details",
    { class: "mt-3", open: !canChart },
    h(
      "summary",
      { class: "cursor-pointer text-sm font-medium text-accent hover:text-accent-strong" },
      "Show as a table",
    ),
    tableBody,
  );
  const notice = canChart
    ? null
    : h(
        "p",
        { class: "text-sm text-ink-muted" },
        "The chart library did not download, so the data is shown as a table.",
      );
  container.replaceChildren(status, ...(canChart ? [chartBox] : [notice]), captionLine, details);

  const chart = canChart ? createChartHolder(canvas, window.Chart) : null;
  let hasRendered = false;

  function showStatus(content) {
    status.replaceChildren(...(content ? [content] : []));
    chartBox.hidden = Boolean(content);
    captionLine.hidden = Boolean(content) || !caption;
    details.hidden = Boolean(content);
    if (notice) {
      notice.hidden = Boolean(content);
    }
  }

  return {
    showLoading() {
      if (hasRendered) {
        setRefreshing(container, true);
      } else {
        showStatus(loadingState("Loading chart…"));
      }
    },
    showError(error, onRetry) {
      setRefreshing(container, false);
      hasRendered = false;
      showStatus(errorState({ title: "Couldn't load this chart", error, onRetry }));
    },
    render(data) {
      setRefreshing(container, false);
      hasRendered = true;
      if (isEmpty(data)) {
        showStatus(emptyState(emptyMessage));
        return;
      }
      showStatus(null);
      canvas.setAttribute("aria-label", summary(data));
      captionLine.textContent = caption ? caption(data) : "";
      const tableData = table(data);
      tableBody.setAttribute("aria-label", tableData.caption);
      tableBody.replaceChildren(buildTable(tableData));
      if (canChart) {
        chart.draw(chartConfig(data));
      }
    },
  };
}
