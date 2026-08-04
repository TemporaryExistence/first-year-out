// @ts-nocheck
// Value ranking - the headline. Reads top to bottom as one argument:
//   1. the five numbers that summarise the selection
//   2. WHERE THE MONEY LANDS  - a scatter of every field, pay vs debt, with the
//      break-even diagonal drawn in. This is the chart that makes the ratio mean
//      something: anything below the line owes more than a year's pay.
//   3. THE SHAPE              - a histogram, so you can see that most programs
//      are fine and the damage is a tail, not the average.
//   4. WHERE PEOPLE ACTUALLY ARE - the biggest fields by graduate volume, as a
//      dumbbell of debt -> pay. Volume matters: a terrible tiny program harms
//      fewer people than a mediocre enormous one.
//   5. the named extremes, trimmed to 12 a side. 60 was a wall nobody reads.
// jsx is sandboxed (React + @malloyyo/dashboard only), so the style kit is
// copied per dashboard on purpose.
import React from "react";
import { Controls, Given, VegaChart, filters, useQuery } from "@malloyyo/dashboard";

const INK = {
  // `card` is deliberately translucent: the colour field sits behind and must
  // tint through, while text and chart ink stay legible on top.
  light: { surface: "#fcfcfb", card: "rgba(255,255,255,0.66)", track: "#e7ebf1", muted: "#5f6570", text: "#0b0e14", line: "rgba(24,40,80,0.10)" },
  dark:  { surface: "#1a1a19", card: "rgba(22,25,34,0.60)",   track: "#2a2d38", muted: "#9aa0ad", text: "#f4f6fa", line: "rgba(255,255,255,0.10)" },
};
const GOOD = "#1a7f5a", BAD = "#b4432c", ACCENT = "#2a78d6";

function relLum(c) {
  if (!c) return null; c = c.trim(); let r, g, b, m;
  if ((m = c.match(/^#([0-9a-f]{6})$/i))) { const h = m[1]; r = parseInt(h.slice(0,2),16); g = parseInt(h.slice(2,4),16); b = parseInt(h.slice(4,6),16); }
  else if ((m = c.match(/^#([0-9a-f]{3})$/i))) { const h = m[1]; r = parseInt(h[0]+h[0],16); g = parseInt(h[1]+h[1],16); b = parseInt(h[2]+h[2],16); }
  else if ((m = c.match(/rgba?\(([^)]+)\)/i))) { const p = m[1].split(",").map(Number); [r,g,b] = p; }
  else return null;
  return (0.2126*r + 0.7152*g + 0.0722*b) / 255;
}
function useInk() {
  const [dark, setDark] = React.useState(false);
  React.useLayoutEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.body || document.documentElement);
      const lum = relLum(cs.getPropertyValue("--dash-fg"));
      setDark(lum != null ? lum > 0.5 : window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    read();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme","class","style"] });
    return () => { mq.removeEventListener("change", read); obs.disconnect(); };
  }, []);
  const ink = dark ? INK.dark : INK.light;
  return { ...ink, dark };   // `dark` rides along so the page field / chrome can branch on it
}
const n = (x) => (x == null || x === "" ? 0 : +x);
const usd = (v) => "$" + Math.round(n(v)).toLocaleString();
const ratio = (v) => n(v).toFixed(2) + "x";

function Card({ ink, title, note, children }) {
  return (
    <div style={{ background: ink.card, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: `1px solid ${ink.line}`, borderRadius: 12, padding: "15px 17px", minWidth: 0, boxShadow: ink.dark ? "none" : "0 1px 2px rgba(20,30,60,.05), 0 8px 24px -14px rgba(20,30,60,.18)" }}>
      <div style={{ fontWeight: 600, color: ink.text, fontSize: 14 }}>{title}</div>
      {note && <div style={{ color: ink.muted, fontSize: 12, marginTop: 2 }}>{note}</div>}
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}
function Stat({ ink, label, value, sub }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: ink.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ color: ink.text, fontSize: 24, fontWeight: 650, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ color: ink.muted, fontSize: 12 }}>{sub}</div>}
    </div>
  );
}
function Bars({ ink, rows, label, value, fmt, accent }) {
  const max = Math.max(1, ...rows.map((r) => n(value(r))));
  if (!rows.length) return <div style={{ color: ink.muted, fontSize: 13 }}>Nothing matches these filters.</div>;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(90px,190px) 1fr auto", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: ink.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label(r)}</span>
          <div style={{ height: 10, background: ink.track, borderRadius: 5, overflow: "hidden" }}>
            <div style={{ width: `${(n(value(r)) / max) * 100}%`, height: "100%", background: accent, borderRadius: 5 }} />
          </div>
          <span style={{ fontSize: 12, color: ink.muted, whiteSpace: "nowrap" }}>{fmt(value(r))}</span>
        </div>
      ))}
    </div>
  );
}
const FOOTNOTE = "Earnings: median for federally-aided graduates who were working, not enrolled in further study, one year after finishing, and for whom this was their highest credential. Debt: median Stafford and Grad PLUS borrowing. Programs with under 30 reported graduates are suppressed by the Department, so small programs are systematically missing.";

