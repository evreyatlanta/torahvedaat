import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildMedia, buildPlaylists, updateGroupCounts, addParentPlaylistCounts } from './build-media.mjs';

async function fixture(t) {
    const directory = await mkdtemp(path.join(tmpdir(), 'evreyatlanta-media-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    return directory;
}

test('playlist sources create slash-separated parents independent of folder names', async t => {
    const directory = await fixture(t);
    await mkdir(path.join(directory, 'arbitrary', 'nested'), { recursive: true });
    await writeFile(path.join(directory, 'playlist.json'), JSON.stringify({
        root: '', items: [{ id: 'torah', title: 'Уроки Торы', tags: ['torah'] }]
    }));
    await writeFile(path.join(directory, 'arbitrary', 'nested', 'playlist.json'), JSON.stringify({
        root: 'torah/rbari', items: [{ id: 'cycle', title: 'Цикл уроков', tags: ['torah', 'rbari'] }]
    }));
    const tree = await buildPlaylists(directory);
    assert.equal(tree.length, 1);
    assert.equal(tree[0].title, 'Уроки Торы');
    assert.equal(tree[0].children[0].id, 'rbari');
    assert.equal(tree[0].children[0].title, 'rbari');
    assert.equal(tree[0].children[0].children[0].id, 'cycle');
    assert.deepEqual(tree[0].children[0].children[0].children, []);
});

test('playlist files merge under shared root; duplicate definitions fail', async t => {
    const directory = await fixture(t);
    await mkdir(path.join(directory, 'more'));
    await writeFile(path.join(directory, 'playlist.json'), JSON.stringify({ root: 'rbari', items: [{ id: 'one', title: 'One' }] }));
    await writeFile(path.join(directory, 'more', 'playlist.json'), JSON.stringify({ root: 'rbari', items: [{ id: 'two', title: 'Two' }] }));
    assert.equal((await buildPlaylists(directory))[0].children.length, 2);
    await writeFile(path.join(directory, 'more', 'playlist.json'), JSON.stringify({ root: 'rbari', items: [{ id: 'one', title: 'Duplicate' }] }));
    await assert.rejects(buildPlaylists(directory), /duplicate playlist definition one/);
});

test('parent playlist totals include nested records and deduplicate shared videos', () => {
    const library = {
        items: [
            { id: 'v1' },
            { id: 'v2' },
            { id: 'v3' }
        ],
        playlists: [{ id: 'a', count: 1 }, { id: 'b', count: 2 }, { id: 'root', count: 1 }]
    };
    const nodes = [{ id: 'root', items: ['v3'], children: [{ id: 'a', items: ['v1'], children: [] }, { id: 'nested', children: [{ id: 'b', items: ['v1', 'v2'], children: [] }] }] }];
    const counts = new Map(addParentPlaylistCounts(library, nodes).playlists.map(x => [x.id, x.count]));
    assert.equal(counts.get('root'), 3);
    assert.equal(counts.get('nested'), 2);
    assert.equal(counts.get('a'), 1);
    assert.equal(counts.get('b'), 2);
});

test('group counts match tags, reset missing tags and preserve group fields and order', () => {
    const groups = [{ id: 'torah', title: 'Уроки Торы', count: 99 }, { id: 'show', title: 'Выступления', count: 5 }];
    assert.deepEqual(updateGroupCounts(groups, [{ tag: 'torah', count: 3 }, { tag: 'unknown', count: 7 }]), [
        { id: 'torah', title: 'Уроки Торы', count: 3 },
        { id: 'show', title: 'Выступления', count: 0 }
    ]);
    assert.equal(groups[0].count, 99);
});

test('recursive merge, explicit empty values, URL composition and distinct counts', async t => {
    const directory = await fixture(t);
    await mkdir(path.join(directory, 'nested', 'deep'), { recursive: true });
    await writeFile(path.join(directory, 'media.json'), JSON.stringify({
        url: 'https://example.com/audio/', type: 'audio', title: 'Common',
        tags: ['torah', 'torah'],
        items: [
            { id: 'one' },
            { id: 'two', url: '', title: null, tags: [] },
            { id: 'three', url: null, title: '' }
        ]
    }));
    await writeFile(path.join(directory, 'nested', 'deep', 'media.json'), JSON.stringify({
        tags: ['music'], items: [{ id: 'four', url: 'https://example.com/custom' }]
    }));
    await writeFile(path.join(directory, 'ignored.json'), 'invalid JSON');
    const result = await buildMedia(directory);
    assert.equal(result.items.length, 4);
    const byId = Object.fromEntries(result.items.map(item => [item.id, item]));
    assert.equal(byId.one.url, 'https://example.com/audio/one');
    assert.equal(byId.one.type, 'audio');
    assert.equal(byId.two.url, '');
    assert.equal(byId.two.title, null);
    assert.deepEqual(byId.two.tags, []);
    assert.equal(byId.three.url, null);
    assert.equal(byId.three.title, '');
    assert.equal(byId.four.url, 'https://example.com/custom');
    assert.deepEqual(result.playlists, []);
    assert.deepEqual(result.tags, [{ tag: 'music', count: 1 }, { tag: 'torah', count: 2 }]);
    assert.deepEqual(await buildMedia(directory), result);
});

test('missing id for common URL reports the source file', async t => {
    const directory = await fixture(t);
    await writeFile(path.join(directory, 'media.json'), JSON.stringify({ url: 'https://example.com', items: [{}] }));
    await assert.rejects(buildMedia(directory), /media\.json: item 1 needs a string id/);
});

test('empty source produces empty collections; invalid JSON fails', async t => {
    const directory = await fixture(t);
    assert.deepEqual(await buildMedia(directory), { items: [], playlists: [], tags: [] });
    await writeFile(path.join(directory, 'media.json'), '{broken');
    await assert.rejects(buildMedia(directory), /media\.json:/);
});
