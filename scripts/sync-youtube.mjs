import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function writeJson(file, value) {
  await writeFile(file, JSON.stringify(value, null, 2) + '\n');
}

export function youtubeApi(key) {
  if (!key) throw new Error('YOUTUBE_API_KEY is missing');
  return async (resource, parameters) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    url.search = new URLSearchParams({ ...parameters, maxResults: '50', key });
    for (let attempt = 0; attempt < 3; attempt++) {
      let response;
      try { response = await fetch(url, { signal: AbortSignal.timeout(60000) }); }
      catch { if (attempt < 2) continue; throw new Error(`YouTube ${resource}: network failure`); }
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      const data = await response.json();
      if (!response.ok) {
        const reason = data.error?.errors?.[0]?.reason || 'requestFailed';
        throw new Error(`YouTube ${resource}: HTTP ${response.status}, ${reason}`);
      }
      if (!Array.isArray(data.items)) throw new Error(`YouTube ${resource}: missing items`);
      return data;
    }
  };
}

async function allPages(api, resource, parameters) {
  const pages = [];
  let token;
  do {
    const page = await api(resource, { ...parameters, ...(token ? { pageToken: token } : {}) });
    pages.push(page);
    token = page.nextPageToken;
  } while (token);
  return { pages, items: pages.flatMap(page => page.items) };
}

export async function collectUploads(api, uploadsId, existing) {
  if (!Array.isArray(existing)) throw new Error('records.json must contain an array');
  const latestId = existing[0]?.id;
  const known = new Set(existing.map(item => item.id));
  const fresh = [];
  const pages = [];
  let token;
  let reachedLatest = false;
  do {
    const page = await api('playlistItems', {
      part: 'snippet,contentDetails,status', playlistId: uploadsId,
      ...(token ? { pageToken: token } : {})
    });
    pages.push(page);
    for (const item of page.items) {
      if (item.id === latestId) { reachedLatest = true; break; }
      if (!known.has(item.id)) { fresh.push(item); known.add(item.id); }
    }
    token = page.nextPageToken;
  } while (token && !reachedLatest);
  return { records: [...fresh, ...existing], pages, added: fresh.length };
}

export async function syncChannels(root, api) {
  const channels = await readJson(path.join(root, 'channels.json'));
  if (!Array.isArray(channels)) throw new Error('channels.json must contain an array');
  const folders = new Set();
  for (const channel of channels) {
    if (!/^[a-zA-Z0-9_-]+$/.test(channel.folder || '') || folders.has(channel.folder)) {
      throw new Error('Each channel needs a unique, simple folder name');
    }
    folders.add(channel.folder);
    if (!channel.channelId || !channel.uploadsId) throw new Error('Missing channelId or uploadsId');
  }
  for (const channel of channels) {
    const directory = path.join(root, channel.folder);
    const pagesDirectory = path.join(directory, 'pages');
    await mkdir(pagesDirectory, { recursive: true });
    const existing = await readJson(path.join(directory, 'records.json'), []);
    const uploads = await collectUploads(api, channel.uploadsId, existing);
    const lists = await allPages(api, 'playlists', {
      part: 'snippet,contentDetails,status', channelId: channel.channelId
    });
    const playlists = [];
    const contentPages = [];
    for (const playlist of lists.items) {
      const content = await allPages(api, 'playlistItems', {
        part: 'snippet,contentDetails,status', playlistId: playlist.id
      });
      playlists.push({ playlist, items: content.items });
      contentPages.push({ id: playlist.id, pages: content.pages });
    }
    // Save only after every request for this channel succeeds.
    await writeJson(path.join(directory, 'records.json'), uploads.records);
    await writeJson(path.join(directory, 'playlists.json'), playlists);
    await writeJson(path.join(pagesDirectory, 'uploads.json'), uploads.pages);
    await writeJson(path.join(pagesDirectory, 'playlists.json'), lists.pages);
    await writeJson(path.join(pagesDirectory, 'playlist-items.json'), contentPages);
    console.log(`${channel.folder}: ${uploads.added} new uploads, ${uploads.records.length} total, ${playlists.length} playlists`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await syncChannels(path.resolve(process.argv[2] || 'youtube'), youtubeApi(process.env.YOUTUBE_API_KEY)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
