export class Pager {
  #entries;
  #state;
  #listeners = [];

  constructor(orderedEntries) {
    this.#entries = orderedEntries;
    this.#state = { index: -1, mode: 'toc' };
  }

  get state() {
    return { ...this.#state };
  }

  get entries() {
    return this.#entries;
  }

  current() {
    if (this.#state.mode === 'toc') return null;
    return this.#entries[this.#state.index] ?? null;
  }

  jumpTo(entryId) {
    const idx = this.#entries.findIndex(e => e.id === entryId);
    if (idx === -1) return;
    this.#state = { index: idx, mode: 'page' };
    this.#notify();
  }

  next() {
    if (this.#state.mode !== 'page') return;
    if (this.#state.index >= this.#entries.length - 1) return;
    this.#state = { index: this.#state.index + 1, mode: 'page' };
    this.#notify();
  }

  prev() {
    if (this.#state.mode !== 'page') return;
    if (this.#state.index <= 0) return;
    this.#state = { index: this.#state.index - 1, mode: 'page' };
    this.#notify();
  }

  toTOC() {
    if (this.#state.mode === 'toc') return;
    this.#state = { index: -1, mode: 'toc' };
    this.#notify();
  }

  onChange(fn) {
    this.#listeners.push(fn);
  }

  #notify() {
    const snapshot = this.state;
    for (const fn of this.#listeners) fn(snapshot);
  }
}
