import test from 'node:test';
import assert from 'node:assert/strict';
import { applySortValues, compareMedia, DEFAULT_MEDIA_SORT } from '../js/media/order.js';
test('New unlisted videos precede ranked cycles; larger ranks first, real dates unchanged', () => {
 const items = [{id:'new',date:'2026-10-14'}, {id:'two',date:'2010-01-01'}, {id:'one',date:'2020-01-01'}];
 const result=applySortValues(items,{one:1,two:2}).sort(compareMedia);
 assert.deepEqual(result.map(x=>x.id),['new','two','one']);
 assert.equal(result[0].sort,DEFAULT_MEDIA_SORT);
 assert.equal(result[2].date,'2020-01-01');
 assert.equal(items[0].sort,undefined);
});
test('Matching ranks use newest calendar date first then natural title; times ignored', () => {
 const items=[{id:'new',date:'2026-10-15',title:'Урок 1'},
 {id:'ten',date:'2026-10-14T01:00:00Z',title:'Урок 10'},
 {id:'two',date:'2026-10-14T19:00:00Z',title:'Урок 2'}, {id:'unknown'}];
 assert.deepEqual(items.sort(compareMedia).map(x=>x.id),['new','two','ten','unknown']);
});
