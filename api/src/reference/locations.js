// Elanco's records name a city but carry no coordinates. The set of cities is
// small and fixed, so the coordinates are hard-coded rather than geocoded at
// runtime: a lookup table cannot fail, costs nothing and is never rate limited.
// Regions are the UK's ITL 1 statistical regions.
const LOCATIONS = Object.freeze([
  { name: "Birmingham", region: "West Midlands", nation: "England", lat: 52.4862, lng: -1.8904 },
  { name: "Bristol", region: "South West", nation: "England", lat: 51.4545, lng: -2.5879 },
  { name: "Cardiff", region: "Wales", nation: "Wales", lat: 51.4816, lng: -3.1791 },
  { name: "Edinburgh", region: "Scotland", nation: "Scotland", lat: 55.9533, lng: -3.1883 },
  { name: "Glasgow", region: "Scotland", nation: "Scotland", lat: 55.8642, lng: -4.2518 },
  {
    name: "Leeds",
    region: "Yorkshire and the Humber",
    nation: "England",
    lat: 53.8008,
    lng: -1.5491,
  },
  { name: "Leicester", region: "East Midlands", nation: "England", lat: 52.6369, lng: -1.1398 },
  { name: "Liverpool", region: "North West", nation: "England", lat: 53.4084, lng: -2.9916 },
  { name: "London", region: "London", nation: "England", lat: 51.5074, lng: -0.1278 },
  { name: "Manchester", region: "North West", nation: "England", lat: 53.4808, lng: -2.2426 },
  { name: "Newcastle", region: "North East", nation: "England", lat: 54.9783, lng: -1.6178 },
  { name: "Nottingham", region: "East Midlands", nation: "England", lat: 52.9548, lng: -1.1581 },
  {
    name: "Sheffield",
    region: "Yorkshire and the Humber",
    nation: "England",
    lat: 53.3811,
    lng: -1.4701,
  },
  { name: "Southampton", region: "South East", nation: "England", lat: 50.9097, lng: -1.4044 },
]);

const LOCATION_NAMES = Object.freeze(LOCATIONS.map((location) => location.name));

module.exports = { LOCATIONS, LOCATION_NAMES };
