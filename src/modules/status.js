const VERB_MAP = {
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

export function verbFor(medium, status) {
  const verbs = VERB_MAP[medium];
  if (!verbs) return status ? 'Done' : 'Not done';
  return status ? verbs.done : verbs.notDone;
}
