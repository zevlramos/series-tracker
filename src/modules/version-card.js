// N-member version card — pure logic, EXTRACTED out of curate.html so it is
// unit-testable under node --test (#55, ADR-0014). The DOM render (release-timeline
// nodes, "Readers will see" panel), real keydown wiring, and N>=4 title wrapping
// live in curate.html and are verified via /verify — NOT here.
//
// A "version group" is a { versionGroup, members } element from deriveVersionGroups:
// members are already release-ordered (earliest first, nulls last). This module
// turns that group into a card model, runs the accumulate-then-advance keyboard
// reducer, projects per-member show/exclude to the durable `excluded` field, and
// performs the 3-state publish selection (drop / excluded / visible + renumber).

import { stripYear } from './version-pairing.js';

// Digit keys cap at 9 (issue #55): a 10th+ member can only be toggled by click.
const MAX_DIGIT_MEMBER = 9;

// The year of a releaseDate string, or null when undated.
function releaseYear(releaseDate) {
  if (releaseDate == null) return null;
  const m = String(releaseDate).match(/^(\d{4})/);
  return m ? m[1] : null;
}

// buildVersionCard(group) -> card model anchored at the EARLIEST member.
// (latest-anchor was considered and REJECTED — single rule, issue #55.)
// Members arrive release-ordered from deriveVersionGroups, so members[0] is earliest.
export function buildVersionCard(group) {
  const members = group.members;
  const earliest = members[0];

  // Date range spans earliest..latest member year; a shared single year shows once.
  const years = members.map(m => releaseYear(m.releaseDate)).filter(y => y != null);
  const firstYear = years.length ? years[0] : null;
  const lastYear = years.length ? years[years.length - 1] : null;
  let dateRange = '';
  if (firstYear != null && lastYear != null) {
    dateRange = firstYear === lastYear ? firstYear : `${firstYear}–${lastYear}`; // en dash
  } else if (firstYear != null) {
    dateRange = firstYear;
  }

  return {
    versionGroup: group.versionGroup,
    title: `${stripYear(earliest.title)} — which version(s)?`, // em dash, matches #47 card copy
    anchorReleaseDate: earliest.releaseDate ?? null,
    dateRange,
    members,
    count: members.length,
  };
}

// initialExcludeState(card) -> reducer state with NOBODY excluded (all shown by
// default; nothing is dropped until the maintainer acts). State is a Set of the
// excluded member ids; the reducer treats it immutably (each step returns a fresh Set).
export function initialExcludeState() {
  return new Set();
}

// reduceCardKey(state, key, card) -> { state, action } — uniform accumulate-then-advance
// for ALL group sizes (including N=2; this REPLACES #47's one-press-commit):
//   '1'..'9' : toggle that member (date order) and STAY on the card  -> action 'stay'
//   '0'      : show ALL (clear every exclusion), stay                -> action 'stay'
//   'x'      : exclude ALL members, stay                             -> action 'stay'
//   ArrowRight / Enter : advance (commit)                            -> action 'advance'
//   ArrowLeft          : back                                        -> action 'back'
//   ' ' (Space)        : skip                                        -> action 'skip'
// Number keys cap at 9; a digit > the group size is a no-op stay. advance/back/skip
// never mutate the exclude-state — only the action differs.
export function reduceCardKey(state, key, card) {
  const members = card.members;

  if (key === 'ArrowRight' || key === 'Enter') return { state, action: 'advance' };
  if (key === 'ArrowLeft') return { state, action: 'back' };
  if (key === ' ') return { state, action: 'skip' };

  if (key === '0') return { state: new Set(), action: 'stay' };
  if (key === 'x') return { state: new Set(members.map(m => m.id)), action: 'stay' };

  if (key >= '1' && key <= '9') {
    const n = Number(key);
    if (n <= MAX_DIGIT_MEMBER && n <= members.length) {
      const id = members[n - 1].id;
      const next = new Set(state);
      if (next.has(id)) next.delete(id); else next.add(id); // toggle
      return { state: next, action: 'stay' };
    }
    return { state, action: 'stay' }; // digit > group size: no-op stay
  }

  return { state, action: 'stay' }; // any other key: ignored stay
}

// projectExclusions(members, state) -> [{ id, excluded }] per member, in member
// (release) order. A member in the state Set is excluded:true; otherwise false.
export function projectExclusions(members, state) {
  return members.map(m => ({ id: m.id, excluded: state.has(m.id) }));
}

// readerOutcome(card, state) -> the shared "Readers will see" readout, reflecting the
// LIVE exclude-state: counts and titles split into visible (release order) vs hidden.
export function readerOutcome(card, state) {
  const visible = card.members.filter(m => !state.has(m.id));
  const hidden = card.members.filter(m => state.has(m.id));
  return {
    visibleCount: visible.length,
    hiddenCount: hidden.length,
    visibleTitles: visible.map(m => m.title),
    hiddenTitles: hidden.map(m => m.title),
  };
}

// selectPublishEntries(entries) -> the 3-state publish selection (the #52<->#55 seam):
//   (a) _drop === true      -> genuinely removed (Tinder swipe-left): GONE from output
//   (b) excluded === true   -> RETAINED, recommendedOrder forced null (gate exempts it)
//   (c) visible (neither)   -> excluded:false, recommendedOrder renumbered 1..N across
//                              the visible set ONLY (excluded members consume no slot)
// _drop wins over excluded. Pure: input entries are not mutated; fresh objects out.
export function selectPublishEntries(entries) {
  let order = 0;
  const out = [];
  for (const e of entries) {
    if (e._drop) continue; // (a) dropped — gone, even if also excluded
    if (e.excluded === true) {
      out.push({ ...e, recommendedOrder: null }); // (b) retained, no order slot
    } else {
      out.push({ ...e, recommendedOrder: ++order }); // (c) visible, renumbered
    }
  }
  return out;
}
