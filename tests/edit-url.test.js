import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEditUrl } from '../src/modules/edit-url.js';

describe('buildEditUrl', () => {
  it('produces a GitHub web-editor URL', () => {
    const url = buildEditUrl({ owner: 'zevlramos', repo: 'series-tracker', branch: 'main' }, 'resident-evil');
    assert.equal(url, 'https://github.com/zevlramos/series-tracker/edit/main/series/resident-evil/data.json');
  });

  it('encodes slugs with special characters', () => {
    const url = buildEditUrl({ owner: 'user', repo: 'repo', branch: 'main' }, 'my series');
    assert.ok(url.includes('my%20series'));
  });

  it('uses the provided branch', () => {
    const url = buildEditUrl({ owner: 'user', repo: 'repo', branch: 'dev' }, 'test');
    assert.ok(url.includes('/edit/dev/'));
  });
});
