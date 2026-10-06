import { element } from '../schedule/elements.js';
import { displayDate } from './dates.js';

export function newsCard(item, today) {
    const card = element('article', null, 'white-box news-card');
    const content = element('div', null, 'news-card-content');
    const metadata = element('div', null, 'news-meta');
    const date = element('time', displayDate(item.date));
    date.dateTime = item.date;
    metadata.append(date);
    if (item.date < today) metadata.append(element('span', 'Состоялось', 'news-past'));
    content.append(metadata, element('h3', item.title, 'news-card-title'));
    const timing = [item.time, item.location].filter(Boolean).join(' · ');
    if (timing) content.append(element('p', timing, 'news-timing'));
    content.append(element('p', item.summary));
    if (item.description) {
        const details = element('details', null, 'news-details');
        details.append(element('summary', 'Подробности'), element('p', item.description));
        content.append(details);
    }
    const registration = element('div', null, 'news-registration');
    if (item.registrationEmail) {
        const line = element('p', 'Для регистрации пишите на ');
        const email = element('a', item.registrationEmail);
        email.href = `mailto:${item.registrationEmail}`;
        line.append(email);
        registration.append(line);
    }
    if (item.registrationPhone) {
        registration.append(element('p', `Регистрация по телефону ${item.registrationPhone}`));
    }
    if (registration.childElementCount) content.append(registration);
    if (item.image) {
        const image = element('img', null, 'news-image');
        image.src = item.image;
        image.alt = item.imageAlt || '';
        image.loading = 'lazy';
        card.classList.add('news-card-with-image');
        card.append(image);
    }
    card.append(content);
    return card;
}
