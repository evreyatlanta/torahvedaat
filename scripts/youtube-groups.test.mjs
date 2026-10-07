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

test('Text selectors bind matching videos and all matching playlists instead of ID', () => {
  const tree = [{ id: 'target', items: [], children: [] }];
  const media = [{ id: 'one', title: 'Weekly TORAH', description: ['For beginners'] },
    { id: 'two', title: 'Music', description: [] },
    { id: 'three', title: 'Another', description: [] }];
  const lists = [{ playlist: { id: 'source', snippet: { title: 'Torah classes', description: 'Weekly lessons' } },
    items: [{ contentDetails: { videoId: 'three' } }] }];
  const rules = { groups: { items: [
    { id: 'ignored', name: 'torah', description: 'BEGINNERS', playlistIds: ['target'] }
  ], playlists: [
    { id: 'ignored', name: 'CLASSES', description: 'weekly', playlistIds: ['target'] }
  ] } };
  const result = applyGroupRules(tree, lists, rules, media);
  assert.deepEqual(result.tree[0].items, ['one', 'three']);
  assert.equal(result.counts[0].count, 2);
});

test('Upload order overrides rule order, playlist order, and previous generated order', () => {
  const media = ['newest', 'middle', 'oldest'].map(id => ({ id, title: id, description: [] }));
  const tree = [{ id: 'root', items: ['oldest', 'newest'], children: [
    { id: 'nested', items: [], children: [] }
  ] }];
  const source = [{ playlist: { id: 'source' }, items: ['oldest', 'middle', 'newest'] }];
  const rules = { groups: {
    records: [{ id: 'oldest', playlistIds: ['nested'] }, { id: 'newest', playlistIds: ['nested'] }],
    playlists: [{ id: 'source', playlistIds: ['root', 'nested'] }]
  } };
  const result = applyGroupRules(tree, source, rules, media);
  assert.deepEqual(result.tree[0].items, ['newest', 'middle', 'oldest']);
  assert.deepEqual(result.tree[0].children[0].items, ['newest', 'middle', 'oldest']);
});

test('Optional folder limits record and playlist bindings to actual source folder', () => {
  const tree = [{ id: 'root', items: [], children: [] }];
  const bari = [{ id: 'bari', title: 'Lesson', description: [] }];
  const tvd = [{ id: 'tvd', title: 'Lesson', description: [] }];
  const folders = new Map([['rbari', bari], ['toravedaat', tvd]]);
  const lists = [{ folder: 'rbari', playlist: { id: 'bari-list', snippet: { title: 'Lesson' } }, items: ['bari'] },
    { folder: 'toravedaat', playlist: { id: 'tvd-list', snippet: { title: 'Lesson' } }, items: ['tvd'] }];
  const rules = { groups: { items: [{ name: 'Lesson', folder: 'rbari', playlistIds: ['root'] }],
    playlists: [{ id: 'tvd-list', folder: 'rbari', playlistIds: ['root'] },
      { name: 'Lesson', folder: 'rbari', playlistIds: ['root'] }] } };
  const result = applyGroupRules(tree, lists, rules, [...bari, ...tvd], folders);
  assert.deepEqual(result.tree[0].items, ['bari']);
});

test('Create adds matching source playlists as children and reuses them on repeated builds', () => {
  const tree = [{ id: 'root', items: [], tags: ['torah'], children: [] }];
  const media = [{ id: 'video', title: 'Lesson', tags: ['torah', 'rbari'] }];
  const lists = [{ folder: 'rbari', playlist: { id: 'source', snippet: { title: 'Weekly lessons' } },
    items: ['video'] }];
  const rules = { groups: { playlists: [{ name: 'lessons', create: { parentId: 'root' } }] } };
  const result = applyGroupRules(tree, lists, rules, media);
  assert.deepEqual(result.tree[0].children[0], {
    id: 'source', title: 'Weekly lessons', tags: ['torah', 'rbari'], items: ['video'], children: []
  });
  assert.deepEqual(applyGroupRules(result.tree, lists, rules, media), result);
});

test('Folder create creates every source playlist inside its root without playlistIds', () => {
  const tree = [{ id: 'root', items: [], children: [] }];
  const media = [{ id: 'video', tags: ['torah'] }];
  const rules = { groups: { folders: [{ folder: 'rbari', create: { parentId: 'root' } }] } };
  const lists = [{ folder: 'rbari', playlist: { id: 'first', snippet: { title: 'First lessons' } }, items: ['video'] },
    { folder: 'rbari', playlist: { id: 'second', snippet: { title: 'Second lessons' } }, items: ['video'] },
    { folder: 'other', playlist: { id: 'ignored', snippet: { title: 'Ignored' } }, items: ['video'] }];
  const result = applyGroupRules(tree, lists, rules, media, new Map([['rbari', media]]));
  assert.deepEqual(result.tree[0].children.map(node => node.id), ['first', 'second']);
  assert.equal(result.tree[0].children[0].title, 'First lessons');
  assert.deepEqual(result.tree[0].children[0].items, ['video']);
  assert.throws(() => applyGroupRules([], lists, rules, media), /Unknown parent playlist/);
  assert.deepEqual(applyGroupRules(result.tree, lists, rules, media), result);
});

test('create.name sets and updates the display title while outer name remains a selector', () => {
  const tree = [{ id: 'root', items: [], children: [] }];
  const lists = [{ playlist: { id: 'source', snippet: { title: 'Original lesson' } }, items: ['video'] }];
  const rules = { groups: { playlists: [{ name: 'lesson', create: { parentId: 'root', name: 'Мои уроки' } }] } };
  const media = [{ id: 'video', tags: ['torah'] }];
  const first = applyGroupRules(tree, lists, rules, media);
  assert.equal(first.tree[0].children[0].title, 'Мои уроки');
  rules.groups.playlists[0].create.name = 'Новое название';
  assert.equal(applyGroupRules(first.tree, lists, rules, media).tree[0].children[0].title, 'Новое название');
});
