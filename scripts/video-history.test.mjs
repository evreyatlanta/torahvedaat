import test from 'node:test';
import assert from 'node:assert/strict';
import { VideoHistory, HISTORY_RETENTION_MS, playbackTime } from '../js/media/video-history.js';

function storage() {
    const data = new Map();
    return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}
const item = { id: 'DTm7X4Sp8-I', title: 'Lesson' };

test('Saved position survives a new instance; expiry is seven days from last playback', () => {
    const store = storage();
    let now = 100000;
    const history = new VideoHistory({ storage: store, key: 'prod', now: () => now });
    history.save(item, { position: 123.5, duration: 1000 });
    assert.equal(new VideoHistory({ storage: store, key: 'prod', now: () => now }).get(item.id).position, 123.5);
    now += HISTORY_RETENTION_MS - 1;
    assert.equal(history.list().length, 1);
    history.save(item, { position: 200, duration: 1000 });
    now += 2;
    assert.equal(history.get(item.id).position, 200);
    now += HISTORY_RETENTION_MS;
    assert.deepEqual(history.list(), []);
    assert.deepEqual(JSON.parse(store.getItem('prod')).entries, []);
});

test('History is isolated by key and explicit remove/clear persist', () => {
    const store = storage();
    const prod = new VideoHistory({ storage: store, key: 'prod' });
    const testHistory = new VideoHistory({ storage: store, key: 'test' });
    prod.save(item, { position: 50, duration: 100 });
    assert.deepEqual(testHistory.list(), []);
    prod.save(item, { position: 100, duration: 100, completed: true });
    assert.equal(prod.get(item.id).completed, true);
    prod.remove(item.id);
    assert.deepEqual(prod.list(), []);
    prod.save(item, { position: 20, duration: 100 });
    prod.clear();
    assert.deepEqual(prod.list(), []);
});

test('Denied storage still allows playback tracking in memory', () => {
    const history = new VideoHistory({ storage: { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } } });
    history.save(item, { position: 50, duration: 100 });
    assert.equal(history.get(item.id).position, 50);
    assert.equal(history.persistent, false);
});

test('Corrupt storage, invalid IDs and timestamps do not break history', () => {
    const store = storage();
    store.setItem('history', 'broken json');
    const history = new VideoHistory({ storage: store, key: 'history' });
    assert.deepEqual(history.list(), []);
    history.save({ id: 'bad' }, { position: 10, duration: 100 });
    assert.deepEqual(history.list(), []);
    history.save(item, { position: 1000, duration: 100 });
    assert.equal(history.get(item.id).position, 100);
});

test('Resume labels support hours', () => {
    assert.equal(playbackTime(1395), '23:15');
    assert.equal(playbackTime(3723.4), '1:02:03');
});
