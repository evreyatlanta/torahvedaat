import { groupLink } from './group-link.js';

export function renderCategoryNavigation(target, categories, selectedId) {
    const visible = categories.filter(category => category.count > 0);
    target.replaceChildren(...visible.map(category => groupLink(category, selectedId)));
    target.closest('section').hidden = visible.length === 0;
}
