import { videoHistory, playbackTime } from './video-history.js';
import { trackYoutubePlayer, pauseHistoryVideos, stopHistoryVideo } from './youtube-history-player.js';
import { VideoPlaylistIndex } from './playlist-index.js';

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
        this.panel = element('dialog', null, 'video-player-panel');
        this.panel.setAttribute('aria-labelledby', 'video-player-panel-title');
        const heading = element('div', null, 'video-player-panel-heading');
        const title = element('h2', 'Плеер уроков');
        title.id = 'video-player-panel-title';
        heading.append(title, button('Закрыть', () => this.panel.close(), 'video-panel-button'));
        this.list = element('div', null, 'video-player-panel-list');
        this.playingTitle = element('p', 'Выберите видео из истории.', 'video-player-current-title');
        this.playerHost = element('div', null, 'video-player-panel-screen');
        const footer = element('div', null, 'video-player-panel-footer');
        footer.append(this.playingTitle, this.playerHost);
        this.panel.append(heading, this.list, footer);
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
            if (this.currentId) pauseHistoryVideos();
            this.playerHost.replaceChildren();
            this.currentId = null;
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
        }
    }

    renderHistory() {
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
            row.append(element('time', new Date(entry.lastPlayedAt).toLocaleString('ru-RU'), 'media-history-note'),
                element('h3', entry.title),
                element('p', entry.completed ? 'Просмотрено полностью' : `Продолжить с ${playbackTime(entry.position)}`, 'media-history-note'));
            const actions = element('div', null, 'video-panel-actions');
            const play = button('▶ Play', () => this.playVideo({ id: entry.videoId, title: entry.title,
                thumbnailUrl: entry.thumbnailUrl, source: 'youtube', type: 'video' }), 'video-panel-button');
            play.setAttribute('aria-label', `Проиграть: ${entry.title}`);
            const lists = button('Плейлисты', () => this.showPlaylists(entry.videoId), 'video-panel-button');
            for (const [node, action] of [[play, 'play'], [lists, 'playlists']]) {
                node.dataset.videoId = entry.videoId;
                node.dataset.action = action;
            }
            actions.append(play, lists);
            row.append(actions);
            this.list.append(row);
        }
        this.list.scrollTop = scroll;
        if (focusId && focusAction) {
            [...this.list.querySelectorAll('button')].find(node => node.dataset.videoId === focusId &&
                node.dataset.action === focusAction)?.focus({ preventScroll: true });
        }
    }

    playVideo(item) {
        if (!/^[\w-]{11}$/.test(item.id || '')) return;
        if (this.currentId) stopHistoryVideo(this.currentId);
        const saved = this.history.get(item.id);
        const position = saved && !saved.completed ? saved.position : 0;
        this.history.save(item, { position, duration: saved?.duration || 0 });
        this.currentId = item.id;
        this.open();
        this.list.scrollTop = 0;
        if (this.playlistsWindow.open) this.playlistsWindow.close();
        this.playingTitle.textContent = item.title || 'Видео';
        const frame = document.createElement('iframe');
        const parameters = new URLSearchParams({ autoplay: '1', playsinline: '1', enablejsapi: '1',
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
                row.append(element('h3', `${playlist.title} (${playlist.count})`),
                    element('p', playlist.path, 'media-history-note'),
                    element('p', `Видео ${playlist.position} из ${playlist.count}`));
                for (const [label, item] of [['Предыдущее', playlist.previous], ['Следующее', playlist.next]]) {
                    if (item) row.append(button(`${label}: ${item.title || 'Видео'}`, () => this.playVideo(item), 'video-playlist-neighbor'));
                    else row.append(element('p', `${label} видео отсутствует.`, 'media-history-note'));
                }
                this.playlistsContent.append(row);
            }
        } catch {
            if (this.selectedPlaylistVideo === videoId) this.playlistsContent.replaceChildren(
                element('p', 'Не удалось загрузить плейлисты. Попробуйте открыть их снова.'));
        }
    }
}

const panel = new VideoPlayerPanel();
document.querySelectorAll('[data-open-video-panel]').forEach(trigger => {
    trigger.addEventListener('click', () => panel.open());
});
