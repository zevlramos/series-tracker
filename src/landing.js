import { esc } from './modules/escape.js';

export async function initLanding(root) {
  root.innerHTML = '<p class="loading">Loading…</p>';

  try {
    const res = await fetch('series.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const seriesList = await res.json();

    root.innerHTML = '';

    const header = document.createElement('header');
    header.className = 'landing-header';
    header.innerHTML = '<h1>Series Tracker</h1>';
    root.appendChild(header);

    if (seriesList.length === 0) {
      root.innerHTML += '<p class="landing-empty">No series registered yet.</p>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'landing-grid';

    for (const s of seriesList) {
      const card = document.createElement('a');
      card.className = 'landing-card';
      card.href = `series/${s.slug}/`;
      card.innerHTML = `<span class="landing-card-name">${esc(s.name)}</span>`;
      grid.appendChild(card);
    }

    root.appendChild(grid);
  } catch (err) {
    root.innerHTML = `<div class="error"><h2>Failed to load series list</h2><p>${esc(err.message)}</p></div>`;
  }
}
