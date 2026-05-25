import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verbFor } from '../src/modules/status.js';

describe('verbFor', () => {
  const media = {
    game:      { done: 'Played',   notDone: 'Not played' },
    novel:     { done: 'Read',     notDone: 'Unread' },
    comic:     { done: 'Read',     notDone: 'Unread' },
    film:      { done: 'Watched',  notDone: 'Unwatched' },
    show:      { done: 'Watched',  notDone: 'Unwatched' },
    stagePlay: { done: 'Watched',  notDone: 'Unwatched' },
    podcast:   { done: 'Listened', notDone: 'Unlistened' },
    audio:     { done: 'Listened', notDone: 'Unlistened' },
    video:     { done: 'Watched',  notDone: 'Unwatched' },
  };

  for (const [medium, verbs] of Object.entries(media)) {
    it(`returns "${verbs.done}" for ${medium} when done`, () => {
      assert.equal(verbFor(medium, true), verbs.done);
    });

    it(`returns "${verbs.notDone}" for ${medium} when not done`, () => {
      assert.equal(verbFor(medium, false), verbs.notDone);
    });
  }
});
