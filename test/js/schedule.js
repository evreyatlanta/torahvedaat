import { loadSchedule } from './schedule/data.js';
import { todayInAtlanta } from './schedule/dates.js';
import { element, lessonCard, noteElement } from './schedule/elements.js';
import { renderSummary } from './schedule/summary.js';

const SUMMARY_VISIBLE_COUNT = 2;
const status = document.getElementById('schedule-status');
const cards = document.getElementById('schedule-classes');
const summary = document.getElementById('schedule-summary');
const generalNotes = document.getElementById('schedule-notes');
const generalInstructions = document.getElementById('schedule-instructions');

function focusLinkedLesson() {
    if (!cards || !location.hash) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && cards.contains(target)) {
        target.scrollIntoView();
        target.focus({ preventScroll: true });
    }
}

async function render() {
    try {
        const today = todayInAtlanta();
        const { classes, notesFor } = await loadSchedule(today);
        for (const note of notesFor(null)) {
            const target = note.type === 'instruction' ? generalInstructions : generalNotes;
            if (target) target.append(noteElement(note));
        }
        if (cards) {
            cards.replaceChildren(...classes.map(lesson => lessonCard(lesson, notesFor(lesson.id))));
        }
        if (summary) renderSummary(summary, classes, { today, visibleCount: SUMMARY_VISIBLE_COUNT });
        if (status) {
            status.textContent = classes.length ? '' : 'Расписание пока не добавлено.';
            status.hidden = classes.length > 0;
        }
        focusLinkedLesson();
    } catch (error) {
        if (status) status.textContent = 'Не удалось загрузить расписание. Попробуйте обновить страницу.';
        if (summary) summary.replaceChildren(element('li', 'Расписание временно недоступно.'));
    }
}

render();
