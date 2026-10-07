import { element } from '../schedule/elements.js';

export function groupLink(group, selectedId = null) {
    const link = element('a', null, 'media-category-nav-link');
    link.href = `/media/?id=${encodeURIComponent(group.id)}`;
    const icon = element('img', null, 'media-group-icon');
    icon.src = `/images/icons/media-${group.id}.svg?v=3`;
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    link.append(icon, element('span', `${group.title} (${group.count})`));
    if (group.id === selectedId) link.setAttribute('aria-current', 'page');
    return link;
}

