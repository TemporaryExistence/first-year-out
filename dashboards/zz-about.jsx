// @ts-nocheck
// About - what this data is, who is in it, and the four things it cannot tell
// you. The coverage figures are QUERIED rather than written down, so this page
// cannot drift from the parquet it describes.
import React from "react";
import { useQuery } from "@malloyyo/dashboard";

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
const pctFmt = (v) => Math.round(n(v) * 100) + "%";
const perMonth = (v) => "$" + Math.round(n(v)).toLocaleString() + "/mo";
// Only show legend entries that actually occur, so a chart of uniformly-green
// dots stops advertising three bands the reader will never find on it.
const bandsPresent = (rows) => BAND_DOMAIN.filter((b) => rows.some((r) => r.band === b));
const bandScale = (rows) => {
  const dom = bandsPresent(rows);
  return { domain: dom, range: dom.map((d) => BAND_RANGE[BAND_DOMAIN.indexOf(d)]) };
};

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
// True only when the pay and debt ranges overlap, i.e. when y = x actually
// crosses the visible plot. When every programme out-earns its debt the line has
// nowhere to sit - which is itself worth saying, but NOT worth captioning as if
// a line were there.
function breakEvenVisible(pts) {
  const span = (vals) => {
    const v = vals.filter((x) => isFinite(x)).sort((a, b) => a - b);
    if (!v.length) return [0, 1];
    const q = (p) => v[Math.min(v.length - 1, Math.max(0, Math.floor(v.length * p)))];
    const lo = q(0.01), hi = q(0.99), pad = Math.max(1, (hi - lo) * 0.06);
    return [Math.max(0, lo - pad), hi + pad];
  };
  const xd = span(pts.map((p) => p.debt)), yd = span(pts.map((p) => p.earnings));
  return Math.min(xd[1], yd[1]) > Math.max(xd[0], yd[0]);
}

function payVsDebtSpec({ ink, pts, xTitle, yTitle, labelField }) {
  // Each axis is fitted to ITS OWN data. Forcing one shared domain kept the
  // 45-degree geometry but, because pay runs far higher than debt, left most of
  // the plot empty - the dots crushed into a corner of a mostly blank square.
  // The break-even reference is still exactly y = x; it is drawn from the real
  // overlap of the two ranges, so it stays truthful at whatever angle it lands.
  const span = (vals, padLo, padHi) => {
    const v = vals.filter((x) => isFinite(x)).sort((a, b) => a - b);
    if (!v.length) return [0, 1];
    const q = (p) => v[Math.min(v.length - 1, Math.max(0, Math.floor(v.length * p)))];
    const lo = q(0.01), hi = q(0.99), pad = Math.max(1, (hi - lo) * 0.06);
    return [Math.max(0, lo - pad * padLo), hi + pad * padHi];
  };
  const xd = span(pts.map((p) => p.debt), 1, 1);
  const yd = span(pts.map((p) => p.earnings), 1, 1);
  // The y = x line only exists where the two ranges overlap.
  const a = Math.max(xd[0], yd[0]), b = Math.min(xd[1], yd[1]);
  const diag = b > a ? [{ x: a, y: a }, { x: b, y: b }] : [];
  const shade = b > a ? [{ x: a, yTop: a, yBot: yd[0] }, { x: b, yTop: b, yBot: yd[0] }] : [];
  const labelPos = b > a ? (a + b) / 2 : null;
  return {
    layer: [
      { data: { values: shade },
        mark: { type: "area", color: BAND.vheavy, opacity: 0.08, line: false },
        encoding: { x: { field: "x", type: "quantitative" },
                    y: { field: "yTop", type: "quantitative" }, y2: { field: "yBot" } } },
      { data: { values: diag },
        mark: { type: "line", strokeDash: [5, 4], color: ink.muted, opacity: 0.75 },
        encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } } },
      { data: { values: labelPos == null ? [] : [{ x: b, y: b }] },
        mark: { type: "text", text: "break-even: debt = a year of pay", dy: -6, dx: -2,
                align: "right", baseline: "bottom", fontSize: 10.5, color: ink.muted, opacity: 0.9 },
        encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } } },
      { mark: { type: "circle", opacity: 0.72 },
        encoding: {
          x: { field: "debt", type: "quantitative", title: xTitle, scale: { domain: xd, nice: false, clamp: true }, axis: { format: "$.2~s", tickCount: 6 } },
          y: { field: "earnings", type: "quantitative", title: yTitle, scale: { domain: yd, nice: false, clamp: true }, axis: { format: "$.2~s", tickCount: 6 } },
          size: { field: "grads", type: "quantitative", scale: { range: [25, 700] }, legend: null },
          color: { field: "band", type: "nominal", title: "Debt vs pay", scale: bandScale(pts) },
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
      <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>{children}</div>
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
        <p style={{ margin: "7px 0 0", color: ink.muted, fontSize: 14, lineHeight: 1.5, maxWidth: 620 }}>{blurb}</p>
      </div>
    </div>
  );
}

