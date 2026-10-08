import { videoHistory, playbackTime } from './video-history.js';
import { youtubePlayer } from './youtube-player.js';
import { stopHistoryVideo } from './youtube-history-player.js';

const target = document.getElementById('video-history');
const status = document.getElementById('video-history-status');
const clear = document.getElementById('video-history-clear');
const rows = new Map();

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function describe(entry) {
    const watched = entry.completed ? 'Просмотрено полностью' : `Остановились на ${playbackTime(entry.position)}`;
    return `${watched}${entry.duration ? ` из ${playbackTime(entry.duration)}` : ''}`;
}

function render() {
    target.replaceChildren();
    rows.clear();
    const entries = videoHistory.list();
    status.textContent = entries.length ? '' : 'История пока пуста. Здесь появятся уроки после начала просмотра.';
    status.hidden = entries.length > 0;
    clear.hidden = !entries.length;
    for (const entry of entries) {
        const card = element('article', null, 'media-record');
        card.append(element('h3', entry.title));
        const position = element('p', describe(entry));
        const progress = element('progress');
        progress.max = entry.duration || 1;
        progress.value = entry.position;
        progress.setAttribute('aria-label', 'Прогресс просмотра');
        const time = element('p', `Последний просмотр: ${new Date(entry.lastPlayedAt).toLocaleString('ru-RU')}`, 'media-history-note');
        const player = youtubePlayer({ id: entry.videoId, title: entry.title,
            thumbnailUrl: entry.thumbnailUrl, source: 'youtube', type: 'video' });
        card.append(position, progress, time, player);
        const remove = element('button', 'Удалить из истории', 'media-history-remove');
        remove.type = 'button';
        remove.addEventListener('click', () => {
            stopHistoryVideo(entry.videoId);
            videoHistory.remove(entry.videoId);
            card.remove();
            rows.delete(entry.videoId);
            if (!videoHistory.list().length) render();
        });
        card.append(remove);
        rows.set(entry.videoId, { position, progress });
        target.append(card);
    }
    if (!videoHistory.persistent) {
        const note = element('p', 'Браузер не разрешает сохранять историю. После закрытия страницы она может быть потеряна.', 'media-history-note');
        target.prepend(note);
    }
}

clear.addEventListener('click', () => {
    stopHistoryVideo();
    videoHistory.clear();
    render();
});
window.addEventListener('video-history-change', event => {
    const entry = videoHistory.get(event.detail.videoId);
    const row = rows.get(event.detail.videoId);
    if (entry && row) {
        row.position.textContent = describe(entry);
        row.progress.max = entry.duration || 1;
        row.progress.value = entry.position;
    }
});
render();
