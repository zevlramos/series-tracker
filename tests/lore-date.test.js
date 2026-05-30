import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseLoreDate, compareLoreDate, formatLoreDate } from '../src/modules/lore-date.js';

describe('parseLoreDate', () => {
  describe('valid precisions', () => {
    const valid = [
      ['1998', { year: 1998, precision: 'year' }],
      ['1998-09', { year: 1998, month: 9, precision: 'month' }],
      ['1998-09-28', { year: 1998, month: 9, day: 28, precision: 'day' }],
      ['1998-01', { year: 1998, month: 1, precision: 'month' }],
      ['1998-12', { year: 1998, month: 12, precision: 'month' }],
      ['1998-01-01', { year: 1998, month: 1, day: 1, precision: 'day' }],
      ['1998-12-31', { year: 1998, month: 12, day: 31, precision: 'day' }],
      ['0001', { year: 1, precision: 'year' }],
      ['0000', { year: 0, precision: 'year' }],
    ];
    for (const [input, expected] of valid) {
      it(`parses ${JSON.stringify(input)}`, () => {
        assert.deepEqual(parseLoreDate(input), expected);
      });
    }
  });

  describe('structural rejects (→ null)', () => {
    const rejects = [
      '98', '199', '12345', '19980', '998',          // wrong-length year
      'abcd', '19x8', '1998-0a',                       // non-digit
      '1998/09', '1998_09', '1998.09', '1998/09/28',   // bad separators
      '1998-9', '1998-09-8',                           // unpadded month/day
      '1998-', '1998-09-',                             // trailing separator
      ' 1998', '1998 ', '1998-09-28 ',                 // whitespace (no trim)
      '1998-09-28T00:00:00',                           // datetime
      '',                                              // empty string
    ];
    for (const input of rejects) {
      it(`rejects ${JSON.stringify(input)}`, () => {
        assert.equal(parseLoreDate(input), null);
      });
    }
  });

  describe('calendar validity', () => {
    const cases = [
      // month bounds
      ['1998-00', null],
      ['1998-13', null],
      // day bounds
      ['1998-09-00', null],
      ['1998-09-31', null],   // September has 30
      ['1998-09-32', null],
      ['1998-04-31', null],   // April has 30
      ['1998-04-30', { year: 1998, month: 4, day: 30, precision: 'day' }],
      ['1998-01-31', { year: 1998, month: 1, day: 31, precision: 'day' }],
      // leap years
      ['1998-02-28', { year: 1998, month: 2, day: 28, precision: 'day' }],
      ['1998-02-29', null],                            // 1998 not leap
      ['2004-02-29', { year: 2004, month: 2, day: 29, precision: 'day' }], // leap
      ['1900-02-29', null],                            // century, not /400
      ['2000-02-29', { year: 2000, month: 2, day: 29, precision: 'day' }], // /400 leap
      ['2004-02-30', null],                            // Feb never reaches 30
    ];
    for (const [input, expected] of cases) {
      it(`${JSON.stringify(input)} → ${expected === null ? 'null' : 'valid'}`, () => {
        assert.deepEqual(parseLoreDate(input), expected);
      });
    }
  });

  describe('non-string input (→ null, the valid/absent signal)', () => {
    const nonStrings = [null, undefined, 1998, true, {}, { year: 1998 }, ['1998']];
    for (const input of nonStrings) {
      it(`rejects ${typeof input} ${JSON.stringify(input)}`, () => {
        assert.equal(parseLoreDate(input), null);
      });
    }
  });
});

