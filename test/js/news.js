import { todayInAtlanta } from './schedule/dates.js';
import { loadNews } from './news/data.js';
import { visibleNews } from './news/dates.js';
import { newsCard } from './news/view.js';

const list = document.getElementById('news-list');
const status = document.getElementById('news-status');

async function renderNews() {
    try {
        const today = todayInAtlanta();
        const news = visibleNews(await loadNews(), today);
        list.replaceChildren(...news.map(item => newsCard(item, today)));
        status.hidden = news.length > 0;
        status.textContent = news.length ? '' : 'Сейчас нет объявлений.';
    } catch {
        status.hidden = false;
        status.textContent = 'Не удалось загрузить объявления. Попробуйте обновить страницу.';
    }
}

if (list && status) renderNews();
