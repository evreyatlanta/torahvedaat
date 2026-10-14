// Invalid or missing dates sort last; equal dates keep their existing order.
export function newestFirst(a, b) {
    const timestamp = item => Number.isFinite(Date.parse(item.date)) ? Date.parse(item.date) : -Infinity;
    const left = timestamp(a), right = timestamp(b);
    return left === right ? 0 : left > right ? -1 : 1;
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
