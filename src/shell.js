import { parseSeries } from './modules/parse-series.js';

export async function initShell(root, seriesPath) {
  root.innerHTML = '<p class="loading">Loading…</p>';

  let text;
  try {
    const res = await fetch(`${seriesPath}/data.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (err) {
    root.innerHTML = `<div class="error"><h2>Failed to load series data</h2><p>${err.message}</p></div>`;
    return;
  }

  const result = parseSeries(text);
  if (!result.ok) {
    root.innerHTML = `<div class="error"><h2>Invalid series data</h2><p>${result.error}</p></div>`;
    return;
  }

  renderTOC(root, result.series);
}

function renderTOC(root, series) {
  const header = document.createElement('header');
  header.className = 'series-header';
  header.innerHTML = `<h1>${esc(series.name)}</h1>`;

  const list = document.createElement('ol');
  list.className = 'toc-list';

  for (const entry of series.entries) {
    const li = document.createElement('li');
    li.className = 'toc-entry';
    li.dataset.entryId = entry.id;
    li.innerHTML = `
      <span class="toc-title">${esc(entry.title)}</span>
      <span class="toc-medium">${esc(entry.medium)}</span>
    `;
    list.appendChild(li);
  }

  root.innerHTML = '';
  root.appendChild(header);
  root.appendChild(list);
}

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}
