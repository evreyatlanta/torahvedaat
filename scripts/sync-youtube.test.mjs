import test from 'node:test';
import assert from 'node:assert/strict';
import { collectUploads, syncChannels } from './sync-youtube.mjs';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('Stops at newest saved ID and preserves raw objects and order', async () => {
  const existing = [{ id: 'old', snippet: { title: 'original' } }, { id: 'older' }];
  const fresh = { id: 'new', contentDetails: { videoId: 'video' }, extra: [1, 2] };
  let calls = 0;
  const result = await collectUploads(async () => {
    calls++;
    return { items: [fresh, existing[0], { id: 'unexpected' }], nextPageToken: 'unused' };
  }, 'uploads', existing);
  assert.equal(calls, 1);
  assert.deepEqual(result.records, [fresh, ...existing]);
  assert.equal(result.pages[0].nextPageToken, 'unused');
});

test('Initial import follows all pages and ignores duplicate IDs', async () => {
  const result = await collectUploads(async (resource, parameters) => parameters.pageToken
    ? { items: [{ id: 'a' }, { id: 'b' }] }
    : { items: [{ id: 'a' }], nextPageToken: 'second' }, 'uploads', []);
  assert.deepEqual(result.records, [{ id: 'a' }, { id: 'b' }]);
  assert.equal(result.pages.length, 2);
});

test('Missing newest ID scans through history without duplicating existing records', async () => {
  const result = await collectUploads(async () => ({ items: [{ id: 'new' }, { id: 'older' }] }),
    'uploads', [{ id: 'removed' }, { id: 'older' }]);
  assert.deepEqual(result.records.map(item => item.id), ['new', 'removed', 'older']);
});

test('Writes raw playlists, ordered contents, and complete response pages', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'youtube-sync-'));
  try {
    await writeFile(path.join(root, 'channels.json'), JSON.stringify([
      { folder: 'channel', channelId: 'channel-id', uploadsId: 'uploads' }
    ]));
    const playlist = { id: 'playlist', snippet: { title: 'Raw title' } };
    const entry = { id: 'entry', snippet: { position: 0 } };
    await syncChannels(root, async (resource, parameters) => {
      if (resource === 'playlists') return { kind: 'raw-response', items: [playlist] };
      return { items: parameters.playlistId === 'uploads' ? [{ id: 'upload' }] : [entry] };
    });
    assert.deepEqual(JSON.parse(await readFile(path.join(root, 'channel/playlists.json'))),
      [{ playlist, items: [entry] }]);
    assert.deepEqual(JSON.parse(await readFile(path.join(root, 'channel/pages/playlists.json'))),
      [{ kind: 'raw-response', items: [playlist] }]);
  } finally { await rm(root, { recursive: true }); }
});
