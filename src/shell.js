import { parseSeries } from './modules/parse-series.js';
import { Pager } from './modules/pager.js';

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

  const series = result.series;
  const pager = new Pager(series.entries);

  root.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'series-header';
  header.innerHTML = `<h1>${esc(series.name)}</h1>`;
  root.appendChild(header);

  const bookmarkBar = buildBookmarkBar(pager);
  root.appendChild(bookmarkBar);

  const viewport = document.createElement('div');
  viewport.className = 'viewport';
  root.appendChild(viewport);

  function render() {
    const state = pager.state;
    updateBookmarkBar(bookmarkBar, pager);

    if (state.mode === 'toc') {
      renderTOC(viewport, series, pager);
    } else {
      renderPage(viewport, pager);
    }
  }

  pager.onChange(render);
  render();
}

function buildBookmarkBar(pager) {
  const nav = document.createElement('nav');
  nav.className = 'bookmark-bar';

  const tocTab = document.createElement('button');
  tocTab.className = 'bookmark-tab bookmark-toc';
  tocTab.textContent = 'Contents';
  tocTab.addEventListener('click', () => pager.toTOC());
  nav.appendChild(tocTab);

  for (const entry of pager.entries) {
    const tab = document.createElement('button');
    tab.className = 'bookmark-tab';
    tab.dataset.entryId = entry.id;
    tab.textContent = entry.title;
    tab.addEventListener('click', () => pager.jumpTo(entry.id));
    nav.appendChild(tab);
  }

  return nav;
}

function updateBookmarkBar(bar, pager) {
  const state = pager.state;
  for (const tab of bar.querySelectorAll('.bookmark-tab')) {
    tab.classList.remove('active');
  }
  if (state.mode === 'toc') {
    bar.querySelector('.bookmark-toc').classList.add('active');
  } else {
    const entry = pager.current();
    if (entry) {
      const tab = bar.querySelector(`[data-entry-id="${entry.id}"]`);
      if (tab) tab.classList.add('active');
    }
  }
}

function renderTOC(container, series, pager) {
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
    li.addEventListener('click', () => pager.jumpTo(entry.id));
    list.appendChild(li);
  }

  container.innerHTML = '';
  container.appendChild(list);
}

function renderPage(container, pager) {
  const entry = pager.current();
  if (!entry) return;

  const page = document.createElement('article');
  page.className = 'entry-page';

  page.innerHTML = `
    <h2 class="entry-title">${esc(entry.title)}</h2>
    <p class="entry-medium">${esc(entry.medium)}</p>
    <p class="entry-summary">${esc(entry.summary)}</p>
  `;

  const nav = document.createElement('div');
  nav.className = 'page-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-nav-btn prev';
  prevBtn.textContent = '← Previous';
  prevBtn.disabled = pager.state.index === 0;
  prevBtn.addEventListener('click', () => pager.prev());

  const tocBtn = document.createElement('button');
  tocBtn.className = 'page-nav-btn toc';
  tocBtn.textContent = 'Contents';
  tocBtn.addEventListener('click', () => pager.toTOC());

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-nav-btn next';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = pager.state.index === pager.entries.length - 1;
  nextBtn.addEventListener('click', () => pager.next());

  nav.appendChild(prevBtn);
  nav.appendChild(tocBtn);
  nav.appendChild(nextBtn);

  container.innerHTML = '';
  container.appendChild(page);
  container.appendChild(nav);
}

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}
