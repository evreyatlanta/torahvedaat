const titleOrder = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
export const DEFAULT_MEDIA_SORT = 1000000;
export function compareMedia(a, b) {
    const rank = item => Number.isFinite(item.sort) ? item.sort : DEFAULT_MEDIA_SORT;
    const difference = rank(a) - rank(b);
    if (difference) return difference;
    const day = item => {
        const value = Date.parse(String(item.date || '').slice(0, 10));
        return Number.isFinite(value) ? value : Infinity;
    };
    const left = day(a), right = day(b);
    return left === right ? titleOrder.compare(a.title || '', b.title || '') : left < right ? -1 : 1;
}
export function applySortValues(items, values) {
    return items.map(item => ({ ...item, sort: Object.hasOwn(values, item.id) && Number.isFinite(values[item.id])
        ? values[item.id] : DEFAULT_MEDIA_SORT }));
}
export async function loadSortValues(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Sort values unavailable: ' + path);
    const values = await response.json();
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid sort values');
    return values;
}
export function displayDate(value) { return String(value || '').slice(0, 10); }
