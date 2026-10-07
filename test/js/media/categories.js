import { readArray } from '../data.js';
import { groupLink } from './group-link.js';

const target = document.getElementById('media-categories');
try {
    const categories = await readArray('/test/data/media-groups.js');
    target.replaceChildren(...categories.map(category => groupLink(category)));
} catch {
    target.textContent = 'Не удалось загрузить рубрики.';
}
