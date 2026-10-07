import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function assembleLibrary(channelMedia, playlistCounts = []) {
  const unique = new Map();
  for (const records of channelMedia) {
    for (const record of records) {
      const previous = unique.get(record.id);
      unique.set(record.id, previous
        ? { ...previous, tags: [...new Set([...previous.tags, ...record.tags])] }
        : record);
    }
  }
  const items = [...unique.values()];
  const counts = new Map();
  for (const item of items) for (const tag of new Set(item.tags)) {
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return {
    items,
    // Playlist generation is intentionally postponed. Preserve existing counts.
    playlists: playlistCounts,
    tags: [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([tag, count]) => ({ tag, count }))
  };
}

export async function assembleYoutubeLibrary(root, dataDirectory) {
  const read = async file => JSON.parse(await readFile(file, 'utf8'));
  const channels = await read(path.join(root, 'channels.json'));
  const records = [];
  for (const channel of channels) {
    if (!/^[a-zA-Z0-9_-]+$/.test(channel.folder || '')) throw new Error('Invalid channel folder');
    records.push(await read(path.join(root, channel.folder, 'media.json')));
  }
  const output = path.join(dataDirectory, 'media.js');
  const previous = await read(output);
  const library = assembleLibrary(records, previous.playlists);
  const groupsFile = path.join(dataDirectory, 'media-groups.js');
  const totals = new Map(library.tags.map(({ tag, count }) => [tag, count]));
  const groups = (await read(groupsFile)).map(group => ({ ...group, count: totals.get(group.id) || 0 }));
  await writeFile(output, JSON.stringify(library, null, 2) + '\n');
  await writeFile(groupsFile, JSON.stringify(groups, null, 2) + '\n');
  console.log(`Assembled ${library.items.length} unique media records in ${output}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    await assembleYoutubeLibrary(path.resolve(process.argv[2] || 'test/youtube'),
      path.resolve(process.argv[3] || 'test/data'));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
