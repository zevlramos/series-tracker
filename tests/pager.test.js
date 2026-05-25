import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Pager } from '../src/modules/pager.js';

const entries = [
  { id: 'a', title: 'Entry A' },
  { id: 'b', title: 'Entry B' },
  { id: 'c', title: 'Entry C' },
];

describe('Pager', () => {
  describe('initial state', () => {
    it('starts in TOC mode', () => {
      const p = new Pager(entries);
      assert.equal(p.state.mode, 'toc');
    });

    it('current() returns null in TOC mode', () => {
      const p = new Pager(entries);
      assert.equal(p.current(), null);
    });
  });

  describe('jumpTo', () => {
    it('switches to page mode at the correct entry', () => {
      const p = new Pager(entries);
      p.jumpTo('b');
      assert.equal(p.state.mode, 'page');
      assert.equal(p.state.index, 1);
      assert.equal(p.current().id, 'b');
    });

    it('ignores unknown entry ids', () => {
      const p = new Pager(entries);
      p.jumpTo('b');
      p.jumpTo('unknown');
      assert.equal(p.state.index, 1);
      assert.equal(p.current().id, 'b');
    });

    it('can jump from TOC directly', () => {
      const p = new Pager(entries);
      p.jumpTo('c');
      assert.equal(p.state.mode, 'page');
      assert.equal(p.current().id, 'c');
    });

    it('can jump between pages', () => {
      const p = new Pager(entries);
      p.jumpTo('a');
      p.jumpTo('c');
      assert.equal(p.current().id, 'c');
    });
  });

  describe('next / prev', () => {
    it('next moves forward', () => {
      const p = new Pager(entries);
      p.jumpTo('a');
      p.next();
      assert.equal(p.current().id, 'b');
    });

    it('prev moves backward', () => {
      const p = new Pager(entries);
      p.jumpTo('b');
      p.prev();
      assert.equal(p.current().id, 'a');
    });

    it('next does nothing at last entry', () => {
      const p = new Pager(entries);
      p.jumpTo('c');
      p.next();
      assert.equal(p.current().id, 'c');
      assert.equal(p.state.index, 2);
    });

    it('prev does nothing at first entry', () => {
      const p = new Pager(entries);
      p.jumpTo('a');
      p.prev();
      assert.equal(p.current().id, 'a');
      assert.equal(p.state.index, 0);
    });

    it('next/prev are no-ops in TOC mode', () => {
      const p = new Pager(entries);
      p.next();
      assert.equal(p.state.mode, 'toc');
      p.prev();
      assert.equal(p.state.mode, 'toc');
    });
  });

  describe('toTOC', () => {
    it('returns to TOC from a page', () => {
      const p = new Pager(entries);
      p.jumpTo('b');
      p.toTOC();
      assert.equal(p.state.mode, 'toc');
      assert.equal(p.current(), null);
    });

    it('is a no-op when already in TOC', () => {
      const p = new Pager(entries);
      p.toTOC();
      assert.equal(p.state.mode, 'toc');
    });
  });

  describe('onChange callback', () => {
    it('fires on navigation', () => {
      const calls = [];
      const p = new Pager(entries);
      p.onChange((state) => calls.push({ ...state }));
      p.jumpTo('a');
      p.next();
      p.toTOC();
      assert.equal(calls.length, 3);
      assert.equal(calls[0].mode, 'page');
      assert.equal(calls[1].index, 1);
      assert.equal(calls[2].mode, 'toc');
    });
  });

  describe('entries accessor', () => {
    it('returns the ordered entries', () => {
      const p = new Pager(entries);
      assert.deepEqual(p.entries, entries);
    });
  });
});
