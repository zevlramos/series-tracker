export function themeToCssVars(theme) {
  const vars = {};
  const tokens = theme.tokens || {};

  if (tokens.palette) {
    for (const [key, value] of Object.entries(tokens.palette)) {
      if (value != null) vars[`--${key}`] = value;
    }
  }

  if (tokens.fonts) {
    if (tokens.fonts.heading != null) vars['--font-heading'] = tokens.fonts.heading;
    if (tokens.fonts.body != null) vars['--font-body'] = tokens.fonts.body;
  }

  if (tokens.heroImage != null) {
    const safe = tokens.heroImage.replace(/[\\"()]/g, '\\$&');
    vars['--hero-image'] = `url("${safe}")`;
  }

  if (tokens.background != null) {
    vars['--background'] = tokens.background;
  }

  return vars;
}
