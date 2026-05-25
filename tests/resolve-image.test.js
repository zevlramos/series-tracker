import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveImage } from '../src/modules/resolve-image.js';

describe('resolveImage', () => {
  it('returns local image when present', () => {
    const entry = { image: 'assets/re1.jpg', imageUrl: 'https://example.com/re1.jpg' };
    assert.equal(resolveImage(entry), 'assets/re1.jpg');
  });

  it('falls back to imageUrl when image is null', () => {
    const entry = { image: null, imageUrl: 'https://example.com/re1.jpg' };
    assert.equal(resolveImage(entry), 'https://example.com/re1.jpg');
  });

  it('returns placeholder when both are null', () => {
    const entry = { image: null, imageUrl: null };
    const result = resolveImage(entry);
    assert.ok(result, 'should return a truthy placeholder');
    assert.ok(typeof result === 'string');
  });

  it('returns placeholder when both are undefined', () => {
    const entry = {};
    const result = resolveImage(entry);
    assert.ok(result);
  });

  it('prefers local image over imageUrl', () => {
    const entry = { image: 'local.jpg', imageUrl: 'https://remote.jpg' };
    assert.equal(resolveImage(entry), 'local.jpg');
  });
});
