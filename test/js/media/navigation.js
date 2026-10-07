import { groupLink } from './group-link.js';

export function renderCategoryNavigation(target, categories, selectedId) {
    target.replaceChildren(...categories.map(category => groupLink(category, selectedId)));
}
