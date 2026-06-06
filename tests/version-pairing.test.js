import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { derivePairings } from '../src/modules/version-pairing.js';

// Builds an entry with sensible defaults; override only what a case cares about.
function entry(overrides) {
  return {
    id: overrides.id,
    title: 'Resident Evil 2',
    medium: 'game',
    releaseDate: null,
    versionNote: null,
    ...overrides
  };
}

describe('derivePairings — remake pairs with its earlier original', () => {
  it('pairs a (2019) remake with the same-base/same-medium original, carrying versionNote as note', () => {
    const original = entry({ id: 'orig', title: 'Resident Evil 2', releaseDate: '1998-01-21' });
    const remake = entry({
      id: 'rmk',
      title: 'Resident Evil 2 (2019)',
      releaseDate: '2019-01-25',
      versionNote: '2019 remake of the 1998 original'
    });
    const result = derivePairings([original, remake]);
    assert.deepEqual(result, [
      { originalId: 'orig', remakeId: 'rmk', note: '2019 remake of the 1998 original' }
    ]);
  });

  it('emits exactly one pairing for that remake', () => {
    const original = entry({ id: 'orig', releaseDate: '1998-01-21' });
    const remake = entry({
      id: 'rmk',
      title: 'Resident Evil 2 (2019)',
      releaseDate: '2019-01-25',
      versionNote: 'remake'
    });
    assert.equal(derivePairings([original, remake]).length, 1);
  });
});

describe('derivePairings — versionNote gates remake status', () => {
  it('an entry with versionNote:null produces no pairing as a remake', () => {
    const a = entry({ id: 'a', title: 'Resident Evil 2', releaseDate: '1998-01-21', versionNote: null });
    const b = entry({ id: 'b', title: 'Resident Evil 2 (2019)', releaseDate: '2019-01-25', versionNote: null });
    assert.deepEqual(derivePairings([a, b]), []);
  });

  it('an empty-string versionNote is not a non-empty remake note (no pairing)', () => {
    const original = entry({ id: 'orig', title: 'Resident Evil 2', releaseDate: '1998-01-21' });
    const notReally = entry({ id: 'x', title: 'Resident Evil 2 (2019)', releaseDate: '2019-01-25', versionNote: '' });
    assert.deepEqual(derivePairings([original, notReally]), []);
  });
});

describe('derivePairings — base title compared case-insensitively', () => {
  it('pairs a differently-cased remake title with its original', () => {
    const original = entry({ id: 'orig', title: 'Resident Evil 2', medium: 'game', releaseDate: '1998-01-21' });
    const remake = entry({
      id: 'rmk',
      title: 'RESIDENT EVIL 2 (2019)',
      medium: 'game',
      releaseDate: '2019-01-25',
      versionNote: '2019 remake'
    });
    assert.deepEqual(derivePairings([original, remake]), [
      { originalId: 'orig', remakeId: 'rmk', note: '2019 remake' }
    ]);
  });
});

describe('derivePairings — original must be present in the set', () => {
  it('a remake whose original is not in the set yields no pairing', () => {
    const loneRemake = entry({
      id: 'rmk',
      title: 'Resident Evil 2 (2019)',
      releaseDate: '2019-01-25',
      versionNote: '2019 remake'
    });
    const unrelated = entry({ id: 'other', title: 'Dino Crisis', medium: 'game', releaseDate: '1999-07-01' });
    assert.deepEqual(derivePairings([loneRemake, unrelated]), []);
  });
});

describe('derivePairings — multiple remakes of one original', () => {
  it('a remaster and a remake of the same original emit two pairings to the same originalId', () => {
    const original = entry({ id: 'orig', title: 'Final Fantasy VII', medium: 'game', releaseDate: '1997-01-31' });
    const remaster = entry({
      id: 'remaster',
      title: 'Final Fantasy VII (2012)',
      medium: 'game',
      releaseDate: '2012-07-04',
      versionNote: '2012 remaster'
    });
    const remake = entry({
      id: 'remake',
      title: 'Final Fantasy VII (2020)',
      medium: 'game',
      releaseDate: '2020-04-10',
      versionNote: '2020 remake'
    });
    const result = derivePairings([original, remaster, remake]);
    assert.deepEqual(result, [
      { originalId: 'orig', remakeId: 'remaster', note: '2012 remaster' },
      { originalId: 'orig', remakeId: 'remake', note: '2020 remake' }
    ]);
  });
});

