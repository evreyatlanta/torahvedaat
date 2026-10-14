import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFixedDates, newestFirst } from '../js/media/order.js';
test('Fixed dates change display and ordering without modifying source records', () => {
    const items = [{ id: 'a', date: '2026-10-14' }, { id: 'b', date: '2020-01-01' }, { id: 'c' }];
    const result = applyFixedDates(items, { a: '2019-01-01', b: '2026-10-15', c: 'invalid' }).sort(newestFirst);
    assert.deepEqual(result.map(x => x.id), ['b', 'a', 'c']);
    assert.equal(result[0].date, '2026-10-15');
    assert.equal(items[0].date, '2026-10-14');
    assert.deepEqual(applyFixedDates(items, {}), items);
});
