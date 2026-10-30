import { h, icon } from "../dom.js";
import { formatDateTime } from "../format.js";
import { REPORT_FIELDS, focusTargetFor } from "./fieldMessages.js";

// The messages above the report form: what went wrong (red), what was saved
// (green) and anything worth knowing about it (amber). Each takes focus
// when it appears, so keyboard and screen-reader users land on it.

const feedback = document.getElementById("report-feedback");

const TONES = {
  error: "border-error bg-error-soft",
  success: "border-success bg-success-soft",
};

function feedbackBox(tone, ...children) {
  return h(
    "div",
    {
      class: `mb-6 rounded-xl border-2 p-4 ${TONES[tone]}`,
      tabindex: "-1",
      role: tone === "error" ? "alert" : null,
    },
    ...children,
  );
}

export function showFeedback(box) {
  feedback.replaceChildren(box);
  box.focus();
}

export function clearFeedback() {
  feedback.replaceChildren();
}

function summaryLink(field, message) {
  return h(
    "a",
    {
      href: `#${focusTargetFor(field).id}`,
      class: "font-medium text-error underline underline-offset-2",
      onClick: (event) => {
        event.preventDefault();
        focusTargetFor(field).focus();
      },
    },
    message,
  );
}

// The GOV.UK-style error summary: every problem in one list, each linking to
// its field. Messages that belong to no field are listed without a link.
export function errorSummary(errors, otherMessages = []) {
  return feedbackBox(
    "error",
    h("h3", { class: "font-semibold text-error" }, "There is a problem"),
    h(
      "ul",
      { class: "mt-2 list-disc space-y-1 pl-5" },
      REPORT_FIELDS.filter((field) => errors[field]).map((field) =>
        h("li", {}, summaryLink(field, errors[field])),
      ),
      otherMessages.map((message) => h("li", { class: "text-error" }, message)),
    ),
  );
}

// Rate limiting cannot be fixed by trying again straight away, so it gets
// no "Try again" button.
export function sendFailure(error, onRetry) {
  const limited = error.code === "RATE_LIMITED";
  return feedbackBox(
    "error",
    h("h3", { class: "font-semibold text-error" }, "Your report hasn't been sent"),
    h(
      "p",
      { class: "mt-1 text-ink" },
      limited ? error.message : `${error.message} Your answers are still here.`,
    ),
    !limited &&
      h("button", { type: "button", class: "btn-secondary mt-3", onClick: onRetry }, "Try again"),
  );
}

export function sentConfirmation(report, warnings, { onViewCity, onReportAnother }) {
  const withPhoto = report.photoUrl ? ", with a photo," : "";
  return feedbackBox(
    "success",
    h(
      "h3",
      { class: "flex items-center gap-2 text-lg font-semibold text-success" },
      icon("check"),
      "Report sent. Thank you!",
    ),
    h(
      "p",
      { class: "mt-2 text-ink" },
      `Your report of a ${report.species} in ${report.location} on ${formatDateTime(report.date)}${withPhoto} has been saved. It now shows in ${report.location}'s panel as an unverified community report.`,
    ),
    warnings.length > 0 &&
      h(
        "div",
        { class: "mt-4 rounded-lg border border-warning/40 bg-warning-soft p-3" },
        h("p", { class: "font-semibold text-warning" }, "Please note"),
        h(
          "ul",
          { class: "mt-1 list-disc space-y-1 pl-5 text-ink" },
          warnings.map((warning) => h("li", {}, warning.message)),
        ),
      ),
    h(
      "div",
      { class: "mt-4 flex flex-wrap gap-2" },
      h(
        "button",
        { type: "button", class: "btn-primary", onClick: onViewCity },
        `View ${report.location} on the map`,
      ),
      h(
        "button",
        { type: "button", class: "btn-secondary", onClick: onReportAnother },
        "Report another sighting",
      ),
    ),
  );
}
