import { h, icon } from "../dom.js";
import { formatInstant } from "../format.js";

const TONE_STYLES = {
  info: "border-accent/30 bg-accent-soft",
  warning: "border-warning/30 bg-warning-soft",
  error: "border-error/30 bg-error-soft",
};

function describeDataStatus(dataState, serverError) {
  if (serverError) {
    const unreachable = serverError.code === "NETWORK_ERROR" || serverError.code === "TIMEOUT";
    return {
      key: `server-error-${serverError.code}`,
      tone: "error",
      title: unreachable ? "Can't reach the Tick Tracker server" : "The server ran into a problem",
      message: unreachable
        ? "Check your internet connection. If you are running Tick Tracker yourself, check the server is still running. This page tries again every 15 seconds."
        : serverError.message,
      canRetry: true,
    };
  }
  if (dataState.status === "loading") {
    return {
      key: "loading",
      tone: "info",
      title: "Loading tick data from Elanco…",
      message:
        "The server has just started and is fetching the data. This page fills in by itself.",
      showSpinner: true,
    };
  }
  if (dataState.status === "stale") {
    const savedAt = dataState.fetchedAt ? formatInstant(dataState.fetchedAt) : "an earlier visit";
    return {
      key: `stale-${dataState.fetchedAt}`,
      tone: "warning",
      title: "Showing saved data",
      message: `Elanco's service can't be reached right now, so this is the copy saved on ${savedAt}. It switches to live data by itself once the service is back.`,
    };
  }
  if (dataState.status === "unavailable") {
    return {
      key: "unavailable",
      tone: "error",
      title: "Tick sightings are unavailable right now",
      message:
        "Elanco's service can't be reached and there is no saved copy yet. The server keeps retrying, and this page checks again every 30 seconds. You can still report a sighting.",
      canRetry: true,
    };
  }
  return null;
}

/**
 * Shows a banner when the data is loading, stale or unavailable, and hides it
 * when all is well. It only redraws when the message changes, so screen
 * readers do not announce the same banner again on every check.
 */
export function createDataBanner(container, { onRetry }) {
  let shownKey = null;

  return function renderDataBanner({ dataState, serverError }) {
    const content = describeDataStatus(dataState, serverError);
    if ((content?.key ?? null) === shownKey) {
      return;
    }
    shownKey = content?.key ?? null;
    container.hidden = !content;
    if (!content) {
      container.replaceChildren();
      return;
    }
    container.replaceChildren(
      h(
        "div",
        {
          class: `flex items-start gap-3 rounded-xl border px-4 py-3 ${TONE_STYLES[content.tone]}`,
          role: content.tone === "error" ? "alert" : "status",
        },
        content.showSpinner
          ? h("span", { class: "spinner mt-0.5 shrink-0", "aria-hidden": "true" })
          : icon(content.tone === "error" ? "warning" : "info", "mt-0.5 h-5 w-5 shrink-0 text-ink"),
        h(
          "div",
          { class: "flex-1" },
          h("p", { class: "font-semibold text-ink" }, content.title),
          h("p", { class: "mt-0.5 text-sm text-ink-soft" }, content.message),
        ),
        content.canRetry &&
          h(
            "button",
            { type: "button", class: "btn-small shrink-0", onClick: onRetry },
            "Try again",
          ),
      ),
    );
  };
}
