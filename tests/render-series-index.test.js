import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderSeriesIndex } from '../pipeline/render-series-index.js';

describe('renderSeriesIndex', () => {
  it('produces HTML with correct title and shell bootstrap', () => {
    const html = renderSeriesIndex('Resident Evil');
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('<title>Resident Evil — Series Tracker</title>'));
    assert.ok(html.includes("initShell(document.getElementById('app'), '.')"));
    assert.ok(html.includes('href="../../style.css"'));
  });

  it('escapes HTML entities in the name', () => {
    const html = renderSeriesIndex('Tom & Jerry <3');
    assert.ok(html.includes('Tom &amp; Jerry &lt;3'));
    assert.ok(!html.includes('<3'));
  });

  it('omits theme.css link by default', () => {
    const html = renderSeriesIndex('Test Series');
    assert.ok(!html.includes('theme.css'));
  });

  it('includes theme.css link when hasThemeCss is true', () => {
    const html = renderSeriesIndex('Resident Evil', { hasThemeCss: true });
    assert.ok(html.includes('href="theme.css"'));
    const styleIdx = html.indexOf('href="../../style.css"');
    const themeIdx = html.indexOf('href="theme.css"');
    assert.ok(themeIdx > styleIdx, 'theme.css link should appear after style.css');
  });
});