// ---- chart kit (copied per dashboard; jsx components are sandboxed) ----
const BAND = { light: "#1a7f5a", mod: "#4f8fd6", heavy: "#d98324", vheavy: "#b4432c" };
const bandOf = (r) => (r < 0.5 ? "Light" : r < 1 ? "Moderate" : r < 2 ? "Heavy" : "Very heavy");
const BAND_DOMAIN = ["Light", "Moderate", "Heavy", "Very heavy"];
const BAND_RANGE = [BAND.light, BAND.mod, BAND.heavy, BAND.vheavy];

function Chart({ ink, spec, data, height }) {
  const base = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    background: "transparent",
    autosize: { type: "fit", contains: "padding", resize: true },
    width: "container",
    height,
    config: {
      axis: { labelColor: ink.muted, titleColor: ink.muted, gridColor: ink.track, domainColor: ink.track, tickColor: ink.track, labelFontSize: 11, titleFontSize: 11 },
      legend: { labelColor: ink.muted, titleColor: ink.muted, labelFontSize: 11, titleFontSize: 11 },
      view: { stroke: null },
    },
  };
  return <VegaChart spec={{ ...base, ...spec }} data={data} />;
}

// A square pay-vs-debt scatter with the break-even diagonal. Both axes MUST
// share one scale or the 45-degree line stops meaning "one year's pay".
function payVsDebtSpec({ ink, pts, xTitle, yTitle, labelField }) {
  const vals = pts.flatMap((p) => [p.debt, p.earnings]).sort((a, b) => a - b);
  const pct = (q) => (vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * q))] : 1);
  const hi = Math.max(1000, pct(0.98)) * 1.06;
  // Zoom the shared window to the data rather than anchoring at $0: a field where
  // pay far exceeds debt otherwise leaves ~75% of the plot empty. Both axes still
  // share ONE domain, so the 45-degree line keeps meaning "one year's pay".
  const lo = Math.max(0, pct(0.02) * 0.75);
  const dom = [lo, hi];
  return {
    layer: [
      { data: { values: [{ x: lo, y: lo }, { x: hi, y: hi }] },
        mark: { type: "line", strokeDash: [5, 4], color: ink.muted, opacity: 0.7 },
        encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } } },
      { mark: { type: "circle", opacity: 0.72 },
        encoding: {
          x: { field: "debt", type: "quantitative", title: xTitle, scale: { domain: dom, nice: false }, axis: { format: "$.2~s", tickCount: 6 } },
          y: { field: "earnings", type: "quantitative", title: yTitle, scale: { domain: dom, nice: false }, axis: { format: "$.2~s", tickCount: 6 } },
          size: { field: "grads", type: "quantitative", scale: { range: [25, 700] }, legend: null },
          color: { field: "band", type: "nominal", title: "Debt vs pay", scale: { domain: BAND_DOMAIN, range: BAND_RANGE } },
          tooltip: [
            { field: labelField, title: "" },
            { field: "earnings", title: "Median pay", format: "$,.0f" },
            { field: "debt", title: "Median debt", format: "$,.0f" },
            { field: "ratio", title: "Debt vs pay", format: ".2f" },
            { field: "grads", title: "Graduates / yr", format: ",.0f" },
          ],
        } },
    ],
  };
}

