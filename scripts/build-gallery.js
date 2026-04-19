#!/usr/bin/env node
// @ts-check
// Generates screenshots/index.html from screenshots/manifest.json, producing
// the static site that gets published to GitHub Pages.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOT_DIR = path.join(ROOT, 'screenshots');
const CAPTURE_DIR = path.join(SHOT_DIR, 'captures');
const MANIFEST = path.join(SHOT_DIR, 'manifest.json');

if (!fs.existsSync(MANIFEST)) {
  console.error(`No manifest found at ${MANIFEST}. Run screenshot tests first.`);
  process.exit(1);
}

// Copy the favicon next to index.html so the published site is self-contained.
const FAVICON_SRC = path.join(ROOT, 'images', 'icon-light-theme-32.png');
if (fs.existsSync(FAVICON_SRC)) {
  fs.copyFileSync(FAVICON_SRC, path.join(SHOT_DIR, 'favicon.png'));
}

// Tell GitHub Pages not to run the content through Jekyll.
fs.writeFileSync(path.join(SHOT_DIR, '.nojekyll'), '');

/** @type {Array<{file:string,title:string,description:string,page:string,viewport:string,group:string}>} */
const entries = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

// Group by `group`, then combine viewports for the same title within each group.
/** @type {Map<string, Map<string, {title:string,description:string,shots:Array<{viewport:string,file:string}>}>>} */
const groups = new Map();
for (const e of entries) {
  if (!groups.has(e.group)) groups.set(e.group, new Map());
  const gmap = groups.get(e.group);
  const key = `${e.page}|${e.title}`;
  if (!gmap.has(key)) {
    gmap.set(key, { title: e.title, description: e.description, shots: [] });
  }
  gmap.get(key).shots.push({ viewport: e.viewport, file: e.file });
}

// Sort viewports so desktop renders first.
const viewportOrder = { desktop: 0, mobile: 1 };
for (const gmap of groups.values()) {
  for (const item of gmap.values()) {
    item.shots.sort((a, b) => (viewportOrder[a.viewport] ?? 9) - (viewportOrder[b.viewport] ?? 9));
  }
}

const commit = process.env.GITHUB_SHA || '';
const shortSha = commit ? commit.slice(0, 7) : '';
const repoUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
  : 'https://github.com/longregen/redirector';
const builtAt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderShot(shot) {
  return `            <figure class="shot shot--${shot.viewport}">
              <div class="shot__frame shot__frame--${shot.viewport}">
                <img loading="lazy" src="captures/${esc(shot.file)}" alt="${esc(shot.viewport)} screenshot" />
              </div>
              <figcaption>
                <span class="badge badge--${shot.viewport}">${shot.viewport === 'mobile' ? 'Mobile' : 'Desktop'}</span>
              </figcaption>
            </figure>`;
}

function renderItem(item) {
  return `        <article class="card">
          <header class="card__header">
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.description)}</p>
          </header>
          <div class="card__shots">
${item.shots.map(renderShot).join('\n')}
          </div>
        </article>`;
}

function renderGroup(name, gmap) {
  const items = Array.from(gmap.values());
  return `      <section class="group" id="${esc(name.toLowerCase())}">
        <h2>${esc(name)}</h2>
        <div class="group__cards">
${items.map(renderItem).join('\n')}
        </div>
      </section>`;
}

const nav = Array.from(groups.keys())
  .map((g) => `<a href="#${esc(g.toLowerCase())}">${esc(g)}</a>`)
  .join('');

