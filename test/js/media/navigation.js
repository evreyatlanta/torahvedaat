import { element } from '../schedule/elements.js';

export function renderCategoryNavigation(target, categories, selectedId) {
    target.replaceChildren(...categories.map(category => {
        const link = element('a', category.title, 'media-category-nav-link');
        link.href = `/test/media/?id=${encodeURIComponent(category.id)}`;
        if (category.id === selectedId) link.setAttribute('aria-current', 'page');
        return link;
    }));
}