// ---------------------------------------------------------------------------
// PAGE FIELD - the colour gradient, built to the web-agency playbook recipe
// (kit/SITE-EXCELLENCE-PLAYBOOK.md §3 "The COLOUR GRADIENT"). Not re-derived by
// hand: ~14 big soft OVERLAPPING radial blooms over a TINTED base, distributed
// organically down the WHOLE page, zoned cool -> violet -> one warm accent low,
// with the warm accent kept away from the greens (green+amber adjacency = mud).
// Bloom radius is kept roughly equal to bloom spacing - radii much larger than
// the gaps average into a flat pale wash, which is the "light but not rich"
// failure mode. NEVER background-attachment:fixed: it pins the field to the
// viewport so the colour hides off-screen and the middle reads flat.
// Cards stay near-white and float on top so chart ink and dark text stay legible.
// ---------------------------------------------------------------------------
const FIELD_LIGHT = [
  "radial-gradient(900px 760px at 6% 1%, rgba(96,152,255,0.52), transparent 72%)",
  "radial-gradient(860px 720px at 72% 4%, rgba(72,190,232,0.46), transparent 72%)",
  "radial-gradient(940px 780px at 34% 8%, rgba(146,132,248,0.46), transparent 73%)",
  "radial-gradient(880px 740px at 96% 12%, rgba(104,140,250,0.44), transparent 72%)",
  "radial-gradient(920px 760px at 12% 17%, rgba(240,158,132,0.34), transparent 72%)",
  "radial-gradient(900px 750px at 60% 21%, rgba(120,196,240,0.46), transparent 72%)",
  "radial-gradient(940px 780px at 22% 26%, rgba(152,128,246,0.46), transparent 73%)",
  "radial-gradient(880px 740px at 88% 30%, rgba(88,168,252,0.44), transparent 72%)",
  "radial-gradient(920px 770px at 44% 35%, rgba(244,166,140,0.32), transparent 72%)",
  "radial-gradient(900px 750px at 8% 40%, rgba(112,186,236,0.44), transparent 72%)",
  "radial-gradient(940px 780px at 74% 44%, rgba(148,130,246,0.46), transparent 73%)",
  "radial-gradient(880px 740px at 30% 49%, rgba(96,156,252,0.44), transparent 72%)",
  "radial-gradient(920px 760px at 92% 53%, rgba(242,162,136,0.34), transparent 72%)",
  "radial-gradient(900px 750px at 16% 58%, rgba(124,192,238,0.44), transparent 72%)",
  "radial-gradient(940px 780px at 64% 62%, rgba(150,128,248,0.46), transparent 73%)",
  "radial-gradient(880px 740px at 26% 67%, rgba(92,160,252,0.44), transparent 72%)",
  "radial-gradient(920px 770px at 84% 71%, rgba(246,168,138,0.36), transparent 72%)",
  "radial-gradient(900px 750px at 10% 76%, rgba(116,188,238,0.42), transparent 72%)",
  "radial-gradient(940px 780px at 68% 80%, rgba(146,130,246,0.44), transparent 73%)",
  "radial-gradient(880px 740px at 34% 85%, rgba(240,160,140,0.38), transparent 72%)",
  "radial-gradient(920px 760px at 90% 90%, rgba(100,164,250,0.42), transparent 72%)",
  "radial-gradient(940px 790px at 46% 96%, rgba(244,172,142,0.38), transparent 73%)",
  "linear-gradient(178deg, #e4ecfa 0%, #e6e6f8 30%, #e9edfb 55%, #f2e7e2 80%, #eef1fb 100%)",
].join(", ");

const FIELD_DARK = [
  "radial-gradient(900px 760px at 6% 1%, rgba(52,96,190,0.50), transparent 72%)",
  "radial-gradient(860px 720px at 72% 5%, rgba(32,116,152,0.46), transparent 72%)",
  "radial-gradient(940px 780px at 34% 9%, rgba(86,72,180,0.46), transparent 73%)",
  "radial-gradient(880px 740px at 96% 13%, rgba(50,88,186,0.44), transparent 72%)",
  "radial-gradient(920px 760px at 12% 18%, rgba(158,88,58,0.34), transparent 72%)",
  "radial-gradient(900px 750px at 60% 22%, rgba(40,120,168,0.44), transparent 72%)",
  "radial-gradient(940px 780px at 22% 27%, rgba(92,70,184,0.46), transparent 73%)",
  "radial-gradient(880px 740px at 88% 31%, rgba(46,94,192,0.44), transparent 72%)",
  "radial-gradient(920px 770px at 44% 36%, rgba(162,92,60,0.32), transparent 72%)",
  "radial-gradient(900px 750px at 8% 41%, rgba(38,116,160,0.44), transparent 72%)",
  "radial-gradient(940px 780px at 74% 45%, rgba(88,72,182,0.46), transparent 73%)",
  "radial-gradient(880px 740px at 30% 50%, rgba(48,92,190,0.44), transparent 72%)",
  "radial-gradient(920px 760px at 92% 54%, rgba(160,90,58,0.34), transparent 72%)",
  "radial-gradient(900px 750px at 16% 59%, rgba(40,118,164,0.44), transparent 72%)",
  "radial-gradient(940px 780px at 64% 63%, rgba(90,70,184,0.46), transparent 73%)",
  "radial-gradient(880px 740px at 26% 68%, rgba(46,96,192,0.44), transparent 72%)",
  "radial-gradient(920px 770px at 84% 72%, rgba(164,94,62,0.36), transparent 72%)",
  "radial-gradient(900px 750px at 10% 77%, rgba(38,114,158,0.42), transparent 72%)",
  "radial-gradient(940px 780px at 68% 81%, rgba(88,70,180,0.44), transparent 73%)",
  "radial-gradient(880px 740px at 34% 86%, rgba(158,88,60,0.38), transparent 72%)",
  "radial-gradient(920px 760px at 90% 91%, rgba(48,96,194,0.42), transparent 72%)",
  "radial-gradient(940px 790px at 46% 97%, rgba(162,96,64,0.38), transparent 73%)",
  "linear-gradient(178deg, #10141d 0%, #14131f 30%, #111722 55%, #1e1712 80%, #101420 100%)",
].join(", ");

