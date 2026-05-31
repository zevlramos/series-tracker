import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSeries } from '../src/modules/parse-series.js';

const validEntry = {
  id: 're1',
  title: 'Resident Evil (2002)',
  medium: 'game',
  branch: 'mainline',
  releaseDate: '2002-03-22',
  recommendedOrder: 1,
  recommendedReason: 'The definitive version of where it all began.',
  chronologicalOrder: 1,
  summary: 'S.T.A.R.S. Bravo Team investigates a mansion in the Arklay Mountains.',
  image: 'assets/re1.jpg',
  imageUrl: null,
  status: false,
  sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game)']
};

const validSeries = {
  slug: 'resident-evil',
  name: 'Resident Evil',
  entries: [validEntry]
};

describe('parseSeries', () => {
  describe('valid input', () => {
    it('returns a Series for valid JSON', () => {
      const result = parseSeries(JSON.stringify(validSeries));
      assert.equal(result.ok, true);
      assert.equal(result.series.slug, 'resident-evil');
      assert.equal(result.series.name, 'Resident Evil');
      assert.equal(result.series.entries.length, 1);
    });

    it('preserves all Entry fields', () => {
      const result = parseSeries(JSON.stringify(validSeries));
      const entry = result.series.entries[0];
      assert.equal(entry.id, 're1');
      assert.equal(entry.title, 'Resident Evil (2002)');
      assert.equal(entry.medium, 'game');
      assert.equal(entry.branch, 'mainline');
      assert.equal(entry.releaseDate, '2002-03-22');
      assert.equal(entry.recommendedOrder, 1);
      assert.equal(entry.recommendedReason, 'The definitive version of where it all began.');
      assert.equal(entry.chronologicalOrder, 1);
      assert.equal(entry.summary, 'S.T.A.R.S. Bravo Team investigates a mansion in the Arklay Mountains.');
      assert.equal(entry.image, 'assets/re1.jpg');
      assert.equal(entry.imageUrl, null);
      assert.equal(entry.status, false);
      assert.deepEqual(entry.sources, ['https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game)']);
    });

    it('accepts null optional fields (releaseDate, chronologicalOrder, image, imageUrl)', () => {
      const entry = { ...validEntry, releaseDate: null, chronologicalOrder: null, image: null, imageUrl: null };
      const series = { ...validSeries, entries: [entry] };
      const result = parseSeries(JSON.stringify(series));
      assert.equal(result.ok, true);
      assert.equal(result.series.entries[0].releaseDate, null);
      assert.equal(result.series.entries[0].chronologicalOrder, null);
    });

    it('accepts loreDate at each precision and carries it through', () => {
      for (const loreDate of [null, '1998', '1998-09', '1998-09-28']) {
        const entry = { ...validEntry, loreDate };
        const series = { ...validSeries, entries: [entry] };
        const result = parseSeries(JSON.stringify(series));
        assert.equal(result.ok, true, `loreDate ${JSON.stringify(loreDate)} should be valid`);
        assert.equal(result.series.entries[0].loreDate, loreDate);
      }
    });

    it('defaults an absent loreDate to null', () => {
      const result = parseSeries(JSON.stringify(validSeries));
      assert.equal(result.ok, true);
      assert.equal(result.series.entries[0].loreDate, null);
    });

    it('accepts all valid Medium values', () => {
      const media = ['game', 'novel', 'comic', 'film', 'show', 'stagePlay', 'podcast', 'audio', 'video'];
      for (const medium of media) {
        const entry = { ...validEntry, id: `test-${medium}`, medium };
        const series = { ...validSeries, entries: [entry] };
        const result = parseSeries(JSON.stringify(series));
        assert.equal(result.ok, true, `medium "${medium}" should be valid`);
      }
    });

    it('accepts both branch values', () => {
      for (const branch of ['mainline', 'spinoff']) {
        const entry = { ...validEntry, id: `test-${branch}`, branch };
        const series = { ...validSeries, entries: [entry] };
        const result = parseSeries(JSON.stringify(series));
        assert.equal(result.ok, true, `branch "${branch}" should be valid`);
      }
    });

    it('accepts status true and false', () => {
      for (const status of [true, false]) {
        const entry = { ...validEntry, status };
        const series = { ...validSeries, entries: [entry] };
        const result = parseSeries(JSON.stringify(series));
        assert.equal(result.ok, true);
        assert.equal(result.series.entries[0].status, status);
      }
    });

    it('sorts entries by recommendedOrder', () => {
      const e1 = { ...validEntry, id: 'a', recommendedOrder: 3 };
      const e2 = { ...validEntry, id: 'b', recommendedOrder: 1 };
      const e3 = { ...validEntry, id: 'c', recommendedOrder: 2 };
      const series = { ...validSeries, entries: [e1, e2, e3] };
      const result = parseSeries(JSON.stringify(series));
      assert.equal(result.ok, true);
      assert.deepEqual(result.series.entries.map(e => e.id), ['b', 'c', 'a']);
    });
  });

  describe('malformed input', () => {
    it('returns error for non-JSON string', () => {
      const result = parseSeries('not json');
      assert.equal(result.ok, false);
      assert.ok(result.error);
    });

    it('returns error for missing slug', () => {
      const { slug, ...noSlug } = validSeries;
      const result = parseSeries(JSON.stringify(noSlug));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('slug'));
    });

    it('returns error for missing name', () => {
      const { name, ...noName } = validSeries;
      const result = parseSeries(JSON.stringify(noName));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('name'));
    });

    it('returns error for missing entries array', () => {
      const { entries, ...noEntries } = validSeries;
      const result = parseSeries(JSON.stringify(noEntries));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('entries'));
    });

    it('returns error for entries that is not an array', () => {
      const result = parseSeries(JSON.stringify({ ...validSeries, entries: 'not-array' }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('entries'));
    });

    it('returns error for empty entries array', () => {
      const result = parseSeries(JSON.stringify({ ...validSeries, entries: [] }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('entries'));
    });

    it('returns error for entry missing required fields', () => {
      const requiredFields = ['id', 'title', 'medium', 'branch', 'recommendedOrder', 'recommendedReason', 'summary', 'sources'];
      for (const field of requiredFields) {
        const entry = { ...validEntry };
        delete entry[field];
        const series = { ...validSeries, entries: [entry] };
        const result = parseSeries(JSON.stringify(series));
        assert.equal(result.ok, false, `missing "${field}" should be invalid`);
        assert.ok(result.error.includes(field), `error should mention "${field}"`);
      }
    });

    it('returns error for invalid medium value', () => {
      const entry = { ...validEntry, medium: 'boardgame' };
      const series = { ...validSeries, entries: [entry] };
      const result = parseSeries(JSON.stringify(series));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('medium'));
    });

    it('returns error for invalid branch value', () => {
      const entry = { ...validEntry, branch: 'sidequest' };
      const series = { ...validSeries, entries: [entry] };
      const result = parseSeries(JSON.stringify(series));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('branch'));
    });

    it('returns error for non-boolean status', () => {
      const entry = { ...validEntry, status: 'completed' };
      const series = { ...validSeries, entries: [entry] };
      const result = parseSeries(JSON.stringify(series));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('status'));
    });

    it('returns error for duplicate entry ids', () => {
      const e1 = { ...validEntry, id: 'same', recommendedOrder: 1 };
      const e2 = { ...validEntry, id: 'same', recommendedOrder: 2 };
      const series = { ...validSeries, entries: [e1, e2] };
      const result = parseSeries(JSON.stringify(series));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('id'));
    });

    it('returns error for non-integer recommendedOrder', () => {
      const entry = { ...validEntry, recommendedOrder: 1.5 };
      const series = { ...validSeries, entries: [entry] };
      const result = parseSeries(JSON.stringify(series));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('recommendedOrder'));
    });

    it('returns error for sources that is not an array', () => {
      const entry = { ...validEntry, sources: 'not-array' };
      const series = { ...validSeries, entries: [entry] };
      const result = parseSeries(JSON.stringify(series));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('sources'));
    });

    it('returns error for JSON null', () => {
      const result = parseSeries('null');
      assert.equal(result.ok, false);
    });

    it('returns error for JSON array', () => {
      const result = parseSeries('[]');
      assert.equal(result.ok, false);
    });

    it('returns error for JSON primitive', () => {
      const result = parseSeries('"hello"');
      assert.equal(result.ok, false);
    });

    it('returns error for non-string releaseDate', () => {
      const entry = { ...validEntry, releaseDate: 2002 };
      const series = { ...validSeries, entries: [entry] };
      const result = parseSeries(JSON.stringify(series));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('releaseDate'));
    });

    it('returns error for non-string loreDate (bare number)', () => {
      const entry = { ...validEntry, loreDate: 1998 };
      const series = { ...validSeries, entries: [entry] };
      const result = parseSeries(JSON.stringify(series));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('loreDate'));
    });

    it('returns error for malformed loreDate strings', () => {
      for (const bad of ['98', '1998-13', '1998-02-29', '1998-9', '']) {
        const entry = { ...validEntry, loreDate: bad };
        const series = { ...validSeries, entries: [entry] };
        const result = parseSeries(JSON.stringify(series));
        assert.equal(result.ok, false, `loreDate ${JSON.stringify(bad)} should be rejected`);
        assert.ok(result.error.includes('loreDate'));
      }
    });
  });
});
