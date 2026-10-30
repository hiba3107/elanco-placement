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
  const where = names.length === 1 ? names[0] : `${names.join(", ")} (joint)`;
  return `${formatNumber(summary.count)} sightings in the data (${formatPercent(summary.share)}). Seen most in ${where}, with ${formatNumber(count)}.`;
}

// Shown when Elanco's Latin name differs from the UK government's species
// profiles, so the guide never quietly overrides what the data says.
function latinNameNote(species, notes) {
  if (!notes.scientificName || notes.scientificName === species.latinName) {
    return null;
  }
  return h(
    "p",
    { class: "mt-3 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning" },
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

function speciesCard(species, numbersLine) {
  const notes = speciesNotes(species.name);
  return h(
    "article",
    { class: "card flex flex-col", "aria-labelledby": `species-${notes.letter}` },
    h(
      "div",
      { class: "flex items-start gap-3" },
      h("span", { class: "letter-badge", "aria-hidden": "true" }, notes.letter),
      h(
        "div",
        {},
        h("h3", { id: `species-${notes.letter}`, class: "card-title" }, species.name),
        h(
          "p",
          { class: "text-sm italic text-ink-soft" },
          notes.scientificName ?? species.latinName,
        ),
        notes.alsoKnownAs &&
          h("p", { class: "text-sm text-ink-muted" }, `Also called the ${notes.alsoKnownAs}`),
      ),
    ),
    latinNameNote(species, notes),
    numbersLine,
    notes.hosts
      ? h(
          "dl",
          { class: "mt-3 space-y-2 text-sm" },
          fact("Usually found on", notes.hosts),
          fact("Where it lives", notes.habitat),
          fact("UK range", notes.range),
          fact("People and pets", notes.risk),
        )
      : h("p", { class: "mt-3 text-sm text-ink-muted" }, "No guide notes for this species yet."),
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
      h("p", { class: "mt-3 text-sm font-medium text-ink" }, "Sighting numbers are loading…"),
    ]),
  );
  container.replaceChildren(
    ...meta.species.map((species) => speciesCard(species, numberLines.get(species.name))),
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
