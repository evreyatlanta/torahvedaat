// Date-only expirations remain visible through that day in Atlanta.
export function todayInAtlanta() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const part = name => parts.find(p => p.type === name).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}
// Lessons are stored in weekly order; keep the order within each day.
export function lessonsFromToday(classes, today) {
    const weekdays = {
        'Воскресенье': 0, 'Понедельник': 1, 'Вторник': 2,
        'Среда': 3, 'Четверг': 4, 'Пятница': 5, 'Шабат': 6, 'Суббота': 6
    };
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const start = classes.findIndex(lesson => weekdays[lesson.days] >= weekday);
    if (start <= 0) return classes;
    return [...classes.slice(start), ...classes.slice(0, start)];
}
