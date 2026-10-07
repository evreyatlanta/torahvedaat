import { readArray } from '../data.js';
import { loadMediaLibrary } from './data.js';
import { renderCategoryNavigation } from './navigation.js';
import { playlistsForTag, findPlaylist, playlistItems, renderPlaylistTree } from './playlists.js';
import { renderMediaRecords } from './records.js';

const status = document.getElementById('media-status');
try {
    const id = new URLSearchParams(location.search).get('id');
    const [categories, library] = await Promise.all([
        readArray('/test/data/media-groups.js'), loadMediaLibrary()
    ]);
    const category = categories.find(item => item.id === id);
    renderCategoryNavigation(document.getElementById('media-category-nav'), categories, id);
    if (!category) {
        status.textContent = 'Рубрика не найдена.';
    } else {
        document.getElementById('media-category-title').textContent = category.title;
        document.title = `${category.title} — Евреи Атланты`;
        const playlists = playlistsForTag(library.playlists, id);
        const media = library.media.filter(item => (item.tags ?? []).includes(id));
        const playlistTarget = document.getElementById('media-playlists');
        const records = document.getElementById('media-records');
        function showSelection() {
            const selectedId = new URLSearchParams(location.search).get('playlist');
            const selected = findPlaylist(playlists, selectedId);
            playlistTarget.querySelectorAll('[data-playlist-id]').forEach(link => {
                if (link.dataset.playlistId === selectedId) link.setAttribute('aria-current', 'true');
                else link.removeAttribute('aria-current');
            });
            if (selected) {
                const items = playlistItems(selected, media);
                renderMediaRecords(records, items, selected.title);
                status.hidden = items.length > 0;
                status.textContent = items.length ? '' : 'В этом плейлисте пока нет записей.';
            } else {
                renderMediaRecords(records, playlists.length ? [] : media);
                status.hidden = !playlists.length && media.length > 0;
                status.textContent = selectedId ? 'Плейлист не найден.' : playlists.length
                    ? 'Выберите плейлист, чтобы посмотреть записи.'
                    : 'Материалы этой рубрики пока не добавлены.';
            }
        }
        renderPlaylistTree(playlistTarget, playlists, id, (node, url) => {
            history.pushState(null, '', url);
            showSelection();
        });
        window.addEventListener('popstate', showSelection);
        showSelection();
    }
} catch {
    status.textContent = 'Не удалось загрузить медиатеку. Попробуйте обновить страницу.';
}
