export function deriveEntryId(title, { disambiguator } = {}) {
  let slug = title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (disambiguator && !slug.endsWith(disambiguator.toLowerCase())) {
    slug = `${slug}-${disambiguator.toLowerCase()}`;
  }

  return slug;
}
