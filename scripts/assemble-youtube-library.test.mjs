import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleLibrary } from './assemble-youtube-library.mjs';

test('Combines channel media, merges duplicate tags, counts unique records and preserves playlists', () => {
  const playlistCounts = [{ id: 'existing', count: 2 }];
  const library = assembleLibrary([
    [{ id: 'same', tags: ['other', 'rbari'] }],
    [{ id: 'same', tags: ['other', 'toravedaat'] }, { id: 'another', tags: ['music', 'toravedaat'] }]
  ], playlistCounts);
  assert.equal(library.items.length, 2);
  assert.deepEqual(library.items[0].tags, ['other', 'rbari', 'toravedaat']);
  assert.deepEqual(Object.fromEntries(library.tags.map(({ tag, count }) => [tag, count])),
    { music: 1, other: 1, rbari: 1, toravedaat: 2 });
  assert.deepEqual(library.playlists, playlistCounts);
});
