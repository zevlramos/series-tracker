import { hasOnlyLowTrustSources } from './flag-low-trust-source.js';

export function renderDraftMarkdown(draft) {
  const lines = [];
  lines.push(`# ${draft.name} — Draft`);
  lines.push('');
  lines.push(`**Slug:** \`${draft.slug}\``);
  lines.push(`**Order rationale:** ${draft.orderRationale}`);
  lines.push('');

  if (draft.incompleteMedia.length > 0) {
    lines.push(`> **Incomplete media:** ${draft.incompleteMedia.join(', ')} — research did not finish for these. Review or re-run.`);
    lines.push('');
  }

  const flagged = [];
  const clean = [];
  for (const entry of draft.entries) {
    if (entry.confidence === 'low' || hasOnlyLowTrustSources(entry.sources)) {
      flagged.push(entry);
    } else {
      clean.push(entry);
    }
  }

  if (flagged.length > 0) {
    lines.push(`## Needs review (${flagged.length})`);
    lines.push('');
    for (const entry of flagged) {
      renderEntry(lines, entry, true);
    }
  }

  lines.push(`## Entries (${clean.length})`);
  lines.push('');
  for (const entry of clean) {
    renderEntry(lines, entry, false);
  }

  return lines.join('\n');
}

function renderEntry(lines, entry, showFlags) {
  lines.push(`### ${entry.recommendedOrder}. ${entry.title}`);
  lines.push('');
  lines.push(`- **Medium:** ${entry.medium} | **Branch:** ${entry.branch}`);
  if (entry.releaseDate) {
    lines.push(`- **Release:** ${entry.releaseDate}`);
  }
  lines.push(`- **Reason for placement:** ${entry.recommendedReason}`);
  lines.push(`- **Summary:** ${entry.summary}`);
  if (entry.imageUrl) {
    lines.push(`- **Cover URL:** ${entry.imageUrl}`);
  }
  if (entry.versionNote) {
    lines.push(`- **Version note:** ${entry.versionNote}`);
  }
  lines.push(`- **Sources:** ${entry.sources.join(', ')}`);

  if (showFlags) {
    const reasons = [];
    if (entry.confidence === 'low') {
      reasons.push(`low confidence${entry.confidenceReason ? ` — ${entry.confidenceReason}` : ''}`);
    }
    if (hasOnlyLowTrustSources(entry.sources)) {
      reasons.push('only low-trust sources');
    }
    if (entry.sourceNotes) {
      reasons.push(entry.sourceNotes);
    }
    lines.push(`- **⚠ Flagged:** ${reasons.join('; ')}`);
  }

  lines.push('');
}
