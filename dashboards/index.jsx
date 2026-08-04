// Landing page for the published site (`malloyyo dashboard bundle`).
//
// Plain React - no Malloy, no DuckDB, and NO imports. The bundler compiles this
// in its own pass so the intro stays small and the query runtime only loads when
// you open a dashboard. That is why the figures here are written out rather than
// queried: they come from the same build as the data and are checked by
// scripts/check-landing-figures.js against docs/programs.parquet.
//
// This page is the Pages ROOT and the one page every visitor is guaranteed to
// hit, so it carries the disclaimer in full.

const REPO = "https://github.com/TemporaryExistence/first-year-out";
const MALLOYYO = "https://github.com/malloydata/malloyyo";
const MALLOY = "https://malloydata.dev";
const WORDFINDER = "https://lloydtabb.github.io/wordfinder/";
const SCORECARD = "https://collegescorecard.ed.gov/data/";

const FIG = { programs: "38,869", schools: "4,500", fields: "326", pay: "$39,856", debt: "$22,762" };
const RELEASE = "June 10, 2026";

const S = `
/* The colour field, same recipe and same palette as the dashboards. The landing
   page is compiled in the bundler's own pass and cannot import the shared kit,
   so the field is restated here rather than shared - keep the two in step. */
body{
  background:
    radial-gradient(900px 760px at 6% 1%, rgba(96,152,255,0.52), transparent 72%),
    radial-gradient(860px 720px at 72% 4%, rgba(72,190,232,0.46), transparent 72%),
    radial-gradient(940px 780px at 34% 8%, rgba(146,132,248,0.46), transparent 73%),
    radial-gradient(880px 740px at 96% 12%, rgba(104,140,250,0.44), transparent 72%),
    radial-gradient(920px 760px at 12% 17%, rgba(240,158,132,0.34), transparent 72%),
    radial-gradient(900px 750px at 60% 21%, rgba(120,196,240,0.46), transparent 72%),
    radial-gradient(940px 780px at 22% 26%, rgba(152,128,246,0.46), transparent 73%),
    radial-gradient(880px 740px at 88% 30%, rgba(88,168,252,0.44), transparent 72%),
    radial-gradient(920px 770px at 44% 35%, rgba(244,166,140,0.32), transparent 72%),
    radial-gradient(900px 750px at 8% 40%, rgba(112,186,236,0.44), transparent 72%),
    radial-gradient(940px 780px at 74% 44%, rgba(148,130,246,0.46), transparent 73%),
    radial-gradient(880px 740px at 30% 49%, rgba(96,156,252,0.44), transparent 72%),
    radial-gradient(920px 760px at 92% 53%, rgba(242,162,136,0.34), transparent 72%),
    radial-gradient(900px 750px at 16% 58%, rgba(124,192,238,0.44), transparent 72%),
    radial-gradient(940px 780px at 64% 62%, rgba(150,128,248,0.46), transparent 73%),
    radial-gradient(880px 740px at 26% 67%, rgba(92,160,252,0.44), transparent 72%),
    radial-gradient(920px 770px at 84% 71%, rgba(246,168,138,0.36), transparent 72%),
    radial-gradient(900px 750px at 10% 76%, rgba(116,188,238,0.42), transparent 72%),
    radial-gradient(940px 780px at 68% 80%, rgba(146,130,246,0.44), transparent 73%),
    radial-gradient(880px 740px at 34% 85%, rgba(240,160,140,0.38), transparent 72%),
    radial-gradient(920px 760px at 90% 90%, rgba(100,164,250,0.42), transparent 72%),
    radial-gradient(940px 790px at 46% 96%, rgba(244,172,142,0.38), transparent 73%),
    linear-gradient(178deg, #e4ecfa 0%, #e6e6f8 30%, #e9edfb 55%, #f2e7e2 80%, #eef1fb 100%);
  background-repeat:no-repeat;
  background-size:100% 100%;
  background-attachment:scroll;
}
@media (prefers-color-scheme: dark){
  body{
    background:
      radial-gradient(900px 760px at 6% 1%, rgba(52,96,190,0.50), transparent 72%),
    radial-gradient(860px 720px at 72% 5%, rgba(32,116,152,0.46), transparent 72%),
    radial-gradient(940px 780px at 34% 9%, rgba(86,72,180,0.46), transparent 73%),
    radial-gradient(880px 740px at 96% 13%, rgba(50,88,186,0.44), transparent 72%),
    radial-gradient(920px 760px at 12% 18%, rgba(158,88,58,0.34), transparent 72%),
    radial-gradient(900px 750px at 60% 22%, rgba(40,120,168,0.44), transparent 72%),
    radial-gradient(940px 780px at 22% 27%, rgba(92,70,184,0.46), transparent 73%),
    radial-gradient(880px 740px at 88% 31%, rgba(46,94,192,0.44), transparent 72%),
    radial-gradient(920px 770px at 44% 36%, rgba(162,92,60,0.32), transparent 72%),
    radial-gradient(900px 750px at 8% 41%, rgba(38,116,160,0.44), transparent 72%),
    radial-gradient(940px 780px at 74% 45%, rgba(88,72,182,0.46), transparent 73%),
    radial-gradient(880px 740px at 30% 50%, rgba(48,92,190,0.44), transparent 72%),
    radial-gradient(920px 760px at 92% 54%, rgba(160,90,58,0.34), transparent 72%),
    radial-gradient(900px 750px at 16% 59%, rgba(40,118,164,0.44), transparent 72%),
    radial-gradient(940px 780px at 64% 63%, rgba(90,70,184,0.46), transparent 73%),
    radial-gradient(880px 740px at 26% 68%, rgba(46,96,192,0.44), transparent 72%),
    radial-gradient(920px 770px at 84% 72%, rgba(164,94,62,0.36), transparent 72%),
    radial-gradient(900px 750px at 10% 77%, rgba(38,114,158,0.42), transparent 72%),
    radial-gradient(940px 780px at 68% 81%, rgba(88,70,180,0.44), transparent 73%),
    radial-gradient(880px 740px at 34% 86%, rgba(158,88,60,0.38), transparent 72%),
    radial-gradient(920px 760px at 90% 91%, rgba(48,96,194,0.42), transparent 72%),
    radial-gradient(940px 790px at 46% 97%, rgba(162,96,64,0.38), transparent 73%),
    linear-gradient(178deg, #10141d 0%, #14131f 30%, #111722 55%, #1e1712 80%, #101420 100%);
    background-repeat:no-repeat;
    background-size:100% 100%;
    background-attachment:scroll;
  }
}
.lp .stats,.lp .cards a,.lp .warn,.lp .spine{
  background:rgba(255,255,255,.66);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  box-shadow:0 1px 2px rgba(20,30,60,.05),0 8px 24px -14px rgba(20,30,60,.18);
}
@media (prefers-color-scheme: dark){
  .lp .stats,.lp .cards a,.lp .warn,.lp .spine{
    background:rgba(22,25,34,.60);box-shadow:none;
  }
}

.lp{max-width:900px;margin:0 auto;padding:38px 22px 70px}
.lp h1{font-size:34px;line-height:1.1;margin:0 0 10px;letter-spacing:-.025em;font-weight:700}
.lp .kick{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:var(--muted);margin:0 0 8px}
.lp .sub{color:var(--muted);font-size:16.5px;margin:0 0 26px;line-height:1.55;max-width:660px}
.lp h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:34px 0 12px;font-weight:600}
.lp p{margin:0 0 13px;line-height:1.6}
.lp a{color:var(--accent)}
.stats{list-style:none;padding:0;margin:0 0 8px;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:14px;
  border:1px solid var(--line);border-radius:12px;background:var(--card);padding:15px 17px}
.stats .k{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
.stats .v{font-size:22px;font-weight:680;line-height:1.15;margin-top:2px}
.cards{list-style:none;padding:0;margin:0;display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.cards a{display:flex;flex-direction:column;gap:4px;padding:15px 17px;border:1px solid var(--line);border-radius:12px;
  background:var(--card);text-decoration:none;color:inherit}
.cards b{font-size:14.5px}
.cards span{color:var(--muted);font-size:13px;line-height:1.5}
.warn{border:1px solid var(--line);border-left:3px solid #d98324;border-radius:10px;padding:14px 16px;margin:26px 0 0;background:var(--card)}
.warn .t{font-weight:700;font-size:13px;margin-bottom:5px}
.warn p{font-size:12.5px;color:var(--muted);margin:0;line-height:1.62}
.spine{border:1px solid var(--line);border-radius:12px;padding:15px 17px;background:var(--card);margin-top:26px}
.spine .t{font-weight:700;font-size:13.5px;margin-bottom:6px}
.spine p{font-size:12.5px;color:var(--muted);margin:0 0 9px;line-height:1.62}
.note{font-size:12px;color:var(--muted);line-height:1.6;margin-top:26px}
`;

