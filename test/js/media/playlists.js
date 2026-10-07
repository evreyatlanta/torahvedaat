import { element } from '../schedule/elements.js';

export function playlistsForTag(nodes, tag) {
    return nodes.flatMap(node => {
        const children = playlistsForTag(node.children ?? [], tag);
        return (node.tags ?? []).includes(tag) || children.length ? [{ ...node, children }] : [];
    });
}

export function findPlaylist(nodes, id) {
    for (const node of nodes) {
        if (node.id === id) return node;
        const child = findPlaylist(node.children ?? [], id);
        if (child) return child;
    }
    return null;
}

export function playlistItems(node, items) {
    const ids = new Set();
    function collect(current) {
        ids.add(current.id);
        (current.children ?? []).forEach(collect);
    }
    collect(node);
    const matching = items.filter(item => (item.playlists ?? []).some(id => ids.has(id)));
    return [...new Map(matching.map(item => [item.id ?? item.url, item])).values()];
}

export function renderPlaylistTree(target, nodes, categoryId, counts, onSelect) {
    const totals = new Map(counts.map(({ id, count }) => [id, count]));
    target.replaceChildren();
    target.closest('section').hidden = nodes.length === 0;
    if (!nodes.length) return;
    function list(branch) {
        const ul = element('ul', null, 'media-playlist-tree');
        for (const node of branch) {
            const li = element('li');
            const link = element('a', `${node.title} (${totals.get(node.id) ?? 0})`, 'media-playlist-link');
            link.href = `/test/media/?id=${encodeURIComponent(categoryId)}&playlist=${encodeURIComponent(node.id)}`;
            link.dataset.playlistId = node.id;
            link.addEventListener('click', event => {
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                event.stopPropagation();
                onSelect(node, link.href);
            });
            if (node.children.length) {
                const details = element('details', null, 'media-playlist-branch');
                const summary = element('summary');
                summary.append(link);
                details.append(summary, list(node.children));
                li.append(details);
            } else {
                li.append(link);
            }
            ul.append(li);
        }
        return ul;
    }
    target.append(list(nodes));
}
