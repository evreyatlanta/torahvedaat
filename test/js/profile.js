import { loadSchedule } from './schedule/data.js';
import { todayInAtlanta, lessonsFromToday } from './schedule/dates.js';
import { element, summaryItem } from './schedule/elements.js';
import { profileContent } from './profile/view.js';

const status = document.getElementById('profile-status');
const content = document.getElementById('profile-content');
const lessons = document.getElementById('schedule-summary');

async function renderProfile() {
    try {
        const id = new URLSearchParams(location.search).get('id');
        const today = todayInAtlanta();
        const { profiles, classes } = await loadSchedule(today);
        const profile = profiles.find(person => person.id === id);
        if (!profile) {
            status.textContent = id ? 'Профиль не найден.' : 'Выберите преподавателя в расписании уроков.';
            lessons.replaceChildren(element('li', 'Преподаватель не выбран.'));
            return;
        }
        document.title = `${profile.name} — Евреи Атланты`;
        content.replaceChildren(profileContent(profile));
        const ownLessons = classes.filter(lesson => lesson.authorId === profile.id);
        lessons.replaceChildren(...lessonsFromToday(ownLessons, today).map(summaryItem));
        if (!ownLessons.length) lessons.append(element('li', 'Уроки пока не добавлены.'));
        status.hidden = true;
    } catch {
        status.textContent = 'Не удалось загрузить профиль. Попробуйте обновить страницу.';
        lessons.replaceChildren(element('li', 'Расписание временно недоступно.'));
    }
}

renderProfile();
