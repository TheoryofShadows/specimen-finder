# Specimen Finder

**Identify any plant from a photo. Then find every record of it sitting in the world's herbaria.**

Specimen Finder is a single-page web tool that ties together open botanical data — Pl@ntNet for photo identification, GBIF for specimen records aggregated from 1,800+ herbaria, plus Wikipedia, Wikidata, POWO, and iNaturalist for context — and then flags which of those specimens look unusual: wrong location, wrong era, missing coordinates, or possible label errors.

It is built for botanists, herbarium curators, conservation biologists, students, naturalists, and curious people. No accounts. No tracking. No mock data. No server. Open it in a browser and use it.

---

## What problem is this solving?

Plants are the foundation of ecology, medicine, conservation, and food. Their primary record is the **herbarium specimen** — a pressed, dried, labeled plant kept in a museum or university collection, sometimes for centuries. Globally there are several hundred million of these specimens, and via GBIF (the Global Biodiversity Information Facility) you can query records aggregated from over 1,800 institutions.

The problem: **the records aren't perfect**. They contain errors of transcription, errors of identification, and errors of georeferencing. Important records get filed under outdated names. Coordinates land in the wrong country. Dates predate the collector's birth. A scrap of a once-common species sits in a drawer with no one to flag it as the last specimen ever collected of that population.

No single curator can audit the global pool. So errors accumulate, and important specimens stay buried.

**Specimen Finder is one small lever on that gap.** Given any plant species (named or photographed), it pulls the GBIF record set, runs robust statistical checks on it, and surfaces specimens worth a closer look — each one with reasoning, evidence, a link to the source record, and a suggested verification path.

---

## How to use it

### Option A — open `index.html` directly

Download or clone, then double-click `index.html`. The "Search by name" tab works immediately. (Photo identification needs to be served over HTTP because of how the Pl@ntNet API handles browser requests — see Option B.)

### Option B — host as a static page (recommended)

Deploy `index.html` anywhere that serves static files:

- **GitHub Pages**: in the repo Settings → Pages, set Source to your branch and root. The site will be at `https://<user>.github.io/specimen-finder/`.
- **Netlify / Vercel / Cloudflare Pages**: drag-and-drop `index.html` or connect the repo.
- **Any static host**: `python3 -m http.server 8000` from this directory, then open `http://localhost:8000`.

### Option C — search by photo

To use photo identification, get a free Pl@ntNet API key (~2 minutes):

