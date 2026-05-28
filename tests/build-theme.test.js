import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTheme } from '../pipeline/build-theme.js';
import { validateTheme } from '../pipeline/validate-theme.js';
import { themeToCssVars } from '../src/modules/theme-mapper.js';

const fixturePath = new URL('../series/resident-evil/theme.json', import.meta.url);
const goldenTheme = JSON.parse(readFileSync(fixturePath, 'utf8'));

describe('buildTheme', () => {
  it('assembles RE golden tokens into a valid theme', () => {
    const theme = buildTheme({
      layoutMode: 'paged',
      tokens: goldenTheme.tokens
    });
    const result = validateTheme(theme);
    assert.equal(result.ok, true);
    assert.deepEqual(theme, goldenTheme);
  });

  it('output is consumable by themeToCssVars', () => {
    const theme = buildTheme({
      layoutMode: 'paged',
      tokens: goldenTheme.tokens
    });
    const vars = themeToCssVars(theme);
    assert.equal(vars['--bg'], '#0a0a0a');
    assert.equal(vars['--accent'], '#c41e3a');
    assert.equal(vars['--font-heading'], "'Trebuchet MS', 'Lucida Sans', sans-serif");
  });

  it('defaults layoutMode to "paged" when omitted', () => {
    const theme = buildTheme({ tokens: goldenTheme.tokens });
    assert.equal(theme.layoutMode, 'paged');
    assert.equal(validateTheme(theme).ok, true);
  });

  it('fills missing heroImage and background with null', () => {
    const theme = buildTheme({
      tokens: {
        palette: goldenTheme.tokens.palette,
        fonts: goldenTheme.tokens.fonts
      }
    });
    assert.equal(theme.tokens.heroImage, null);
    assert.equal(theme.tokens.background, null);
    assert.equal(validateTheme(theme).ok, true);
  });

  it('preserves non-null heroImage and background', () => {
    const theme = buildTheme({
      tokens: {
        palette: goldenTheme.tokens.palette,
        fonts: goldenTheme.tokens.fonts,
        heroImage: 'assets/hero.jpg',
        background: 'linear-gradient(#000, #111)'
      }
    });
    assert.equal(theme.tokens.heroImage, 'assets/hero.jpg');
    assert.equal(theme.tokens.background, 'linear-gradient(#000, #111)');
  });
});
