export const HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export class VideoHistory {
    constructor({ storage, key, now = () => Date.now(), retentionMs = HISTORY_RETENTION_MS } = {}) {
        this.key = key || (globalThis.location?.pathname.startsWith('/test/')
            ? 'evreyatlanta:test:video-history:v1' : 'evreyatlanta:video-history:v1');
        this.now = now;
        this.retentionMs = retentionMs;
        this.memory = [];
        try { this.storage = storage === undefined ? globalThis.localStorage : storage; }
        catch { this.storage = null; }
        this.persistent = !!this.storage;
    }

    read() {
        let entries = this.memory;
        try {
            const raw = this.storage?.getItem(this.key);
            if (raw) {
                const data = JSON.parse(raw);
                entries = Array.isArray(data.entries) ? data.entries : [];
            } else if (this.storage) entries = [];
        } catch { this.persistent = false; }
        const cutoff = this.now() - this.retentionMs;
        const valid = entries.filter(entry => entry && /^[\w-]{11}$/.test(entry.videoId || '') &&
            Number.isFinite(entry.lastPlayedAt) && entry.lastPlayedAt > cutoff &&
            Number.isFinite(entry.position) && entry.position >= 0 &&
            Number.isFinite(entry.duration) && entry.duration >= 0);
        if (valid.length !== entries.length) this.write(valid);
        this.memory = valid;
        return valid;
    }

    write(entries) {
        this.memory = entries;
        try { this.storage?.setItem(this.key, JSON.stringify({ version: 1, entries })); }
        catch { this.persistent = false; this.storage = null; }
    }

    list() { return this.read().map(entry => ({ ...entry })).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt); }
    get(videoId) { return this.list().find(entry => entry.videoId === videoId) || null; }

    save(item, { position, duration, completed = false }) {
        if (!/^[\w-]{11}$/.test(item.id || '') || !Number.isFinite(position) || !Number.isFinite(duration)) return;
        const entry = {
            videoId: item.id,
            title: item.title || 'Видео без названия',
            thumbnailUrl: item.thumbnailUrl || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            position: Math.max(0, duration > 0 ? Math.min(position, duration) : position),
            duration: Math.max(0, duration),
            lastPlayedAt: this.now(),
            completed: !!completed
        };
        this.write([entry, ...this.read().filter(previous => previous.videoId !== item.id)]);
        return entry;
    }

    remove(videoId) { this.write(this.read().filter(entry => entry.videoId !== videoId)); }
    clear() { this.write([]); }
}

export const videoHistory = new VideoHistory();

export function playbackTime(seconds) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const minutes = Math.floor(total / 60);
    const remaining = String(total % 60).padStart(2, '0');
    return minutes >= 60 ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remaining}`
        : `${minutes}:${remaining}`;
}
