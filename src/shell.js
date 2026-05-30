import { parseSeries } from './modules/parse-series.js';
import { Pager } from './modules/pager.js';
import { availableSorts, sortEntries } from './modules/sort-engine.js';
import { presentEntry } from './modules/present-entry.js';
import { themeToCssVars } from './modules/theme-mapper.js';
import { validateTheme } from '../pipeline/validate-theme.js';
import { esc } from './modules/escape.js';

const REPO_COORDS = { owner: 'zevlramos', repo: 'series-tracker', branch: 'main' };

export async function initShell(root, seriesPath) {
  root.innerHTML = '<p class="loading">Loading…</p>';

  const [dataResult, themeResult] = await Promise.all([
    fetchJson(`${seriesPath}/data.json`),
    fetchJson(`${seriesPath}/theme.json`).catch(() => null)
  ]);

  if (!dataResult.ok) {
    root.innerHTML = `<div class="error"><h2>Failed to load series data</h2><p>${esc(dataResult.error)}</p></div>`;
    return;
  }

  const result = parseSeries(dataResult.text);
  if (!result.ok) {
    root.innerHTML = `<div class="error"><h2>Invalid series data</h2><p>${esc(result.error)}</p></div>`;
    return;
  }

  const series = result.series;

  let pageTurn3d = false;
  if (themeResult && themeResult.ok) {
    try {
      const theme = JSON.parse(themeResult.text);
      const valid = validateTheme(theme);
      if (!valid.ok) {
        root.innerHTML = `<div class="error"><h2>Invalid theme</h2><p>${esc(valid.error)}</p></div>`;
        return;
      }
      applyTheme(theme);
      pageTurn3d = theme.pageTurn === '3d';
    } catch (e) {
      console.warn('Invalid theme.json, using defaults:', e.message);
    }
  }
  if (pageTurn3d) root.classList.add('page-turn-3d');

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

  let prevPagerState = null;
  let flipping = false;

  function rebuildBookmarkBar() {
    bookmarkContainer.innerHTML = '';
    const bar = buildBookmarkBar(pager);
    bookmarkContainer.appendChild(bar);
  }

  function flipDir(prev, cur) {
    if (!prev || (prev.mode === cur.mode && prev.index === cur.index)) return null;
    if (cur.mode === 'toc') return 'backward';
    if (prev.mode === 'toc') return 'forward';
    return cur.index > prev.index ? 'forward' : 'backward';
  }

  function renderContent() {
    if (pager.state.mode === 'toc') {
      renderTOC(viewport, series, pager, orderedEntries);
    } else {
      renderPage(viewport, pager, series.slug);
    }
  }

  function render() {
    updateProgress(progressEl, series);

    const curState = pager.state;
    const dir = pageTurn3d ? flipDir(prevPagerState, curState) : null;
    prevPagerState = curState;

    if (dir && !flipping) {
      if (dir === 'forward') {
        const clone = viewport.cloneNode(true);
        const rect = flipRect();
        renderContent();
        startFlip(clone, rect, 'ds-flip-forward');
      } else {
        renderContent();
        startFlip(viewport.cloneNode(true), flipRect(), 'ds-flip-backward');
      }
    } else if (pageTurn3d) {
      renderContent();
      const bar = bookmarkContainer.firstElementChild;
      if (bar) updateBookmarkBar(bar, pager);
    } else {
      const bar = bookmarkContainer.firstElementChild;
      if (bar) updateBookmarkBar(bar, pager);
      viewport.classList.remove('flip-ready');
      viewport.classList.add('flipping');
      requestAnimationFrame(() => {
        renderContent();
        requestAnimationFrame(() => {
          viewport.classList.remove('flipping');
          viewport.classList.add('flip-ready');
        });
      });
    }
  }

  function flipRect() {
    const vr = viewport.getBoundingClientRect();
    const ar = root.getBoundingClientRect();
    return { top: vr.top, left: vr.left, width: vr.width, height: ar.bottom - vr.top };
  }

  function startFlip(clone, rect, animName) {
    flipping = true;
    pinAndFlip(clone, rect, animName, () => {
      flipping = false;
      const bar = bookmarkContainer.firstElementChild;
      if (bar) updateBookmarkBar(bar, pager);
    });
  }

  rebuildBookmarkBar();
  pager.onChange(render);
  render();
}

function pinAndFlip(cloneEl, rect, animName, onComplete) {
  cloneEl.classList.add('ds-flip-overlay');
  cloneEl.style.top = rect.top + 'px';
  cloneEl.style.left = rect.left + 'px';
  cloneEl.style.width = rect.width + 'px';
  cloneEl.style.height = rect.height + 'px';
  cloneEl.style.animation = `${animName} 0.5s cubic-bezier(0.4, 0.0, 0.2, 1) forwards`;
  document.body.appendChild(cloneEl);
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    cloneEl.remove();
    onComplete();
  }
  cloneEl.addEventListener('animationend', finish);
  setTimeout(finish, 600);
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
  if (vars['--hero-image']) {
    document.documentElement.style.setProperty('--hero-display', 'block');
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
      const tab = bar.querySelector(`[data-entry-id="${CSS.escape(entry.id)}"]`);
      if (tab) tab.classList.add('active');
    }
  }
}

function renderTOC(container, series, pager, orderedEntries) {
  container.innerHTML = '';

  const hero = document.createElement('div');
  hero.className = 'toc-hero';
  container.appendChild(hero);

  const list = document.createElement('ol');
  list.className = 'toc-list';

  for (const entry of orderedEntries) {
    const view = presentEntry(entry, REPO_COORDS, series.slug);
    const li = document.createElement('li');
    li.className = 'toc-entry' + (view.statusDone ? ' done' : '');
    li.dataset.entryId = view.id;
    li.innerHTML = `
      <div class="toc-entry-main">
        <span class="toc-title">${esc(view.title)}</span>
        <span class="toc-reason">${esc(view.recommendedReason)}</span>
      </div>
      <div class="toc-entry-meta">
        <span class="toc-medium">${esc(view.medium)}</span>
        <span class="toc-status ${view.statusDone ? 'status-done' : 'status-pending'}">${esc(view.statusLabel)}</span>
      </div>
    `;
    li.addEventListener('click', () => pager.jumpTo(view.id));
    list.appendChild(li);
  }

  container.appendChild(list);
}

function renderPage(container, pager, seriesSlug) {
  const entry = pager.current();
  if (!entry) return;

  const view = presentEntry(entry, REPO_COORDS, seriesSlug);

  const page = document.createElement('article');
  page.className = 'entry-page';

  page.innerHTML = `
    <div class="entry-layout">
      <div class="entry-cover">
        <img src="${esc(view.imageSrc)}" alt="${esc(view.title)}" class="entry-cover-img" />
      </div>
      <div class="entry-details">
        <h2 class="entry-title">${esc(view.title)}</h2>
        <div class="entry-badges">
          <span class="entry-medium badge">${esc(view.medium)}</span>
          <span class="entry-branch badge badge-${esc(view.branch)}">${esc(view.branch)}</span>
          <span class="entry-status badge ${view.statusDone ? 'status-done' : 'status-pending'}">${esc(view.statusLabel)}</span>
        </div>
        ${view.loreDateLabel ? `<p class="entry-lore-date"><span class="entry-lore-date-label">Set in:</span> ${esc(view.loreDateLabel)}</p>` : ''}
        <p class="entry-summary">${esc(view.summary)}</p>
        <a class="edit-link" href="${esc(view.editUrl)}" target="_blank" rel="noopener">Edit on GitHub</a>
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