// PageShell - the field is a LAYER INSIDE the scrolling content, not a <body>
// background. The dashboard renders into an inner scrolling div, so painting
// <body> pins the field to the viewport: content scrolls over a stationary
// field, the middle of a long page reads flat, and the colour hides off-screen.
// That is functionally `background-attachment: fixed`, which the playbook names
// as a literal root cause. As a layer, the field is as tall as the document and
// the bloom %-positions land where they were designed to.
// Also paints <body> the base tint only, so the margins are never a dead white.
function PageShell({ dark, children }) {
  React.useLayoutEffect(() => {
    const b = document.body;
    const prev = b.style.background;
    b.style.background = dark ? "#10141d" : "#e4ecfa";
    return () => { b.style.background = prev; };
  }, [dark]);
  return (
    <div style={{ position: "relative", isolation: "isolate", padding: "18px 20px 26px" }}>
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: dark ? FIELD_DARK : FIELD_LIGHT,
        backgroundRepeat: "no-repeat", backgroundSize: "100% 100%",
      }} />
      <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>{children}</div>
    </div>
  );
}

// THE SIGNATURE MOVE this build owns: the break-even diagonal, promoted from a
// chart annotation to the masthead's own device. It is the one idea the whole
// site turns on - pay above the line, debt below it - so it earns being the
// thing you see first. Product-specific, not a decorative flourish.
function Masthead({ ink, dark, title, kicker, blurb }) {
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: dark ? "rgba(24,26,34,0.72)" : "rgba(255,255,255,0.72)",
      backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
      border: `1px solid ${ink.line}`, borderRadius: 14, padding: "22px 24px",
    }}>
      <svg viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"
           style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(46%, 460px)", height: "100%", opacity: dark ? 0.42 : 0.34, pointerEvents: "none" }}>
        <line x1="0" y1="120" x2="400" y2="0" stroke={ink.muted} strokeWidth="1.2" strokeDasharray="6 5" />
        <circle cx="132" cy="44" r="7" fill={BAND.light} opacity="0.85" />
        <circle cx="196" cy="34" r="10" fill={BAND.light} opacity="0.7" />
        <circle cx="252" cy="52" r="6" fill={BAND.mod} opacity="0.8" />
        <circle cx="168" cy="62" r="5" fill={BAND.mod} opacity="0.75" />
        <circle cx="298" cy="86" r="6" fill={BAND.heavy} opacity="0.8" />
        <circle cx="344" cy="98" r="5" fill={BAND.vheavy} opacity="0.75" />
      </svg>
      <div style={{ position: "relative" }}>
        <div style={{ color: ink.muted, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 600 }}>{kicker}</div>
        <h1 style={{ margin: "6px 0 0", color: ink.text, fontSize: 30, lineHeight: 1.12, letterSpacing: "-0.02em", fontWeight: 700 }}>{title}</h1>
        <p style={{ margin: "8px 0 0", color: ink.muted, fontSize: 14, lineHeight: 1.55, maxWidth: 720 }}>{blurb}</p>
      </div>
    </div>
  );
}

