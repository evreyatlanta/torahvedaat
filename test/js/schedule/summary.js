import { element, summaryItem } from './elements.js';
import { lessonsFromToday } from './dates.js';

function collapseSummary(summary, visibleCount) {
    const remaining = Array.from(summary.children).slice(visibleCount);
    if (!remaining.length) return;
    remaining.forEach(item => { item.hidden = true; });
    const count = remaining.length;
    const plural = count % 10 === 1 && count % 100 !== 11 ? 'урок'
        : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'урока' : 'уроков';
    const reveal = element('button', `Показать еще ${count} ${plural}`, 'schedule-reveal');
    reveal.type = 'button';
    reveal.setAttribute('aria-controls', summary.id);
    reveal.setAttribute('aria-expanded', 'false');
    reveal.addEventListener('click', () => {
        remaining.forEach(item => { item.hidden = false; });
        reveal.setAttribute('aria-expanded', 'true');
        const firstLink = remaining[0].querySelector('a');
        if (firstLink) firstLink.focus({ preventScroll: true });
        reveal.remove();
    });
    summary.after(reveal);
}

export function renderSummary(summary, classes, today, visibleCount) {
    const ordered = lessonsFromToday(classes, today);
    let previewCount = Math.min(visibleCount, ordered.length);
    // Keep every lesson of the last included day visible.
    while (previewCount > 0 && previewCount < ordered.length
        && ordered[previewCount].days === ordered[previewCount - 1].days) {
        previewCount += 1;
    }
    summary.replaceChildren(...ordered.map(summaryItem));
    collapseSummary(summary, previewCount);
}
