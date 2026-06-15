import { parseLoreDate } from './lore-date.js';
import { makeNullsLast } from './sort-engine.js';

const VALID_MEDIA = ['game', 'novel', 'comic', 'film', 'show', 'stagePlay', 'podcast', 'audio', 'video'];
const VALID_BRANCHES = ['mainline', 'spinoff'];

export function parseSeries(jsonString) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Expected a JSON object' };
  }
  if (typeof data.slug !== 'string' || !data.slug) {
    return { ok: false, error: 'Missing or invalid "slug"' };
  }
  if (typeof data.name !== 'string' || !data.name) {
    return { ok: false, error: 'Missing or invalid "name"' };
  }
  if (!Array.isArray(data.entries)) {
    return { ok: false, error: 'Missing or invalid "entries" — must be an array' };
  }
  if (data.entries.length === 0) {
    return { ok: false, error: '"entries" must not be empty' };
  }

  const seenIds = new Set();
  const entries = [];

  for (let i = 0; i < data.entries.length; i++) {
    const raw = data.entries[i];
    const prefix = `Entry[${i}]`;
    const err = validateEntry(raw, prefix, seenIds);
    if (err) return { ok: false, error: err };
    seenIds.add(raw.id);
    entries.push(normalizeEntry(raw));
  }

  entries.sort(makeNullsLast(e => e.recommendedOrder));

  return {
    ok: true,
    series: {
      slug: data.slug,
      name: data.name,
      entries
    }
  };
}

function validateEntry(e, prefix, seenIds) {
  if (typeof e !== 'object' || e === null) return `${prefix}: not an object`;

  // Excluded entries are retained but Shell-hidden (ADR-0014): they have no place
  // in the recommended order, so they're exempt from recommendedReason +
  // recommendedOrder. Strict `=== true` so absent/false still require both.
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

  return null;
}

function normalizeEntry(raw) {
  return {
    id: raw.id,
    title: raw.title,
    medium: raw.medium,
    branch: raw.branch,
    releaseDate: raw.releaseDate ?? null,
    recommendedOrder: raw.recommendedOrder ?? null,
    recommendedReason: raw.recommendedReason,
    chronologicalOrder: raw.chronologicalOrder ?? null,
    loreDate: raw.loreDate ?? null,
    summary: raw.summary,
    image: raw.image ?? null,
    imageUrl: raw.imageUrl ?? null,
    status: raw.status,
    excluded: raw.excluded ?? false,
    sources: raw.sources
  };
}
