import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { presentEntry } from '../src/modules/present-entry.js';

const COORDS = { owner: 'user', repo: 'repo', branch: 'main' };

describe('presentEntry', () => {
  const entry = {
    id: 're1',
    title: 'Resident Evil',
    medium: 'game',
    branch: 'mainline',
    summary: 'Survival horror classic.',
    recommendedReason: 'Start here',
    status: true,
    image: 'assets/re1.jpg',
  };

  it('returns all expected fields', () => {
    const view = presentEntry(entry, COORDS, 'resident-evil');
    assert.equal(view.id, 're1');
    assert.equal(view.title, 'Resident Evil');
    assert.equal(view.medium, 'game');
    assert.equal(view.branch, 'mainline');
    assert.equal(view.summary, 'Survival horror classic.');
    assert.equal(view.recommendedReason, 'Start here');
    assert.equal(view.imageSrc, 'assets/re1.jpg');
    assert.equal(view.statusLabel, 'Played');
    assert.equal(view.statusDone, true);
    assert.ok(view.editUrl.includes('resident-evil'));
  });

  it('resolves statusDone=false for incomplete entries', () => {
    const view = presentEntry({ ...entry, status: false }, COORDS, 'test');
    assert.equal(view.statusDone, false);
    assert.equal(view.statusLabel, 'Not played');
  });

  it('uses placeholder image when entry has no image', () => {
    const view = presentEntry({ ...entry, image: null }, COORDS, 'test');
    assert.ok(view.imageSrc, 'should have a truthy imageSrc');
  });

  it('builds edit URL from repo coords and slug', () => {
    const view = presentEntry(entry, COORDS, 'resident-evil');
    assert.equal(view.editUrl, 'https://github.com/user/repo/edit/main/series/resident-evil/data.json');
  });

  it('handles unknown medium gracefully', () => {
    const view = presentEntry({ ...entry, medium: 'hologram' }, COORDS, 'test');
    assert.equal(view.statusLabel, 'Done');
  });

  it('exposes a formatted loreDateLabel when loreDate is set', () => {
    const view = presentEntry({ ...entry, loreDate: '1998-09' }, COORDS, 'test');
    assert.equal(view.loreDateLabel, 'September 1998');
  });

  it('loreDateLabel is null when loreDate is absent or null', () => {
    assert.equal(presentEntry(entry, COORDS, 'test').loreDateLabel, null);
    assert.equal(presentEntry({ ...entry, loreDate: null }, COORDS, 'test').loreDateLabel, null);
  });
});
