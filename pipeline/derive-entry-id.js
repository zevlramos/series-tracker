export function deriveEntryId(title, { disambiguator } = {}) {
  let slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['‘’ʼʹ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (disambiguator && !slug.endsWith(`-${disambiguator.toLowerCase()}`)) {
    slug = `${slug}-${disambiguator.toLowerCase()}`;
  }

  return slug;
}