// The disclaimer. Deliberately NOT small grey print at the bottom of one page:
// it sits on EVERY dashboard, and it is the thing that keeps this site honest
// about making financial statements concerning named schools and named programs.
function Disclaimer({ ink, dark }) {
  const L = ({ children }) => (
    <li style={{ margin: "0 0 3px" }}>{children}</li>
  );
  return (
    <div style={{
      background: dark ? "rgba(28,24,20,0.62)" : "rgba(255,251,244,0.82)",
      border: `1px solid ${dark ? "#4a3b2c" : "#e7d9c2"}`,
      borderLeft: `3px solid ${BAND.heavy}`,
      borderRadius: 10, padding: "13px 16px",
    }}>
      <div style={{ color: ink.text, fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
        Not advice. Read before concluding anything.
      </div>
      <ul style={{ color: ink.muted, fontSize: 12.5, lineHeight: 1.55, margin: 0, paddingLeft: 17 }}>
        <L><b>A median is not a promise.</b> Half of graduates earned less.</L>
        <L><b>Not everyone is counted</b> - only graduates who took federal aid, were working, and stopped studying.</L>
        <L><b>Missing is not bad.</b> Programs under 30 graduates are withheld by the Department.</L>
        <L><b>The figures lag.</b> This cohort finished years ago.</L>
      </ul>
      <div style={{ color: ink.muted, fontSize: 12, marginTop: 7 }}>
        Independent; not affiliated with the Department of Education or any school named here.{" "}
        <a href="zz-about.html" style={{ color: BAND.mod, textDecoration: "underline" }}>Full limitations</a>
        {" · "}
        <a href="https://collegescorecard.ed.gov/" target="_blank" rel="noopener noreferrer"
           style={{ color: BAND.mod, textDecoration: "underline" }}>Official Scorecard</a>
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
      <b>Source:</b> US Department of Education, College Scorecard, {RELEASE.label}. Public domain.{" "}
      <a href="zz-about.html" style={{ color: BAND.mod, textDecoration: "underline" }}>Sources and method</a>.
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
      display: "flex", flexWrap: "wrap", gap: "8px 16px", alignItems: "baseline",
      background: dark ? "rgba(22,26,36,0.60)" : "rgba(255,255,255,0.66)",
      border: `1px solid ${ink.line}`, borderRadius: 10, padding: "12px 16px",
    }}>
      <span style={{ color: ink.text, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>Built on Malloy</span>
      <span style={{ color: ink.muted, fontSize: 12.5, lineHeight: 1.55, flex: "1 1 380px", minWidth: 0 }}>
        A <A href="https://www.malloydata.dev/">Malloy</A> model and four dashboards, compiled by{" "}
        <A href="https://github.com/malloydata/malloyyo">Malloyyo</A> into static pages that query a Parquet
        file in your browser. No backend - so nothing you do here is sent anywhere. By Lloyd Tabb and the
        Malloy team, following his <A href="https://lloydtabb.github.io/wordfinder/">Word Finder</A>.
      </span>
    </div>
  );
}


function P({ ink, children }) {
  return <p style={{ color: ink.text, fontSize: 14, lineHeight: 1.6, margin: "0 0 10px" }}>{children}</p>;
}
function H({ ink, children }) {
  return <div style={{ color: ink.text, fontSize: 15, fontWeight: 650, margin: "4px 0 8px" }}>{children}</div>;
}

export default function Dashboard({ dashboard, givens }) {
  const ink = useInk();
  const cov = useQuery({ query: "coverage", givens });
  const sch = useQuery({ query: "school_count", givens });
  const fld = useQuery({ query: "field_count", givens });
  const sta = useQuery({ query: "state_count", givens });
  const lvl = useQuery({ query: "coverage_by_level", givens });
  const c = (cov.rows || [])[0] || {};
  const one = (q) => n(((q.rows || [])[0] || {}).how_many);
  // Until the first rows arrive every tile reads 0, which on the page that
  // exists to establish credibility looks like a site with no data in it.
  const loading = !(cov.rows && cov.rows.length);
  const show = (v) => (loading ? "—" : v);
  const lvlRows = lvl.rows || [];

  return (
    <PageShell dark={ink.dark}>
      <Masthead ink={ink} dark={ink.dark}
                kicker="First Year Out"
                title="Where these numbers come from, and what they cannot tell you"
                blurb="What the numbers are, who is counted, and where they stop being reliable." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14, background: ink.surface, border: `1px solid ${ink.line}`, borderRadius: 10, padding: "14px 16px" }}>
        <Stat ink={ink} label="Programs" value={show(Math.round(n(c.total_programs)).toLocaleString())} />
        <Stat ink={ink} label="Schools" value={show(Math.round(one(sch)).toLocaleString())} />
        <Stat ink={ink} label="Fields of study" value={show(Math.round(one(fld)).toLocaleString())} />
        <Stat ink={ink} label="States & territories" value={show(Math.round(one(sta)).toLocaleString())} />
        <Stat ink={ink} label="Graduates / yr" value={show(Math.round(n(c.graduates)).toLocaleString())} />
      </div>

      <Card ink={ink} title="Where the numbers come from">
        <P ink={ink}>
          The US Department of Education's <b>College Scorecard</b>, field-of-study release. One row is one
          program: a school, a four-digit CIP field, a credential level. Earnings from Treasury/IRS records,
          debt from the National Student Loan Data System. Public domain; we add no estimates.
        </P>
        <P ink={ink}>
          <b>Debt vs pay</b> is median debt over median first-year pay - the ratio regulators use, not a
          score we invented. 1.00x means a graduate owes about a year's pay.
        </P>
        <H ink={ink}>The monthly payment</H>
        <P ink={ink}>
          The <b>Department's own</b> 10-year standard-repayment estimate, not one we derived. <b>Share of
          pay</b> is twelve of those payments against median first-year pay. Reported for every program here.
        </P>
        <H ink={ink}>Beat a high-school graduate</H>
        <P ink={ink}>
          The Department's own benchmark, and the one thing a debt ratio cannot tell you: whether the
          credential beat not having one. Reported for about 83% of programs here.
        </P>
      </Card>

      <Card ink={ink} title="Four things this data cannot tell you" note="Read these before drawing a conclusion about any specific program.">
        <H ink={ink}>1. It is not everyone - it is federally-aided graduates</H>
        <P ink={ink}>
          Only graduates who took federal aid, were working, were not studying, and for whom this was their
          highest credential. Where few students borrow, the figure describes a minority of the class.
        </P>
        <H ink={ink}>2. Small programs are missing, and not at random</H>
        <P ink={ink}>
          The Department suppresses any figure covering fewer than 30 graduates. Most of the raw file is
          suppressed on one side or the other; only the rows carrying <i>both</i> an earnings and a debt
          figure are loaded here. That systematically removes small programs - so absence from this site
          is not evidence of anything about a program.
        </P>
        <H ink={ink}>3. Five years is as far as this data sees</H>
        <P ink={ink}>
          The Department publishes earnings at one year and at five years after finishing, by field. It does
          not publish a career. That matters more than it sounds: median pay rises about <b>60% between year
          one and year five</b>, and the rise is very uneven. Fields that normally feed into graduate school
          look catastrophic at year one because many of those graduates were still studying - speech
          pathology graduates show about $4,900 at year one and roughly $70,000 at year five.
        </P>
        <P ink={ink}>
          So the site shows <b>both horizons everywhere</b>, and any ranking on the year-one figure should be
          read with the year-five figure beside it. Neither is a career. Earnings are also pooled across
          award years, so this cohort entered the job market well before today.
        </P>
        <H ink={ink}>4. A median is not a promise</H>
        <P ink={ink}>
          Half of graduates earned less. Earnings vary enormously within one program by role, employer and
          location. This is the shape of a distribution, not a forecast.
        </P>
      </Card>

      <Card ink={ink} title="Coverage by credential level" note="Queried live from the data this site loads.">
        {/* RATER: this was a bar chart with a DETACHED list of numbers underneath,
            so the reader had to match rows by position. One row per level now. */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5, minWidth: 520 }}>
            <thead>
              <tr style={{ color: ink.muted, textAlign: "left" }}>
                {["Credential", "Programs", "Median pay", "Median debt", "Debt vs pay"].map((hd, i) => (
                  <th key={hd} style={{ padding: "6px 8px", fontWeight: 600, borderBottom: `1px solid ${ink.line}`, textAlign: i ? "right" : "left", whiteSpace: "nowrap" }}>{hd}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lvlRows.map((r, i) => {
                const maxP = Math.max(...lvlRows.map((x) => n(x.programs_at_level)), 1);
                return (
                  <tr key={i}>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${ink.line}`, color: ink.text }}>{r.credential}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${ink.line}`, textAlign: "right", color: ink.text, whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-block", width: 60, height: 6, background: ink.track, borderRadius: 3, marginRight: 8, verticalAlign: "middle", overflow: "hidden" }}>
                        <span style={{ display: "block", width: `${(n(r.programs_at_level) / maxP) * 100}%`, height: "100%", background: ACCENT }} />
                      </span>
                      {Math.round(n(r.programs_at_level)).toLocaleString()}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${ink.line}`, textAlign: "right", color: ink.muted, whiteSpace: "nowrap" }}>{usd(r.earnings)}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${ink.line}`, textAlign: "right", color: ink.muted, whiteSpace: "nowrap" }}>{usd(r.debt)}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${ink.line}`, textAlign: "right", color: n(r.ratio) < 1 ? BAND.light : n(r.ratio) < 2 ? ink.text : BAND.vheavy, fontWeight: 600, whiteSpace: "nowrap" }}>{ratio(r.ratio)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Disclaimer ink={ink} dark={ink.dark} />

      <SourcesFull ink={ink} dark={ink.dark} />

      <Card ink={ink} title="How it is built">
        <P ink={ink}>
          A Malloy model over a Parquet file, queried <b>in your browser</b> with DuckDB-WASM. No server,
          no database: the page fetches one file and every filter runs on your machine. Nothing is sent
          anywhere. Built with <b>Malloyyo</b>.
        </P>
      </Card>
      <BuiltWith ink={ink} dark={ink.dark} />
    </PageShell>
  );
}
