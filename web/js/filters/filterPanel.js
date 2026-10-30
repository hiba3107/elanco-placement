import { speciesLetter } from "../content/species.js";
import { h } from "../dom.js";
import { EMPTY_FILTERS, countActiveFilters, filtersStore, sanitiseFilters } from "../state.js";

const form = document.getElementById("filters");
const controls = document.getElementById("filter-controls");
const toggle = document.getElementById("filters-toggle");
const toggleLabel = document.getElementById("filters-toggle-label");
const fromInput = document.getElementById("filter-from");
const toInput = document.getElementById("filter-to");
const presetGroup = document.getElementById("filter-presets");
const speciesMenu = document.getElementById("filter-species");
const speciesOptions = document.getElementById("filter-species-options");
const speciesLabel = document.getElementById("filter-species-label");
const errorMessage = document.getElementById("filter-error");
const notice = document.getElementById("filter-notice");

let presets = [];
let activeFilterCount = 0;

// Quick ranges are relative to the newest sighting, not to today: Elanco's
// data ends in December 2024, so "the last 12 months" from today would be empty.
function buildPresets({ latest }) {
  const latestYear = Number(latest.slice(0, 4));
  return [
    { label: "All years", from: null, to: null },
    { label: `${latestYear - 2}–${latestYear}`, from: `${latestYear - 2}-01-01`, to: latest },
    { label: `${latestYear} only`, from: `${latestYear}-01-01`, to: latest },
  ];
}

function checkedValues(name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function readForm() {
  return {
    from: fromInput.value || null,
    to: toInput.value || null,
    species: checkedValues("species"),
    severity: checkedValues("severity"),
  };
}

function describeSpecies(species) {
  if (species.length === 0) {
    return "All species";
  }
  return species.length === 1 ? species[0] : `${species.length} species`;
}

function updateSummaries(filters) {
  speciesLabel.textContent = describeSpecies(filters.species);
  activeFilterCount = countActiveFilters(filters);
  updateToggleLabel();
  for (const button of presetGroup.querySelectorAll("button")) {
    const preset = presets[Number(button.dataset.preset)];
    const matches = preset.from === filters.from && preset.to === filters.to;
    button.setAttribute("aria-pressed", String(matches));
  }
}

function showFormValues(filters) {
  fromInput.value = filters.from ?? "";
  toInput.value = filters.to ?? "";
  for (const input of form.querySelectorAll('input[type="checkbox"]')) {
    input.checked = filters[input.name].includes(input.value);
  }
  updateSummaries(filters);
}

function applyForm() {
  const filters = readForm();
  if (filters.from && filters.to && filters.from > filters.to) {
    errorMessage.textContent = "The “To” date must be on or after the “From” date.";
    errorMessage.hidden = false;
    return;
  }
  errorMessage.hidden = true;
  updateSummaries(filters);
  if (JSON.stringify(filters) !== JSON.stringify(filtersStore.get())) {
    filtersStore.set(filters);
  }
}

function speciesOption(species) {
  return h(
    "label",
    { class: "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-page" },
    h("input", { type: "checkbox", name: "species", value: species.name, class: "accent-accent" }),
    h(
      "span",
      { class: "letter-badge !h-6 !w-6 !text-xs", "aria-hidden": "true" },
      speciesLetter(species.name),
    ),
    h("span", {}, species.name),
  );
}

function presetButton(preset, index) {
  return h(
    "button",
    {
      type: "button",
      class: "btn-small aria-pressed:border-accent aria-pressed:bg-accent-soft",
      "data-preset": index,
      "aria-pressed": "false",
      onClick: () => {
        fromInput.value = preset.from ?? "";
        toInput.value = preset.to ?? "";
        applyForm();
      },
    },
    preset.label,
  );
}

function updateToggleLabel() {
  const action = toggle.getAttribute("aria-expanded") === "true" ? "Hide filters" : "Show filters";
  toggleLabel.textContent =
    activeFilterCount > 0 ? `${action} (${activeFilterCount} active)` : action;
}

function setControlsOpen(open) {
  toggle.setAttribute("aria-expanded", String(open));
  controls.classList.toggle("hidden", !open);
  controls.classList.toggle("flex", open);
  updateToggleLabel();
}

function closeSpeciesMenuOnOutsideClick(event) {
  if (speciesMenu.open && !speciesMenu.contains(event.target)) {
    speciesMenu.open = false;
  }
}

/**
 * Builds the filter controls from the reference data and keeps them in sync
 * with the shared filters. Values from the address bar are checked first: an
 * unknown species or an impossible date is dropped with a visible note.
 */
export function initFilterPanel(meta) {
  speciesOptions.replaceChildren(...meta.species.map(speciesOption));
  const range = meta.data.dateRange;
  if (range) {
    fromInput.min = toInput.min = range.earliest;
    fromInput.max = toInput.max = range.latest;
    presets = buildPresets(range);
    presetGroup.replaceChildren(...presets.map(presetButton));
  }

  const { filters, changed } = sanitiseFilters(
    filtersStore.get(),
    meta.species.map((species) => species.name),
  );
  if (changed) {
    notice.textContent =
      "Some filters in the link were not recognised, so they have been left out.";
    notice.hidden = false;
    filtersStore.set(filters);
  }
  showFormValues(filters);

  form.addEventListener("change", applyForm);
  form.addEventListener("reset", (event) => {
    event.preventDefault();
    notice.hidden = true;
    showFormValues(EMPTY_FILTERS);
    applyForm();
  });
  toggle.addEventListener("click", () =>
    setControlsOpen(toggle.getAttribute("aria-expanded") !== "true"),
  );
  document.addEventListener("click", closeSpeciesMenuOnOutsideClick);
  speciesMenu.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && speciesMenu.open) {
      speciesMenu.open = false;
      speciesMenu.querySelector("summary").focus();
    }
  });
  filtersStore.subscribe(showFormValues);
}
