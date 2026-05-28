export function buildTheme({ layoutMode, tokens } = {}) {
  const t = tokens || {};
  return {
    layoutMode: layoutMode || 'paged',
    tokens: {
      palette: { ...t.palette },
      fonts: { ...t.fonts },
      heroImage: t.heroImage ?? null,
      background: t.background ?? null
    }
  };
}
