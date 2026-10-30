# Video walkthrough outline

An outline for a walkthrough of about nine minutes, leaving a minute spare under the ten-minute
limit. It lists what to show and the points to make in each part. Put the points into your own
words: it should sound like you explaining your project, not reading a script.

## Before recording

- [ ] Run `npm start` with Elanco's live data, and check the page shows 1,000 sightings.
- [ ] Open <http://localhost:3000> in a clean browser window, with the zoom at 100% and other tabs
      closed.
- [ ] Have a terminal open in the project folder, and the code open in your editor at
      `api/src/analysis/severity.js`.
- [ ] Send one test report beforehand, so a city panel has a community report to show.
- [ ] Have a small photo of a tick (or any small JPEG) ready to upload.
- [ ] Do one practice run with a timer.

## Timings

| Part | Time | Topic                                    |
| ---- | ---- | ---------------------------------------- |
| 1    | 0:00 | Introduction                             |
| 2    | 0:30 | How it fits together                     |
| 3    | 1:30 | The map, filters and city panel          |
| 4    | 3:15 | Charts, species guide and prevention     |
| 5    | 4:15 | Reporting a sighting                     |
| 6    | 5:30 | Data cleaning and the severity rule      |
| 7    | 7:00 | Error handling                           |
| 8    | 8:00 | Tests, accessibility and phones          |
| 9    | 8:40 | What I would change, and close (to 9:15) |

## 1. Introduction (0:00 to 0:30)

**Show:** the top of the page: the welcome, the drawing and the line of key numbers.

- Your name, your course and year, and that this is the full-stack technical task.
- One sentence on what Tick Tracker does: it turns Elanco's tick sightings into a map, charts and
  advice, and lets people report sightings of their own.
- You built every item in the brief, including all twelve front-end features and the extras.

## 2. How it fits together (0:30 to 1:30)

**Show:** the "How it works" diagram in the README, then the folder structure in your editor.

- The Express server fetches Elanco's data once at start-up, cleans it and keeps it in memory.
  Every request after that is answered from memory, so Elanco's rate limit of about 30 rapid calls
  never matters.
- The page only ever talks to this API, never to Elanco. That is the main reason for having a
  backend, along with doing the cleaning and the maths in one tested place.
- The stack: you know Elanco's stack (TypeScript, Next.js, Tailwind and Horizon) and chose plain
  JavaScript, Express, Leaflet, Chart.js and Tailwind so you could deliver something complete and
  fully explainable in the time. Tailwind overlaps with Elanco's.
- The folders: `api/src` has one folder per job (routes, analysis, sightings, reports); `web/js` has
  one folder per part of the page.

## 3. The map, filters and city panel (1:30 to 3:15)

**Show:** the map, then use it.

- **Markers.** Colour is severity, a ring means a sighting in the last 30 days of the data, the
  letter is the most-seen species, and the size is the number of sightings. Point at the legend.
- **Filters.** Pick a quick range such as "2024 only", then one species. Point out the address bar
  changing: the view can be shared as a link.
- **Keyboard.** Press Tab until a marker is focused and press Enter to open it. Mention that every
  marker has a spoken description for screen readers.
- **City panel.** Walk through the severity summary, the timeline of sightings per year, the species
  mix, the latest sightings and the community reports, which are marked unverified.
- **Quick actions.** "Share" opens the device's share menu where there is one, and otherwise copies
  the link. "Directions" opens Google Maps. Leave "Report a sighting here" for part 5.
- Press Escape to close the panel, and point out that focus goes back to the marker.

## 4. Charts, species guide and prevention (3:15 to 4:15)

**Show:** the trends section, the seasonal chart, the species guide and the prevention tips.

- The trend chart follows the filters, and switches between weekly, monthly and yearly.
- **The seasonal chart is the honest part.** Choose a city and a year in the dropdowns. Real ticks
  peak from spring to autumn, but Elanco's sightings are spread evenly through the year. A
  chi-squared test checks whether the months differ more than chance would explain, and the page
  says plainly that they do not, instead of drawing a pattern that is not there.