describe('derivePairings — medium must match', () => {
  it('same base title but a different medium is not paired', () => {
    const film = entry({ id: 'film', title: 'Resident Evil', medium: 'film', releaseDate: '2002-03-15' });
    const gameRemake = entry({
      id: 'game',
      title: 'Resident Evil (2002)',
      medium: 'game',
      releaseDate: '2002-04-30',
      versionNote: '2002 remake of the 1996 game'
    });
    // No same-base/same-medium original for the game remake; the film is a different medium.
    assert.deepEqual(derivePairings([film, gameRemake]), []);
  });
});

describe('derivePairings — null releaseDate sorts last when choosing the original', () => {
  it('picks the earliest real-dated candidate as the original; null-dated candidate sorts last', () => {
    const undated = entry({ id: 'undated', title: 'Resident Evil 2', medium: 'game', releaseDate: null });
    const earliest = entry({ id: 'earliest', title: 'Resident Evil 2', medium: 'game', releaseDate: '1998-01-21' });
    const remake = entry({
      id: 'rmk',
      title: 'Resident Evil 2 (2019)',
      medium: 'game',
      releaseDate: '2019-01-25',
      versionNote: 'remake'
    });
    const result = derivePairings([undated, earliest, remake]);
    assert.deepEqual(result, [{ originalId: 'earliest', remakeId: 'rmk', note: 'remake' }]);
  });
});

describe('derivePairings — equal-date tie-break prefers the non-versionNote original', () => {
  it('on a date tie, the candidate without a versionNote wins as the original', () => {
    // Two same-base/same-medium candidates share a releaseDate: one is a plain original,
    // the other carries a versionNote (itself a remake). Contract: prefer the non-remake.
    const original = entry({ id: 'orig', title: 'Resident Evil 2', medium: 'game', releaseDate: '2000-01-01' });
    const sameDateRemake = entry({
      id: 'altremake',
      title: 'Resident Evil 2',
      medium: 'game',
      releaseDate: '2000-01-01',
      versionNote: 'alternate cut'
    });
    const remake = entry({
      id: 'rmk',
      title: 'Resident Evil 2 (2019)',
      medium: 'game',
      releaseDate: '2019-01-25',
      versionNote: '2019 remake'
    });
    const result = derivePairings([original, sameDateRemake, remake]);
    // sameDateRemake is also processed as a remake; the earliest-dated original wins for it.
    assert.deepEqual(result, [
      { originalId: 'orig', remakeId: 'altremake', note: 'alternate cut' },
      { originalId: 'orig', remakeId: 'rmk', note: '2019 remake' }
    ]);
  });
});

describe('derivePairings — output ordered by remake input position', () => {
  it('orders pairings by the remake entry input order, regardless of original positions', () => {
    const origA = entry({ id: 'origA', title: 'Alpha', medium: 'game', releaseDate: '1990-01-01' });
    const origB = entry({ id: 'origB', title: 'Beta', medium: 'game', releaseDate: '1991-01-01' });
    const remakeB = entry({
      id: 'rmkB',
      title: 'Beta (2010)',
      medium: 'game',
      releaseDate: '2010-01-01',
      versionNote: 'B remake'
    });
    const remakeA = entry({
      id: 'rmkA',
      title: 'Alpha (2011)',
      medium: 'game',
      releaseDate: '2011-01-01',
      versionNote: 'A remake'
    });
    // remakeB appears before remakeA in input, so its pairing comes first.
    const result = derivePairings([origA, origB, remakeB, remakeA]);
    assert.deepEqual(result, [
      { originalId: 'origB', remakeId: 'rmkB', note: 'B remake' },
      { originalId: 'origA', remakeId: 'rmkA', note: 'A remake' }
    ]);
  });
});

describe('derivePairings — purity', () => {
  it('does not mutate the input array or its entry objects', () => {
    const original = entry({ id: 'orig', title: 'Resident Evil 2', medium: 'game', releaseDate: '1998-01-21' });
    const remake = entry({
      id: 'rmk',
      title: 'Resident Evil 2 (2019)',
      medium: 'game',
      releaseDate: '2019-01-25',
      versionNote: 'remake'
    });
    const input = [original, remake];
    const inputSnapshot = JSON.parse(JSON.stringify(input));

    derivePairings(input);

    assert.equal(input.length, 2);
    assert.deepEqual(input, inputSnapshot);
    assert.deepEqual(original, inputSnapshot[0]);
    assert.deepEqual(remake, inputSnapshot[1]);
  });
});
