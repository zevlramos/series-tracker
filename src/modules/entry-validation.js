// Shared entry-validation primitives for the two parallel gates that must enforce
// the SAME entry rules: the publish-time gate (parse-series.js) and the draft-stage
// gate (pipeline/validate-draft.js). Keeping these in one place means the two gates
// cannot drift — a draft that passes the wizard gate cannot then fail the publish
// gate (or vice-versa) because they agree by construction, not by parallel prose.

export const VALID_MEDIA = ['game', 'novel', 'comic', 'film', 'show', 'stagePlay', 'podcast', 'audio', 'video'];
export const VALID_BRANCHES = ['mainline', 'spinoff'];

// isRecommendedExempt(entry) -> true when the entry is exempt from recommendedReason
// + recommendedOrder. Excluded entries are retained but Shell-hidden (ADR-0014): they
// have no place in the recommended order, so both fields are optional for them.
// Strict `=== true` so absent/false `excluded` still requires both fields.
export function isRecommendedExempt(entry) {
  return entry.excluded === true;
}