const content = Array.from(groups.entries())
  .map(([name, gmap]) => renderGroup(name, gmap))
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirector - Screenshots</title>
  <meta name="description" content="Visual gallery of the Redirector browser extension, captured automatically from the end-to-end test suite." />
  <link rel="icon" href="favicon.png" />
  <style>
    :root {
      --bg: #0b1020;
      --bg-elevated: #131a33;
      --bg-card: #1a2242;
      --border: #29305a;
      --text: #e8ecff;
      --text-dim: #a4abd6;
      --accent: #7c5cff;
      --accent-2: #29e0ff;
      --mobile: #ff7cbd;
      --desktop: #29e0ff;
      --shadow: 0 20px 45px -20px rgba(0, 0, 0, 0.55);
    }

    * { box-sizing: border-box; }

    html, body { margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
        Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
      color: var(--text);
      background: radial-gradient(1200px 800px at 10% -10%, #1c2656 0%, transparent 60%),
                  radial-gradient(1000px 700px at 110% 10%, #2a1657 0%, transparent 55%),
                  var(--bg);
      min-height: 100vh;
      line-height: 1.55;
    }

    a { color: inherit; }

    .site-header {
      padding: 72px 24px 32px;
      text-align: center;
      position: relative;
    }

    .site-header h1 {
      margin: 0;
      font-size: clamp(2.2rem, 5vw, 3.4rem);
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .site-header .tagline {
      margin: 14px auto 0;
      max-width: 640px;
      color: var(--text-dim);
      font-size: 1.05rem;
    }

    .meta-row {
      margin-top: 18px;
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
      font-size: 0.85rem;
    }

    .meta-chip {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 999px;
      color: var(--text-dim);
      text-decoration: none;
      transition: border-color 0.2s, color 0.2s;
    }
    .meta-chip:hover { border-color: var(--accent); color: var(--text); }

    nav.toc {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(11, 16, 32, 0.82);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }

    nav.toc .toc-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 12px 24px;
      display: flex;
      gap: 16px;
      overflow-x: auto;
    }

    nav.toc a {
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 0.9rem;
      color: var(--text-dim);
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.2s ease;
    }
    nav.toc a:hover { border-color: var(--border); color: var(--text); }

    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 28px 24px 80px;
    }

    .group {
      margin-top: 56px;
      scroll-margin-top: 80px;
    }

    .group:first-of-type { margin-top: 32px; }

    .group h2 {
      margin: 0 0 20px;
      font-size: 1.8rem;
      letter-spacing: -0.01em;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .group h2::before {
      content: "";
      display: inline-block;
      width: 10px;
      height: 22px;
      border-radius: 3px;
      background: linear-gradient(180deg, var(--accent), var(--accent-2));
    }

    .group__cards {
      display: grid;
      gap: 28px;
    }

    .card {
      background: linear-gradient(180deg, var(--bg-card), var(--bg-elevated));
      border: 1px solid var(--border);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: var(--shadow);
    }

    .card__header {
      padding: 22px 26px 6px;
    }
    .card__header h3 {
      margin: 0 0 6px;
      font-size: 1.25rem;
      letter-spacing: -0.01em;
    }
    .card__header p {
      margin: 0;
      color: var(--text-dim);
      font-size: 0.98rem;
    }

    .card__shots {
      padding: 20px 26px 26px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (min-width: 780px) {
      .card__shots { grid-template-columns: 2fr 1fr; }
    }

    .shot { margin: 0; }
    .shot__frame {
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      background: #000;
      max-height: 560px;
      position: relative;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      cursor: zoom-in;
    }
    .shot__frame::after {
      content: "";
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 80px;
      pointer-events: none;
      background: linear-gradient(180deg, transparent, rgba(11, 16, 32, 0.75));
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    .shot__frame.has-overflow::after { opacity: 1; }
    .shot__frame:hover {
      transform: translateY(-2px);
      box-shadow: 0 30px 60px -30px rgba(124, 92, 255, 0.5);
    }
    .shot img {
      display: block;
      width: 100%;
      height: auto;
    }
    .shot__frame--scrollable {
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--accent) transparent;
    }
    .shot__frame--scrollable::-webkit-scrollbar { width: 8px; }
    .shot__frame--scrollable::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 4px; }
    .shot__frame--mobile {
      max-width: 320px;
      margin-left: auto;
      margin-right: auto;
    }

    figcaption {
      margin-top: 10px;
      text-align: center;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 1px solid transparent;
    }
    .badge--desktop { background: rgba(41, 224, 255, 0.12); color: var(--desktop); border-color: rgba(41, 224, 255, 0.35); }
    .badge--mobile  { background: rgba(255, 124, 189, 0.12); color: var(--mobile);  border-color: rgba(255, 124, 189, 0.35); }

    footer.site-footer {
      padding: 40px 24px 64px;
      text-align: center;
      color: var(--text-dim);
      font-size: 0.9rem;
    }
    footer.site-footer a { color: var(--accent-2); text-decoration: none; }
    footer.site-footer a:hover { text-decoration: underline; }

    /* Lightbox */
    .lightbox {
      position: fixed;
      inset: 0;
      background: rgba(5, 7, 18, 0.92);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 24px;
      cursor: zoom-out;
    }
    .lightbox.open { display: flex; }
    .lightbox img {
      max-width: 100%;
      max-height: 100%;
      border-radius: 10px;
      box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.7);
    }

    @media (prefers-reduced-motion: reduce) {
      .shot__frame { transition: none; }
      .shot__frame:hover { transform: none; }
    }
  </style>
</head>
<body>
  <header class="site-header">
    <h1>Redirector - Visual Tour</h1>
    <p class="tagline">
      Auto-generated gallery from the Playwright end-to-end test suite. Every screenshot below is
      captured in CI from the live extension UI across desktop and mobile breakpoints.
    </p>
    <div class="meta-row">
      <a class="meta-chip" href="${esc(repoUrl)}" target="_blank" rel="noopener">GitHub repository</a>
      ${shortSha ? `<a class="meta-chip" href="${esc(repoUrl)}/commit/${esc(commit)}" target="_blank" rel="noopener">Commit ${esc(shortSha)}</a>` : ''}
      <span class="meta-chip">Built ${esc(builtAt)}</span>
    </div>
  </header>

  <nav class="toc" aria-label="Section navigation">
    <div class="toc-inner">${nav}</div>
  </nav>

  <main>
${content}
  </main>

  <footer class="site-footer">
    <p>Redirector is open source software, created by
      <a href="http://einaregilsson.com" target="_blank" rel="noopener">Einar Egilsson</a>.
      Screenshots regenerated on every push to <code>main</code>.
    </p>
  </footer>

  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Screenshot preview">
    <img id="lightbox-img" alt="" />
  </div>

  <script>
    (function () {
      const lb = document.getElementById('lightbox');
      const lbImg = document.getElementById('lightbox-img');
      document.querySelectorAll('.shot__frame').forEach(function (frame) {
        const img = frame.querySelector('img');
        if (img) {
          const check = function () {
            if (img.naturalHeight && img.clientHeight < img.naturalHeight * (frame.clientWidth / img.naturalWidth)) {
              frame.classList.add('has-overflow', 'shot__frame--scrollable');
            }
          };
          if (img.complete) check(); else img.addEventListener('load', check);
        }
        frame.addEventListener('click', function (e) {
          // Allow scroll inside the frame without triggering lightbox unless
          // the click lands on the image itself.
          if (e.target !== frame.querySelector('img')) return;
          if (!img) return;
          lbImg.src = img.src;
          lbImg.alt = img.alt;
          lb.classList.add('open');
        });
      });
      lb.addEventListener('click', function () { lb.classList.remove('open'); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') lb.classList.remove('open');
      });
    })();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(SHOT_DIR, 'index.html'), html);
console.log(`Wrote ${path.join(SHOT_DIR, 'index.html')} (${entries.length} screenshots, ${groups.size} groups)`);
