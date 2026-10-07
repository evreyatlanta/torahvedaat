import { readArray } from '../data.js';

export async function loadMediaLibrary() {
    const [media, playlists] = await Promise.all([
        readArray('/test/data/media.js'),
        readArray('/test/data/playlists.js')
    ]);
    return { media, playlists };
}
