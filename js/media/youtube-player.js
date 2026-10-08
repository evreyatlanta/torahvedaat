import { videoHistory, playbackTime } from './video-history.js';
import { trackYoutubePlayer } from './youtube-history-player.js';

export function youtubePlayer(item) {
    if (item.source !== 'youtube' || item.type !== 'video' || !/^[\w-]{11}$/.test(item.id || '')) return null;
    const row = document.createElement('div');
    row.className = 'media-youtube';
    const image = document.createElement('img');
    image.className = 'media-youtube-thumbnail';
    image.src = item.thumbnailUrl || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
    image.alt = item.title || 'Превью видео';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => { image.hidden = true; }, { once: true });
    const player = document.createElement('div');
    player.className = 'media-youtube-player';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'media-youtube-play';
    const saved = videoHistory.get(item.id);
    button.textContent = saved?.completed ? '▶ Смотреть снова' : saved?.position > 0
        ? `▶ Продолжить с ${playbackTime(saved.position)}` : '▶ Смотреть';
    button.setAttribute('aria-label', `${button.textContent.replace('▶ ', '')}: ${item.title || 'видео'}`);
    button.addEventListener('click', () => {
        const frame = document.createElement('iframe');
        const latest = videoHistory.get(item.id);
        const start = latest && !latest.completed ? Math.floor(latest.position) : 0;
        const parameters = new URLSearchParams({ autoplay: '1', playsinline: '1', enablejsapi: '1',
            origin: location.origin, start: String(start) });
        frame.src = `https://www.youtube-nocookie.com/embed/${item.id}?${parameters}`;
        frame.title = item.title || 'YouTube видео';
        frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        player.replaceChildren(frame);
        trackYoutubePlayer(frame, item);
    }, { once: true });
    player.append(image, button);
    row.append(player);
    return row;
}
