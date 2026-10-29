// The five species in Elanco's dataset, with the Latin names exactly as the
// data gives them. The common name is the key: the Latin name is derived from it.
const SPECIES = Object.freeze([
  { name: "Fox/badger tick", latinName: "Ixodes canisuga" },
  { name: "Marsh tick", latinName: "Ixodes apronophorus" },
  { name: "Passerine tick", latinName: "Dermacentor frontalis" },
  { name: "Southern rodent tick", latinName: "Ixodes acuminatus" },
  { name: "Tree-hole tick", latinName: "Ixodes arboricola" },
]);

const SPECIES_NAMES = Object.freeze(SPECIES.map((species) => species.name));

module.exports = { SPECIES, SPECIES_NAMES };
