
// Adversarial test run. Tries to BREAK the site rather than confirm it works.
// Every page, mobile, dark mode, every credential level, hostile URL params,
// special characters in drill values, and internal link resolution.
// Fails loudly on: console errors, NaN/undefined/Infinity in rendered text,
// horizontal scroll, or a page that never populates.
//   node scripts/stress.js [baseUrl]
const { chromium } = require("playwright-core");
const BASE = process.argv[2] || "http://127.0.0.1:8800";
const PAGES = ["index", "value-ranking", "field-compare", "school-profile", "zz-about"];

const fails = [];
const note = (t, m) => { fails.push(`${t}: ${m}`); console.log(`  FAIL  ${t} - ${m}`); };
const ok = (t) => console.log(`  ok    ${t}`);
const POISON = /\bNaN\b|\bundefined\b|\bInfinity\b|\[object Object\]|&quot;|NaN%/;

async function check(page, label, opts) {
  opts = opts || {};
  const expectData = opts.expectData !== false;
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => errs.push("pageerror: " + String(e).slice(0, 160)));
  if (expectData) {
    await page.waitForFunction(() => /\$[0-9]/.test(document.body.innerText), { timeout: 40000 })
      .catch(() => note(label, "never populated with data"));
  }
  await page.waitForTimeout(1400);
  const t = await page.evaluate(() => document.body.innerText);
  const m = t.match(POISON);
  if (m) note(label, "poison text rendered: " + JSON.stringify(m[0]));
  const hs = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (hs) note(label, "horizontal scroll");
  const real = errs.filter((e) => !/favicon|404 \(File not found\)/i.test(e));
  if (real.length) note(label, "console errors: " + real.slice(0, 2).join(" | "));
  if (!fails.some((f) => f.indexOf(label + ":") === 0)) ok(label);
}

const g = (v) => encodeURIComponent(JSON.stringify(v));

(async () => {
  const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });

  console.log("\n[1] every page, desktop 1440");
  for (const pg of PAGES) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    await p.goto(BASE + "/" + pg + ".html", { waitUntil: "networkidle", timeout: 90000 });
    await check(p, "desktop/" + pg);
    await p.close();
  }

  console.log("\n[2] every page, mobile 390");
  for (const pg of PAGES) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await p.goto(BASE + "/" + pg + ".html", { waitUntil: "networkidle", timeout: 90000 });
    await check(p, "mobile/" + pg);
    await p.close();
  }

  console.log("\n[3] dark mode");
  for (const pg of ["index", "value-ranking", "zz-about"]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: "dark" });
    await p.goto(BASE + "/" + pg + ".html", { waitUntil: "networkidle", timeout: 90000 });
    await check(p, "dark/" + pg);
    await p.close();
  }

  console.log("\n[4] every credential level");
  const CREDS = ["Associate's Degree","Bachelor's Degree","Doctoral Degree","First Professional Degree",
                 "Graduate/Professional Certificate","Master's Degree","Post-baccalaureate Certificate",
                 "Undergraduate Certificate or Diploma"];
  for (const c of CREDS) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    await p.goto(BASE + "/value-ranking.html?CREDENTIAL=" + g({ kind: "oneOf", values: [c] }),
                 { waitUntil: "networkidle", timeout: 90000 });
    await check(p, "cred/" + c.slice(0, 24), { expectData: false });
    await p.close();
  }

  console.log("\n[5] hostile / nonsense URL params");
  const HOSTILE = [
    ["bogus-credential", "?CREDENTIAL=" + g({ kind: "oneOf", values: ["NOT_A_REAL_CREDENTIAL"] })],
    ["not-json",         "?CREDENTIAL=not-json-at-all"],
    ["absurd-min-grads", "?MIN_GRADS=" + g({ kind: "greaterThan", value: 999999999 })],
    ["bogus-state",      "?STATE=" + g({ kind: "oneOf", values: ["ZZ"] })],
    ["sql-injection",    "?FIELD=" + g({ kind: "oneOf", values: ["'; DROP TABLE programs; --"] })],
    ["xss-attempt",      "?FIELD=" + g({ kind: "oneOf", values: ["<script>alert(1)</script>"] })],
    ["all-empty",        "?CREDENTIAL=&STATE=&FIELD=&MIN_GRADS="],
    ["param-flood",      "?" + "x=1&".repeat(200)],
  ];
  for (const pair of HOSTILE) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    await p.goto(BASE + "/value-ranking.html" + pair[1], { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
    await check(p, "hostile/" + pair[0], { expectData: false });
    await p.close();
  }

  console.log("\n[6] special characters in drill values");
  const NASTY = [
    ["school-profile", "SCHOOL", "Massachusetts Institute of Technology"],
    ["field-compare",  "FIELD",  "Health Services/Allied Health/Health Sciences, General"],
    ["field-compare",  "FIELD",  "Registered Nursing, Nursing Administration, Nursing Research and Clinical Nursing"],
    ["field-compare",  "FIELD",  "Drama/Theatre Arts and Stagecraft"],
  ];
  for (const row of NASTY) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    await p.goto(BASE + "/" + row[0] + ".html?" + row[1] + "=" + g({ kind: "oneOf", values: [row[2]] }),
                 { waitUntil: "networkidle", timeout: 90000 });
    await check(p, "special/" + row[2].slice(0, 28), { expectData: false });
    await p.close();
  }

  console.log("\n[7] internal links resolve");
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(BASE + "/index.html", { waitUntil: "networkidle", timeout: 90000 });
  const hrefs = await p.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]")).map((a) => a.getAttribute("href"))
      .filter((h) => h && !/^https?:|^mailto:|^#/.test(h)));
  for (const h of Array.from(new Set(hrefs))) {
    const r = await p.request.get(BASE + "/" + h.replace(/^\.\//, "")).catch(() => null);
    if (!r || r.status() >= 400) note("links", h + " -> " + (r ? r.status() : "unreachable"));
  }
  if (!fails.some((f) => f.indexOf("links:") === 0)) ok("links (all internal hrefs resolve)");
  await p.close();

  await b.close();
  console.log("\n" + "=".repeat(58));
  console.log(fails.length ? fails.length + " FAILURE(S)\n" + fails.map((f) => " - " + f).join("\n")
                           : "ALL CHECKS PASSED - could not break it");
  process.exit(fails.length ? 1 : 0);
})();