// The disclaimer. Deliberately NOT small grey print at the bottom of one page:
// it sits on EVERY dashboard, and it is the thing that keeps this site honest
// about making financial statements concerning named schools and named programs.
function Disclaimer({ ink, dark }) {
  return (
    <div style={{
      background: dark ? "rgba(28,24,20,0.62)" : "rgba(255,251,244,0.82)",
      border: `1px solid ${dark ? "#4a3b2c" : "#e7d9c2"}`,
      borderLeft: `3px solid ${BAND.heavy}`,
      borderRadius: 10, padding: "13px 16px",
    }}>
      <div style={{ color: ink.text, fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
        Read this before you draw a conclusion
      </div>
      <div style={{ color: ink.muted, fontSize: 12.5, lineHeight: 1.6 }}>
        <b>This is not financial, career, or admissions advice.</b> It is a plain view of figures published
        by the US Department of Education, and nothing here is a prediction of what any individual will earn
        or owe. The figures cover <b>only graduates who received federal financial aid</b>, who were working
        and not enrolled in further study, and for whom this was their highest credential - not everyone who
        attended. <b>A median is not a promise:</b> half of graduates earned less than the number shown.
        Programs with fewer than 30 reported graduates are suppressed by the Department, so smaller programs
        are systematically absent and <b>a program missing from this site is evidence of nothing</b>. Figures
        describe a cohort that finished several years ago and may not reflect a field as it stands today.
        Earnings vary enormously within any one program by role, employer and location. Verify anything that
        matters against the school and the{" "}
        <a href="https://collegescorecard.ed.gov/" target="_blank" rel="noopener noreferrer"
           style={{ color: BAND.mod, textDecoration: "underline" }}>official College Scorecard</a> before
        making a decision. This site is independent and is not affiliated with, or endorsed by, the US
        Department of Education or any institution named on it.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SOURCES / BIBLIOGRAPHY. Every URL here was actually fetched while building
// this site (2026-08-04) - this is a citation list, not a plausible-looking one.
// RELEASE is the dated release the shipped parquet was built from; it appears
// in the source filenames and changes each publication, so it is the single
// value to bump when the data is rebuilt.
// ---------------------------------------------------------------------------
const RELEASE = { id: "06102026", label: "June 10, 2026", accessed: "August 4, 2026" };
const DL = "https://ed-public-download.scorecard.network/downloads";

const SOURCES = [
  {
    n: 1,
    title: "College Scorecard - Most Recent Cohorts: Field of Study",
    org: "US Department of Education",
    detail: "The primary dataset. One row per institution × 4-digit CIP field × credential level; carries median earnings and median cumulative debt. 227,980 rows, of which 38,869 carry both figures and form this site's corpus.",
    href: `${DL}/Most-Recent-Cohorts-Field-of-Study_${RELEASE.id}.zip`,
    hrefLabel: "Most-Recent-Cohorts-Field-of-Study_" + RELEASE.id + ".zip",
  },
  {
    n: 2,
    title: "College Scorecard - Most Recent Cohorts: Institution",
    org: "US Department of Education",
    detail: "Used only to attach state and city to each institution. The field-of-study file carries no geography of its own.",
    href: `${DL}/Most-Recent-Cohorts-Institution_${RELEASE.id}.zip`,
    hrefLabel: "Most-Recent-Cohorts-Institution_" + RELEASE.id + ".zip",
  },
  {
    n: 3,
    title: "Technical Documentation: College Scorecard Data by Field of Study",
    org: "US Department of Education",
    detail: "The definitions this site relies on: who is in the earnings cohort (federally-aided graduates, working, not enrolled, highest credential), the CREDLEV credential codes, and the privacy-suppression rule.",
    href: "https://collegescorecard.ed.gov/assets/FieldOfStudyDataDocumentation.pdf",
    hrefLabel: "FieldOfStudyDataDocumentation.pdf",
  },
  {
    n: 4,
    title: "College Scorecard Data Dictionary",
    org: "US Department of Education",
    detail: "Per-variable definitions. Confirms EARN_MDN_HI_1YR as median earnings of graduates working and not enrolled one year after completing their highest credential, and DEBT_ALL_STGP_EVAL_MDN as median Stafford and Grad PLUS debt disbursed at the institution.",
    href: "https://collegescorecard.ed.gov/assets/CollegeScorecardDataDictionary.xlsx",
    hrefLabel: "CollegeScorecardDataDictionary.xlsx",
  },
  {
    n: 5,
    title: "College Scorecard - data home",
    org: "US Department of Education",
    detail: "Where every file above is published, and the place to check for a newer release than the one this site was built from.",
    href: "https://collegescorecard.ed.gov/data/",
    hrefLabel: "collegescorecard.ed.gov/data",
  },
];

// The Department compiles the Scorecard from these; worth naming, because
// "earnings" here means tax records, not a survey, and that is unusual.
const UPSTREAM = [
  ["IPEDS", "Integrated Postsecondary Education Data System - enrolment and completions."],
  ["NSLDS", "National Student Loan Data System - the cumulative debt figures."],
  ["US Treasury / IRS", "Administrative tax records - the earnings figures. Not self-reported, and not a survey."],
];

function SourcesFull({ ink, dark }) {
  return (
    <Card ink={ink} title="Sources"
          note={`Every figure on this site comes from the files below. Release of ${RELEASE.label}; accessed ${RELEASE.accessed}. All are US Government works in the public domain.`}>
      <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 12 }}>
        {SOURCES.map((s) => (
          <li key={s.n} style={{ color: ink.text, fontSize: 13, lineHeight: 1.55 }}>
            <b>{s.title}.</b> <span style={{ color: ink.muted }}>{s.org}.</span>
            <div style={{ color: ink.muted, fontSize: 12.5, margin: "3px 0 4px" }}>{s.detail}</div>
            <a href={s.href} target="_blank" rel="noopener noreferrer"
               style={{ color: BAND.mod, fontSize: 12, wordBreak: "break-all", textDecoration: "underline" }}>{s.hrefLabel}</a>
          </li>
        ))}
      </ol>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${ink.line}` }}>
        <div style={{ color: ink.text, fontSize: 13, fontWeight: 650, marginBottom: 6 }}>What the Department compiles it from</div>
        <div style={{ display: "grid", gap: 5 }}>
          {UPSTREAM.map(([k, v]) => (
            <div key={k} style={{ fontSize: 12.5, color: ink.muted, lineHeight: 1.5 }}>
              <b style={{ color: ink.text }}>{k}</b> - {v}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${ink.line}`, color: ink.muted, fontSize: 12.5, lineHeight: 1.55 }}>
        <b style={{ color: ink.text }}>What this site adds:</b> nothing but arithmetic and presentation. Debt vs pay is
        median debt divided by median first-year earnings - no weighting, no modelling, no estimates of our own.
        The transformation is a single documented script; no row is altered and none is dropped except where a
        program is missing one of the two figures.
      </div>
    </Card>
  );
}

