import { videoHistory, playbackTime } from './video-history.js';
import { trackYoutubePlayer, pauseHistoryVideos, stopHistoryVideo } from './youtube-history-player.js';
import { VideoPlaylistIndex } from './playlist-index.js';

const SEARCH_PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 250;

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
}
function button(text, action, className) {
    const node = element('button', text, className);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
}

export class VideoPlayerPanel {
    constructor({ history = videoHistory, dataRoot = location.pathname.startsWith('/test/') ? '/test/data/' : '/data/' } = {}) {
        this.history = history;
        this.dataRoot = dataRoot;
        this.currentId = null;
        this.catalogPromise = null;
        this.searchVersion = 0;
        this.searchLimit = SEARCH_PAGE_SIZE;
        this.browsingPlaylist = null;
        this.panel = element('dialog', null, 'video-player-panel');
        this.panel.setAttribute('aria-labelledby', 'video-player-panel-title');
        const heading = element('div', null, 'video-player-panel-heading');
        const title = element('h2', 'Плеер уроков');
        title.id = 'video-player-panel-title';
        heading.append(title, button('Закрыть', () => this.panel.close(), 'video-panel-button'));
        const searchArea = element('div', null, 'video-panel-search');
        const searchLabel = element('label', 'Поиск видео и плейлистов');
        searchLabel.htmlFor = 'video-panel-search-input';
        const searchControls = element('div', null, 'video-panel-search-controls');
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'search';
        this.searchInput.id = 'video-panel-search-input';
        this.searchInput.placeholder = 'Введите название';
        this.searchInput.autocomplete = 'off';
        this.clearSearch = button('×', () => this.resetSearch(), 'video-panel-button');
        this.clearSearch.setAttribute('aria-label', 'Очистить поиск');
        this.clearSearch.hidden = true;
        searchControls.append(this.searchInput, this.clearSearch);
        searchArea.append(searchLabel, searchControls);
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimer);
            this.searchVersion++;
            this.browsingPlaylist = null;
            this.searchLimit = SEARCH_PAGE_SIZE;
            this.clearSearch.hidden = !this.searchInput.value.trim();
            if (!this.searchInput.value.trim()) { this.resetSearch(false); return; }
            this.searchTimer = setTimeout(() => this.performSearch(), SEARCH_DELAY_MS);
        });
        this.list = element('div', null, 'video-player-panel-list');
        this.playingTitle = element('p', 'Выберите видео из истории.', 'video-player-current-title');
        this.playerHost = element('div', null, 'video-player-panel-screen');
        const footer = element('div', null, 'video-player-panel-footer');
        this.currentPlaylists = button('Плейлисты', () => this.showPlaylists(this.currentId), 'video-panel-button video-current-playlists');
        this.currentPlaylists.hidden = true;
        this.currentPaths = element('ul', null, 'video-player-current-paths');
        this.currentPaths.setAttribute('aria-label', 'Пути к плейлистам видео');
        footer.append(this.currentPaths, this.playingTitle, this.currentPlaylists, this.playerHost);
        this.panel.append(heading, searchArea, this.list, footer);
        this.playlistsWindow = element('dialog', null, 'video-playlists-window');
        this.playlistsWindow.setAttribute('aria-labelledby', 'video-playlists-window-title');
        const playlistsHeading = element('div', null, 'video-player-panel-heading');
        const playlistsTitle = element('h2', 'Плейлисты видео');
        playlistsTitle.id = 'video-playlists-window-title';
        playlistsHeading.append(playlistsTitle, button('Закрыть', () => this.playlistsWindow.close(), 'video-panel-button'));
        this.playlistsContent = element('div', null, 'video-playlists-content');
        this.playlistsWindow.append(playlistsHeading, this.playlistsContent);
        document.body.append(this.panel, this.playlistsWindow);
        this.panel.addEventListener('close', () => {
            clearTimeout(this.searchTimer);
            this.searchVersion++;
            if (this.currentId) pauseHistoryVideos();
            this.playerHost.replaceChildren();
            this.currentId = null;
            this.currentPlaylists.hidden = true;
            this.currentPaths.replaceChildren();
            this.playingTitle.textContent = 'Выберите видео из истории.';
            if (this.playlistsWindow.open) this.playlistsWindow.close();
            this.returnFocus?.focus({ preventScroll: true });
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.panel.open && !this.playlistsWindow.open) {
                event.preventDefault();
                this.panel.close();
            }
        });
        window.addEventListener('video-history-change', () => { if (this.panel.open) this.renderHistory(); });
        window.addEventListener('storage', event => {
            if (event.key === this.history.key && this.panel.open) this.renderHistory();
        });
    }

    open() {
        this.renderHistory();
        if (!this.panel.open) {
            this.returnFocus = document.activeElement;
            this.panel.show();
            if (this.searchInput.value.trim() && !this.browsingPlaylist) this.performSearch();
        }
    }

    renderHistory() {
        if (this.searchInput.value.trim() || this.browsingPlaylist) return;
        const focused = document.activeElement?.dataset;
        const focusId = focused?.videoId;
        const focusAction = focused?.action;
        const scroll = this.list.scrollTop;
        this.list.replaceChildren();
        const entries = this.history.list();
        if (!entries.length) this.list.append(element('p', 'История пока пуста. Начните просмотр видео в медиатеке.'));
        for (const entry of entries) {
            const row = element('article', null, 'video-player-history-row');
            if (entry.videoId === this.currentId) row.classList.add('is-playing');
            const metadata = element('div', null, 'video-panel-row-meta');
            metadata.append(element('time', new Date(entry.lastPlayedAt).toLocaleString('ru-RU')),
                element('span', entry.completed ? 'Просмотрено' : playbackTime(entry.position)));
            const item = { id: entry.videoId, title: entry.title, thumbnailUrl: entry.thumbnailUrl, source: 'youtube', type: 'video' };
            row.append(this.videoTitle(item), metadata);
            const actions = element('div', null, 'video-panel-actions');
            const play = button('▶', () => this.playVideo({ id: entry.videoId, title: entry.title,
                thumbnailUrl: entry.thumbnailUrl, source: 'youtube', type: 'video' }), 'video-panel-button');
            play.setAttribute('aria-label', `Проиграть: ${entry.title}`);
            play.dataset.videoId = entry.videoId;
            play.dataset.action = 'play';
            actions.append(play);
            row.append(actions);
            this.list.append(row);
        }
        this.list.scrollTop = scroll;
        if (focusId && focusAction) {
            [...this.list.querySelectorAll('button')].find(node => node.dataset.videoId === focusId &&
                node.dataset.action === focusAction)?.focus({ preventScroll: true });
        }
    }

    resetSearch(focus = true) {
        clearTimeout(this.searchTimer);
        this.searchVersion++;
        this.searchInput.value = '';
        this.clearSearch.hidden = true;
        this.browsingPlaylist = null;
        this.renderHistory();
        this.list.scrollTop = 0;
        if (focus) this.searchInput.focus();
    }

    videoTitle(item) {
        const heading = element('h3');
        const title = button(item.title || 'Видео без названия', () => this.playVideo(item, false), 'video-panel-title-button');
        title.dataset.videoId = item.id;
        title.dataset.action = 'select';
        heading.append(title);
        return heading;
    }

    videoResult(item) {
        const row = element('article', null, 'video-player-history-row');
        if (item.id === this.currentId) row.classList.add('is-playing');
        if (item.date) row.append(element('time', item.date, 'media-history-note'));
        row.append(this.videoTitle(item));
        const saved = this.history.get(item.id);
        if (saved?.position && !saved.completed) row.append(element('p',
            `Продолжить с ${playbackTime(saved.position)}`, 'media-history-note'));
        const actions = element('div', null, 'video-panel-actions');
        const play = button('▶', () => this.playVideo(item), 'video-panel-button');
        play.setAttribute('aria-label', `Проиграть: ${item.title || 'Видео'}`);
        actions.append(play);
        row.append(actions);
        return row;
    }

    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) { this.resetSearch(false); return; }
        const version = ++this.searchVersion;
        this.browsingPlaylist = null;
        this.list.replaceChildren(element('p', 'Поиск…'));
        try {
            const catalog = await this.catalog();
            if (version !== this.searchVersion || !this.panel.open) return;
            const result = catalog.search(query, this.searchLimit);
            this.list.replaceChildren();
            const status = element('p', `Найдено: ${result.playlistCount} плейлистов, ${result.videoCount} видео.`, 'media-history-note');
            status.setAttribute('role', 'status');
            this.list.append(status);
            if (!result.playlistCount && !result.videoCount) this.list.append(element('p', 'Ничего не найдено. Попробуйте другое название.'));
            if (result.playlistCount) {
                this.list.append(element('h3', 'Плейлисты', 'video-panel-result-heading'));
                for (const playlist of result.playlists) {
                    const row = element('article', null, 'video-player-history-row');
                    row.append(button(`${playlist.title} (${playlist.count})`, () => this.showSearchPlaylist(playlist, catalog), 'video-playlist-neighbor'),
                        element('p', playlist.path, 'media-history-note'));
                    this.list.append(row);
                }
            }
            if (result.videoCount) {
                this.list.append(element('h3', 'Видео', 'video-panel-result-heading'));
                for (const item of result.videos) this.list.append(this.videoResult(item));
            }
            if (result.videoCount > result.videos.length || result.playlistCount > result.playlists.length) {
                this.list.append(button('Показать ещё результаты', () => {
                    this.searchLimit += SEARCH_PAGE_SIZE;
                    this.performSearch();
                }, 'video-panel-button'));
            }
            this.list.scrollTop = 0;
        } catch {
            if (version === this.searchVersion) this.list.replaceChildren(element('p', 'Не удалось выполнить поиск.'),
                button('Попробовать снова', () => this.performSearch(), 'video-panel-button'));
        }
    }

    showSearchPlaylist(playlist, catalog, limit = SEARCH_PAGE_SIZE) {
        this.searchVersion++;
        this.browsingPlaylist = playlist.id;
        this.list.replaceChildren(button('← Назад к результатам', () => this.performSearch(), 'video-panel-button'),
            element('h3', `${playlist.title} (${playlist.count})`, 'video-panel-result-heading'),
            element('p', playlist.path, 'media-history-note'));
        const items = playlist.items.map(id => catalog.media.get(id))
            .filter(item => item?.source === 'youtube' && item.type === 'video');
        if (!items.length) this.list.append(element('p', 'В этом плейлисте пока нет видео.'));
        for (const item of items.slice(0, limit)) this.list.append(this.videoResult(item));
        if (items.length > limit) this.list.append(button('Показать ещё видео', () =>
            this.showSearchPlaylist(playlist, catalog, limit + SEARCH_PAGE_SIZE), 'video-panel-button'));
        this.list.scrollTop = 0;
    }

    playVideo(item, autoplay = true) {
        if (!/^[\w-]{11}$/.test(item.id || '')) return;
        if (this.currentId) stopHistoryVideo(this.currentId);
        const saved = this.history.get(item.id);
        const position = saved && !saved.completed ? saved.position : 0;
        if (autoplay) this.history.save(item, { position, duration: saved?.duration || 0 });
        this.currentId = item.id;
        this.open();
        this.list.scrollTop = 0;
        if (this.playlistsWindow.open) this.playlistsWindow.close();
        this.playingTitle.textContent = item.title || 'Видео';
        this.currentPlaylists.hidden = true;
        this.currentPaths.replaceChildren();
        this.catalog().then(catalog => {
            if (this.currentId !== item.id || !this.panel.open) return;
            const memberships = catalog.forVideo(item.id);
            this.currentPlaylists.hidden = memberships.length === 0;
            const paths = [...new Set(memberships.map(playlist => playlist.path))];
            this.currentPaths.replaceChildren(...paths.map(path => element('li', path)));
        }).catch(() => {});
        this.list.querySelectorAll('.video-player-history-row').forEach(row => {
            row.classList.toggle('is-playing', row.querySelector('[data-action="select"]')?.dataset.videoId === item.id);
        });
        const frame = document.createElement('iframe');
        const parameters = new URLSearchParams({ autoplay: autoplay ? '1' : '0', playsinline: '1', enablejsapi: '1',
            origin: location.origin, start: String(Math.floor(position)) });
        frame.src = `https://www.youtube-nocookie.com/embed/${item.id}?${parameters}`;
        frame.title = item.title || 'YouTube видео';
        frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        this.playerHost.replaceChildren(frame);
        trackYoutubePlayer(frame, item);
    }

    async catalog() {
        if (!this.catalogPromise) this.catalogPromise = Promise.all(['media.js', 'playlist.js'].map(async file => {
            const response = await fetch(`${this.dataRoot}${file}`);
            if (!response.ok) throw new Error('Media data unavailable');
            return response.json();
        })).then(([library, tree]) => new VideoPlaylistIndex(library.items, tree))
            .catch(error => { this.catalogPromise = null; throw error; });
        return this.catalogPromise;
    }

    async showPlaylists(videoId) {
        pauseHistoryVideos();
        this.selectedPlaylistVideo = videoId;
        this.playlistsContent.replaceChildren(element('p', 'Загрузка плейлистов…'));
        if (!this.playlistsWindow.open) this.playlistsWindow.showModal();
        try {
            const catalog = await this.catalog();
            if (this.selectedPlaylistVideo !== videoId || !this.playlistsWindow.open) return;
            this.playlistsContent.replaceChildren();
            const matches = catalog.forVideo(videoId);
            if (!matches.length) this.playlistsContent.append(element('p', 'Это видео не входит в плейлисты сайта.'));
            for (const playlist of matches) {
                const row = element('section', null, 'video-playlist-choice');
                const previous = button('←', () => this.playVideo(playlist.previous), 'video-playlist-arrow');
                const next = button('→', () => this.playVideo(playlist.next), 'video-playlist-arrow');
                for (const [control, label, item] of [[previous, 'Предыдущее', playlist.previous], [next, 'Следующее', playlist.next]]) {
                    control.disabled = !item;
                    control.title = item ? label + ': ' + (item.title || 'Видео') : label + ' видео отсутствует';
                    control.setAttribute('aria-label', control.title);
                }
                const info = element('div', null, 'video-playlist-info');
                const title = element('h3', playlist.title);
                title.title = playlist.path;
                info.append(title, element('span', 'Видео ' + playlist.position + ' из ' + playlist.count, 'media-history-note'));
                row.append(previous, info, next);
                this.playlistsContent.append(row);
            }
        } catch {
            if (this.selectedPlaylistVideo === videoId) this.playlistsContent.replaceChildren(
                element('p', 'Не удалось загрузить плейлисты. Попробуйте открыть их снова.'));
        }
    }
}

const panel = new VideoPlayerPanel();
window.addEventListener('open-video-panel', event => {
    if (event.detail?.item) panel.playVideo(event.detail.item);
    else panel.open();
});
document.querySelectorAll('[data-open-video-panel]').forEach(trigger => {
    trigger.addEventListener('click', () => panel.open());
});
