// Post-bundle HTML polish. `malloyyo dashboard bundle` writes the pages, so
// anything the bundler does not emit (meta description, favicon, og tags) is
// injected here. Run it after every bundle; it is idempotent.
const fs = require("fs"), path = require("path");
const DOCS = path.join(__dirname, "..", "docs");
const DESC = "Every US college program ranked by what graduates earned in their first year out against what they borrowed. Public Department of Education data, queried in your browser.";
const OG = "First Year Out - what a degree pays, against what it costs";

// Inline SVG favicon: the break-even diagonal, the same device the masthead uses.
const FAVICON = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
  '<rect width="32" height="32" rx="7" fill="#1a2740"/>' +
  '<path d="M4 28 L28 4" stroke="#8fa8d8" stroke-width="2" stroke-dasharray="4 3" fill="none"/>' +
  '<circle cx="12" cy="10" r="3.4" fill="#1a7f5a"/>' +
  '<circle cx="20" cy="16" r="2.8" fill="#4f8fd6"/>' +
  '<circle cx="25" cy="24" r="2.4" fill="#b4432c"/></svg>');

// The bundler's nav ships a LINE-ART home glyph. Andrew's standing rule is no
// line art anywhere on our pages, so it is replaced here with a solid mark that
// reuses this site's own device (the break-even diagonal and its dots).
const BRAND_MARK = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
  '<path d="M2 21 L21 3" stroke="#c9d4e6" stroke-width="1.7" stroke-dasharray="3 2.4" fill="none"/>' +
  '<circle cx="8" cy="8" r="2.6" fill="#3fa37a"/>' +
  '<circle cx="14" cy="12.5" r="2.2" fill="#6ba2de"/>' +
  '<circle cx="19" cy="19" r="1.9" fill="#c9614a"/></svg>');
const CSS_PATCH = `
/* A native <select> sizes itself to its LONGEST option. The field-of-study list
   contains names like "Registered Nursing, Nursing Administration, Nursing
   Research and Clinical Nursing", which forced the page to ~770px wide at a
   390px viewport and produced a horizontal scroll. Caught by scripts/stress.js. */
/* The controls carry no class names, so this is targeted structurally. A flex/grid
   item defaults to min-width:auto and will NOT shrink below its content, so the
   cap has to be applied to the LABEL wrapper as well as the select itself. */
select,input{max-width:100%;min-width:0;box-sizing:border-box}
label{min-width:0;max-width:100%;overflow:hidden}
label>select{width:100%}

/* replace the line-art home glyph with a solid mark (no line art, house rule) */
nav.dash-nav a.brand svg{display:none}
nav.dash-nav a.brand{
  width:19px;height:19px;display:inline-block;
  background:url("${BRAND_MARK}") center/contain no-repeat;
}
`;
const cssPath = path.join(DOCS, "assets", "site.css");
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, "utf8");
  if (!css.includes("house rule")) fs.appendFileSync(cssPath, CSS_PATCH);
}

let n = 0;
for (const f of fs.readdirSync(DOCS).filter((x) => x.endsWith(".html"))) {
  const p = path.join(DOCS, f);
  let html = fs.readFileSync(p, "utf8");
  if (html.includes('name="description"')) continue;      // idempotent
  const title = (html.match(/<title>([^<]*)<\/title>/) || [, OG])[1];
  html = html.replace("</head>",
    `<meta name="description" content="${DESC}">\n` +
    `<meta property="og:title" content="${title}">\n` +
    `<meta property="og:description" content="${DESC}">\n` +
    `<meta property="og:type" content="website">\n` +
    `<link rel="icon" href="${FAVICON}">\n` +
    `</head>`);
  fs.writeFileSync(p, html);
  n++;
}
console.log(`post-bundle: patched ${n} page(s) with description, og tags and favicon`);
