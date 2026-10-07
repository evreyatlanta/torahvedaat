import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const videoId = record => record.contentDetails?.videoId || record.snippet?.resourceId?.videoId;

export function matchesRule(rule, id, snippet = {}) {
  const selectors = ['name', 'description'].filter(field => Object.hasOwn(rule, field));
  if (!selectors.length) return rule.id === id;
  return selectors.every(field => {
    const value = field === 'name' ? snippet.title : snippet.description;
    return String(value || '').toLocaleLowerCase().includes(rule[field].toLocaleLowerCase());
  });
}

export function validateRules(rules) {
  if (!Array.isArray(rules?.mainTags) || !rules.mainTags.includes('other') ||
      rules.mainTags.some(tag => typeof tag !== 'string' || !tag)) {
    throw new Error('rules.json requires mainTags including other');
  }
  for (const name of ['records', 'items', 'playlists']) {
    const list = rules.tags?.[name] ?? [];
    if (!Array.isArray(list) || list.some(rule => {
      const selectors = ['name', 'description'].filter(field => Object.hasOwn(rule, field));
      return (selectors.length ? selectors.some(field => typeof rule[field] !== 'string' || !rule[field].trim())
        : typeof rule.id !== 'string' || !rule.id) || !Array.isArray(rule.tags) ||
        rule.tags.some(tag => typeof tag !== 'string' || !tag);
    })) {
      throw new Error(`Invalid rules.json tags.${name}`);
    }
  }
  if (!Array.isArray(rules.tags.folders ?? []) || (rules.tags.folders ?? []).some(rule =>
    typeof rule.folder !== 'string' || !rule.folder || !Array.isArray(rule.tags) ||
    rule.tags.some(tag => typeof tag !== 'string' || !tag))) {
    throw new Error('Invalid rules.json tags.folders');
  }
}

export function buildChannelMedia(records, playlists, channel, rules) {
  validateRules(rules);
  const mainTags = new Set(rules.mainTags);
  const memberships = new Map();
  for (const list of playlists) {
    for (const record of list.items) {
      const id = videoId(record);
      if (!id) continue;
      if (!memberships.has(id)) memberships.set(id, new Set());
      memberships.get(id).add(list.playlist.id);
    }
  }
  const seen = new Set();
  const result = [];
  for (const record of records) {
    const id = videoId(record);
    if (!id) throw new Error('YouTube upload record has no video ID');
    if (seen.has(id)) continue;
    seen.add(id);
    const tags = new Set();
    for (const rule of [...(rules.tags.records ?? []), ...(rules.tags.items ?? [])]) {
      if (matchesRule(rule, id, record.snippet)) for (const tag of rule.tags) tags.add(tag);
    }
    for (const rule of rules.tags.folders ?? []) {
      if (rule.folder !== channel.folder) continue;
      for (const tag of rule.tags) {
        if (mainTags.has(tag) && [...tags].some(value => mainTags.has(value))) continue;
        tags.add(tag);
      }
    }
    for (const rule of rules.tags.playlists ?? []) {
      if (!playlists.some(list => memberships.get(id)?.has(list.playlist.id) &&
        matchesRule(rule, list.playlist.id, list.playlist.snippet))) continue;
      for (const tag of rule.tags) {
        if (mainTags.has(tag) && [...tags].some(value => mainTags.has(value))) continue;
        tags.add(tag);
      }
    }
    if (![...tags].some(tag => mainTags.has(tag))) tags.add('other');
    tags.add(channel.folder);
    const media = {
      id,
      type: 'video',
      source: 'youtube',
      title: record.snippet?.title || null,
      url: `https://www.youtube.com/watch?v=${id}`,
      description: record.snippet?.description ? [record.snippet.description] : [],
      tags: [...tags]
    };
    const publishedAt = record.contentDetails?.videoPublishedAt;
    if (publishedAt) media.date = publishedAt.slice(0, 10);
    result.push(media);
  }
  return result;
}

export async function buildYoutubeMedia(root) {
  const read = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
  const channels = await read('channels.json');
  const rules = await read('rules.json');
  validateRules(rules);
  const outputs = [];
  for (const channel of channels) {
    if (!/^[a-zA-Z0-9_-]+$/.test(channel.folder || '')) throw new Error('Invalid channel folder');
    const records = await read(`${channel.folder}/records.json`);
    const playlists = await read(`${channel.folder}/playlists.json`);
    outputs.push({ folder: channel.folder, media: buildChannelMedia(records, playlists, channel, rules) });
  }
  for (const { folder, media } of outputs) {
    await writeFile(path.join(root, folder, 'media.json'), JSON.stringify(media, null, 2) + '\n');
    console.log(`${folder}: generated ${media.length} media records`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await buildYoutubeMedia(path.resolve(process.argv[2] || 'test/youtube')); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
