// Newest calendar dates first; matching days use natural title order.
const titleOrder = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
export function newestFirst(a, b) {
    const timestamp = item => Number.isFinite(Date.parse(String(item.date || '').slice(0, 10))) ? Date.parse(String(item.date).slice(0, 10)) : -Infinity;
    const left = timestamp(a), right = timestamp(b);
    return left === right ? titleOrder.compare(a.title || '', b.title || '') : left > right ? -1 : 1;
}

export function applyFixedDates(items, dates) {
    return items.map(item => Object.hasOwn(dates, item.id) &&
        typeof dates[item.id] === 'string' && Number.isFinite(Date.parse(dates[item.id]))
        ? { ...item, date: dates[item.id] } : item);
}

export async function loadFixedDates(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Date overrides unavailable: ' + path);
    const dates = await response.json();
    if (!dates || typeof dates !== 'object' || Array.isArray(dates)) throw new Error('Invalid date overrides');
    return dates;
}