- Click "Show as a table" once: every chart has one, for screen readers and if Chart.js fails.
- The species guide is built from the five species in the data. Point out the passerine tick's
  note: "Elanco's data calls this _Dermacentor frontalis_. The
  [UK government's tick species list (UKHSA)](https://www.gov.uk/guidance/tick-species-profiles)
  names the passerine tick _Ixodes frontalis_." The guide shows both names.

## 5. Reporting a sighting (4:15 to 5:30)

**Show:** the report form, starting from "Report a sighting here" in a city panel.

- Press "Send report" with the form empty: an error summary appears at the top, focus moves to it,
  and each link jumps to its field. Errors are red.
- Pick a date more than a year ago: an amber warning appears, which does not stop sending.
- Fill in the rest, add the photo and send it: the green success message, with the warning repeated.
- **The photo.** The browser re-saves it before upload, which shrinks it and strips hidden details
  such as the GPS location. The server then checks the file's actual bytes, so a renamed text file
  is refused.
- **Validation happens twice.** The browser checks first, for the person; the server checks
  everything again, because anyone can call an API directly, and answers 422 with a message per
  field.

## 6. Data cleaning and the severity rule (5:30 to 7:00)

This is the part to slow down for.

**Show:** the "About the data" section with the data-quality report, then
`api/test/fixtures/messy-sightings.json`, then `api/src/analysis/severity.js`.

- **Cleaning.** Elanco's data is clean, but the brief asks for duplicates, missing fields and bad
  dates to be handled, so the cleaning assumes nothing. The rule: fix what is unambiguous (letter
  case, a missing Latin name), reject what would need a guess (`01/05/2024`, a misspelt city). Show
  the fixture of 33 broken records, each with a note saying what is wrong with it.
- Every removal and correction is counted and shown on the page, so nothing disappears silently.
- **Severity.** The data has no severity field, so you derived one. In `SEVERITY_RULE`: each
  sighting is weighted by its age, halving every 365 days; the weights are added up per city; a
  city 25% or more above the median city is high, 25% or more below is low.
- **Why this rule.** A raw count treats a sighting from 2012 the same as last month's. Recency only
  lets one stray sighting turn a city red. Recency-weighted uses both how many and how recent.
- **Why the median.** There is no medical baseline for "high", but the data can say which cities are
  busier than the rest. If every city is about the same, they are all medium.
- **The reference date** is the end of the data (December 2024), not today, or every city would
  score close to zero.

## 7. Error handling (7:00 to 8:00)

**Show:** the terminal and the page side by side.

- **The server goes down.** Stop the server with Ctrl+C: the page says it cannot reach the server
  and keeps checking. Start it again: the page recovers by itself, with no reload.
- **Elanco goes down.** Stop the server and start it again pointing at an address that does not
  exist (commands below). The page shows its loading state while the terminal shows each attempt
  being retried with a longer wait. After 10 to 15 seconds the page shows "Showing saved data",
  from the copy saved on the last good run.
- **A bad filter.** Open <http://localhost:3000/api/sightings?location=londn>: a 422 with "Did you
  mean London?". Elanco's own API returns an empty list for a wrongly cased city, which looks
  exactly like "no sightings".
- Mention that every request on the page has a loading, an empty and an error state.

In PowerShell on Windows:

```powershell
$env:ELANCO_API_URL = "https://elanco.invalid/data/tick-sightings"; npm start
```

Afterwards, clear it again (or close that terminal window):

```powershell
Remove-Item Env:ELANCO_API_URL
```

On macOS or Linux:

```bash
ELANCO_API_URL=https://elanco.invalid/data/tick-sightings npm start
```

## 8. Tests, accessibility and phones (8:00 to 8:40)

**Show:** run `npm run check` in the terminal, then the page in the browser's phone view.

- 300 tests, none of which need the network. They run every line of the cleaning, filtering,
  severity and aggregation code, and every endpoint.
- The page was checked with axe-core against WCAG 2.2 AA, works fully by keyboard, and never shows
  severity by colour alone.
- Switch to the phone view (F12, then the device toolbar): the layout adapts, and the city list
  under the map gives full-size targets where markers overlap.

## 9. What I would change, and close (8:40 to 9:15)

**Show:** the README's "What I would do differently with more time" section.

- Two or three things you would change, in your own words. The architecture document's
  ["With more time"](architecture.md#with-more-time) list has ideas: a database and moderation for
  reports, server-side photo processing, continuous integration, moving to TypeScript and Next.js.
- One sentence on how you used AI to build it, matching your README section.
- Thank them for watching.

## If you are running long

Cut in this order:

1. The directions and share buttons in part 3 (just mention them).
2. The phone view in part 8.
3. The "Elanco goes down" demo in part 7: describe it instead, and keep the server-down demo.

Never cut part 6. The cleaning and the severity rule are what you will be asked about most.
