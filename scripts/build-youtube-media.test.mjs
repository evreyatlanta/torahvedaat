import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChannelMedia } from './build-youtube-media.mjs';

const records = [{ id: 'upload-item-id', snippet: { title: 'Title', description: 'Text' },
  contentDetails: { videoId: 'video-id', videoPublishedAt: '2026-10-07T12:00:00Z' } }];
const playlists = ['first', 'second'].map(id => ({ playlist: { id }, items: [
  { id: 'different-playlist-item-id', contentDetails: { videoId: 'video-id' } }
] }));
const rules = (records = [], playlists = []) => ({
  mainTags: ['torah', 'show', 'music', 'other'], tags: { records, playlists }
});
const build = rules => buildChannelMedia(records, playlists, { folder: 'rbari' }, rules)[0];

test('Specific video rule wins over playlist categories, other tags are combined uniquely', () => {
  const original = JSON.stringify({ records, playlists });
  const media = build(rules([{ id: 'video-id', tags: ['music', 'topic'] }], [
    { id: 'first', tags: ['torah', 'topic', 'rbari'] },
    { id: 'second', tags: ['show', 'another'] }
  ]));
  assert.deepEqual(media.tags, ['music', 'topic', 'rbari', 'another']);
  assert.equal(media.id, 'video-id');
  assert.equal(media.date, '2026-10-07');
  assert.equal(JSON.stringify({ records, playlists }), original);
});

test('First matching playlist category wins when video has no category', () => {
  assert.deepEqual(build(rules([], [
    { id: 'first', tags: ['torah'] }, { id: 'second', tags: ['music', 'topic'] }
  ])).tags, ['torah', 'topic', 'rbari']);
});

test('Unmatched records get other and the channel folder, never unrelated playlist tags', () => {
  assert.deepEqual(build(rules([], [{ id: 'unrelated', tags: ['music'] }])).tags, ['other', 'rbari']);
});

test('Non-category record tags still allow playlist classification', () => {
  assert.deepEqual(build(rules([{ id: 'video-id', tags: ['topic'] }], [
    { id: 'first', tags: ['show'] }
  ])).tags, ['topic', 'show', 'rbari']);
});

test('Folder rules classify every record of that channel and ignore other folders', () => {
  const config = rules();
  config.tags.folders = [{ folder: 'rbari', tags: ['torah', 'topic'] },
    { folder: 'different', tags: ['music'] }];
  assert.deepEqual(build(config).tags, ['torah', 'topic', 'rbari']);
});

test('Specific video category wins over folder category, which wins over playlists', () => {
  const config = rules([{ id: 'video-id', tags: ['music'] }], [{ id: 'first', tags: ['show'] }]);
  config.tags.folders = [{ folder: 'rbari', tags: ['torah', 'topic'] }];
  assert.deepEqual(build(config).tags, ['music', 'topic', 'rbari']);
  config.tags.records = [];
  assert.deepEqual(build(config).tags, ['torah', 'topic', 'rbari']);
});
