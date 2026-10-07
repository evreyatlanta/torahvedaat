import { readArray } from '../data.js';
import { element } from '../schedule/elements.js';

const target = document.getElementById('media-categories');
try {
    const categories = await readArray('/test/data/media-groups.js');
    target.replaceChildren(...categories.map(category => {
        const link = element('a', `${category.title} (${category.count})`, 'media-category-nav-link');
        link.href = `/test/media/?id=${encodeURIComponent(category.id)}`;
        return link;
    }));
} catch {
    target.textContent = 'Не удалось загрузить рубрики.';
}
