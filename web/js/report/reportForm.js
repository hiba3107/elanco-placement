import { api } from "../api.js";
import { speciesNotes } from "../content/species.js";
import { h, icon } from "../dom.js";
import { formatDateTime, formatNumber, nowInUk, todayInUk } from "../format.js";
import { selectedCityStore } from "../state.js";
import { currentPosition, isFarAway, nearestCity } from "./location.js";
import { PhotoError, preparePhoto } from "./photo.js";
import { validateReportForm } from "./validation.js";

const FIELDS = ["date", "time", "location", "species", "notes", "photo"];

const form = document.getElementById("report-form");
const feedback = document.getElementById("report-feedback");
const submitButton = document.getElementById("report-submit");
const dateInput = document.getElementById("report-date");
const timeInput = document.getElementById("report-time");
const locationSelect = document.getElementById("report-location");
const speciesOptions = document.getElementById("report-species-options");
const notesInput = document.getElementById("report-notes");
const notesCount = document.getElementById("report-notes-count");
const photoInput = document.getElementById("report-photo");
const photoPreview = document.getElementById("report-photo-preview");
const locateButton = document.getElementById("report-locate");
const locateStatus = document.getElementById("report-locate-status");

// Where each field's error and warning messages go, and which element they
// describe for screen readers.
const slots = {};

function controlFor(field) {
  return {
    date: dateInput,
    time: timeInput,
    location: locationSelect,
    species: document.getElementById("field-species"),
    notes: notesInput,
    photo: photoInput,
  }[field];
}

function focusTargetFor(field) {
  return field === "species" ? speciesOptions.querySelector("input") : controlFor(field);
}

// The element the messages sit around: errors go before it, warnings after.
function anchorFor(field) {
  if (field === "location") {
    return locationSelect.parentElement;
  }
  return field === "species" ? speciesOptions : controlFor(field);
}

