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
