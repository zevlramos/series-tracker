import { parseLoreDate } from '../src/modules/lore-date.js';

const VALID_MEDIA = ['game', 'novel', 'comic', 'film', 'show', 'stagePlay', 'podcast', 'audio', 'video'];
const VALID_BRANCHES = ['mainline', 'spinoff'];
const VALID_CONFIDENCE = ['high', 'low'];

export function validateDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return { ok: false, error: 'Draft must be an object' };
  }

  if (typeof draft.slug !== 'string' || !draft.slug) {
    return { ok: false, error: 'Missing or invalid "slug"' };
  }
  if (typeof draft.name !== 'string' || !draft.name) {
    return { ok: false, error: 'Missing or invalid "name"' };
  }
  if (typeof draft.orderRationale !== 'string' || !draft.orderRationale) {
    return { ok: false, error: 'Missing or invalid "orderRationale"' };
  }
  if (!Array.isArray(draft.incompleteMedia)) {
    return { ok: false, error: 'Missing or invalid "incompleteMedia" — must be an array' };
  }
  if (!Array.isArray(draft.entries)) {
    return { ok: false, error: 'Missing or invalid "entries" — must be an array' };
  }
  if (draft.entries.length === 0) {
    return { ok: false, error: '"entries" must not be empty' };
  }

  const seenIds = new Set();

  for (let i = 0; i < draft.entries.length; i++) {
    const entry = draft.entries[i];
    const prefix = `Entry[${i}]`;
    const err = validateDraftEntry(entry, prefix, seenIds);
    if (err) return { ok: false, error: err };
    seenIds.add(entry.id);
  }

  return { ok: true, draft };
}

function validateDraftEntry(e, prefix, seenIds) {
  if (typeof e !== 'object' || e === null) return `${prefix}: not an object`;

  // Excluded entries are exempt from recommendedReason + recommendedOrder, exactly
  // as the publish gate (parse-series) is — a newly-excluded draft entry has
  // neither. Strict `=== true` so absent/false still require both (ADR-0014).
  const exempt = e.excluded === true;

  const requiredStrings = ['id', 'title', 'medium', 'branch', 'summary'];
  if (!exempt) requiredStrings.push('recommendedReason');
  for (const field of requiredStrings) {
    if (typeof e[field] !== 'string' || !e[field]) {
      return `${prefix}: missing or invalid "${field}"`;
    }
  }

  if (!exempt && (typeof e.recommendedOrder !== 'number' || !Number.isInteger(e.recommendedOrder))) {
    return `${prefix}: missing or invalid "recommendedOrder" — must be an integer`;
  }

  if (!Array.isArray(e.sources)) {
    return `${prefix}: missing or invalid "sources" — must be an array`;
  }
  if (e.sources.length === 0) {
    return `${prefix}: "sources" must have at least one entry`;
  }
  for (let j = 0; j < e.sources.length; j++) {
    if (typeof e.sources[j] !== 'string' || !e.sources[j]) {
      return `${prefix}: sources[${j}] must be a non-empty string`;
    }
  }

  if (!VALID_MEDIA.includes(e.medium)) {
    return `${prefix}: invalid "medium" "${e.medium}" — must be one of: ${VALID_MEDIA.join(', ')}`;
  }

  if (!VALID_BRANCHES.includes(e.branch)) {
    return `${prefix}: invalid "branch" "${e.branch}" — must be one of: ${VALID_BRANCHES.join(', ')}`;
  }

  if (typeof e.status !== 'boolean') {
    return `${prefix}: invalid "status" — must be a boolean`;
  }

  if (e.excluded != null && typeof e.excluded !== 'boolean') {
    return `${prefix}: "excluded" must be a boolean`;
  }

  if (seenIds.has(e.id)) {
    return `${prefix}: duplicate "id" "${e.id}"`;
  }

  if (e.releaseDate != null && typeof e.releaseDate !== 'string') {
    return `${prefix}: "releaseDate" must be a string or null`;
  }

  if (e.chronologicalOrder !== null && e.chronologicalOrder !== undefined &&
      (typeof e.chronologicalOrder !== 'number' || !Number.isInteger(e.chronologicalOrder))) {
    return `${prefix}: invalid "chronologicalOrder" — must be an integer or null`;
  }

  if (e.loreDate != null &&
      (typeof e.loreDate !== 'string' || parseLoreDate(e.loreDate) === null)) {
    return `${prefix}: invalid "loreDate" — must be null or an ISO date (YYYY, YYYY-MM, or YYYY-MM-DD)`;
  }

  if (!VALID_CONFIDENCE.includes(e.confidence)) {
    return `${prefix}: invalid "confidence" — must be one of: ${VALID_CONFIDENCE.join(', ')}`;
  }

  if (e.confidenceReason !== null && typeof e.confidenceReason !== 'string') {
    return `${prefix}: "confidenceReason" must be a string or null`;
  }

  if (e.versionNote !== null && typeof e.versionNote !== 'string') {
    return `${prefix}: "versionNote" must be a string or null`;
  }

  if (e.sourceNotes !== null && typeof e.sourceNotes !== 'string') {
    return `${prefix}: "sourceNotes" must be a string or null`;
  }

  return null;
}
