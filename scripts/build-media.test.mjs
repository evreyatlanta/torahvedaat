import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildMedia, updateGroupCounts } from './build-media.mjs';

async function fixture(t) {
    const directory = await mkdtemp(path.join(tmpdir(), 'evreyatlanta-media-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    return directory;
}

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
        tags: ['torah', 'torah'], playlists: ['p1', 'p1'],
        items: [
            { id: 'one' },
            { id: 'two', url: '', title: null, tags: [], playlists: [] },
            { id: 'three', url: null, title: '' }
        ]
    }));
    await writeFile(path.join(directory, 'nested', 'deep', 'media.json'), JSON.stringify({
        tags: ['music'], items: [{ id: 'four', url: 'https://example.com/custom', playlists: ['p1', 'p2'] }]
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
    assert.deepEqual(result.playlists, [{ id: 'p1', count: 3 }, { id: 'p2', count: 1 }]);
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
