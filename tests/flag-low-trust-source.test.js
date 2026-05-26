import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasOnlyLowTrustSources } from '../pipeline/flag-low-trust-source.js';

describe('hasOnlyLowTrustSources', () => {
  it('returns true for empty array', () => {
    assert.equal(hasOnlyLowTrustSources([]), true);
  });

  it('returns true for non-array', () => {
    assert.equal(hasOnlyLowTrustSources(null), true);
    assert.equal(hasOnlyLowTrustSources(undefined), true);
  });

  it('returns true when all sources are low-trust', () => {
    assert.equal(hasOnlyLowTrustSources([
      'https://www.reddit.com/r/gaming/some-post',
      'https://gamefaqs.com/some-page'
    ]), true);
  });

  it('returns false when at least one source is high-trust', () => {
    assert.equal(hasOnlyLowTrustSources([
      'https://www.reddit.com/r/gaming/some-post',
      'https://en.wikipedia.org/wiki/Some_Game'
    ]), false);
  });

  it('returns false for Wikipedia-only sources', () => {
    assert.equal(hasOnlyLowTrustSources([
      'https://en.wikipedia.org/wiki/Resident_Evil'
    ]), false);
  });

  it('flags forum URLs', () => {
    assert.equal(hasOnlyLowTrustSources([
      'https://some-forum.example.com/thread/123'
    ]), true);
  });

  it('flags blogspot', () => {
    assert.equal(hasOnlyLowTrustSources([
      'https://obscure-game-blog.blogspot.com/2020/review'
    ]), true);
  });

  it('flags tumblr', () => {
    assert.equal(hasOnlyLowTrustSources([
      'https://someone.tumblr.com/post/123'
    ]), true);
  });

  it('flags quora', () => {
    assert.equal(hasOnlyLowTrustSources([
      'https://www.quora.com/What-is-the-best-RE-game'
    ]), true);
  });

  it('treats official game sites as high-trust', () => {
    assert.equal(hasOnlyLowTrustSources([
      'https://www.residentevil.com/re4/'
    ]), false);
  });
});
