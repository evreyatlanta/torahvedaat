import { element, summaryItem } from './elements.js';
import { lessonsFromToday } from './dates.js';

function collapseSummary(summary, visibleCount) {
    const remaining = Array.from(summary.children).slice(visibleCount);
    if (!remaining.length) return;
    remaining.forEach(item => { item.hidden = true; });
    const count = remaining.length;
    const plural = count % 10 === 1 && count % 100 !== 11 ? 'урок'
        : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'урока' : 'уроков';
    const collapsedLabel = `Показать еще ${count} ${plural}`;
    const reveal = element('button', collapsedLabel, 'schedule-reveal');
    let expanded = false;
    reveal.type = 'button';
    reveal.setAttribute('aria-controls', summary.id);
    reveal.setAttribute('aria-expanded', 'false');
    reveal.addEventListener('click', () => {
        expanded = !expanded;
        remaining.forEach(item => { item.hidden = !expanded; });
        reveal.setAttribute('aria-expanded', String(expanded));
        reveal.textContent = expanded ? 'Оставить ближайшие уроки' : collapsedLabel;
    });
    summary.after(reveal);
}

export function renderSummary(summary, classes, { today, visibleCount = null, authorId = null }) {
    const previousButton = summary.nextElementSibling;
    if (previousButton?.classList.contains('schedule-reveal')) previousButton.remove();
    const selected = authorId ? classes.filter(lesson => lesson.authorId === authorId) : classes;
    const ordered = lessonsFromToday(selected, today);
    summary.replaceChildren(...ordered.map(summaryItem));
    if (!ordered.length) {
        summary.append(element('li', 'Уроки пока не добавлены.'));
        return;
    }
    if (visibleCount === null) return;
    let previewCount = Math.min(visibleCount, ordered.length);
    // Keep every lesson of the last included day visible.
    while (previewCount > 0 && previewCount < ordered.length
        && ordered[previewCount].days === ordered[previewCount - 1].days) {
        previewCount += 1;
    }
    collapseSummary(summary, previewCount);
}
