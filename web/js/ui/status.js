import { h, icon } from "../dom.js";

// Every request in the page has three possible outcomes besides success:
// still loading, nothing to show, or failed. These build the message for each,
// so no area of the page is ever left blank without an explanation.

export function loadingState(message = "Loading…") {
  return h(
    "div",
    {
      class: "flex flex-col items-center justify-center gap-3 py-10 text-center text-ink-soft",
      role: "status",
    },
    h("span", { class: "spinner", "aria-hidden": "true" }),
    h("p", { class: "text-sm" }, message),
  );
}

export function emptyState({ title, message, action }) {
  return h(
    "div",
    { class: "flex flex-col items-center justify-center gap-2 py-10 text-center", role: "status" },
    icon("search", "h-7 w-7 text-ink-muted"),
    h("p", { class: "font-semibold text-ink" }, title),
    message && h("p", { class: "max-w-sm text-sm text-ink-soft" }, message),
    action &&
      h(
        "button",
        { type: "button", class: "btn-secondary mt-2", onClick: action.onClick },
        action.label,
      ),
  );
}

export function describeError(error) {
  if (error?.code === "DATA_LOADING") {
    return "The server is still loading tick data from Elanco. This will update by itself when it is ready.";
  }
  return error?.message || "Please try again.";
}

export function errorState({ title = "Something went wrong", error, onRetry }) {
  return h(
    "div",
    { class: "flex flex-col items-center justify-center gap-2 py-10 text-center", role: "alert" },
    icon("warning", "h-7 w-7 text-error"),
    h("p", { class: "font-semibold text-ink" }, title),
    h("p", { class: "max-w-sm text-sm text-ink-soft" }, describeError(error)),
    onRetry &&
      h("button", { type: "button", class: "btn-secondary mt-2", onClick: onRetry }, "Try again"),
  );
}

// Marks an area as busy while it reloads. Its current content stays visible,
// dimmed, so the page does not flash empty or jump around.
export function setRefreshing(element, refreshing) {
  element.classList.toggle("is-refreshing", refreshing);
  element.setAttribute("aria-busy", String(refreshing));
}

// Runs a request, cancelling the previous one from the same caller first, so
// only the newest answer is ever shown.
export function createLatestRequest() {
  let controller = null;
  return function runLatest(task) {
    controller?.abort();
    controller = new AbortController();
    return task(controller.signal);
  };
}
