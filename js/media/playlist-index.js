export class VideoPlaylistIndex {
    constructor(items, tree) {
        this.media = new Map(items.map(item => [item.id, item]));
        this.memberships = new Map();
        const visit = (node, parents) => {
            const titlePath = [...parents, node.title];
            const ids = [...new Set([...(node.items || []),
                ...(node.children || []).flatMap(child => visit(child, titlePath))])]
                .filter(id => this.media.has(id));
            ids.forEach((videoId, index) => {
                if (!this.memberships.has(videoId)) this.memberships.set(videoId, []);
                this.memberships.get(videoId).push({
                    id: node.id, title: node.title, path: titlePath.join(' → '),
                    count: ids.length, position: index + 1,
                    previous: index > 0 ? this.media.get(ids[index - 1]) : null,
                    next: index + 1 < ids.length ? this.media.get(ids[index + 1]) : null
                });
            });
            return ids;
        };
        tree.forEach(node => visit(node, []));
    }
    forVideo(videoId) { return this.memberships.get(videoId) || []; }
}
