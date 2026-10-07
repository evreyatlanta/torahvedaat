import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleLibrary, assembleYoutubeLibrary } from './assemble-youtube-library.mjs';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

test('Rebuilding from permanent tree removes obsolete bindings and generated children', async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), 'youtube-tree-'));
  const root = path.join(workspace, 'youtube');
  const data = path.join(workspace, 'data');
  const write = async (file, value) => writeFile(file, JSON.stringify(value));
  try {
    await mkdir(path.join(root, 'channel'), { recursive: true });
    await mkdir(data);
    await write(path.join(root, 'channels.json'), [{ folder: 'channel', title: 'Channel' }]);
    await write(path.join(root, 'channel/media.json'), [{ id: 'video', tags: ['torah'] }]);
    await write(path.join(root, 'channel/playlists.json'), [
      { playlist: { id: 'source', snippet: { title: 'Lessons' } }, items: ['video'] }
    ]);
    const tree = [{ id: 'root', title: 'Root', tags: ['torah'], items: [], children: [] }];
    await write(path.join(data, 'media-tree.js'), tree);
    await write(path.join(data, 'media-groups.js'), [{ id: 'torah', title: 'Torah' }]);
    await write(path.join(root, 'rules.json'), { groups: {
      records: [{ id: 'video', playlistIds: ['root'] }],
      playlists: [{ id: 'source', create: { parentId: 'root' } }]
    } });
    await assembleYoutubeLibrary(root, data);
    const first = JSON.parse(await readFile(path.join(data, 'playlist.js')));
    assert.deepEqual(first[0].items, ['video']);
    assert.equal(first[0].children[0].id, 'source');
    await write(path.join(root, 'rules.json'), { groups: { records: [], playlists: [] } });
    await assembleYoutubeLibrary(root, data);
    assert.deepEqual(JSON.parse(await readFile(path.join(data, 'playlist.js'))), tree);
    assert.deepEqual(JSON.parse(await readFile(path.join(data, 'media-tree.js'))), tree);
    const library = JSON.parse(await readFile(path.join(data, 'media.js')));
    assert.deepEqual(library.playlists, [{ id: 'root', count: 0 }]);
  } finally { await rm(workspace, { recursive: true }); }
});
