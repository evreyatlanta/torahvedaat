(() => {
    'use strict';
    const status = document.getElementById('schedule-status');
    const cards = document.getElementById('schedule-classes');
    const summary = document.getElementById('schedule-summary');
    const generalNotes = document.getElementById('schedule-notes');
    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text != null) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    // Date-only expirations remain visible through that day in Atlanta.
    function todayInAtlanta() {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(new Date());
        const part = name => parts.find(p => p.type === name).value;
        return `${part('year')}-${part('month')}-${part('day')}`;
    }
    async function readArray(path) {
        const response = await fetch(path);
        if (!response.ok) throw new Error('Schedule data unavailable');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid schedule data');
        return data;
    }
    async function render() {
        try {
            const [classes, notes] = await Promise.all([
                readArray('/test/data/classes.js'), readArray('/test/data/class-notes.js')
            ]);
            const today = todayInAtlanta();
            const activeNotes = notes.filter(note => note.expiration === null || note.expiration >= today);
            const notesFor = id => activeNotes.filter(note => note.classId === id);
            for (const note of notesFor(null)) {
                generalNotes.append(element('p', note.title, 'schedule-note'));
            }
            classes.forEach((lesson, index) => {
                const card = element('article', null, 'class-card');
                card.id = `lesson-${index + 1}`;
                card.tabIndex = -1;
                card.append(element('p', `${lesson.days} · ${lesson.time}`, 'class-time'));
                card.append(element('h3', lesson.title));
                if (lesson.author) card.append(element('p', `Преподаватель: ${lesson.author}`, 'class-author'));
                if (lesson.description) card.append(element('p', lesson.description));
                for (const note of notesFor(lesson.id)) card.append(element('p', note.title, 'schedule-note'));
                cards.append(card);
                const item = element('li');
                item.append(element('p', `${lesson.days} · ${lesson.time}`, 'summary-time'));
                const link = element('a', lesson.title);
                link.href = `#${card.id}`;
                item.append(link);
                summary.append(item);
            });
            status.textContent = classes.length ? '' : 'Расписание пока не добавлено.';
            status.hidden = classes.length > 0;
        } catch (error) {
            status.textContent = 'Не удалось загрузить расписание. Попробуйте обновить страницу.';
            summary.append(element('li', 'Расписание временно недоступно.'));
        }
    }
    render();
})();
