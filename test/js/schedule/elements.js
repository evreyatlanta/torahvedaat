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

export function lessonCard(lesson, notes) {
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
    const lessonNotes = notes;
    for (const note of lessonNotes.filter(note => note.type !== 'instruction')) card.append(noteElement(note));
    for (const note of lessonNotes.filter(note => note.type === 'instruction')) card.append(noteElement(note));
    return card;
}

export function summaryItem(lesson) {
    const item = element('li');
    const summaryTimeRow = element('div', null, 'class-time-row summary-time');
    summaryTimeRow.append(element('span', `${lesson.days} · ${lesson.time}`));
    const summaryFormat = formatBadge(lesson);
    if (summaryFormat) summaryTimeRow.append(summaryFormat);
    item.append(summaryTimeRow);
    const link = element('a', lesson.title);
    link.href = `/test/classes.html#${encodeURIComponent(`lesson-${lesson.id}`)}`;
    item.append(link);
    const summaryAuthor = lesson.short_author || lesson.author;
    if (summaryAuthor) item.append(element('p', summaryAuthor, 'class-author'));
    return item;
}

export { element, noteElement };