1. Sign up at [my.plantnet.org](https://my.plantnet.org/)
2. Verify your email and log in
3. Account → "API key" → copy
4. In Specimen Finder, click "Set up photo ID" and paste

Free tier allows 500 identifications per day. The key is stored in your browser's `localStorage` only — never transmitted anywhere except directly to Pl@ntNet.

---

## What it actually does, step by step

1. **Resolves the query.** Common name like "swamp milkweed"? It hits iNaturalist's taxonomy API, filters to plants only (Kingdom Plantae), and if multiple species share the name shows a disambiguation list. Scientific name like *Sarracenia purpurea*? Skips that step. Photo? Sends it to Pl@ntNet, shows top 5 candidates with confidence scores.
2. **Matches the species to GBIF.** Queries `api.gbif.org/v1/species/match` with `kingdom=Plantae` so an animal genus with a colliding name can't match. Warns you if the match is only at genus/family level rather than species.
3. **Fetches up to 300 preserved-specimen records.** That's the GBIF API page maximum; for common species with tens of thousands of records, this is a sample — see "Known limitations" below.
4. **Computes summary statistics** — date range, country count, georeferenced count, population center (median lat/median lon, using circular statistics for longitude so trans-Pacific species don't break it).
5. **Runs anomaly detection** on each specimen using the **Median Absolute Deviation method** (Iglewicz & Hoaglin, 1993). For each numeric dimension (distance from population center, collection year), it computes a *modified Z-score*: `0.6745 × (x − median) / MAD`. Anything above |3.5| is flagged. MAD is used instead of standard deviation because herbarium data is rarely normally distributed and conventional Z-scores would be misled by long tails.
6. **Layers on rule-based flags** for things that don't need statistics: Null Island (0,0) coordinates, GBIF-reported quality issues (`COUNTRY_COORDINATE_MISMATCH`, `PRESUMED_NEGATED_LATITUDE`, etc.), pre-1900 unimaged specimens, missing coordinates.
7. **Renders the results** with full evidence, priority badge, a falsification recipe ("here's how you'd disprove this flag"), an image if GBIF has one, and a one-click Darwin-Core-ish citation.
8. **Pulls a "What's known about this plant" panel** in parallel from Wikipedia (description, ecology, uses, toxicity, phytochemistry sections), Wikidata (IUCN status, common names), iNaturalist (observation counts, conservation flags), and GBIF (vernacular names in many languages). Every claim links back to its source. The panel emphasizes that *compounds studied* is not the same as *plant treats anything*, and surfaces poison-control hotlines prominently.

---

## Data sources — all open, all citable

| Source | What we use it for | License |
|---|---|---|
| [GBIF](https://www.gbif.org) | Specimen occurrence records (up to 300/search), taxonomy match, vernacular names | CC0 / CC BY / CC BY-NC depending on publisher |
| [Pl@ntNet API v2](https://my.plantnet.org/) | Photo identification (optional, user-provided key) | Research/non-commercial |
| [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) + [MediaWiki API](https://en.wikipedia.org/w/api.php) | Species summary and section extraction (Description, Ecology, Uses, Toxicity, Chemistry) | CC BY-SA 3.0 |
| [Wikidata](https://www.wikidata.org/) | Conservation status (P141 — IUCN), common names (P1843) | CC0 |
| [iNaturalist API](https://api.inaturalist.org/v1/docs/) | Common-name → scientific name resolution, observation counts | CC BY-NC |
| [Plants of the World Online (Kew/POWO)](https://powo.science.kew.org/) | Linked authoritative taxonomy lookup | CC BY |
| [PubChem (NIH)](https://pubchem.ncbi.nlm.nih.gov/) | Linked compound database | Public domain |

No proprietary APIs. No paid keys. Specimen Finder's own code is MIT-licensed (see `LICENSE`).

---

## Features

- **Common-name and scientific-name search.** "Pitcher plant" → disambiguation list of *Sarracenia*, *Nepenthes*, *Cephalotus*. *Sarracenia purpurea* → straight to results.
- **Photo identification** with organ hint (leaf / flower / fruit / bark / whole plant) for better accuracy.
- **Statistical outlier detection** with the Modified Z-score / MAD method — explained inline next to each flag so the reasoning is reproducible.
- **GBIF data-quality issues** surfaced verbatim (negated latitude, country-coordinate mismatch, etc.).
- **Global distribution map** rendered to canvas (no external map library — works offline once loaded).
- **Filter by flag type** (e.g., show only "Far from typical location" or only "Historical, not imaged").
- **Falsification recipe per flag** — every flag tells you the concrete step to confirm or refute it.
- **CSV export** with all flagged records and their GBIF URLs.
- **One-click citations** in a research-paper-friendly format.
- **"What's known" knowledge panel** drawing only from primary, citable sources, with a prominent warning that *"compounds studied"* does not mean *"medicine."*
- **Poison-control phone numbers** displayed alongside any toxicity content.
- **Race-condition guard** so rapid clicks on different examples don't interleave results.

---

## Known limitations (we should be honest)

These are real and acknowledged:

1. **300-record cap per search.** This is the GBIF Occurrence Search API's effective per-page limit. For common species (e.g., *Taraxacum officinale* has hundreds of thousands of specimens), 300 records is a small biased sample of "whichever GBIF returned first." For complete coverage on common species, use the [GBIF download API](https://www.gbif.org/developer/occurrence#download) directly. We could add pagination in a future version; doing so means dozens of API calls per search.
2. **No native-range awareness.** Some "Far from typical location" flags are real range extensions, others are cultivated specimens grown outside the native range, others are mislabelled. The tool can't tell these apart automatically — it surfaces the anomaly so a botanist can.
3. **Statistical thresholds are heuristics, not gospel.** Modified Z-score > 3.5 is a defensible default (Iglewicz & Hoaglin recommend it), but it's still a threshold. Some real outliers will fall below it; some non-outliers above it.
4. **Wikipedia section parsing is fragile.** If a Wikipedia article uses a non-standard section title ("Pharmacognosy" vs "Phytochemistry"), the knowledge panel may not surface that content. The "Go deeper at authoritative sources" links are the safety net.
5. **No clinical or toxicity API for plants exists for free at scale.** The toxicity section deliberately refuses to make plant-safety claims and instead links to ASPCA, the Canadian Poisonous Plants database, PubChem, and NIH NCCIH.
6. **Pl@ntNet free tier is 500 IDs/day per key.** If you go over, the app will tell you. Search-by-name still works.
7. **Photo ID requires HTTPS or http://localhost.** Pl@ntNet's API rejects requests from `file://` origins in some browsers due to CORS. Host the file or use the name-search tab.
8. **Coordinate antimeridian handling.** Longitude median uses circular statistics (unit-vector mean), but very widely distributed species (e.g., circumboreal) still produce a "population center" that is a statistical artifact rather than a real centroid. The distance-based outlier check should be interpreted with that in mind.
9. **No login = no per-user history.** Every search is from scratch. By design.

---

## Critique — from three angles

The user who commissioned this asked for honest self-critique from a researcher, a developer, and an end user. Here it is.

### As a researcher

**What works:** the MAD-based outlier method is appropriate for ecological data and the reasoning is exposed inline rather than hidden. The citation block per record is useful for note-taking and adequate for an exploratory pass. Linking out to the original GBIF record and POWO is the right default — this tool's job is to surface, not to publish.

**What's weak:** 300 records is not enough for serious work on common species. A serious workflow would use the GBIF download API (which gives you a DOI-citable, complete CSV) and run the same analysis offline. The flagged-record CSV here is a starting point, not the deliverable. Also: there's no way to mark a flag as "checked, false positive" or "checked, confirmed" and persist that — a curator running this on a thousand records would want lightweight annotation.

### As a developer

**What works:** zero build step, single HTML file, no dependencies beyond fonts. Easy to read, easy to fork, easy to host anywhere. State is local-only. CORS works for all the APIs used. The code is mostly readable.

**What's weak:** this is one ~1500-line HTML file. At this size it's still navigable but it would benefit from being split into separate JS modules. There are no automated tests — manual exercise on known species (Franklinia, *Sarracenia purpurea*, *Taraxacum officinale*) is what verifies the flow. Race-condition handling exists but is informal (an `id` counter). Accessibility could be much better: filter chips and organ pills should be keyboard-navigable buttons with ARIA roles, not divs. Some flag-class names are still passed unchecked into class attributes — fine because the class names are controlled by us, but it's a pattern that could regress.

### As an end user

**What works:** the "Try one of these" example pills are perfect for first-time users — pick one, see the entire flow execute. The status panel makes it visible exactly what API is being hit at each step, which builds trust. The "How would you verify or disprove this flag?" line per record is genuinely useful — it makes the tool feel like a collaborator rather than an oracle.

**What's weak:** a non-botanist seeing "Modified Z-score: 4.2" has no idea what that means even with the inline explanation. A plain-language version like "this specimen is in the 99th percentile of unusual locations for this species" would be friendlier. The map is a dotted grid with no continent outlines, so a Mexican specimen is hard to tell from a Guatemalan one at a glance — adding a simple coastline overlay would dramatically improve the map without adding dependencies. Toxicity warnings are appropriately strong, but a first-time user might bounce off the heavy disclaimers; they're correct, just heavy. And: there's no way to save a search or share a URL of results — which a teacher running this in a classroom would want.

---

## Bugs found and fixed in this revision

1. **`looksLikeScientificName("Pitcher plant")` returned true,** falsely flagging the query as a Latin binomial and skipping common-name resolution. Fixed with a denylist of common English plant-related nouns.
2. **GBIF species match was unconstrained,** so an animal or fungal genus with a colliding spelling could win the match. Added `kingdom=Plantae`.
3. **No warning when GBIF matched at genus or higher rank.** Now flagged with an info status line, since search results then cover the whole genus rather than a single species.
4. **Race condition:** rapid clicks on different examples could interleave results. Added a `searchId` counter; stale async branches abort cleanly.
5. **Longitude wraparound** broke the geographic-center calculation for trans-Pacific or circumboreal species. Added circular-statistics median for longitude.
6. **File input reuse:** re-selecting the same file did nothing because the input's `value` was unchanged. Fixed by clearing `value` after each change event.
7. **Citation HTML was injected unescaped,** which would have broken on species names containing markup-like characters. Now escaped.
8. **Status message text** was injected as raw HTML (low risk because all callers are internal, but tightened to escape user-derived strings).
9. **Pl@ntNet 500/day free-tier limit** wasn't communicated. Added to the setup modal and the rate-limit error message.

---

## File layout

```
specimen-finder/
├── index.html      # the entire app, single file, no build step
├── README.md       # this file
└── LICENSE         # MIT
```

That's it. Open `index.html`. The tool runs.

---

## Contributing

This is a small, focused tool. Useful contributions:

- **Add a coastline outline to the map** (a low-resolution world coastline as a static GeoJSON path embedded in the file would be a big UX improvement).
- **Plain-language outlier explanations** alongside the statistical ones.
- **Per-search shareable URL** (`?q=Sarracenia+purpurea` would load and execute on page load).
- **Save/annotate flags** as "confirmed false positive" or "needs review," persisted to `localStorage`.
- **Native-range awareness** by joining POWO distribution data so cultivated specimens outside the native range can be distinguished from real range extensions.
- **Accessibility pass** — keyboard navigation, ARIA, focus management in modals.

PRs welcome. Keep it a single HTML file. Keep all data sources open and citable.

---

## Citation

If Specimen Finder helps you find something useful in a herbarium record, please cite the underlying record (GBIF and the originating institution), not this tool. The tool is just a lens.

If you want to acknowledge Specimen Finder itself in a methods section, something like:

> Anomaly flagging was performed using Specimen Finder, which queries GBIF for preserved-specimen records and applies a Modified Z-score test (Iglewicz & Hoaglin 1993, threshold 3.5) on collection-year and great-circle distance from the population centroid.

---

## License

MIT. See [LICENSE](LICENSE). All data sources retain their own licenses — see the table above.
