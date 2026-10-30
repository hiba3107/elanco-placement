import { h } from "../dom.js";

// The error and warning messages shown next to each field of the report
// form, wired up for screen readers: every message is linked to its field
// with aria-describedby, and fields with an error get aria-invalid.

export const REPORT_FIELDS = ["date", "time", "location", "species", "notes", "photo"];

const speciesOptions = document.getElementById("report-species-options");
const locationSelect = document.getElementById("report-location");

const slots = {};

function controlFor(field) {
  if (field === "species") {
    return document.getElementById("field-species");
  }
  return document.getElementById(`report-${field}`);
}

// The element that receives focus when a field's error is chosen from the
// error summary. For the species radio buttons, that is the first one.
export function focusTargetFor(field) {
  return field === "species" ? speciesOptions.querySelector("input") : controlFor(field);
}

// Messages sit around this element: errors before it, warnings after.
function anchorFor(field) {
  if (field === "location") {
    return locationSelect.parentElement;
  }
  return field === "species" ? speciesOptions : controlFor(field);
}

export function createMessageSlots() {
  for (const field of REPORT_FIELDS) {
    const error = h("p", {
      id: `report-${field}-error`,
      class: "mt-1.5 text-sm font-semibold text-error",
      hidden: true,
    });
    const warning = h("p", {
      id: `report-${field}-warning`,
      class: "mt-1.5 text-sm text-warning",
      hidden: true,
    });
    anchorFor(field).before(error);
    anchorFor(field).after(warning);
    slots[field] = {
      error,
      warning,
      baseDescription: controlFor(field).getAttribute("aria-describedby"),
    };
  }
}

function setMessage(element, message) {
  element.textContent = message ?? "";
  element.hidden = !message;
}

function updateDescription(field) {
  const { error, warning, baseDescription } = slots[field];
  const ids = [baseDescription, !error.hidden && error.id, !warning.hidden && warning.id];
  controlFor(field).setAttribute("aria-describedby", ids.filter(Boolean).join(" "));
}

export function showFieldMessages(field, { error, warning }) {
  setMessage(slots[field].error, error);
  setMessage(slots[field].warning, warning);
  const inputs =
    field === "species" ? speciesOptions.querySelectorAll("input") : [controlFor(field)];
  for (const input of inputs) {
    if (error) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  }
  updateDescription(field);
}

export function clearFieldMessages() {
  for (const field of REPORT_FIELDS) {
    showFieldMessages(field, {});
  }
}
