import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderSeriesIndex } from '../pipeline/render-series-index.js';

describe('renderSeriesIndex', () => {
  it('produces valid HTML with the series name in the title', () => {
    const html = renderSeriesIndex('Resident Evil');
    assert.ok(html.includes('<title>Resident Evil — Series Tracker</title>'));
  });

  it('includes the doctype', () => {
    const html = renderSeriesIndex('Silent Hill');
    assert.ok(html.startsWith('<!DOCTYPE html>'));
  });

  it('includes the shell script import', () => {
    const html = renderSeriesIndex('Resident Evil');
    assert.ok(html.includes("import { initShell } from '../../src/shell.js'"));
  });

  it('includes the stylesheet link', () => {
    const html = renderSeriesIndex('Resident Evil');
    assert.ok(html.includes('href="../../style.css"'));
  });

  it('includes the app mount point', () => {
    const html = renderSeriesIndex('Resident Evil');
    assert.ok(html.includes('id="app"'));
  });

  it('escapes HTML entities in the name', () => {
    const html = renderSeriesIndex('Tom & Jerry <3');
    assert.ok(html.includes('Tom &amp; Jerry &lt;3'));
    assert.ok(!html.includes('<3'));
  });
});
