import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { themeToCssVars } from '../src/modules/theme-mapper.js';

describe('themeToCssVars', () => {
  it('maps palette tokens to CSS custom properties', () => {
    const theme = {
      tokens: {
        palette: { bg: '#000', surface: '#111', text: '#eee', accent: '#f00' }
      }
    };
    const vars = themeToCssVars(theme);
    assert.equal(vars['--bg'], '#000');
    assert.equal(vars['--surface'], '#111');
    assert.equal(vars['--text'], '#eee');
    assert.equal(vars['--accent'], '#f00');
  });

  it('maps font tokens', () => {
    const theme = {
      tokens: {
        fonts: { heading: 'Georgia, serif', body: 'Verdana, sans-serif' }
      }
    };
    const vars = themeToCssVars(theme);
    assert.equal(vars['--font-heading'], 'Georgia, serif');
    assert.equal(vars['--font-body'], 'Verdana, sans-serif');
  });

  it('maps heroImage and background', () => {
    const theme = {
      tokens: {
        heroImage: 'assets/hero.jpg',
        background: 'linear-gradient(#000, #111)'
      }
    };
    const vars = themeToCssVars(theme);
    assert.equal(vars['--hero-image'], 'url("assets/hero.jpg")');
    assert.equal(vars['--background'], 'linear-gradient(#000, #111)');
  });

  it('handles missing optional tokens gracefully', () => {
    const theme = { tokens: {} };
    const vars = themeToCssVars(theme);
    assert.equal(typeof vars, 'object');
    assert.equal(vars['--bg'], undefined);
  });

  it('handles completely empty theme', () => {
    const vars = themeToCssVars({});
    assert.equal(typeof vars, 'object');
  });

  it('handles missing tokens key', () => {
    const vars = themeToCssVars({});
    assert.equal(typeof vars, 'object');
  });

  it('does not produce vars for null token values', () => {
    const theme = {
      tokens: {
        palette: { bg: '#000', surface: null }
      }
    };
    const vars = themeToCssVars(theme);
    assert.equal(vars['--bg'], '#000');
    assert.equal(vars['--surface'], undefined);
  });
});
