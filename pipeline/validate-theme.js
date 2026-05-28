const VALID_LAYOUT_MODES = ['paged'];
const PALETTE_KEYS = ['bg', 'surface', 'text', 'accent'];
const FONT_KEYS = ['heading', 'body'];

export function validateTheme(theme) {
  if (!theme || typeof theme !== 'object' || Array.isArray(theme)) {
    return { ok: false, error: 'Theme must be an object' };
  }

  if (!VALID_LAYOUT_MODES.includes(theme.layoutMode)) {
    return { ok: false, error: `Invalid layoutMode "${theme.layoutMode}" — must be one of: ${VALID_LAYOUT_MODES.join(', ')}` };
  }

  if (!theme.tokens || typeof theme.tokens !== 'object' || Array.isArray(theme.tokens)) {
    return { ok: false, error: 'Missing or invalid "tokens" — must be an object' };
  }

  const t = theme.tokens;

  if (!t.palette || typeof t.palette !== 'object' || Array.isArray(t.palette)) {
    return { ok: false, error: 'Missing or invalid "tokens.palette" — must be an object' };
  }
  for (const key of PALETTE_KEYS) {
    if (!(key in t.palette)) {
      return { ok: false, error: `Missing palette key "${key}"` };
    }
    if (t.palette[key] !== null && typeof t.palette[key] !== 'string') {
      return { ok: false, error: `palette.${key} must be a string or null` };
    }
  }

  if (!t.fonts || typeof t.fonts !== 'object' || Array.isArray(t.fonts)) {
    return { ok: false, error: 'Missing or invalid "tokens.fonts" — must be an object' };
  }
  for (const key of FONT_KEYS) {
    if (!(key in t.fonts)) {
      return { ok: false, error: `Missing font key "${key}"` };
    }
    if (t.fonts[key] !== null && typeof t.fonts[key] !== 'string') {
      return { ok: false, error: `fonts.${key} must be a string or null` };
    }
  }

  if (!('heroImage' in t)) {
    return { ok: false, error: 'Missing "tokens.heroImage" key' };
  }
  if (t.heroImage !== null && typeof t.heroImage !== 'string') {
    return { ok: false, error: 'tokens.heroImage must be a string or null' };
  }

  if (!('background' in t)) {
    return { ok: false, error: 'Missing "tokens.background" key' };
  }
  if (t.background !== null && typeof t.background !== 'string') {
    return { ok: false, error: 'tokens.background must be a string or null' };
  }

  return { ok: true, theme };
}
