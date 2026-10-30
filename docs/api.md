# API reference

Everything the page shows comes from these endpoints. They are served by the same server as the
page, under `/api`, and answer in JSON.

The examples were captured from a running server. The numbers come from the stand-in data used
during development, so they will differ from Elanco's real data, and long lists are shortened with
a `// …` comment.

## Contents

- [Conventions](#conventions)
- [Filters](#filters)
- [Status and reference data](#status-and-reference-data): [health](#get-apihealth),
  [meta](#get-apimeta), [data quality](#get-apidata-quality)
- [Sightings](#sightings): [search](#get-apisightings), [one sighting](#get-apisightingsid)
- [Insights](#insights): [locations](#get-apiinsightslocations), [regions](#get-apiinsightsregions),
  [species](#get-apiinsightsspecies), [trends](#get-apiinsightstrends),
  [seasonal](#get-apiinsightsseasonal)
- [Reports](#reports): [send](#post-apireports), [list](#get-apireports),
  [one report](#get-apireportsid), [photos](#get-apiuploadsfile)

## Conventions

### Dates and times

- **Sighting times** are UK local times with no timezone, exactly as Elanco writes them:
  `"2024-05-22T20:13:00"`.
- **Days** in options and answers are `YYYY-MM-DD`: `"2024-05-22"`.
- **Server events** (`fetchedAt`, `submittedAt`) are real moments, in UTC with a `Z`:
  `"2026-10-30T01:49:37.838Z"`.

### Errors

Every error has the same shape. `code` is stable for programs to check; `message` is written for
people; `details` lists each problem when there is more than one thing to say.

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Some of the options in this request are not valid.",
    "details": [
      {
        "field": "location",
        "message": "Unknown location \"londn\". Did you mean \"London\"?",
        "suggestion": "London"
      }
    ]
  }
}
```

| Status | `code`                   | When                                                                      |
| ------ | ------------------------ | ------------------------------------------------------------------------- |
| 400    | `BAD_REQUEST`            | The request could not be read at all, such as a broken upload             |
| 404    | `NOT_FOUND`              | No such sighting, report, photo or endpoint                               |
| 415    | `UNSUPPORTED_MEDIA_TYPE` | A report was not sent as `multipart/form-data`                            |
| 422    | `VALIDATION_FAILED`      | An option or a report field is not valid; `details` says which and why    |
| 429    | `RATE_LIMITED`           | Too many reports from one visitor; `Retry-After` says how long to wait    |
| 500    | `INTERNAL_ERROR`         | Something unexpected on the server; the details go to its log, not here   |
| 503    | `DATA_LOADING`           | Elanco's data is still loading; `Retry-After: 5`                          |
| 503    | `DATA_UNAVAILABLE`       | Elanco could not be reached and there is no saved copy; `Retry-After: 60` |

The sightings and insights endpoints need Elanco's data, so they are the ones that can answer 503.
Health, meta and the report endpoints always work.

**Unknown options are errors.** `/api/sightings?spieces=Marsh%20tick` answers 422 instead of quietly
ignoring the typo and returning every sighting:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Some of the options in this request are not valid.",
    "details": [
      {
        "field": "spieces",
        "message": "\"spieces\" is not an option here. Options are: from, to, location, species, severity, page, pageSize, sort."
      }
    ]
  }
}
```

Every problem in a request is reported at once, so `?spieces=Marsh%20tick&from=2024-02-30` gets two
entries in `details`.

## Filters

The sightings and insights endpoints share these options. All are optional.

| Option     | Example      | Meaning                                                    |
| ---------- | ------------ | ---------------------------------------------------------- |
| `from`     | `2024-01-01` | Sightings on or after this day (UK time)                   |
| `to`       | `2024-12-31` | Sightings on or before this day, including all of that day |
| `location` | `London`     | One or more of the 14 cities                               |
| `species`  | `Marsh tick` | One or more of the 5 species                               |
| `severity` | `high`       | Cities rated `high`, `medium` or `low`                     |

- **Several values** can be given by repeating the option (`?severity=high&severity=medium`) or
  with commas (`?severity=high,medium`).
- **Names ignore case and extra spaces**, so `london`, `LONDON` and `" London "` all mean `London`.
  A name that matches nothing is a 422, with a suggestion when one is close. Elanco's own API
  answers a wrongly cased city with an empty list, which looks exactly like "no sightings".
- **`Fox/badger tick`** works as a value. Here the species is a query value rather than part of the
  path, so the slash needs no special handling, though `Fox%2Fbadger%20tick` works too.
- **Invalid dates are errors**, including impossible ones such as `2024-02-30`, and `to` must not be
  before `from`.

**How the filters combine.** The date range and species decide which sightings count. Severity is
then rated across all 14 cities on those sightings. Only after that do `location` and `severity`
choose which cities to include. So asking for one city, or only high cities, never changes how any
city is rated.

Every answer that takes filters echoes them back as they were understood, in canonical form:

```json
{
  "filters": {
    "from": "2024-01-01",
    "to": null,
    "location": ["London"],
    "species": ["Fox/badger tick"],
    "severity": []
  }
}
```

## Status and reference data

### `GET /api/health`

Whether the server is running and what data it is serving. Always answers 200 while the server is
up, even when Elanco is down: `data.status` says what is being served (`loading`, `ready`, `stale`
or `unavailable`) and `data.lastError` says what went wrong last.

```bash
curl http://localhost:3000/api/health
```

```json
{
  "status": "ok",
  "uptimeSeconds": 0,
  "data": {
    "status": "ready",
    "source": "elanco",
    "records": 1000,
    "fetchedAt": "2026-10-30T01:49:37.838Z",
    "lastAttemptAt": "2026-10-30T01:49:37.838Z",
    "dateRange": { "earliest": "2012-01-03", "latest": "2024-12-30" },
    "lastError": null
  }
}
```

`source` is `elanco` for fresh data and `snapshot` when serving the copy saved on disk.

### `GET /api/meta`

Everything the page needs to build its filters and the report form: the data's status and date
range, the cities with their coordinates and regions, the species, the severity rule and the rules
a report must meet. It works in every data state.

```bash
curl http://localhost:3000/api/meta
```

```jsonc
{
  "data": {
    "status": "ready",
    "source": "elanco",
    "records": 1000,
    "fetchedAt": "2026-10-30T01:49:37.838Z",
    "lastAttemptAt": "2026-10-30T01:49:37.838Z",
    "dateRange": { "earliest": "2012-01-03", "latest": "2024-12-30" }
  },
  "locations": [
    {
      "name": "Birmingham",
      "region": "West Midlands",
      "nation": "England",
      "lat": 52.4862,
      "lng": -1.8904
    },
    // … 13 more cities
  ],
  "species": [
    { "name": "Fox/badger tick", "latinName": "Ixodes canisuga" },
    // … 4 more species
  ],
  "severityRule": {
    "halfLifeDays": 365,
    "highAtOrAbove": 1.25,
    "lowAtOrBelow": 0.75,
    "recentDays": 30
  },
  "reportRules": {
    "earliestDate": "2000-01-01",
    "maxNotesLength": 500,
    "maxPhotoBytes": 5242880,
    "maxPhotoDimension": 8000,
    "photoTypes": ["image/jpeg", "image/png"],
    "oldSightingDays": 365,
    "futureToleranceMinutes": 5
  }
}
```

### `GET /api/data-quality`

What the cleaning step did with Elanco's records: how many arrived, were kept, removed and
corrected, counted by reason, including the checks that found nothing, plus up to 20 examples.
Elanco's supplied data is clean, so on the live feed every count should be 0. Here is what it says
when given the test fixture of 33 deliberately broken records:

```jsonc
{
  "source": "elanco",
  "fetchedAt": "2026-10-30T01:49:37.838Z",
  "received": 33,
  "kept": 9,
  "removed": 24,
  "corrected": 5,
  "removedByReason": [
    {
      "code": "notAnObject",
      "description": "Not a record at all (null, text or a list)",
      "count": 3
    },
    {
      "code": "missingField",
      "description": "Missing an id, date, location or species",
      "count": 6
    },
    {
      "code": "invalidDate",
      "description": "Date is not a real date in ISO format (YYYY-MM-DDTHH:mm:ss)",
      "count": 6
    },
    // … futureDate, implausibleDate, unknownLocation, unknownSpecies, duplicateId, duplicateSighting
  ],
  "correctionsByType": [
    {
      "code": "tidiedText",
      "description": "Fixed letter case, spacing or a numeric id",
      "count": 2
    },
    // … filledLatinName, fixedLatinName, convertedTimezone
  ],
  "examples": [
    {
      "index": 4,
      "id": "resubmitted-london",
      "reason": "duplicateSighting",
      "detail": "Repeats the sighting \"ok-london\""
    },
    // … up to 20 examples
  ]
}
```

`index` is the record's position in Elanco's list, counting from 0, so a problem can be traced back
to the exact record.

## Sightings

### `GET /api/sightings`

Searches the cleaned sightings, one page at a time.

| Option     | Default  | Meaning                           |
| ---------- | -------- | --------------------------------- |
| Filters    |          | Any of the [filters](#filters)    |
| `page`     | `1`      | Which page                        |
| `pageSize` | `20`     | Sightings per page, from 1 to 100 |
| `sort`     | `newest` | `newest` or `oldest` first        |

```bash
curl "http://localhost:3000/api/sightings?location=london&species=Fox%2Fbadger%20tick&from=2024-01-01&pageSize=2"
```

```json
{
  "data": [
    {
      "id": "9TU6irPLXXCYXI2pAsy9",
      "date": "2024-05-22T20:13:00",
      "location": "London",
      "species": "Fox/badger tick",
      "latinName": "Ixodes canisuga"
    }
  ],
  "pagination": { "page": 1, "pageSize": 2, "total": 1, "totalPages": 1 },
  "filters": {
    "from": "2024-01-01",
    "to": null,
    "location": ["London"],
    "species": ["Fox/badger tick"],
    "severity": []
  }
}
```

No matches is not an error: `data` is an empty list and `total` is 0.

### `GET /api/sightings/:id`

One sighting by its Elanco id, or 404.

```bash
curl http://localhost:3000/api/sightings/9TU6irPLXXCYXI2pAsy9
```

```json
{
  "data": {
    "id": "9TU6irPLXXCYXI2pAsy9",
    "date": "2024-05-22T20:13:00",
    "location": "London",
    "species": "Fox/badger tick",
    "latinName": "Ixodes canisuga"
  }
}
```

## Insights

Every insights endpoint takes the [filters](#filters).

### `GET /api/insights/locations`

One summary per city, most severe first: what the map and the city panel show. Cities with no
matching sightings are left out.

```bash
curl "http://localhost:3000/api/insights/locations?from=2024-01-01"
```

```jsonc
{
  "referenceDate": "2024-12-30T16:00:00",
  "medianScore": 3.28,
  "rule": {
    "halfLifeDays": 365,
    "highAtOrAbove": 1.25,
    "lowAtOrBelow": 0.75,
    "recentDays": 30
  },
  "totals": { "sightings": 63, "locations": 14 },
  "locations": [
    {
      "location": "Liverpool",
      "region": "North West",
      "nation": "England",
      "lat": 53.4084,
      "lng": -2.9916,
      "total": 8,
      "species": [
        { "name": "Fox/badger tick", "count": 0 },
        { "name": "Marsh tick", "count": 1 },
        // … all five species, including those with none
      ],
      "mostSeenSpecies": { "names": ["Passerine tick"], "count": 5 },
      "latestSighting": "2024-12-30T16:00:00",
      "recentCount": 1,
      "severity": { "band": "high", "score": 6.62, "comparedToMedian": 2.019 }
    },
    // … 13 more cities
  ],
  "filters": { "from": "2024-01-01", "to": null, "location": [], "species": [], "severity": [] }
}
```

| Field                       | Meaning                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `referenceDate`             | "Now" for recency: the end of the chosen period, or the newest sighting if that is earlier  |
| `medianScore`               | The middle city's score, which the bands are measured against                               |
| `mostSeenSpecies.names`     | A list, because two species can tie                                                         |
| `recentCount`               | Sightings in the 30 days up to the reference date                                           |
| `severity.score`            | The sum of each sighting's weight: 1 on the reference date, halving for every year older    |
| `severity.comparedToMedian` | The score divided by the median; 2.019 is about twice the median. `null` if the median is 0 |
| `severity.band`             | `high` at 1.25 × the median or more, `low` at 0.75 × or less, `medium` between; 0 is `low`  |

### `GET /api/insights/regions`

Sightings per UK region (each region holds one or more of the 14 cities), largest first.

```bash
curl http://localhost:3000/api/insights/regions
```

```jsonc
{
  "totals": { "sightings": 1000, "regions": 10 },
  "regions": [
    {
      "region": "East Midlands",
      "nation": "England",
      "total": 156,
      "locations": ["Leicester", "Nottingham"]
    },
    {
      "region": "Scotland",
      "nation": "Scotland",
      "total": 151,
      "locations": ["Edinburgh", "Glasgow"]
    },
    // … 8 more regions
  ],
  "filters": { "from": null, "to": null, "location": [], "species": [], "severity": [] }
}
```

### `GET /api/insights/species`

One entry for each of the five species, including any with no matching sightings.

```bash
curl "http://localhost:3000/api/insights/species?location=Leeds"
```

```jsonc
{
  "totals": { "sightings": 59 },
  "species": [
    {
      "name": "Fox/badger tick",
      "latinName": "Ixodes canisuga",
      "count": 12,
      "share": 0.2034,
      "mostSeenIn": { "names": ["Leeds"], "count": 12 },
      "latestSighting": "2024-12-01T23:05:00"
    },
    // … 4 more species
  ],
  "filters": { "from": null, "to": null, "location": ["Leeds"], "species": [], "severity": [] }
}
```

`share` is the species' fraction of the matching sightings. `latestSighting` and `mostSeenIn` are
`null` and empty for a species with no sightings.

### `GET /api/insights/trends`

Sightings per week, month or year.

| Option     | Default | Meaning                        |
| ---------- | ------- | ------------------------------ |
| Filters    |         | Any of the [filters](#filters) |
| `interval` | `month` | `week`, `month` or `year`      |

```bash
curl "http://localhost:3000/api/insights/trends?interval=week&from=2024-12-01&location=Glasgow"
```

```jsonc
{
  "interval": "week",
  "from": "2024-12-01",
  "to": "2024-12-30",
  "total": 1,
  "points": [
    { "period": "2024-W48", "start": "2024-11-25", "count": 0 },
    { "period": "2024-W49", "start": "2024-12-02", "count": 0 },
    // … 4 more weeks
  ],
  "filters": {
    "from": "2024-12-01",
    "to": null,
    "location": ["Glasgow"],
    "species": [],
    "severity": []
  }
}
```

- **Periods** are ISO weeks (`2024-W49`, starting on a Monday), months (`2024-05`) or years
  (`2024`). `start` is the first day of each period.
- **Empty periods are included** with a count of 0, so a chart shows quiet spells instead of joining
  the dots across them.
- **The range stops where the data stops.** `from` and `to` in the answer are the chosen dates,
  limited to the data's own range, so there are no zeros after the last sighting that would look
  like activity stopping.
- **The first and last periods can be partial.** Above, the range starts on Sunday 1 December, so
  the first point is the week starting Monday 25 November, counting only 1 December.
- **At most 1,000 points.** More than that is a 422 asking for a longer interval or a shorter range.

### `GET /api/insights/seasonal`

Sightings per calendar month, all years together, and an honest verdict on whether there is a
seasonal pattern.

```bash
curl http://localhost:3000/api/insights/seasonal
```

```jsonc
{
  "months": [
    { "month": 1, "name": "January", "count": 89 },
    // … one entry for every month, February to December
  ],
  "total": 1000,
  "averagePerMonth": 83.33,
  "pattern": {
    "kind": "even",
    "total": 1000,
    "peakMonths": [8],
    "quietestMonths": [12],
    "chiSquared": 8.6
  },
  "filters": { "from": null, "to": null, "location": [], "species": [], "severity": [] }
}
```

| `pattern.kind` | Meaning                                                                             |
| -------------- | ----------------------------------------------------------------------------------- |
| `too-few`      | Fewer than 60 sightings, too few to judge; `minimumNeeded` says how many it takes   |
| `even`         | The months differ by no more than chance would explain (chi-squared 19.675 or less) |
| `seasonal`     | Some months are busier than chance alone would explain                              |

`chiSquared` measures how far the monthly counts are from perfectly even: 0 means every month is
the same. With 12 months, an even spread would score above 19.675 only 5% of the time by chance.
`peakMonths` and `quietestMonths` are lists because months can tie. The page's city and year
dropdowns send `location`, `from` and `to`.

## Reports

### `POST /api/reports`

Saves a sighting report. Send it as `multipart/form-data`, the way a form with a file upload does.

| Field      | Required | Rules                                                                           |
| ---------- | -------- | ------------------------------------------------------------------------------- |
| `date`     | Yes      | `YYYY-MM-DD`, a real date, from 1 January 2000                                  |
| `time`     | Yes      | `HH:mm`, 24-hour; together with the date, not in the future (5 minutes' leeway) |
| `location` | Yes      | One of the 14 cities, ignoring case                                             |
| `species`  | Yes      | One of the 5 species, ignoring case                                             |
| `notes`    | No       | Up to 500 characters                                                            |
| `photo`    | No       | One JPEG or PNG, judged by its contents, up to 5 MB and 8,000 pixels a side     |

```bash
curl -X POST http://localhost:3000/api/reports -F date=2026-10-12 -F time=14:30 -F location=london -F "species=Fox/badger tick" -F "notes=On my dog after a walk on Hampstead Heath" -F "photo=@tick.png"
```

**201 Created**, with the new report's address in the `Location` header
(`/api/reports/806305cb-8886-4b92-97ae-c52ebcb269f9`):

```json
{
  "data": {
    "id": "806305cb-8886-4b92-97ae-c52ebcb269f9",
    "date": "2026-10-12T14:30:00",
    "location": "London",
    "species": "Fox/badger tick",
    "latinName": "Ixodes canisuga",
    "notes": "On my dog after a walk on Hampstead Heath",
    "photoUrl": "/api/uploads/806305cb-8886-4b92-97ae-c52ebcb269f9.png",
    "submittedAt": "2026-10-30T01:50:30.635Z",
    "status": "unverified"
  },
  "warnings": []
}
```

**Warnings** do not stop a report being saved. They come back alongside it:

| `code`              | When                                                            |
| ------------------- | --------------------------------------------------------------- |
| `oldSighting`       | The sighting is more than a year old, in case the date is wrong |
| `possibleDuplicate` | The same species was already reported in that city on that day  |

```json
{
  "warnings": [
    {
      "code": "possibleDuplicate",
      "field": null,
      "message": "A Fox/badger tick in London was already reported for 2026-10-12. This report has been saved too, so there is no need to send it again."
    }
  ]
}
```

**Errors** stop it being saved, and nothing is stored, not even the photo. Every field's problem
comes back at once:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Please correct the highlighted fields.",
    "details": [
      { "field": "date", "message": "Enter a real date in the format YYYY-MM-DD." },
      { "field": "time", "message": "Enter a time in 24-hour format, for example 14:30." },
      {
        "field": "location",
        "message": "Choose one of the listed cities. Did you mean \"London\"?"
      },
      { "field": "species", "message": "Choose one of the five listed species." },
      { "field": "photo", "message": "The photo must be a JPEG or PNG image." }
    ]
  }
}
```

That last error came from a file named `fake.png`, sent as `image/png`, that was really a few bytes
of text: the server goes by what is in the file, not its name or claimed type.

Other answers: **415** if the body is not `multipart/form-data` (JSON, for example), **400** if the
form cannot be read, and **429** after 10 reports from one visitor within 15 minutes, with
`Retry-After` in seconds.

### `GET /api/reports`

Community reports, newest sighting first. Takes `from`, `to`, `location` and `species` (not
`severity`, since reports are not rated), plus `page` and `pageSize`.

```bash
curl "http://localhost:3000/api/reports?location=London&pageSize=1"
```

```json
{
  "data": [
    {
      "id": "309be904-6b3d-4e76-84ff-48d54ee039ba",
      "date": "2026-10-12T16:00:00",
      "location": "London",
      "species": "Fox/badger tick",
      "latinName": "Ixodes canisuga",
      "notes": "",
      "photoUrl": null,
      "submittedAt": "2026-10-30T01:50:30.649Z",
      "status": "unverified"
    }
  ],
  "pagination": { "page": 1, "pageSize": 1, "total": 2, "totalPages": 2 },
  "filters": { "from": null, "to": null, "location": ["London"], "species": [] }
}
```

### `GET /api/reports/:id`

One report by its id, or 404. Same shape as an item in the list above, inside `data`.

### `GET /api/uploads/:file`

A report's photo, at the address given in its `photoUrl`. Photo names are random and never reused,
so they are cached for a year (`Cache-Control: public, max-age=31536000, immutable`), and each is
sent with `Content-Security-Policy: default-src 'none'`, so a stored file could never run code. A
missing photo is a 404 in the usual error shape.
