function dateValue(date) {
    return new Date(`${date}T00:00:00Z`);
}

function dateString(date) {
    return date.toISOString().slice(0, 10);
}

// Clamp month-end dates: March 31 starts showing on February 28/29.
function monthBefore(date) {
    const value = dateValue(date);
    const day = value.getUTCDate();
    value.setUTCDate(1);
    value.setUTCMonth(value.getUTCMonth() - 1);
    const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
    value.setUTCDate(Math.min(day, lastDay));
    return dateString(value);
}

function daysAfter(date, days) {
    const value = dateValue(date);
    value.setUTCDate(value.getUTCDate() + days);
    return dateString(value);
}

export function visibleNews(news, today) {
    return news.filter(item => {
        const start = item.publishedAt || monthBefore(item.date);
        const end = item.expiresAt || daysAfter(item.date, 14);
        return start <= today && today <= end;
    }).sort((a, b) => a.date.localeCompare(b.date));
}

export function displayDate(date) {
    return new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'UTC', day: 'numeric', month: 'long'
    }).format(dateValue(date));
}