// Compact citation for the bottom of every non-About page.
function SourceLine({ ink }) {
  return (
    <div style={{ color: ink.muted, fontSize: 12, lineHeight: 1.55 }}>
      <b>Source:</b> US Department of Education, <i>College Scorecard - Most Recent Cohorts: Field of Study
      and Institution</i>, release of {RELEASE.label} (accessed {RELEASE.accessed}). Public domain.{" "}
      <a href="zz-about.html" style={{ color: BAND.mod, textDecoration: "underline" }}>Full sources and method</a>.
    </div>
  );
}

// Built-on credit. Malloy/Malloyyo are the spine of this project, not a
// dependency footnote: the whole app is a semantic model plus four dashboards,
// with no backend and almost no application code. Shown on every page.
function BuiltWith({ ink, dark }) {
  const A = ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
       style={{ color: BAND.mod, textDecoration: "underline", fontWeight: 600 }}>{children}</a>
  );
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "10px 18px", alignItems: "baseline",
      background: dark ? "rgba(22,26,36,0.60)" : "rgba(255,255,255,0.66)",
      border: `1px solid ${ink.line}`, borderRadius: 10, padding: "12px 16px",
    }}>
      <span style={{ color: ink.text, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>
        Built on Malloy
      </span>
      <span style={{ color: ink.muted, fontSize: 12.5, lineHeight: 1.55, flex: "1 1 420px", minWidth: 0 }}>
        This whole site is a <A href="https://malloydata.dev">Malloy</A> semantic model and four dashboards,
        compiled by <A href="https://github.com/malloydata/malloyyo">Malloyyo</A> into static pages that query
        a Parquet file in your browser with DuckDB-WASM. No backend, no database server, almost no application
        code - and because the query engine ships to you, nothing you do here is transmitted anywhere. Malloy
        and Malloyyo are the work of Lloyd Tabb and the Malloy team; the pattern is the one shown by his{" "}
        <A href="https://lloydtabb.github.io/wordfinder/">Word Finder</A>.
      </span>
    </div>
  );
}


function go(slug, givens) { parent.postMessage({ type: "navigate", dashboard: slug, givens }, "*"); }



