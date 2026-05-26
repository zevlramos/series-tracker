import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appendToRegistry } from '../pipeline/append-to-registry.js';

describe('appendToRegistry', () => {
  it('appends a new entry to an empty registry', () => {
    const result = appendToRegistry([], { slug: 'silent-hill', name: 'Silent Hill' });
    assert.deepEqual(result, [{ slug: 'silent-hill', name: 'Silent Hill' }]);
  });

  it('appends to an existing registry', () => {
    const existing = [{ slug: 'resident-evil', name: 'Resident Evil' }];
    const result = appendToRegistry(existing, { slug: 'silent-hill', name: 'Silent Hill' });
    assert.equal(result.length, 2);
    assert.equal(result[1].slug, 'silent-hill');
  });

  it('is idempotent — does not duplicate on second call', () => {
    const existing = [{ slug: 'resident-evil', name: 'Resident Evil' }];
    const result = appendToRegistry(existing, { slug: 'resident-evil', name: 'Resident Evil' });
    assert.equal(result.length, 1);
    assert.deepEqual(result, existing);
  });

  it('matches on slug only, not name', () => {
    const existing = [{ slug: 'resident-evil', name: 'Resident Evil' }];
    const result = appendToRegistry(existing, { slug: 'resident-evil', name: 'RE Series' });
    assert.equal(result.length, 1);
  });

  it('does not mutate the input array', () => {
    const existing = [{ slug: 'resident-evil', name: 'Resident Evil' }];
    const frozen = [...existing];
    appendToRegistry(existing, { slug: 'silent-hill', name: 'Silent Hill' });
    assert.deepEqual(existing, frozen);
  });
});
