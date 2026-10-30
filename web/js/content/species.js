// Educational notes for the five species in Elanco's data, keyed by the
// species name the API uses. Sources: the UK Health Security Agency's tick
// species profiles, and published research on each species. Sighting numbers
// on the page come from the API, never from here.

const SPECIES_NOTES = {
  "Fox/badger tick": {
    letter: "F",
    scientificName: "Ixodes canisuga",
    alsoKnownAs: "British dog tick",
    hosts:
      "Foxes and badgers, and dogs that go into their setts and earths. Also cats, sheep and horses.",
    habitat:
      "A nest-dwelling tick that lives in burrows, setts, earths and dens, and in dog kennels.",
    range: "Recorded across Britain.",
    risk: "The one pet owners are most likely to meet: dogs pick it up from setts, earths and kennels. It rarely bites people.",
  },
  "Marsh tick": {
    letter: "M",
    scientificName: "Ixodes apronophorus",
    hosts: "Mainly water voles, and other small mammals in wet places.",
    habitat: "Wetlands: marshes, fens, wet meadows and riverbanks.",
    range:
      "Rare. UK records come from a few wetlands such as Kent, the Norfolk Broads and Wicken Fen.",
    risk: "Seldom bites people or pets.",
  },
  "Passerine tick": {
    letter: "P",
    scientificName: "Ixodes frontalis",
    datasetNameNote:
      "Elanco's data calls this Dermacentor frontalis. No tick by that name exists: the passerine tick is Ixodes frontalis.",
    hosts:
      "Only birds, especially songbirds such as robins and blackbirds that feed on the ground.",
    habitat:
      "Leaf litter beneath the bushes and hedges where birds roost, in woods, parks and gardens.",
    range: "Mostly southern England; rare further north.",
    risk: "Very rarely bites people, and is not a pest of cats or dogs.",
  },
  "Southern rodent tick": {
    letter: "S",
    scientificName: "Ixodes acuminatus",
    hosts: "Small mammals: mice, voles, shrews, moles and dormice.",
    habitat: "Lives inside the burrows and nests of its hosts.",
    range: "Mostly southern England, including Devon, Cornwall and the Isles of Scilly.",
    risk: "Rarely met by people or pets because it stays underground.",
  },
  "Tree-hole tick": {
    letter: "T",
    scientificName: "Ixodes arboricola",
    hosts: "Birds that nest in holes, mainly great tits and blue tits, also nuthatches.",
    habitat: "Spends its whole life inside tree holes and nest boxes.",
    range: "Wherever hole-nesting birds breed, including gardens with nest boxes.",
    risk: "Very rarely bites people. Wear gloves when cleaning out old nest boxes.",
  },
};

// A species without notes (if Elanco ever adds one) still gets a letter and
// a card, instead of breaking the page.
export function speciesNotes(name) {
  return SPECIES_NOTES[name] ?? { letter: name.charAt(0).toUpperCase(), scientificName: null };
}

export function speciesLetter(name) {
  return speciesNotes(name).letter;
}