export default function Landing({ dashboards }) {
  const order = ["value-ranking", "field-compare", "school-profile", "zz-about"];
  const blurb = {
    "value-ranking": "Every program in the country, ranked by debt against pay. Start here.",
    "field-compare": "Pick a subject. See how it pays across levels, school types, schools and states.",
    "school-profile": "One institution, every reported program. A school average hides what matters.",
    "zz-about": "Where the numbers come from, what they cannot tell you, and the full sources.",
  };
  const list = order
    .map((slug) => (dashboards || []).find((d) => d.name === slug || d.href === slug + ".html"))
    .filter(Boolean);

  return (
    <main className="lp">
      <style>{S}</style>

      <p className="kick">First Year Out</p>
      <h1>What a degree pays, against what it costs</h1>
      <p className="sub">
        Every US college program, ranked by what graduates earned in their first year out against what
        they borrowed to get there. The Department of Education publishes these numbers one school at a
        time. This asks the question across all of them at once.
      </p>

      <ul className="stats">
        <li><div className="k">Programs</div><div className="v">{FIG.programs}</div></li>
        <li><div className="k">Schools</div><div className="v">{FIG.schools}</div></li>
        <li><div className="k">Fields</div><div className="v">{FIG.fields}</div></li>
        <li><div className="k">Typical pay</div><div className="v">{FIG.pay}</div></li>
        <li><div className="k">Typical debt</div><div className="v">{FIG.debt}</div></li>
      </ul>

      <h2>Start here</h2>
      <ul className="cards">
        {list.map((d) => (
          <li key={d.href}>
            <a href={d.href}>
              <b>{d.title || d.name}</b>
              <span>{blurb[d.name] || d.description}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="warn">
        <div className="t">Read this before you draw a conclusion</div>
        <p>
          <b>This is not financial, career, or admissions advice.</b> It is a plain view of figures
          published by the US Department of Education, and nothing here predicts what any individual will
          earn or owe. The figures cover <b>only graduates who received federal financial aid</b>, who were
          working and not enrolled in further study, and for whom this was their highest credential - not
          everyone who attended. <b>A median is not a promise:</b> half of graduates earned less than the
          number shown. Programs with fewer than 30 reported graduates are suppressed by the Department, so
          smaller programs are systematically absent and <b>a program missing from this site is evidence of
          nothing</b>. Figures describe a cohort that finished several years ago. Earnings vary enormously
          within any one program by role, employer and location. Verify anything that matters against the
          school and the <a href={SCORECARD} target="_blank" rel="noopener noreferrer">official College
          Scorecard</a> before making a decision. This site is independent and is not affiliated with, or
          endorsed by, the US Department of Education or any institution named on it.
        </p>
      </div>

      <div className="spine">
        <div className="t">Built on Malloy</div>
        <p>
          This whole site is a <a href={MALLOY} target="_blank" rel="noopener noreferrer">Malloy</a> semantic
          model and four dashboards, compiled by <a href={MALLOYYO} target="_blank" rel="noopener noreferrer">Malloyyo</a>{" "}
          into static pages that query a Parquet file in your browser with DuckDB-WASM. No backend, no
          database server, almost no application code - and because the query engine ships to you, nothing
          you do here is transmitted anywhere.
        </p>
        <p>
          Malloy and Malloyyo are the work of Lloyd Tabb and the Malloy team. The pattern is the one shown
          by his <a href={WORDFINDER} target="_blank" rel="noopener noreferrer">Word Finder</a>; this is that
          pattern pointed at a higher-stakes dataset. Source:{" "}
          <a href={REPO} target="_blank" rel="noopener noreferrer">the repo</a>.
        </p>
      </div>

      <p className="note">
        <b>Source:</b> US Department of Education, College Scorecard - Most Recent Cohorts: Field of Study
        and Institution, release of {RELEASE}. US Government work, public domain. Earnings derive from
        Treasury/IRS administrative records, debt from the National Student Loan Data System, enrolment
        from IPEDS. This site adds nothing but arithmetic and presentation.
      </p>
    </main>
  );
}
