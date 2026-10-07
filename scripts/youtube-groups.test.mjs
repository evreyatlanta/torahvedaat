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

test('Folder bindings use source folders, not matching tags, and avoid duplicates', () => {
  const tree = [{ id: 'bari-root', items: [], children: [] },
    { id: 'tvd-root', items: [], children: [] }];
  const bari = [{ id: 'one', tags: ['toravedaat'] }, { id: 'two', tags: [] }];
  const tvd = [{ id: 'three', tags: ['rbari'] }];
  const folders = new Map([['rbari', bari], ['toravedaat', tvd]]);
  const rules = { groups: { records: [], playlists: [], folders: [
    { folder: 'rbari', playlistIds: ['bari-root'] },
    { folder: 'toravedaat', playlistIds: ['tvd-root'] }
  ] } };
  const result = applyGroupRules(tree, [], rules, [...bari, ...tvd], folders);
  assert.deepEqual(result.tree.map(node => node.items), [['one', 'two'], ['three']]);
  assert.deepEqual(result.counts, [{ id: 'bari-root', count: 2 }, { id: 'tvd-root', count: 1 }]);
  assert.deepEqual(applyGroupRules(result.tree, [], rules, [...bari, ...tvd], folders), result);
});
