# First Year Out

**What a degree pays, against what it costs.**

Every US college program, ranked by what graduates earned in their first year out against what they
borrowed to get there - 38,869 programs across 4,500 schools and 326 fields of study.

**Live site:** https://temporaryexistence.github.io/first-year-out/

The US Department of Education publishes these numbers, but its own tool answers them **one school at a
time**. This asks the question across all of them at once: rank every program in the country by debt
against pay, see the whole distribution, and find out whether a school is uniformly solid or wildly uneven.

Everything runs **in your browser**. No server, no database, no accounts, no tracking, nothing sent anywhere.

---

## Built on Malloy

This project is **built on [Malloy](https://malloydata.dev) and [Malloyyo](https://github.com/malloydata/malloyyo)**,
and they are not a detail of the implementation - they are the spine of it.

The entire application is a **semantic model plus four dashboards**. There is no backend, no API layer, no
database server, and almost no application code. Malloy defines the data's meaning once - what a program
is, what "debt vs pay" means, how the plain-language bands are drawn - and every view inherits that one
definition, so no two parts of the site can quietly disagree about what a number means. Malloyyo compiles
that model and the dashboards into a static site that queries a Parquet file client-side with
**DuckDB-WASM**, and that is what makes the site's best property possible: because the query engine ships
to the reader, **nothing the reader does is ever transmitted anywhere**.

A conventional build of this would have been a server, a database, a query API, a caching layer and a
hosting bill. Here it is ~20 lines of semantic model, four dashboard files, and a static host.

Malloy and Malloyyo are the work of **Lloyd Tabb** and the Malloy team.

The direct inspiration was Lloyd's own [Word Finder](https://lloydtabb.github.io/wordfinder/), which
demonstrated this whole shape - semantic model → dashboards → static site → DuckDB-WASM in the browser.
This project is that pattern pointed at a higher-stakes dataset.

---

## The data

| | |
|---|---|
| **Source** | US Department of Education, [College Scorecard](https://collegescorecard.ed.gov/data/) - Field of Study + Institution |
| **Release** | June 10, 2026 (accessed August 4, 2026) |
| **Licence** | US Government work, public domain |
| **Grain** | one row per institution × 4-digit CIP field × credential level |
| **Corpus** | 38,869 programs carrying **both** a median-earnings and a median-debt figure |

Earnings come from Treasury/IRS administrative records - not a survey. Debt comes from the National
Student Loan Data System. Enrolment and completions come from IPEDS.

**This site adds nothing but arithmetic and presentation.** "Debt vs pay" is median debt divided by median
first-year earnings. No weighting, no modelling, no estimates of our own. The transformation is a single
documented script (`scripts/build-data.sh`); no row is altered, and none is dropped except where a program
is missing one of the two figures.

### What the data cannot tell you

Read these before drawing a conclusion about any specific program. They are stated on the site itself, at
length, on every page - not buried here.

1. **It is not everyone - it is federally-aided graduates.** Earnings cover graduates who received federal
   financial aid, were working, were not enrolled in further study, and for whom this was their highest
   credential.
2. **Small programs are missing, and not at random.** The Department suppresses any figure covering fewer
   than 30 graduates. **Absence from this site is evidence of nothing.**
3. **The numbers describe the past.** Earnings are pooled across award years and measured a few years after
   graduation.
4. **A median is not a promise.** Half of graduates earned less than the figure shown.

**This is not financial, career, or admissions advice.** This project is independent and is not affiliated
with, or endorsed by, the US Department of Education or any institution named on it.

---

## Build it yourself

Requires **Node ≥ 20**.

```bash
npm install                                  # installs malloyyo (project-local)
bash scripts/build-data.sh                   # download the Scorecard files -> docs/programs.parquet
npx malloyyo lint                            # validate dashboards against the model
npx malloyyo dashboard dev                   # preview at http://localhost:4173
npx malloyyo dashboard bundle --out docs --title "First Year Out" --duckdb bundled --no-serve
```

`docs/` is the published site - static HTML, the DuckDB-WASM runtime, and the Parquet, served by GitHub
Pages. `--duckdb bundled` self-hosts the engine so the site has no CDN dependency.

### Layout

```
storage.malloy        where the parquet lives  (site-root relative -- see the gotcha below)
degree_roi.malloy     the model: dimensions, measures, the debt-vs-pay ratio, the bands
index.malloy          the export surface -- only what this exports is visible to dashboards
dashboards/*.malloy   the queries behind each dashboard
dashboards/*.jsx      the layout and charts for each dashboard
scripts/build-data.sh CSV -> parquet, the one transformation step
docs/                 the published static site
```

**One gotcha worth knowing if you fork this:** `storage.malloy` addresses the parquet as
`programs.parquet`, not `docs/programs.parquet`, because the bundled site's root *is* `docs/`. Get it
wrong and it fails **silently** - the page renders, every control works, and every tile reads zero.
`malloyyo lint` and `bundle` resolve that same string from the *project* root, so `build-data.sh` writes
`docs/` and keeps a gitignored copy at the project root for compile time.

---

## Licence

**Code:** MIT - see [LICENSE](LICENSE).
**Data:** US Government work, public domain. Sourced from the College Scorecard; not modified.

Built by [Tabb Labs](https://tabblabs.net).
