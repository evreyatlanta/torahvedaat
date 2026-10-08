export class VideoPlaylistIndex {
    constructor(items, tree) {
        this.media = new Map(items.map(item => [item.id, item]));
        this.memberships = new Map();
        this.playlists = new Map();
        const visit = (node, parents) => {
            const titlePath = [...parents, node.title];
            const childIds = (node.children || []).flatMap(child => visit(child, titlePath));
            const inherited = new Set(childIds);
            const ids = [...new Set([...(node.items || []), ...childIds])]
                .filter(id => this.media.has(id));
            this.playlists.set(node.id, { id: node.id, title: node.title,
                path: titlePath.join(' → '), count: ids.length, items: ids });
            ids.forEach((videoId, index) => {
                if (inherited.has(videoId)) return;
                if (!this.memberships.has(videoId)) this.memberships.set(videoId, []);
                this.memberships.get(videoId).push({
                    id: node.id, title: node.title, path: titlePath.join(' → '),
                    count: ids.length, position: index + 1,
                    previous: index + 1 < ids.length ? this.media.get(ids[index + 1]) : null,
                    next: index > 0 ? this.media.get(ids[index - 1]) : null
                });
            });
            return ids;
        };
        tree.forEach(node => visit(node, []));
    }
    forVideo(videoId) { return this.memberships.get(videoId) || []; }

    search(query, limit = 20) {
        const normalize = value => String(value || '').toLocaleLowerCase('ru-RU').replaceAll('ё', 'е');
        const words = normalize(query).trim().split(/\s+/).filter(Boolean);
        if (!words.length) return { videos: [], playlists: [], videoCount: 0, playlistCount: 0 };
        const matches = title => words.every(word => normalize(title).includes(word));
        const videos = [...this.media.values()].filter(item => item.source === 'youtube' &&
            item.type === 'video' && matches(item.title));
        const playlists = [...this.playlists.values()].filter(item => matches(item.title));
        return { videos: videos.slice(0, limit), playlists: playlists.slice(0, limit),
            videoCount: videos.length, playlistCount: playlists.length };
    }
}
