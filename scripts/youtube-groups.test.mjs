import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGroupRules } from './youtube-groups.mjs';

test('Binds individual videos and recursively binds playlists without duplicate IDs', () => {
  const tree = [{ id: 'root', items: [], children: [{ id: 'child', items: [], children: [] }] }];
  const source = [{ playlist: { id: 'source' }, items: [{ contentDetails: { videoId: 'one' } }],
    children: [{ playlist: { id: 'nested' }, items: [
      { contentDetails: { videoId: 'two' } }, { contentDetails: { videoId: 'one' } }
    ] }] }];
  const rules = { groups: {
    records: [{ id: 'one', playlistIds: ['child'] }],
    playlists: [{ id: 'source', playlistIds: ['child', 'root'] }]
  } };
  const media = [{ id: 'one' }, { id: 'two' }];
  const result = applyGroupRules(tree, source, rules, media);
  assert.deepEqual(result.tree[0].children[0].items, ['one', 'two']);
  assert.deepEqual(result.tree[0].items, ['one', 'two']);
  assert.deepEqual(result.counts, [{ id: 'child', count: 2 }, { id: 'root', count: 2 }]);
  assert.deepEqual(tree[0].items, []);
  assert.deepEqual(applyGroupRules(result.tree, source, rules, media), result);
});

test('Unknown targets fail instead of silently creating nodes', () => {
  assert.throws(() => applyGroupRules([], [], { groups: {
    records: [{ id: 'video', playlistIds: ['missing'] }], playlists: []
  } }, [{ id: 'video' }]), /Unknown target playlist/);
});
