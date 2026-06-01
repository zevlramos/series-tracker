// Curation wizard — local dev server, shared by create-series and update-series.
// Usage: node .claude/skills/curate-series/curate-server.mjs <slug>
// Series-agnostic: everything series-specific is read from .drafts/<slug>.json at runtime.
// See REFERENCE.md for the /stage (ungated) vs /publish (gated) write model.

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, normalize } from 'node:path';

import { draftToSeriesData } from '../../../pipeline/draft-to-series-data.js';
import { appendToRegistry } from '../../../pipeline/append-to-registry.js';
import { renderSeriesIndex } from '../../../pipeline/render-series-index.js';
import { parseSeries } from '../../../src/modules/parse-series.js';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('usage: node curate-server.mjs <slug>   (slug = lowercase letters, digits, hyphens)');
  process.exit(1);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');           // repo root: .claude/skills/curate-series → up 3
const PORT = Number(process.env.CURATE_PORT) || 8123;

const HTML = resolve(HERE, 'curate.html');
const DRAFT = resolve(ROOT, '.drafts', `${slug}.json`);
const SERIES_DIR = resolve(ROOT, 'series', slug);
const DATA = resolve(SERIES_DIR, 'data.json');
const REGISTRY = resolve(ROOT, 'series.json');

if (!existsSync(DRAFT)) {
  console.error(`No draft at ${DRAFT}\nThe skill must write the merged starting set there before launching the server.`);
  process.exit(1);
}

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};
const readBody = req => new Promise(resolve => { let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d)); });

// Serve browser-imported modules from disk so the wizard reuses the same lore-date
// and escape logic the publish gate validates against, never a reimplementation.
function serveModule(res, url) {
  const rel = normalize(url).replace(/^(\.\.[/\\])+/, '');
  if (!/^\/(src|pipeline)\/[\w./-]+\.js$/.test(rel)) return false;
  const file = resolve(ROOT, '.' + rel);
  if (!file.startsWith(ROOT) || !existsSync(file)) return false;
  send(res, 200, readFileSync(file, 'utf8'), 'text/javascript');
  return true;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') return send(res, 200, readFileSync(HTML, 'utf8'), 'text/html');
    if (req.method === 'GET' && req.url === '/data') return send(res, 200, readFileSync(DRAFT, 'utf8'));
    if (req.method === 'GET' && serveModule(res, req.url)) return;

    if (req.method === 'POST' && req.url === '/stage') {
      writeFileSync(DRAFT, await readBody(req));   // ungated autosave, UI fields and all
      return send(res, 200, JSON.stringify({ ok: true }));
    }

    if (req.method === 'POST' && req.url === '/publish') {
      const working = JSON.parse(await readBody(req));
      // Project to the 14 schema fields first: the gate tolerates extra fields, so
      // dropping the _-prefixed UI ones has to happen here, before the write.
      const projected = draftToSeriesData({ slug, name: working.name, entries: working.entries });
      const gate = parseSeries(JSON.stringify(projected));
      if (!gate.ok) return send(res, 200, JSON.stringify({ ok: false, error: gate.error }));

      mkdirSync(SERIES_DIR, { recursive: true });
      writeFileSync(DATA, JSON.stringify(gate.series, null, 2) + '\n');

      // Scaffold registry + index on first publish (create); no-ops on update.
      const registry = existsSync(REGISTRY) ? JSON.parse(readFileSync(REGISTRY, 'utf8')) : [];
      const nextRegistry = appendToRegistry(registry, { slug, name: gate.series.name });
      if (nextRegistry !== registry) writeFileSync(REGISTRY, JSON.stringify(nextRegistry, null, 2) + '\n');

      const indexPath = resolve(SERIES_DIR, 'index.html');
      if (!existsSync(indexPath)) {
        const hasThemeCss = existsSync(resolve(SERIES_DIR, 'theme.css'));
        writeFileSync(indexPath, renderSeriesIndex(gate.series.name, { hasThemeCss }));
      }
      return send(res, 200, JSON.stringify({ ok: true, count: gate.series.entries.length }));
    }

    send(res, 404, JSON.stringify({ error: 'not found' }));
  } catch (e) {
    send(res, 500, JSON.stringify({ error: String(e && e.message || e) }));
  }
});

server.listen(PORT, () => {
  console.log(`curation wizard: http://localhost:${PORT}/  (series: ${slug})`);
  console.log(`  draft   ${DRAFT}`);
  console.log(`  publish ${DATA}`);
});