describe('compareLoreDate', () => {
  it('returns strictly -1 / 0 / 1, never raw differences', () => {
    assert.strictEqual(compareLoreDate('1000', '2024'), -1); // not -1024
    assert.strictEqual(compareLoreDate('1998-01', '1998-12'), -1); // not -11
    assert.strictEqual(compareLoreDate('1998-09-28', '1998-09-01'), 1); // not 27
  });

  describe('precision chain "1998" < "1998-09" < "1999"', () => {
    it('"1998" before "1998-09" (absent month sorts first)', () => {
      assert.strictEqual(compareLoreDate('1998', '1998-09'), -1);
    });
    it('"1998-09" before "1999" (year dominates precision)', () => {
      assert.strictEqual(compareLoreDate('1998-09', '1999'), -1);
    });
    it('"1998-09" before "1998-09-28" (absent day sorts first)', () => {
      assert.strictEqual(compareLoreDate('1998-09', '1998-09-28'), -1);
    });
    it('"1998-09" before "1998-09-01" (absent day < day 01, not equal)', () => {
      assert.strictEqual(compareLoreDate('1998-09', '1998-09-01'), -1);
    });
  });

  describe('ordering at each level', () => {
    const pairs = [
      ['1998', '1999', -1],
      ['1999', '1998', 1],
      ['1998', '1998', 0],
      ['1998-03', '1998-11', -1],
      ['1998-11', '1998-03', 1],
      ['1998-09', '1998-09', 0],
      ['1998-09-01', '1998-09-28', -1],
      ['1998-09-28', '1998-09-28', 0],
      ['1998-09-28', '1998-10', -1], // month precedence before day
    ];
    for (const [a, b, expected] of pairs) {
      it(`compare(${a}, ${b}) === ${expected}`, () => {
        assert.strictEqual(compareLoreDate(a, b), expected);
      });
    }
  });

  describe('null and invalid sort after known dates (nulls-last)', () => {
    it('compare(null, "1998") === 1', () => assert.strictEqual(compareLoreDate(null, '1998'), 1));
    it('compare("1998", null) === -1', () => assert.strictEqual(compareLoreDate('1998', null), -1));
    it('compare(null, null) === 0', () => assert.strictEqual(compareLoreDate(null, null), 0));
    it('invalid string treated as null: compare("garbage", "1998") === 1', () =>
      assert.strictEqual(compareLoreDate('garbage', '1998'), 1));
    it('invalid string treated as null: compare("1998", "garbage") === -1', () =>
      assert.strictEqual(compareLoreDate('1998', 'garbage'), -1));
    it('invalid == null at the tail: compare("garbage", null) === 0', () =>
      assert.strictEqual(compareLoreDate('garbage', null), 0));
    it('invalid == invalid: compare("garbage", "nonsense") === 0', () =>
      assert.strictEqual(compareLoreDate('garbage', 'nonsense'), 0));
    it('calendar-invalid sorts after valid: compare("1900-02-29", "1900") === 1', () =>
      assert.strictEqual(compareLoreDate('1900-02-29', '1900'), 1));
  });

  it('works as an Array.sort comparator: dates interleave by precision, null/invalid land last', () => {
    const input = ['1999', null, '1998-09', 'garbage', '1998', '1998-09-28'];
    const sorted = [...input].sort(compareLoreDate);
    // Known dates, in order, occupy the front:
    assert.deepEqual(sorted.slice(0, 4), ['1998', '1998-09', '1998-09-28', '1999']);
    // The last two slots are exactly the unknowns (mutual order unconstrained, they compare 0):
    assert.deepEqual(new Set(sorted.slice(4)), new Set([null, 'garbage']));
  });
});

describe('formatLoreDate', () => {
  describe('renders each precision', () => {
    const cases = [
      ['1998', '1998'],
      ['2024', '2024'],
      ['1998-01', 'January 1998'],
      ['1998-09', 'September 1998'],
      ['1998-12', 'December 1998'],
      ['1998-02', 'February 1998'],
      ['1998-09-28', 'September 28, 1998'],
      ['1998-09-01', 'September 1, 1998'],   // day not zero-padded
      ['2000-01-05', 'January 5, 2000'],
      ['1998-10-01', 'October 1, 1998'],
      ['1998-12-31', 'December 31, 1998'],
      ['2004-02-29', 'February 29, 2004'],
    ];
    for (const [input, expected] of cases) {
      it(`${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
        assert.equal(formatLoreDate(input), expected);
      });
    }
  });

  describe('null / invalid → null (defers to parse validity)', () => {
    const nullish = [null, undefined, 1998, '', '1998-13', '1998-00', '1998-9', '1998-02-29', '2001-02-29', '1998-02-30'];
    for (const input of nullish) {
      it(`${JSON.stringify(input)} → null`, () => {
        assert.equal(formatLoreDate(input), null);
      });
    }
  });
});
