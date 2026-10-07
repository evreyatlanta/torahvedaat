import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function findLists(directory, sourceName = 'media.json') {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await findLists(filename, sourceName));
        else if (entry.isFile() && entry.name === sourceName) files.push(filename);
    }
    return files;
}

export async function buildPlaylists(directory) {
    const tree = [];
    const ids = new Map();
    const definitions = new Set();
    for (const filename of await findLists(directory, 'playlist.json')) {
        let source;
        try { source = JSON.parse((await readFile(filename, 'utf8')).replace(/^\uFEFF/, '')); }
        catch (error) { throw new Error(`${filename}: ${error.message}`); }
        if (!source || typeof source.root !== 'string' || !Array.isArray(source.items)) {
            throw new Error(`${filename}: expected root string and items array`);
        }
        const fragments = source.root === '' ? [] : source.root.split('/');
        if (fragments.some(id => !id.trim())) throw new Error(`${filename}: empty root path fragment`);
        let children = tree;
        for (const id of fragments) {
            let node = children.find(node => node.id === id);
            if (!node) {
                if (ids.has(id)) throw new Error(`${filename}: playlist id ${id} already belongs to another parent`);
                node = { id, title: id, tags: [], items: [], children: [] };
                children.push(node);
                ids.set(id, node);
            }
            children = node.children;
        }
        for (const item of source.items) {
            if (!item || typeof item.id !== 'string' || !item.id || typeof item.title !== 'string'
                || (item.children && (!Array.isArray(item.children) || item.children.length))) {
                throw new Error(`${filename}: items must be flat playlist descriptions with id and title`);
            }
            if (definitions.has(item.id)) throw new Error(`${filename}: duplicate playlist definition ${item.id}`);
            let node = children.find(node => node.id === item.id);
            if (!node && ids.has(item.id)) throw new Error(`${filename}: playlist id ${item.id} already belongs to another parent`);
            if (!node) {
                node = { id: item.id, children: [] };
                children.push(node);
                ids.set(item.id, node);
            }
            const existingChildren = node.children;
            if (item.items && (!Array.isArray(item.items) || item.items.some(id => typeof id !== 'string' || !id))) {
                throw new Error(`${filename}: playlist ${item.id} items must contain media ids`);
            }
            Object.assign(node, { tags: [], items: [], ...item, children: existingChildren });
            definitions.add(item.id);
        }
    }
    return tree;
}

function counts(items, field, key) {
    const result = new Map();
    for (const item of items) {
        const values = item[field] ?? [];
        if (!Array.isArray(values) || values.some(value => typeof value !== 'string' || !value)) {
            throw new Error(`${field} must be an array of nonempty strings (item ${item.id ?? item.url})`);
        }
        for (const value of new Set(values)) result.set(value, (result.get(value) ?? 0) + 1);
    }
    return [...result].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([value, count]) => ({ [key]: value, count }));
}

export async function buildMedia(directory) {
    const items = [];
    for (const filename of await findLists(directory)) {
        let list;
        try { list = JSON.parse((await readFile(filename, 'utf8')).replace(/^\uFEFF/, '')); }
        catch (error) { throw new Error(`${filename}: ${error.message}`); }
        if (!list || Array.isArray(list) || typeof list !== 'object' || !Array.isArray(list.items)) {
            throw new Error(`${filename}: expected an object with an items array`);
        }
        const { items: records, ...common } = list;
        for (const [index, record] of records.entries()) {
            if (!record || Array.isArray(record) || typeof record !== 'object') {
                throw new Error(`${filename}: item ${index + 1} must be an object`);
            }
            const item = { ...common, ...record };
            if (!Object.hasOwn(record, 'url') && Object.hasOwn(common, 'url')) {
                if (typeof common.url !== 'string' || !common.url || typeof record.id !== 'string' || !record.id) {
                    throw new Error(`${filename}: item ${index + 1} needs a string id and a nonempty common url`);
                }
                item.url = `${common.url.replace(/\/+$/, '')}/${record.id.replace(/^\/+/, '')}`;
            }
            items.push(item);
        }
    }
    return { items, playlists: [], tags: counts(items, 'tags', 'tag') };
}

export function updateGroupCounts(groups, tags) {
    if (!Array.isArray(groups) || groups.some(group => !group || typeof group.id !== 'string')) {
        throw new Error('media-groups.js must contain an array of groups with string ids');
    }
    const totals = new Map(tags.map(({ tag, count }) => [tag, count]));
    return groups.map(group => ({ ...group, count: totals.get(group.id) ?? 0 }));
}

export function addParentPlaylistCounts(library, nodes) {
    const totals = new Map();
    const available = new Set(library.items.map(item => item.id));
    function visit(node) {
        const children = node.children ?? [];
        const ids = new Set(node.items ?? []);
        for (const id of ids) if (!available.has(id)) throw new Error(`Playlist ${node.id} references missing media id ${id}`);
        for (const child of children) for (const id of visit(child)) ids.add(id);
        totals.set(node.id, ids.size);
        return ids;
    }
    nodes.forEach(visit);
    library.playlists = [...totals].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([id, count]) => ({ id, count }));
    return library;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    try {
        const directory = process.argv[2] ?? 'media';
        const result = await buildMedia(directory);
        const groupsPath = process.argv[4] ?? 'data/media-groups.js';
        const playlistsPath = path.join(path.dirname(groupsPath), 'playlists.js');
        const playlists = await buildPlaylists(directory);
        addParentPlaylistCounts(result, playlists);
        const groups = JSON.parse((await readFile(groupsPath, 'utf8')).replace(/^\uFEFF/, ''));
        const updatedGroups = updateGroupCounts(groups, result.tags);
        await writeFile(process.argv[3] ?? 'data/media.js', `${JSON.stringify(result, null, 2)}\n`);
        await writeFile(groupsPath, `${JSON.stringify(updatedGroups, null, 2)}\n`);
        await writeFile(playlistsPath, `${JSON.stringify(playlists, null, 2)}\n`);
        console.log(`Generated media.js, playlists.js and media-groups.js: ${result.items.length} items`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
