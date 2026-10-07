import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function findLists(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await findLists(filename));
        else if (entry.isFile() && entry.name === 'media.json') files.push(filename);
    }
    return files;
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
    return { items, playlists: counts(items, 'playlists', 'id'), tags: counts(items, 'tags', 'tag') };
}

export function updateGroupCounts(groups, tags) {
    if (!Array.isArray(groups) || groups.some(group => !group || typeof group.id !== 'string')) {
        throw new Error('media-groups.js must contain an array of groups with string ids');
    }
    const totals = new Map(tags.map(({ tag, count }) => [tag, count]));
    return groups.map(group => ({ ...group, count: totals.get(group.id) ?? 0 }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    try {
        const result = await buildMedia(process.argv[2] ?? 'test/media');
        const groupsPath = process.argv[4] ?? 'test/data/media-groups.js';
        const groups = JSON.parse((await readFile(groupsPath, 'utf8')).replace(/^\uFEFF/, ''));
        const updatedGroups = updateGroupCounts(groups, result.tags);
        await writeFile(process.argv[3] ?? 'test/data/media.js', `${JSON.stringify(result, null, 2)}\n`);
        await writeFile(groupsPath, `${JSON.stringify(updatedGroups, null, 2)}\n`);
        console.log(`Generated media.js and media-groups.js: ${result.items.length} items`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