export default function Dashboard({ dashboard, givens }) {
  const ink = useInk();
  const head = useQuery({ query: "headline", givens });
  const best = useQuery({ query: "best_value", givens });
  const worst = useQuery({ query: "worst_value", givens });
  const bands = useQuery({ query: "verdict_split", givens });
  const scatter = useQuery({ query: "field_scatter", givens });
  const dist = useQuery({ query: "ratio_distribution", givens });
  const big = useQuery({ query: "biggest_fields", givens });

  const h = (head.rows || [])[0] || {};
  const bestRows = (best.rows || []).slice(0, 12);
  const worstRows = (worst.rows || []).slice(0, 12);
  const bandRows = bands.rows || [];
  const bandTotal = bandRows.reduce((a, r) => a + n(r.programs_in_band), 0);

  const pts = (scatter.rows || []).map((r) => ({
    field: r.field, earnings: n(r.earnings), debt: n(r.debt),
    ratio: n(r.ratio), grads: n(r.grads), band: bandOf(n(r.ratio)),
  }));
  // Cap the square axis at a high percentile rather than the raw max: a single
  // outlier field otherwise squeezes every other dot into the corner. The
  // diagonal only reads as "break-even" if BOTH axes share one scale, so this
  // is one number used twice, never two independent scales.
  const vals = pts.flatMap((p) => [p.debt, p.earnings]).sort((a, b) => a - b);
  const pct = (q) => (vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * q))] : 1);
  const axisMax = Math.max(1000, pct(0.98)) * 1.08;

  // Bins are rendered as an ORDINAL axis, not a quantitative binned one.
  // Vega-Lite's {binned:true} + x2 encoding drew nothing here; an ordinal axis
  // gives each bar a natural band width and is easier to read anyway at 13 bins.
  const BIN_STEP = 0.25;
  const distRows = (dist.rows || []).map((r) => {
    const b = n(r.ratio_bin);
    return {
      bin: b,
      label: b >= 3 ? "3x+" : `${b}x`,
      programs: n(r.programs_in_bin),
      band: bandOf(b),
    };
  }).sort((a, b) => a.bin - b.bin);
  const binOrder = distRows.map((d) => d.label);

  const dumbbell = [];
  (big.rows || []).forEach((r) => {
    dumbbell.push({ field: r.field, kind: "Debt", amount: n(r.debt), grads: n(r.grads) });
    dumbbell.push({ field: r.field, kind: "Pay (1 yr)", amount: n(r.earnings), grads: n(r.grads) });
  });
  const bigOrder = (big.rows || []).map((r) => r.field);

  return (
    <PageShell dark={ink.dark}>
      <Masthead ink={ink} dark={ink.dark}
                kicker="First Year Out"
                title="What a degree pays, against what it costs"
                blurb="Every college program in America, ranked by what graduates earned in their first year out against what they borrowed to get there. The government publishes these numbers one school at a time. This asks the question across all of them at once." />
      <Controls>
        <Given name="CREDENTIAL" />
        <Given name="FIELD" />
        <Given name="STATE" />
        <Given name="CONTROL" />
        <Given name="MIN_GRADS" />
      </Controls>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, background: ink.surface, border: `1px solid ${ink.line}`, borderRadius: 10, padding: "14px 16px" }}>
        <Stat ink={ink} label="Programs" value={Math.round(n(h.programs_shown)).toLocaleString()} sub="matching your filters" />
        <Stat ink={ink} label="Typical pay" value={usd(h.typical_earnings)} sub="median, 1 year after" />
        <Stat ink={ink} label="Typical debt" value={usd(h.typical_debt)} sub="median borrowed" />
        <Stat ink={ink} label="Debt vs pay" value={ratio(h.typical_ratio)} sub="1.00x = one year's earnings" />
        <Stat ink={ink} label="Graduates / yr" value={Math.round(n(h.graduates)).toLocaleString()} sub="across these programs" />
      </div>

      <Card ink={ink} title="What each field pays, against what it costs"
            note="One dot per field of study. The diagonal is break-even - one year's pay equals the debt. Below the line, graduates owe more than they make in a year. Dot size is graduates per year.">
        {pts.length === 0 ? <div style={{ color: ink.muted, fontSize: 13 }}>Nothing matches these filters.</div> : (
          <Chart ink={ink} height={380} data={pts} spec={{
            layer: [
              { data: { values: [{ x: 0, y: 0 }, { x: axisMax, y: axisMax }] },
                mark: { type: "line", strokeDash: [5, 4], color: ink.muted, opacity: 0.7 },
                encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } } },
              { mark: { type: "circle", opacity: 0.72 },
                encoding: {
                  x: { field: "debt", type: "quantitative", title: "Median debt", scale: { domain: [0, axisMax], nice: false }, axis: { format: "$.2~s", tickCount: 6 } },
                  y: { field: "earnings", type: "quantitative", title: "Median pay, 1 year after", scale: { domain: [0, axisMax], nice: false }, axis: { format: "$.2~s", tickCount: 6 } },
                  size: { field: "grads", type: "quantitative", title: "Graduates / yr", scale: { range: [20, 900] }, legend: null },
                  color: { field: "band", type: "nominal", title: "Debt vs pay", scale: { domain: BAND_DOMAIN, range: BAND_RANGE } },
                  tooltip: [
                    { field: "field", title: "Field" },
                    { field: "earnings", title: "Median pay", format: "$,.0f" },
                    { field: "debt", title: "Median debt", format: "$,.0f" },
                    { field: "ratio", title: "Debt vs pay", format: ".2f" },
                    { field: "grads", title: "Graduates / yr", format: ",.0f" },
                  ],
                } },
            ],
          }} />
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 14 }}>
        <Card ink={ink} title="The shape of it"
              note="How many programs sit at each debt level. Most of the mass is on the left; the harm is in the tail.">
          {distRows.length === 0 ? <div style={{ color: ink.muted, fontSize: 13 }}>No data.</div> : (
            <Chart ink={ink} height={230} data={distRows} spec={{
              mark: { type: "bar", cornerRadiusEnd: 2, width: { band: 0.82 } },
              encoding: {
                x: { field: "label", type: "ordinal", title: "Debt as a multiple of one year's pay", sort: binOrder, axis: { labelAngle: 0 } },
                y: { field: "programs", type: "quantitative", title: "Programs" },
                color: { field: "band", type: "nominal", scale: { domain: BAND_DOMAIN, range: BAND_RANGE }, legend: null },
                tooltip: [
                  { field: "label", title: "Debt vs pay (from)" },
                  { field: "programs", title: "Programs", format: ",.0f" },
                  { field: "band", title: "Band" },
                ],
              },
            }} />
          )}
          <div style={{ display: "grid", gap: 5, marginTop: 12 }}>
            {bandRows.map((b, i) => {
              const pct = bandTotal ? (n(b.programs_in_band) / bandTotal) * 100 : 0;
              const key = String(b.debt_verdict || "");
              const col = key.startsWith("Light") ? BAND.light : key.startsWith("Moderate") ? BAND.mod : key.startsWith("Heavy") ? BAND.heavy : key.startsWith("Very") ? BAND.vheavy : ink.muted;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(120px,240px) 1fr auto", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: ink.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{key}</span>
                  <div style={{ height: 8, background: ink.track, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 12, color: ink.muted, whiteSpace: "nowrap" }}>{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card ink={ink} title="Where people actually are"
              note="The biggest fields by graduates per year. Each line runs from what they borrow to what they earn - longer and further right is better.">
          {dumbbell.length === 0 ? <div style={{ color: ink.muted, fontSize: 13 }}>No data.</div> : (
            <Chart ink={ink} height={Math.max(230, bigOrder.length * 22)} data={dumbbell} spec={{
              encoding: {
                y: { field: "field", type: "nominal", title: null, sort: bigOrder, axis: { labelLimit: 230 } },
                x: { field: "amount", type: "quantitative", title: "Dollars", axis: { format: "$.2~s", tickCount: 6 } },
              },
              layer: [
                { mark: { type: "line", color: ink.muted, opacity: 0.55, strokeWidth: 2 }, encoding: { detail: { field: "field", type: "nominal" } } },
                { mark: { type: "point", filled: true, size: 90, opacity: 0.95 },
                  encoding: {
                    color: { field: "kind", type: "nominal", title: null, scale: { domain: ["Debt", "Pay (1 yr)"], range: [BAND.vheavy, BAND.light] } },
                    tooltip: [
                      { field: "field", title: "Field" },
                      { field: "kind", title: "" },
                      { field: "amount", title: "Amount", format: "$,.0f" },
                      { field: "grads", title: "Graduates / yr", format: ",.0f" },
                    ],
                  } },
              ],
            }} />
          )}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 14 }}>
        <Card ink={ink} title="Lightest debt relative to pay" note="Ranked by debt as a multiple of first-year pay - NOT by pay itself, and not a judgement of quality. A low-debt, low-pay program can outrank a high-pay one. Click a field or school to dig in.">
          <RankList ink={ink} rows={bestRows} accent={BAND.light} go={go} />
        </Card>
        <Card ink={ink} title="Heaviest debt relative to pay" note="Where debt most outweighs first-year pay. Check the cohort size: a program graduating a handful of people a year has an unstable median.">
          <RankList ink={ink} rows={worstRows} accent={BAND.vheavy} go={go} />
        </Card>
      </div>

      <Disclaimer ink={ink} dark={ink.dark} />
      <BuiltWith ink={ink} dark={ink.dark} />
      <SourceLine ink={ink} />
    </PageShell>
  );
}

