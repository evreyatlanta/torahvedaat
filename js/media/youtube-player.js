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
    button.textContent = '▶ Смотреть';
    button.setAttribute('aria-label', `Смотреть: ${item.title || 'видео'}`);
    button.addEventListener('click', () => {
        const frame = document.createElement('iframe');
        frame.src = `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&playsinline=1`;
        frame.title = item.title || 'YouTube видео';
        frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        player.replaceChildren(frame);
    }, { once: true });
    player.append(image, button);
    row.append(player);
    return row;
}
