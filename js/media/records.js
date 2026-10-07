import { element } from '../schedule/elements.js';

export function renderMediaRecords(target, items, title) {
    target.replaceChildren();
    if (title) target.append(element('h3', title));
    for (const item of items) {
        const card = element('article', null, 'media-record');
        if (item.title) card.append(element('h4', item.title));
        if (item.date) card.append(element('p', item.date));
        (item.description ?? []).forEach(paragraph => card.append(element('p', paragraph)));
        try {
            const url = new URL(item.url, location.href);
            if (url.protocol === 'https:' || url.protocol === 'http:') {
                const link = element('a', 'Открыть материал');
                link.href = url.href;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                card.append(link);
            }
        } catch { /* A malformed URL must not hide the remaining records. */ }
        target.append(card);
    }
}

