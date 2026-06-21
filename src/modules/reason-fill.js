// Reason-suggestion apply-policy for the curation wizard (#64 / ADR-0015): the pure
// core deciding which Entries a research-time `_proposedReason` scratch may fill. The
// invariant is never-clobber — a proposal applies ONLY where `recommendedReason` is
// empty (FALSY, matching the publish gate's `!e[field]` at parse-series.js:61; no trim,
// so whitespace counts as AUTHORED). The accepted value lands in the real
// `recommendedReason` by a human act; this module never mutates.

// true iff the entry carries a non-empty proposed reason (the scratch suggestion).
export function hasProposedReason(entry) {
  return !!entry._proposedReason;
}

// true iff the entry already has an authored reason. Falsy-test, no trim: a
// whitespace-only reason counts as authored (mirrors the gate, never overwrite it).
export function hasAuthoredReason(entry) {
  return !!entry.recommendedReason;
}

// true iff there is a proposal to apply AND no authored reason to protect.
export function canUseProposed(entry) {
  return hasProposedReason(entry) && !hasAuthoredReason(entry);
}

// The blanks-only fill plan: one { id, value } per fillable entry, input order
// preserved, the proposal used verbatim. Authored entries are never included.
export function planReasonFill(entries) {
  return entries
    .filter(canUseProposed)
    .map((e) => ({ id: e.id, value: e._proposedReason }));
}
