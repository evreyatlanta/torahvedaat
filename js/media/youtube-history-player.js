import { videoHistory } from './video-history.js';

let apiPromise;
const sessions = new Set();

function loadPlayerApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
        const previous = window.onYouTubeIframeAPIReady;
        const timeout = setTimeout(() => reject(new Error('YouTube API timeout')), 20000);
        window.onYouTubeIframeAPIReady = () => {
            clearTimeout(timeout);
            previous?.();
            resolve(window.YT);
        };
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = () => { clearTimeout(timeout); reject(new Error('YouTube API unavailable')); };
        document.head.append(script);
    }).catch(error => { apiPromise = null; throw error; });
    return apiPromise;
}

export async function trackYoutubePlayer(frame, item) {
    let YT;
    try { YT = await loadPlayerApi(); }
    catch {
        if (frame.isConnected) {
            const note = document.createElement('p');
            note.className = 'media-history-note';
            note.textContent = 'Не удалось подключить сохранение позиции для этого просмотра.';
            frame.closest('.media-youtube')?.append(note);
        }
        return;
    }
    if (!frame.isConnected) return;
    let player;
    let interval;
    let played = false;
    let disposed = false;
    let lastPosition = 0;
    let lastDuration = 0;
    let completed = false;
    function save() {
        if (!played || disposed) return;
        try {
            const position = player.getCurrentTime();
            const duration = player.getDuration();
            if (Number.isFinite(position)) lastPosition = position;
            if (Number.isFinite(duration) && duration > 0) lastDuration = duration;
        } catch { /* Keep the last measured position if the iframe is already gone. */ }
        if (completed && lastDuration) lastPosition = lastDuration;
        videoHistory.save(item, { position: lastPosition, duration: lastDuration, completed });
        window.dispatchEvent(new CustomEvent('video-history-change', { detail: { videoId: item.id } }));
    }
    function stopTimer() { clearInterval(interval); interval = undefined; }
    function dispose() {
        if (disposed) return;
        // Removing a history entry must not re-create it during cleanup.
        if (videoHistory.get(item.id)) save();
        disposed = true;
        stopTimer();
        observer.disconnect();
        window.removeEventListener('pagehide', save);
        document.removeEventListener('visibilitychange', save);
        sessions.delete(session);
        try { player.destroy(); } catch { /* It may have already been removed. */ }
    }
    const observer = new MutationObserver(() => { if (!frame.isConnected) dispose(); });
    const session = { pause: () => { try { player.pauseVideo(); } catch {} }, dispose, videoId: item.id };
    function stateChanged(state) {
        if (disposed) return;
        if (state === YT.PlayerState.PLAYING) {
            for (const other of sessions) if (other !== session) other.pause();
            played = true;
            completed = false;
            save();
            stopTimer();
            interval = setInterval(save, 5000);
        } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
            completed = state === YT.PlayerState.ENDED;
            save();
            stopTimer();
        } else if (state === YT.PlayerState.BUFFERING) stopTimer();
    }
    player = new YT.Player(frame, {
        events: {
            onReady: event => stateChanged(event.target.getPlayerState()),
            onStateChange: event => stateChanged(event.data)
        }
    });
    sessions.add(session);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', save);
}

export function stopHistoryVideo(videoId) {
    for (const session of [...sessions]) if (!videoId || session.videoId === videoId) session.dispose();
}
