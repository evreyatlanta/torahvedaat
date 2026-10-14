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

test('Videos published on the same day ignore time and use title order', () => {
    const items = [{ id: 'early', title: 'Урок 1', date: '2026-10-14T09:00:00Z' },
        { id: 'late', title: 'Урок 2', date: '2026-10-14T18:30:00Z' }];
    assert.deepEqual(items.sort(newestFirst).map(item => item.id), ['early', 'late']);
});

test('Equal days use natural ascending titles without overriding different days', () => {
 const items = [
  { id: 'ten', title: 'Урок 10', date: '2026-10-14T12:00:00Z' },
  { id: 'two', title: 'Урок 2', date: '2026-10-14T12:00:00Z' },
  { id: 'new', title: 'Урок 99', date: '2026-10-15T12:00:01Z' }
 ];
 assert.deepEqual(items.sort(newestFirst).map(x => x.id), ['new', 'two', 'ten']);
});
