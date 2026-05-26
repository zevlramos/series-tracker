import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveEntryId } from '../pipeline/derive-entry-id.js';

describe('deriveEntryId', () => {
  it('produces a kebab-case slug from a simple title', () => {
    assert.equal(deriveEntryId('Resident Evil 0'), 'resident-evil-0');
  });

  it('preserves parenthetical year for remakes', () => {
    assert.equal(deriveEntryId('Resident Evil 2 (2019)'), 'resident-evil-2-2019');
  });

  it('handles subtitled entries with colon', () => {
    assert.equal(deriveEntryId('Resident Evil: Degeneration'), 'resident-evil-degeneration');
  });

  it('handles subtitled entries with dash', () => {
    assert.equal(deriveEntryId('Resident Evil: The Marhawa Desire'), 'resident-evil-the-marhawa-desire');
  });

  it('is deterministic — same input always yields same output', () => {
    const a = deriveEntryId('Resident Evil 4 (2023)');
    const b = deriveEntryId('Resident Evil 4 (2023)');
    assert.equal(a, b);
  });

  it('strips special characters', () => {
    assert.equal(deriveEntryId("Resident Evil™: Director's Cut"), 'resident-evil-directors-cut');
  });

  it('collapses multiple hyphens', () => {
    assert.equal(deriveEntryId('Resident Evil -- Code: Veronica'), 'resident-evil-code-veronica');
  });

  it('trims leading and trailing hyphens', () => {
    assert.equal(deriveEntryId('  Resident Evil  '), 'resident-evil');
  });

  it('uses disambiguator when provided', () => {
    assert.equal(
      deriveEntryId('Resident Evil', { disambiguator: '2002' }),
      'resident-evil-2002'
    );
  });

  it('does not double-append disambiguator if already in title', () => {
    assert.equal(
      deriveEntryId('Resident Evil (2002)', { disambiguator: '2002' }),
      'resident-evil-2002'
    );
  });

  it('normalizes accented characters via NFD decomposition', () => {
    assert.equal(deriveEntryId('Pokémon Legends: Arceus'), 'pokemon-legends-arceus');
    assert.equal(deriveEntryId('Café'), 'cafe');
    assert.equal(deriveEntryId('Naïve'), 'naive');
  });

  it('strips curly apostrophes (U+2018, U+2019)', () => {
    assert.equal(deriveEntryId('Director’s Cut'), 'directors-cut');
    assert.equal(deriveEntryId('Director‘s Cut'), 'directors-cut');
  });

  it('strips underscores', () => {
    assert.equal(deriveEntryId('__test__'), 'test');
  });

  it('disambiguator checks segment boundary, not bare suffix', () => {
    assert.equal(
      deriveEntryId('Game 12002', { disambiguator: '2002' }),
      'game-12002-2002'
    );
  });
});
