import { parseSeries } from './modules/parse-series.js';
import { Pager } from './modules/pager.js';
import { availableSorts, sortEntries } from './modules/sort-engine.js';
import { verbFor } from './modules/status.js';
import { buildEditUrl } from './modules/edit-url.js';
import { resolveImage } from './modules/resolve-image.js';
import { themeToCssVars } from './modules/theme-mapper.js';

const REPO_COORDS = { owner: 'zevlramos', repo: 'series-tracker', branch: 'main' };

export async function initShell(root, seriesPath) {
  root.innerHTML = '<p class="loading">Loading…</p>';

  const [dataResult, themeResult] = await Promise.all([
    fetchJson(`${seriesPath}/data.json`),
    fetchJson(`${seriesPath}/theme.json`).catch(() => null)
  ]);

  if (!dataResult.ok) {
    root.innerHTML = `<div class="error"><h2>Failed to load series data</h2><p>${dataResult.error}</p></div>`;
    return;
  }

  const result = parseSeries(dataResult.text);
  if (!result.ok) {
    root.innerHTML = `<div class="error"><h2>Invalid series data</h2><p>${result.error}</p></div>`;
    return;
  }

  const series = result.series;

  if (themeResult && themeResult.ok) {
    const theme = JSON.parse(themeResult.text);
    const layoutMode = theme.layoutMode || 'paged';
    if (layoutMode !== 'paged') {
      root.innerHTML = `<div class="error"><h2>Unsupported layout mode</h2><p>"${esc(layoutMode)}" is not supported. Only "paged" is available.</p></div>`;
      return;
    }
    applyTheme(theme);
  }

  const sorts = availableSorts(series);
  let currentSort = 'recommended';
  let orderedEntries = sortEntries(series.entries, currentSort);
  let pager = new Pager(orderedEntries);

  root.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'series-header';
  header.innerHTML = `<h1>${esc(series.name)}</h1>`;

  const progressEl = document.createElement('div');
  progressEl.className = 'series-progress';
  header.appendChild(progressEl);

  root.appendChild(header);

  let sortBar = null;
  if (sorts.length > 1) {
    sortBar = buildSortBar(sorts, currentSort, (mode) => {
      currentSort = mode;
      orderedEntries = sortEntries(series.entries, currentSort);
      pager = new Pager(orderedEntries);
      pager.onChange(render);
      rebuildBookmarkBar();
      render();
    });
    root.appendChild(sortBar);
  }

  const bookmarkContainer = document.createElement('div');
  root.appendChild(bookmarkContainer);

  const viewport = document.createElement('div');
  viewport.className = 'viewport';
  root.appendChild(viewport);

  function rebuildBookmarkBar() {
    bookmarkContainer.innerHTML = '';
    const bar = buildBookmarkBar(pager);
    bookmarkContainer.appendChild(bar);
  }

  function render() {
    const bar = bookmarkContainer.firstElementChild;
    if (bar) updateBookmarkBar(bar, pager);
    updateProgress(progressEl, series);

    viewport.classList.remove('flip-ready');
    viewport.classList.add('flipping');

    requestAnimationFrame(() => {
      if (pager.state.mode === 'toc') {
        renderTOC(viewport, series, pager, orderedEntries);
      } else {
        renderPage(viewport, pager, series.slug);
      }

      requestAnimationFrame(() => {
        viewport.classList.remove('flipping');
        viewport.classList.add('flip-ready');
      });
    });
  }

  rebuildBookmarkBar();
  pager.onChange(render);
  render();
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function applyTheme(theme) {
  const vars = themeToCssVars(theme);
  for (const [prop, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(prop, value);
  }
}

function updateProgress(el, series) {
  const done = series.entries.filter(e => e.status).length;
  const total = series.entries.length;
  el.textContent = `${done} / ${total} completed`;
}

function buildSortBar(sorts, activeSort, onSort) {
  const bar = document.createElement('div');
  bar.className = 'sort-bar';

  const LABELS = { recommended: 'Recommended', release: 'Release Date', chronological: 'Chronological' };

  for (const mode of sorts) {
    const btn = document.createElement('button');
    btn.className = 'sort-btn' + (mode === activeSort ? ' active' : '');
    btn.textContent = LABELS[mode] || mode;
    btn.dataset.sortMode = mode;
    btn.addEventListener('click', () => {
      bar.querySelector('.sort-btn.active')?.classList.remove('active');
      btn.classList.add('active');
      onSort(mode);
    });
    bar.appendChild(btn);
  }

  return bar;
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
    bar.querySelector('.bookmark-toc')?.classList.add('active');
  } else {
    const entry = pager.current();
    if (entry) {
      const tab = bar.querySelector(`[data-entry-id="${entry.id}"]`);
      if (tab) tab.classList.add('active');
    }
  }
}

function renderTOC(container, series, pager, orderedEntries) {
  const list = document.createElement('ol');
  list.className = 'toc-list';

  for (const entry of orderedEntries) {
    const statusLabel = verbFor(entry.medium, entry.status);
    const li = document.createElement('li');
    li.className = 'toc-entry' + (entry.status ? ' done' : '');
    li.dataset.entryId = entry.id;
    li.innerHTML = `
      <div class="toc-entry-main">
        <span class="toc-title">${esc(entry.title)}</span>
        <span class="toc-reason">${esc(entry.recommendedReason)}</span>
      </div>
      <div class="toc-entry-meta">
        <span class="toc-medium">${esc(entry.medium)}</span>
        <span class="toc-status ${entry.status ? 'status-done' : 'status-pending'}">${esc(statusLabel)}</span>
      </div>
    `;
    li.addEventListener('click', () => pager.jumpTo(entry.id));
    list.appendChild(li);
  }

  container.innerHTML = '';
  container.appendChild(list);
}

function renderPage(container, pager, seriesSlug) {
  const entry = pager.current();
  if (!entry) return;

  const imageSrc = resolveImage(entry);
  const statusLabel = verbFor(entry.medium, entry.status);
  const editUrl = buildEditUrl(REPO_COORDS, seriesSlug);

  const page = document.createElement('article');
  page.className = 'entry-page';

  page.innerHTML = `
    <div class="entry-layout">
      <div class="entry-cover">
        <img src="${esc(imageSrc)}" alt="${esc(entry.title)}" class="entry-cover-img" />
      </div>
      <div class="entry-details">
        <h2 class="entry-title">${esc(entry.title)}</h2>
        <div class="entry-badges">
          <span class="entry-medium badge">${esc(entry.medium)}</span>
          <span class="entry-branch badge badge-${esc(entry.branch)}">${esc(entry.branch)}</span>
          <span class="entry-status badge ${entry.status ? 'status-done' : 'status-pending'}">${esc(statusLabel)}</span>
        </div>
        <p class="entry-summary">${esc(entry.summary)}</p>
        <a class="edit-link" href="${esc(editUrl)}" target="_blank" rel="noopener">Edit on GitHub</a>
      </div>
    </div>
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
