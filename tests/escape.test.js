import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { esc } from '../src/modules/escape.js';

describe('esc', () => {
  it('escapes ampersands', () => {
    assert.equal(esc('a & b'), 'a &amp; b');
  });

  it('escapes angle brackets', () => {
    assert.equal(esc('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapes double quotes', () => {
    assert.equal(esc('a "b" c'), 'a &quot;b&quot; c');
  });

  it('escapes single quotes', () => {
    assert.equal(esc("it's"), 'it&#x27;s');
  });

  it('handles strings with no special characters', () => {
    assert.equal(esc('hello world'), 'hello world');
  });

  it('handles empty strings', () => {
    assert.equal(esc(''), '');
  });

  it('coerces non-string values', () => {
    assert.equal(esc(42), '42');
    assert.equal(esc(null), 'null');
    assert.equal(esc(undefined), 'undefined');
  });

  it('escapes all special characters in one string', () => {
    assert.equal(esc(`<a href="x" class='y'>&</a>`), '&lt;a href=&quot;x&quot; class=&#x27;y&#x27;&gt;&amp;&lt;/a&gt;');
  });
});
