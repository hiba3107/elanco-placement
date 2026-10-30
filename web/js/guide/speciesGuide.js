import { api } from "../api.js";
import { UKHSA_SPECIES_PROFILES_URL, speciesNotes } from "../content/species.js";
import { h } from "../dom.js";
import { formatNumber, formatPercent } from "../format.js";

const container = document.getElementById("species-guide");

function fact(label, text) {
  return (
    text &&
    h(
      "div",
      {},
      h("dt", { class: "font-semibold text-ink" }, label),
      h("dd", { class: "text-ink-soft" }, text),
    )
  );
}

function describeNumbers(summary) {
  if (summary.count === 0) {
    return "No sightings of this species in the data.";
  }
  const { names, count } = summary.mostSeenIn;
  const most =
    names.length === 1
      ? `${names[0]} (${formatNumber(count)})`
      : `${names.join(" and ")} (${formatNumber(count)} each)`;
  return `${formatNumber(summary.count)} sightings (${formatPercent(summary.share)}), most in ${most}.`;
}

// Shown when Elanco's Latin name differs from the UK government's species
// profiles, so the guide never quietly overrides what the data says.
function latinNameNote(species, notes) {
  if (!notes.scientificName || notes.scientificName === species.latinName) {
    return null;
  }
  return h(
    "p",
    { class: "mt-2 rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning" },
    "Elanco's data calls this ",
    h("i", {}, species.latinName),
    ". The ",
    h(
      "a",
      { class: "text-link", href: UKHSA_SPECIES_PROFILES_URL, rel: "noopener", target: "_blank" },
      "UK government's tick species list (UKHSA)",
    ),
    ` names the ${species.name.toLowerCase()} `,
    h("i", {}, notes.scientificName),
    ".",
  );
}

// The drawing beside each species is decoration (alt=""): the name next to it
// says the same, and the drawings are too stylised to identify a tick by.
function drawing(notes) {
  if (!notes.drawing) {
    return h(
      "span",
      { class: "letter-badge species-drawing", "aria-hidden": "true" },
      notes.letter,
    );
  }
  return h("img", {
    class: "species-drawing",
    src: notes.drawing,
    alt: "",
    width: 88,
    height: 88,
    loading: "lazy",
  });
}

function moreAbout(species, notes) {
  if (!notes.hosts) {
    return h("p", { class: "mt-2 text-sm text-ink-muted" }, "No guide notes for this species yet.");
  }
  return h(
    "details",
    { class: "learn-more mt-2" },
    h(
      "summary",
      {},
      "Learn more",
      h("span", { class: "sr-only" }, ` about the ${species.name.toLowerCase()}`),
    ),
    h(
      "dl",
      { class: "learn-more__body space-y-2 text-sm" },
      fact("Usually found on", notes.hosts),
      fact("Where it lives", notes.habitat),
      fact("UK range", notes.range),
    ),
  );
}

function speciesItem(species, numbersLine) {
  const notes = speciesNotes(species.name);
  return h(
    "li",
    { class: "species-item" },
    drawing(notes),
    h(
      "div",
      { class: "min-w-0" },
      h(
        "div",
        { class: "flex flex-wrap items-center gap-x-2.5 gap-y-1" },
        h("h3", { class: "card-title" }, species.name),
        h(
          "span",
          { class: "letter-badge !h-6 !w-6 !text-xs", title: "Letter used on the map" },
          h("span", { class: "sr-only" }, "Map letter "),
          notes.letter,
        ),
      ),
      h("p", { class: "italic text-ink-muted" }, notes.scientificName ?? species.latinName),
      notes.alsoKnownAs &&
        h("p", { class: "text-sm text-ink-muted" }, `Also called the ${notes.alsoKnownAs}`),
      latinNameNote(species, notes),
      notes.risk && h("p", { class: "mt-2 text-ink-soft" }, notes.risk),
      numbersLine,
      moreAbout(species, notes),
    ),
  );
}

/**
 * The identification guide, built from the species the API reports. The
 * descriptions show straight away; the sighting numbers fill in once
 * Elanco's data is available, and say so plainly if they cannot be loaded.
 */
export function createSpeciesGuide(meta) {
  const numberLines = new Map(
    meta.species.map((species) => [
      species.name,
      h("p", { class: "mt-2 text-sm font-semibold text-ink" }, "Sighting numbers are loading…"),
    ]),
  );
  container.replaceChildren(
    ...meta.species.map((species) => speciesItem(species, numberLines.get(species.name))),
  );

  function showNumbersMessage(message) {
    for (const line of numberLines.values()) {
      line.replaceChildren(message);
    }
  }

  return {
    showWaiting(error) {
      showNumbersMessage(
        error
          ? "Sighting numbers are unavailable right now."
          : "Sighting numbers appear once the data has loaded.",
      );
    },
    async loadNumbers() {
      try {
        const response = await api.species({});
        for (const summary of response.species) {
          numberLines.get(summary.name)?.replaceChildren(describeNumbers(summary));
        }
      } catch {
        showNumbersMessage("Sighting numbers are unavailable right now.");
      }
    },
  };
}
