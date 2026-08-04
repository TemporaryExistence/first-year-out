// The landing page is compiled in the bundler's own pass with NO Malloy and no
// DuckDB, so its headline figures are written out by hand. Hand-written numbers
// drift the moment the data is rebuilt, and a wrong number on the front page of
// a site about other people's money is not a cosmetic bug.
//
// This asserts every figure in dashboards/index.jsx against the shipped parquet.
// Run it after scripts/build-data.sh. Exits non-zero on any mismatch.
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");

const ROOT = path.join(__dirname, "..");
const SQL = `
SELECT
  count(*)                                   AS programs,
  count(DISTINCT school)                     AS schools,
  count(DISTINCT field)                      AS fields,
  round(avg(earn_1yr)   FILTER (WHERE credential = 'Bachelor''s Degree')) AS pay,
  round(avg(debt_median)FILTER (WHERE credential = 'Bachelor''s Degree')) AS debt
FROM 'docs/programs.parquet';`;

const out = execFileSync("npx", ["--no-install", "malloyyo", "sql", "duckdb", "-j", "-e", SQL],
  { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24 });
const row = JSON.parse(out.slice(out.indexOf("["), out.lastIndexOf("]") + 1))[0];

const grp = (n) => Number(n).toLocaleString("en-US");
const expect = {
  programs: grp(row.programs),
  schools:  grp(Math.round(row.schools / 100) * 100),   // landing rounds schools to the nearest 100
  fields:   grp(row.fields),
  pay:      "$" + grp(row.pay),
  debt:     "$" + grp(row.debt),
};

const src = fs.readFileSync(path.join(ROOT, "dashboards", "index.jsx"), "utf8");
const m = src.match(/const FIG = \{([^}]*)\}/);
if (!m) { console.error("FAIL: could not find FIG in dashboards/index.jsx"); process.exit(1); }
const actual = {};
for (const [, k, v] of m[1].matchAll(/(\w+):\s*"([^"]*)"/g)) actual[k] = v;

let bad = 0;
for (const k of Object.keys(expect)) {
  const ok = actual[k] === expect[k];
  if (!ok) bad++;
  console.log(`${ok ? "  ok  " : "  BAD "} ${k.padEnd(9)} landing=${String(actual[k]).padEnd(10)} data=${expect[k]}`);
}
if (bad) {
  console.error(`\nFAIL: ${bad} landing figure(s) disagree with docs/programs.parquet. Update FIG in dashboards/index.jsx.`);
  process.exit(1);
}
console.log("\nOK: every landing-page figure matches the shipped data.");
