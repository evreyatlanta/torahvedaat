import { compareMedia, applySortValues, loadSortValues } from '/js/media/order.js';
import { readArray } from '../data.js';

export async function loadMediaLibrary() {
    const [media, playlists, dates] = await Promise.all([
        readMedia('/test/data/media.js'),
        readArray('/test/data/playlist.js'),
        loadSortValues('/test/data/sort.js')
    ]);
    return { media: applySortValues(media.items, dates).sort(compareMedia), playlists, counts: { playlists: media.playlists, tags: media.tags } };
}

async function readMedia(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Data unavailable: ${path}`);
    const data = await response.json();
    if (!data || !Array.isArray(data.items) || !Array.isArray(data.playlists) || !Array.isArray(data.tags)) {
        throw new Error(`Invalid media library: ${path}`);
    }
    return data;
}
