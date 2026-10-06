(() => {
    'use strict';
    const SUMMARY_VISIBLE_COUNT = 2;
    const status = document.getElementById('schedule-status');
    const cards = document.getElementById('schedule-classes');
    const summary = document.getElementById('schedule-summary');
    const generalNotes = document.getElementById('schedule-notes');
    const generalInstructions = document.getElementById('schedule-instructions');
    function noteElement(note) {
        const instruction = note.type === 'instruction';
        const block = element('div', null, instruction ? 'schedule-instruction' : 'schedule-note');
        const text = element('p');
        const emails = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
        let position = 0;
        for (const match of note.title.matchAll(emails)) {
            text.append(document.createTextNode(note.title.slice(position, match.index)));
            const link = element('a', match[0]);
            link.href = `mailto:${match[0]}`;
            text.append(link);
            position = match.index + match[0].length;
        }
        text.append(document.createTextNode(note.title.slice(position)));
        block.append(text);
        return block;
    }
    const formats = { 'WhatsApp': 'WhatsApp', 'zoom': 'Zoom' };
    function formatBadge(lesson) {
        const label = lesson.type === 'in-person' ? lesson.location : formats[lesson.type];
        if (!label) return null;
        return element('span', label, `class-format format-${lesson.type.toLowerCase()}`);
    }
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
    // Lessons are stored in weekly order; keep the order within each day.
    function rotateSummary(classes, today) {
        const weekdays = {
            'Воскресенье': 0, 'Понедельник': 1, 'Вторник': 2,
            'Среда': 3, 'Четверг': 4, 'Пятница': 5, 'Шабат': 6, 'Суббота': 6
        };
        const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
        const start = classes.findIndex(lesson => weekdays[lesson.days] >= weekday);
        if (start <= 0) return;
        const items = Array.from(summary.children);
        summary.replaceChildren(...items.slice(start), ...items.slice(0, start));
    }
    function collapseSummary() {
        const remaining = Array.from(summary.children).slice(SUMMARY_VISIBLE_COUNT);
        if (!remaining.length) return;
        remaining.forEach(item => { item.hidden = true; });
        const count = remaining.length;
        const plural = count % 10 === 1 && count % 100 !== 11 ? 'урок'
            : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'урока' : 'уроков';
        const reveal = element('button', `еще ${count} ${plural}`, 'schedule-reveal');
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
            const activeNotes = notes
                .map(note => ({ ...note, type: note.type ?? 'note' }))
                .filter(note => note.expiration === null || note.expiration >= today);
            const notesFor = id => activeNotes.filter(note => note.classId === id);
            for (const note of notesFor(null)) {
                const target = note.type === 'instruction' ? generalInstructions : generalNotes;
                if (target) target.append(noteElement(note));
            }
            if (summary) summary.replaceChildren();
            classes.forEach((lesson) => {
                const card = element('article', null, 'class-card');
                card.id = `lesson-${lesson.id}`;
                card.tabIndex = -1;
                const timeRow = element('div', null, 'class-time-row');
                timeRow.append(element('span', `${lesson.days} · ${lesson.time}`, 'class-time'));
                const cardFormat = formatBadge(lesson);
                if (cardFormat) timeRow.append(cardFormat);
                card.append(timeRow);
                card.append(element('h3', lesson.title));
                if (lesson.link) {
                    const url = new URL(lesson.link, location.href);
                    if (url.protocol === 'https:' || url.protocol === 'http:') {
                        const join = element('a', lesson.type === 'in-person' ? 'Место проведения' : 'Открыть ссылку на урок', 'class-link');
                        join.href = url.href;
                        join.target = '_blank';
                        join.rel = 'noopener noreferrer';
                        card.append(join);
                    }
                }
                if (lesson.author) card.append(element('p', lesson.author, 'class-author'));
                if (lesson.description) card.append(element('p', lesson.description));
                const lessonNotes = notesFor(lesson.id);
                for (const note of lessonNotes.filter(note => note.type !== 'instruction')) card.append(noteElement(note));
                for (const note of lessonNotes.filter(note => note.type === 'instruction')) card.append(noteElement(note));
                if (cards) cards.append(card);
                const item = element('li');
                const summaryTimeRow = element('div', null, 'class-time-row summary-time');
                summaryTimeRow.append(element('span', `${lesson.days} · ${lesson.time}`));
                const summaryFormat = formatBadge(lesson);
                if (summaryFormat) summaryTimeRow.append(summaryFormat);
                item.append(summaryTimeRow);
                const link = element('a', lesson.title);
                link.href = `/test/classes.html#${encodeURIComponent(card.id)}`;
                item.append(link);
                const summaryAuthor = lesson.short_author || lesson.author;
                if (summaryAuthor) item.append(element('p', summaryAuthor, 'class-author'));
                if (summary) summary.append(item);
            });
            if (summary) {
                rotateSummary(classes, today);
                collapseSummary();
            }
            if (status) status.textContent = classes.length ? '' : 'Расписание пока не добавлено.';
            if (status) status.hidden = classes.length > 0;
            if (cards && location.hash) {
                const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
                if (target && cards.contains(target)) { target.scrollIntoView(); target.focus({ preventScroll: true }); }
            }
        } catch (error) {
            if (status) status.textContent = 'Не удалось загрузить расписание. Попробуйте обновить страницу.';
            if (summary) summary.replaceChildren(element('li', 'Расписание временно недоступно.'));
        }
    }
    render();
})();
