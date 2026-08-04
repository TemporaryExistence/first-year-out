#!/usr/bin/env bash
# Build docs/programs.parquet from the US Dept of Education College Scorecard bulk files.
#
# Source (public domain, no API key needed for the bulk files):
#   Field of Study : institution x 4-digit CIP x credential level  -> earnings + debt
#   Institution    : UNITID -> state/city (the field-of-study file has NO geography)
#
# Both are re-downloaded here, so data-src/ is fully regenerable and is gitignored.
# Re-run whenever the Department publishes a new release (the date is in the filename).
set -euo pipefail

RELEASE="06102026"          # published 2026-06-10; bump when a newer release lands
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/data-src"
OUT="$ROOT/docs"
BASE="https://ed-public-download.scorecard.network/downloads"

mkdir -p "$SRC" "$OUT"

fetch() {  # fetch <zipname> <expected-csv-glob>
  local zip="$1" csv="$2"
  if compgen -G "$SRC/$csv" > /dev/null; then
    echo "  have $csv"
  else
    echo "  downloading $zip ..."
    curl -sSLf -o "$SRC/$zip" "$BASE/$zip"
    unzip -o -q "$SRC/$zip" -d "$SRC"
  fi
}

echo "[1/3] Source files"
fetch "Most-Recent-Cohorts-Field-of-Study_${RELEASE}.zip" "Most-Recent-Cohorts-Field-of-Study.csv"
fetch "Most-Recent-Cohorts-Institution_${RELEASE}.zip"    "Most-Recent-Cohorts-Institution.csv"

FOS="$SRC/Most-Recent-Cohorts-Field-of-Study.csv"
INST="$SRC/Most-Recent-Cohorts-Institution.csv"

echo "[2/3] Building $OUT/programs.parquet"

# NOTE on the source encoding: suppressed / missing cells arrive as the literal strings
# 'PS' (PrivacySuppressed, applied at n<30) or 'NULL'. TRY_CAST turns both into SQL NULL,
# which is what we want -- a suppressed value must never be read as a zero.
cd "$ROOT"
npx --no-install malloyyo sql duckdb <<SQL
COPY (
  WITH inst AS (
    SELECT
      TRY_CAST(UNITID AS INTEGER) AS unitid,
      STABBR                      AS state,
      CITY                        AS city
    FROM read_csv('${INST}', header=true, all_varchar=true, ignore_errors=true)
  ),
  fos AS (
    SELECT
      TRY_CAST(UNITID AS INTEGER)                     AS unitid,
      INSTNM                                          AS school,
      CONTROL                                         AS control,
      CIPCODE                                         AS cip_code,
      -- the Department's descriptions carry a trailing period; strip it for display
      RTRIM(CIPDESC, '.')                             AS field,
      TRY_CAST(CREDLEV AS INTEGER)                    AS cred_level,
      CREDDESC                                        AS credential,
      TRY_CAST(DEBT_ALL_STGP_EVAL_MDN AS DOUBLE)      AS debt_median,
      TRY_CAST(EARN_MDN_HI_1YR AS DOUBLE)             AS earn_1yr,
      TRY_CAST(EARN_MDN_HI_2YR AS DOUBLE)             AS earn_2yr,
      TRY_CAST(EARN_MDN_4YR AS DOUBLE)                AS earn_4yr,
      TRY_CAST(EARN_MDN_5YR AS DOUBLE)                AS earn_5yr,
      TRY_CAST(EARN_COUNT_WNE_HI_1YR AS INTEGER)      AS earn_n,
      TRY_CAST(IPEDSCOUNT1 AS INTEGER)                AS grads_yr1,
      TRY_CAST(IPEDSCOUNT2 AS INTEGER)                AS grads_yr2
    FROM read_csv('${FOS}', header=true, all_varchar=true, ignore_errors=true)
  )
  SELECT
    f.school, i.state, i.city, f.control,
    f.field, f.cip_code, f.credential, f.cred_level,
    f.debt_median, f.earn_1yr, f.earn_2yr, f.earn_4yr, f.earn_5yr,
    f.earn_n, f.grads_yr1, f.grads_yr2
  FROM fos f
  LEFT JOIN inst i USING (unitid)
  -- The corpus IS the rows where both sides of the question are answerable.
  -- A program with earnings but no debt (or vice versa) cannot be ranked on value,
  -- and including it half-populated would silently skew every ranking.
  WHERE f.earn_1yr IS NOT NULL
    AND f.debt_median IS NOT NULL
) TO '${OUT}/programs.parquet' (FORMAT PARQUET, COMPRESSION ZSTD);
SQL

# The parquet must exist in TWO places, for two different resolvers:
#   docs/programs.parquet  -> the PUBLISHED copy. The bundled site's root IS
#                             docs/, so storage.malloy addresses it as
#                             'programs.parquet'. This is the one Pages serves
#                             and the one that gets committed.
#   ./programs.parquet     -> a COMPILE-TIME copy at the project root, because
#                             `malloyyo lint` / `dashboard bundle` resolve the
#                             same string relative to the project root. Without
#                             it the model fails to compile ("Reference to
#                             undefined object 'programs'"). Gitignored.
# One string, two roots -- this is the seam, and it is why the copy exists.
cp -f "$OUT/programs.parquet" "$ROOT/programs.parquet"

echo "[3/3] Result"
ls -la "$OUT/programs.parquet" "$ROOT/programs.parquet"
