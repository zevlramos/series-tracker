import { resolveImage } from './resolve-image.js';
import { verbFor } from './status.js';
import { buildEditUrl } from './edit-url.js';

export function presentEntry(entry, repoCoords, seriesSlug) {
  return {
    id: entry.id,
    title: entry.title,
    medium: entry.medium,
    branch: entry.branch,
    summary: entry.summary,
    recommendedReason: entry.recommendedReason,
    imageSrc: resolveImage(entry),
    statusLabel: verbFor(entry.medium, entry.status),
    statusDone: Boolean(entry.status),
    editUrl: buildEditUrl(repoCoords, seriesSlug),
  };
}
