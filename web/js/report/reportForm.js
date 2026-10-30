import { api } from "../api.js";
import { speciesNotes } from "../content/species.js";
import { h } from "../dom.js";
import { formatNumber, nowInUk, todayInUk } from "../format.js";
import { selectedCityStore } from "../state.js";
import {
  clearFeedback,
  errorSummary,
  sendFailure,
  sentConfirmation,
  showFeedback,
} from "./feedback.js";
import {
  REPORT_FIELDS,
  clearFieldMessages,
  createMessageSlots,
  showFieldMessages,
} from "./fieldMessages.js";
import { clearLocateStatus, initLocateButton } from "./locateButton.js";
import { createPhotoField } from "./photoField.js";
import { validateReportForm } from "./validation.js";

const TEXT_FIELDS = ["date", "time", "location", "species", "notes"];

const form = document.getElementById("report-form");
const submitButton = document.getElementById("report-submit");
const dateInput = document.getElementById("report-date");
const timeInput = document.getElementById("report-time");
const locationSelect = document.getElementById("report-location");
const speciesOptions = document.getElementById("report-species-options");
const notesInput = document.getElementById("report-notes");
const notesCount = document.getElementById("report-notes-count");

function readValues() {
  return {
    date: dateInput.value,
    time: timeInput.value,
    location: locationSelect.value,
    species: form.querySelector('input[name="species"]:checked')?.value ?? "",
    notes: notesInput.value,
  };
}

function speciesChoice(species, index) {
  const notes = speciesNotes(species.name);
  return h(
    "label",
    { class: "choice-chip !items-start" },
    h("input", {
      type: "radio",
      name: "species",
      value: species.name,
      id: `report-species-${index}`,
      class: "mt-1 accent-accent",
    }),
    h("span", { class: "letter-badge !h-6 !w-6 !text-xs", "aria-hidden": "true" }, notes.letter),
    h(
      "span",
      {},
      h("span", { class: "block font-medium" }, species.name),
      h(
        "span",
        { class: "block text-xs italic text-ink-muted" },
        notes.scientificName ?? species.latinName,
      ),
    ),
  );
}

function buildFormData(values, photo) {
  const body = new FormData();
  body.set("date", values.date);
  body.set("time", values.time);
  body.set("location", values.location);
  body.set("species", values.species);
  body.set("notes", values.notes.trim());
  if (photo) {
    body.set("photo", photo, "photo.jpg");
  }
  return body;
}

// Splits the server's 422 details into field errors and anything else.
function sortServerErrors(details) {
  const errors = {};
  const otherMessages = [];
  for (const detail of details) {
    if (REPORT_FIELDS.includes(detail.field)) {
      errors[detail.field] ??= detail.message;
    } else {
      otherMessages.push(detail.message);
    }
  }
  return { errors, otherMessages };
}

/**
 * The report form. The browser checks each field first (errors block
 * sending, warnings do not), the server checks everything again, and every
 * way sending can fail is explained without losing what was typed.
 */
export function initReportForm(meta, { onSaved }) {
  const rules = meta.reportRules;
  const photo = createPhotoField(rules);
  let showErrorsLive = false;
  let sending = false;

  locationSelect.append(
    ...meta.locations.map((location) => h("option", { value: location.name }, location.name)),
  );
  speciesOptions.replaceChildren(...meta.species.map(speciesChoice));
  dateInput.min = rules.earliestDate;
  dateInput.max = todayInUk();
  createMessageSlots();

  function validate() {
    return validateReportForm(readValues(), { rules, now: nowInUk() });
  }

  function updateNotesCount() {
    const length = notesInput.value.trim().length;
    notesCount.textContent = `${formatNumber(length)} of ${formatNumber(rules.maxNotesLength)} characters`;
  }

  // Warnings show as soon as they apply. Errors only show after a first try
  // at sending, so nobody is told off for a field they have not reached yet.
  function refreshMessages() {
    const { errors, warnings } = validate();
    for (const field of TEXT_FIELDS) {
      showFieldMessages(field, {
        error: showErrorsLive ? errors[field] : null,
        warning: warnings[field],
      });
    }
  }

  function setSending(isSending) {
    sending = isSending;
    submitButton.disabled = isSending;
    submitButton.textContent = isSending ? "Sending…" : "Send report";
    form.setAttribute("aria-busy", String(isSending));
  }

  function startAnotherReport() {
    form.reset();
    form.hidden = false;
    dateInput.focus();
  }

  async function send(values) {
    setSending(true);
    try {
      const response = await api.submitReport(buildFormData(values, photo.blob()));
      form.hidden = true;
      showFeedback(
        sentConfirmation(response.data, response.warnings, {
          onViewCity: () => selectedCityStore.set(response.data.location),
          onReportAnother: startAnotherReport,
        }),
      );
      onSaved(response.data);
    } catch (error) {
      if (error.code === "VALIDATION_FAILED") {
        const { errors, otherMessages } = sortServerErrors(error.details);
        for (const field of REPORT_FIELDS) {
          showFieldMessages(field, { error: errors[field] });
        }
        showFeedback(errorSummary(errors, otherMessages));
      } else {
        showFeedback(sendFailure(error, () => send(values)));
      }
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending) {
      return;
    }
    await photo.whenReady();
    showErrorsLive = true;
    const { errors, warnings } = validate();
    for (const field of TEXT_FIELDS) {
      showFieldMessages(field, { error: errors[field], warning: warnings[field] });
    }
    if (Object.keys(errors).length > 0) {
      showFeedback(errorSummary(errors));
      return;
    }
    clearFeedback();
    await send(readValues());
  }

  function handleReset() {
    photo.clear();
    showErrorsLive = false;
    clearFeedback();
    clearLocateStatus();
    clearFieldMessages();
    // The reset event fires before the fields are cleared.
    setTimeout(updateNotesCount);
  }

  initLocateButton(meta.locations, { onCityChosen: refreshMessages });
  form.addEventListener("submit", handleSubmit);
  form.addEventListener("reset", handleReset);
  form.addEventListener("input", refreshMessages);
  form.addEventListener("change", refreshMessages);
  notesInput.addEventListener("input", updateNotesCount);
  updateNotesCount();
}
