import test from 'node:test';
import assert from 'node:assert/strict';
import { VideoPlaylistIndex } from '../js/media/playlist-index.js';

test('Shows all memberships, positions and neighbors with unique parent counts', () => {
    const items = ['new', 'middle', 'old'].map(id => ({ id, title: id }));
    const tree = [{ id: 'root', title: 'Root', items: ['middle'], children: [
        { id: 'one', title: 'One', items: ['new', 'middle', 'old', 'missing'], children: [] },
        { id: 'two', title: 'Two', items: ['middle', 'old'], children: [] }
    ] }];
    const index = new VideoPlaylistIndex(items, tree);
    const memberships = index.forVideo('middle');
    assert.equal(memberships.length, 3);
    const one = memberships.find(item => item.id === 'one');
    assert.equal(one.path, 'Root → One');
    assert.equal(one.count, 3);
    assert.equal(one.position, 2);
    assert.equal(one.previous.id, 'new');
    assert.equal(one.next.id, 'old');
    assert.equal(memberships.find(item => item.id === 'root').count, 3);
    assert.equal(index.forVideo('new').find(item => item.id === 'one').previous, null);
    assert.equal(index.forVideo('old').find(item => item.id === 'one').next, null);
    assert.deepEqual(index.forVideo('absent'), []);
});

test('Search matches title words without case or ё distinction, returns capped results and full totals', () => {
    const items = Array.from({ length: 25 }, (_, index) => ({
        id: String(index), title: `Урок: ПОЁТ Бари ${index}`, source: 'youtube', type: 'video'
    }));
    items.push({ id: 'audio', title: 'Поёт Бари', source: 's3', type: 'audio' });
    const tree = [{ id: 'course', title: 'Уроки БАРИ', items: items.map(item => item.id), children: [] }];
    const index = new VideoPlaylistIndex(items, tree);
    const result = index.search('поет бари', 20);
    assert.equal(result.videoCount, 25);
    assert.equal(result.videos.length, 20);
    assert.equal(result.playlistCount, 0);
    assert.equal(index.search('бари уроки').playlists[0].id, 'course');
    assert.equal(index.search('unknown').videoCount, 0);
    assert.deepEqual(index.search('   '), { videos: [], playlists: [], videoCount: 0, playlistCount: 0 });
    assert.equal(index.playlists.get('course').items[0], '0');
});