function RankList({ ink, rows, accent, go }) {
  if (!rows.length) return <div style={{ color: ink.muted, fontSize: 13 }}>No programs match these filters.</div>;
  return (
    <div style={{ display: "grid", gap: 0 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 10, alignItems: "baseline", padding: "7px 0", borderTop: i ? `1px solid ${ink.line}` : "none" }}>
          <span style={{ color: ink.muted, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
          <div style={{ minWidth: 0 }}>
            <div
              onClick={() => go("field-compare", { FIELD: filters.oneOf(r.field) })}
              title="Compare this field across schools"
              style={{ color: ink.text, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >{r.field}</div>
            <div
              onClick={() => go("school-profile", { SCHOOL: filters.oneOf(r.school) })}
              title="See every program at this school"
              style={{ color: ink.muted, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >{r.school}{r.state ? ` · ${r.state}` : ""}</div>
          </div>
          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <div style={{ color: accent, fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{ratio(r.ratio)}</div>
            <div style={{ color: ink.muted, fontSize: 11 }}>
              {usd(r.earnings)} pay · {usd(r.debt)} debt
              {n(r.grads) > 0 && <> · <span title="Graduates per year. A small cohort makes any median unstable.">{Math.round(n(r.grads)).toLocaleString()}/yr</span></>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
