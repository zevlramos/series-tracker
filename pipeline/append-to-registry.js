export function appendToRegistry(registry, { slug, name }) {
  if (registry.some(entry => entry.slug === slug)) {
    return registry;
  }
  return [...registry, { slug, name }];
}
