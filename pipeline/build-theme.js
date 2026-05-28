export function buildTheme({ layoutMode, pageTurn, tokens } = {}) {
  const t = tokens || {};
  const theme = {
    layoutMode: layoutMode || 'paged',
    tokens: {
      palette: { ...t.palette },
      fonts: { ...t.fonts },
      heroImage: t.heroImage ?? null,
      background: t.background ?? null
    }
  };
  if (pageTurn != null) theme.pageTurn = pageTurn;
  return theme;
}