function createMessageSlots() {
  for (const field of FIELDS) {
    const control = controlFor(field);
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
    slots[field] = { error, warning, baseDescription: control.getAttribute("aria-describedby") };
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

function showFieldMessages(field, { error, warning }) {
  setMessage(slots[field].error, error);
  setMessage(slots[field].warning, warning);
  const control =
    field === "species" ? speciesOptions.querySelectorAll("input") : [controlFor(field)];
  for (const element of control) {
    if (error) {
      element.setAttribute("aria-invalid", "true");
    } else {
      element.removeAttribute("aria-invalid");
    }
  }
  updateDescription(field);
}

function readValues() {
  return {
    date: dateInput.value,
    time: timeInput.value,
    location: locationSelect.value,
    species: form.querySelector('input[name="species"]:checked')?.value ?? "",
    notes: notesInput.value,
  };
}

function feedbackBox(tone, ...children) {
  const tones = {
    error: "border-error bg-error-soft",
    success: "border-success bg-success-soft",
  };
  return h(
    "div",
    { class: `mb-6 rounded-xl border-2 p-4 ${tones[tone]}`, tabindex: "-1" },
    ...children,
  );
}

function showFeedback(box) {
  feedback.replaceChildren(box);
  box.focus();
}

function errorSummary(errors, otherMessages = []) {
  const items = FIELDS.filter((field) => errors[field]).map((field) =>
    h(
      "li",
      {},
      h(
        "a",
        {
          href: `#${focusTargetFor(field).id}`,
          class: "font-medium text-error underline underline-offset-2",
          onClick: (event) => {
            event.preventDefault();
            focusTargetFor(field).focus();
          },
        },
        errors[field],
      ),
    ),
  );
  const box = feedbackBox(
    "error",
    h("h3", { class: "font-semibold text-error" }, "There is a problem"),
    h(
      "ul",
      { class: "mt-2 list-disc space-y-1 pl-5" },
      items,
      otherMessages.map((message) => h("li", { class: "text-error" }, message)),
    ),
  );
  box.setAttribute("role", "alert");
  return box;
}

/**
 * The report form: browser-side checks with distinct error, warning and
 * success messages, an optional photo cleaned up before upload, and every
 * way sending can fail explained without losing what was typed.
 */
export function initReportForm(meta, { onSaved }) {
  const rules = meta.reportRules;
  let photoBlob = null;
  let photoProcessing = null;
  let showErrorsLive = false;
  let sending = false;

  locationSelect.append(
    ...meta.locations.map((location) => h("option", { value: location.name }, location.name)),
  );
  speciesOptions.replaceChildren(
    ...meta.species.map((species, index) => {
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
        h(
          "span",
          { class: "letter-badge !h-6 !w-6 !text-xs", "aria-hidden": "true" },
          notes.letter,
        ),
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
    }),
  );
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
    for (const field of ["date", "time", "location", "species", "notes"]) {
      showFieldMessages(field, {
        error: showErrorsLive ? errors[field] : null,
        warning: warnings[field],
      });
    }
  }

  function clearPhoto() {
    photoBlob = null;
    photoInput.value = "";
    const preview = photoPreview.querySelector("img");
    if (preview) {
      URL.revokeObjectURL(preview.src);
    }
    photoPreview.replaceChildren();
    photoPreview.hidden = true;
  }

  function showPhotoPreview(blob, fileName) {
    const url = URL.createObjectURL(blob);
    photoPreview.replaceChildren(
      h(
        "div",
        { class: "flex items-center gap-3" },
        h("img", {
          src: url,
          alt: "Preview of the photo you chose",
          class: "h-20 w-20 rounded-lg border border-line object-cover",
        }),
        h(
          "div",
          { class: "text-sm" },
          h("p", { class: "font-medium text-ink" }, fileName),
          h(
            "p",
            { class: "text-ink-muted" },
            `Ready to send (${formatNumber(Math.round(blob.size / 1024))} KB)`,
          ),
          h(
            "button",
            { type: "button", class: "text-link mt-1", onClick: clearPhoto },
            "Remove photo",
          ),
        ),
      ),
    );
    photoPreview.hidden = false;
  }

  async function handlePhotoChosen() {
    const file = photoInput.files[0];
    showFieldMessages("photo", {});
    if (!file) {
      clearPhoto();
      return;
    }
    photoPreview.replaceChildren(
      h("p", { class: "text-sm text-ink-soft", role: "status" }, "Preparing your photo…"),
    );
    photoPreview.hidden = false;
    photoProcessing = preparePhoto(file, rules)
      .then((blob) => {
        photoBlob = blob;
        showPhotoPreview(blob, file.name);
      })
      .catch((error) => {
        clearPhoto();
        const message =
          error instanceof PhotoError
            ? error.message
            : "That photo couldn't be prepared for upload. Please try another one.";
        showFieldMessages("photo", {
          error: `${message} You can also send the report without a photo.`,
        });
      })
      .finally(() => {
        photoProcessing = null;
      });
  }

  async function useMyLocation() {
    locateButton.disabled = true;
    locateStatus.className = "mt-2 text-sm text-ink-soft";
    locateStatus.textContent = "Finding your location…";
    try {
      const { city, distance } = nearestCity(await currentPosition(), meta.locations);
      locationSelect.value = city.name;
      refreshMessages();
      const kilometres = formatNumber(Math.round(distance));
      if (isFarAway(distance)) {
        locateStatus.className = "mt-2 text-sm text-warning";
        locateStatus.textContent = `The nearest city we track is ${city.name}, about ${kilometres} km away. Please check this is right.`;
      } else {
        locateStatus.textContent = `Chose ${city.name}, the nearest city we track (about ${kilometres} km away).`;
      }
    } catch (error) {
      locateStatus.className = "mt-2 text-sm text-warning";
      locateStatus.textContent = error.message;
    } finally {
      locateButton.disabled = false;
    }
  }

  function setSending(isSending) {
    sending = isSending;
    submitButton.disabled = isSending;
    submitButton.textContent = isSending ? "Sending…" : "Send report";
    form.setAttribute("aria-busy", String(isSending));
  }

  function showServerFieldErrors(details) {
    const errors = {};
    const otherMessages = [];
    for (const detail of details) {
      if (FIELDS.includes(detail.field)) {
        errors[detail.field] ??= detail.message;
      } else {
        otherMessages.push(detail.message);
      }
    }
    for (const field of FIELDS) {
      showFieldMessages(field, { error: errors[field] });
    }
    showFeedback(errorSummary(errors, otherMessages));
  }

  function showSendFailure(error, retry) {
    const keepsAnswers = error.code === "RATE_LIMITED" ? "" : " Your answers are still here.";
    const box = feedbackBox(
      "error",
      h("h3", { class: "font-semibold text-error" }, "Your report hasn't been sent"),
      h("p", { class: "mt-1 text-ink" }, `${error.message}${keepsAnswers}`),
      error.code !== "RATE_LIMITED" &&
        h("button", { type: "button", class: "btn-secondary mt-3", onClick: retry }, "Try again"),
    );
    box.setAttribute("role", "alert");
    showFeedback(box);
  }

  function startAnotherReport() {
    form.reset();
    form.hidden = false;
    dateInput.focus();
  }

  function showSuccess(report, warnings) {
    form.hidden = true;
    const withPhoto = report.photoUrl ? ", with a photo," : "";
    showFeedback(
      feedbackBox(
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
            {
              type: "button",
              class: "btn-primary",
              onClick: () => selectedCityStore.set(report.location),
            },
            `View ${report.location} on the map`,
          ),
          h(
            "button",
            { type: "button", class: "btn-secondary", onClick: startAnotherReport },
            "Report another sighting",
          ),
        ),
      ),
    );
  }

  async function send(values) {
    setSending(true);
    const body = new FormData();
    body.set("date", values.date);
    body.set("time", values.time);
    body.set("location", values.location);
    body.set("species", values.species);
    body.set("notes", values.notes.trim());
    if (photoBlob) {
      body.set("photo", photoBlob, "photo.jpg");
    }
    try {
      const response = await api.submitReport(body);
      showSuccess(response.data, response.warnings);
      onSaved(response.data);
    } catch (error) {
      if (error.code === "VALIDATION_FAILED") {
        showServerFieldErrors(error.details);
      } else {
        showSendFailure(error, () => send(values));
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
    await photoProcessing;
    showErrorsLive = true;
    const { errors, warnings } = validate();
    for (const field of ["date", "time", "location", "species", "notes"]) {
      showFieldMessages(field, { error: errors[field], warning: warnings[field] });
    }
    if (Object.keys(errors).length > 0) {
      showFeedback(errorSummary(errors));
      return;
    }
    feedback.replaceChildren();
    await send(readValues());
  }

  function handleReset() {
    clearPhoto();
    showErrorsLive = false;
    feedback.replaceChildren();
    locateStatus.textContent = "";
    for (const field of FIELDS) {
      showFieldMessages(field, {});
    }
    // The reset event fires before the fields are cleared.
    setTimeout(updateNotesCount);
  }

  form.addEventListener("submit", handleSubmit);
  form.addEventListener("reset", handleReset);
  form.addEventListener("input", refreshMessages);
  form.addEventListener("change", refreshMessages);
  notesInput.addEventListener("input", updateNotesCount);
  photoInput.addEventListener("change", handlePhotoChosen);
  locateButton.addEventListener("click", useMyLocation);
  updateNotesCount();
}
