import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateTheme } from '../pipeline/validate-theme.js';

const fixturePath = new URL('../series/resident-evil/theme.json', import.meta.url);
const goldenTheme = JSON.parse(readFileSync(fixturePath, 'utf8'));

describe('validateTheme', () => {
  it('accepts the RE golden fixture', () => {
    const result = validateTheme(goldenTheme);
    assert.equal(result.ok, true);
    assert.deepEqual(result.theme, goldenTheme);
  });

  it('accepts non-null heroImage and background', () => {
    const theme = {
      layoutMode: 'paged',
      tokens: {
        ...goldenTheme.tokens,
        heroImage: 'assets/hero.jpg',
        background: 'linear-gradient(#000, #111)'
      }
    };
    const result = validateTheme(theme);
    assert.equal(result.ok, true);
  });

  it('rejects missing layoutMode', () => {
    const { layoutMode, ...noLayout } = goldenTheme;
    const result = validateTheme(noLayout);
    assert.equal(result.ok, false);
    assert.match(result.error, /layoutMode/);
  });

  it('rejects unsupported layoutMode', () => {
    const result = validateTheme({ ...goldenTheme, layoutMode: 'grid' });
    assert.equal(result.ok, false);
    assert.match(result.error, /layoutMode/);
  });

  it('rejects missing tokens', () => {
    const result = validateTheme({ layoutMode: 'paged' });
    assert.equal(result.ok, false);
    assert.match(result.error, /tokens/);
  });

  it('rejects missing palette key', () => {
    const { accent, ...noAccent } = goldenTheme.tokens.palette;
    const theme = {
      ...goldenTheme,
      tokens: { ...goldenTheme.tokens, palette: noAccent }
    };
    const result = validateTheme(theme);
    assert.equal(result.ok, false);
    assert.match(result.error, /accent/);
  });

  it('rejects missing font key', () => {
    const { body, ...noBody } = goldenTheme.tokens.fonts;
    const theme = {
      ...goldenTheme,
      tokens: { ...goldenTheme.tokens, fonts: noBody }
    };
    const result = validateTheme(theme);
    assert.equal(result.ok, false);
    assert.match(result.error, /body/);
  });

  it('rejects missing heroImage key', () => {
    const { heroImage, ...rest } = goldenTheme.tokens;
    const theme = { ...goldenTheme, tokens: rest };
    const result = validateTheme(theme);
    assert.equal(result.ok, false);
    assert.match(result.error, /heroImage/);
  });

  it('rejects missing background key', () => {
    const { background, ...rest } = goldenTheme.tokens;
    const theme = { ...goldenTheme, tokens: rest };
    const result = validateTheme(theme);
    assert.equal(result.ok, false);
    assert.match(result.error, /background/);
  });

  it('rejects non-object input', () => {
    assert.equal(validateTheme(null).ok, false);
    assert.equal(validateTheme('string').ok, false);
    assert.equal(validateTheme([]).ok, false);
  });

  it('accepts pageTurn "3d"', () => {
    const theme = { ...goldenTheme, pageTurn: '3d' };
    const result = validateTheme(theme);
    assert.equal(result.ok, true);
  });

  it('accepts missing pageTurn', () => {
    const { pageTurn, ...noPT } = goldenTheme;
    const result = validateTheme(noPT);
    assert.equal(result.ok, true);
  });

  it('accepts null pageTurn', () => {
    const theme = { ...goldenTheme, pageTurn: null };
    const result = validateTheme(theme);
    assert.equal(result.ok, true);
  });

  it('rejects unsupported pageTurn', () => {
    const result = validateTheme({ ...goldenTheme, pageTurn: 'slide' });
    assert.equal(result.ok, false);
    assert.match(result.error, /pageTurn/);
  });
});
