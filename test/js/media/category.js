import { readArray } from '../data.js';
import { element } from '../schedule/elements.js';
import { loadMediaLibrary } from './data.js';

function matchingPlaylists(nodes, tag) {
    return nodes.flatMap(node => [
        ...(node.tags.includes(tag) ? [node] : []),
        ...matchingPlaylists(node.children, tag)
    ]);
}

const status = document.getElementById('media-status');
try {
    const id = new URLSearchParams(location.search).get('id');
    const [categories, library] = await Promise.all([
        readArray('/test/data/media-categories.js'), loadMediaLibrary()
    ]);
    const category = categories.find(item => item.id === id);
    if (!category) {
        status.textContent = 'Рубрика не найдена.';
    } else {
        document.getElementById('media-category-title').textContent = category.title;
        document.title = `${category.title} — Евреи Атланты`;
        const playlists = matchingPlaylists(library.playlists, id);
        const media = library.media.filter(item => item.tags.includes(id));
        const playlistTarget = document.getElementById('media-playlists');
        if (playlists.length) {
            playlistTarget.append(element('h3', 'Плейлисты'));
            const list = element('ul');
            playlists.forEach(item => list.append(element('li', item.title)));
            playlistTarget.append(list);
        }
        const records = document.getElementById('media-records');
        for (const item of media) {
            const card = element('article', null, 'media-record');
            if (item.title) card.append(element('h3', item.title));
            if (item.date) card.append(element('p', item.date));
            item.description.forEach(paragraph => card.append(element('p', paragraph)));
            const url = new URL(item.url, location.href);
            if (url.protocol === 'https:' || url.protocol === 'http:') {
                const link = element('a', 'Открыть материал');
                link.href = url.href;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                card.append(link);
            }
            records.append(card);
        }
        status.hidden = playlists.length + media.length > 0;
        status.textContent = status.hidden ? '' : 'Материалы этой рубрики пока не добавлены.';
    }
} catch {
    status.textContent = 'Не удалось загрузить медиатеку. Попробуйте обновить страницу.';
}
