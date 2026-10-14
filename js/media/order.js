// Invalid or missing dates sort last; equal dates keep their existing order.
export function newestFirst(a, b) {
    const timestamp = item => Number.isFinite(Date.parse(item.date)) ? Date.parse(item.date) : -Infinity;
    const left = timestamp(a), right = timestamp(b);
    return left === right ? 0 : left > right ? -1 : 1;
}
