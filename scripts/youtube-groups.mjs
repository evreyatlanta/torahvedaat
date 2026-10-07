import { matchesRule } from './build-youtube-media.mjs';

// Bind source video/playlist IDs to existing nodes; never create tree nodes.
export function applyGroupRules(tree, sourcePlaylists, rules, mediaItems, folderMedia = new Map()) {
  for (const name of ['records', 'items', 'playlists']) {
    const list = rules.groups?.[name] ?? [];
    if (!Array.isArray(list) || list.some(rule => {
      const selectors = ['name', 'description'].filter(field => Object.hasOwn(rule, field));
      return (selectors.length ? selectors.some(field => typeof rule[field] !== 'string' || !rule[field].trim())
        : typeof rule.id !== 'string' || !rule.id) || !Array.isArray(rule.playlistIds) ||
        rule.playlistIds.some(id => typeof id !== 'string' || !id) ||
        (Object.hasOwn(rule, 'folder') && (typeof rule.folder !== 'string' || !rule.folder));
    })) {
      throw new Error(`Invalid rules.json groups.${name}`);
    }
  }
  if (!Array.isArray(rules.groups.folders ?? []) || (rules.groups.folders ?? []).some(rule =>
    typeof rule.folder !== 'string' || !rule.folder || !Array.isArray(rule.playlistIds) ||
    rule.playlistIds.some(id => typeof id !== 'string' || !id))) {
    throw new Error('Invalid rules.json groups.folders');
  }
  const result = structuredClone(tree);
  const targets = new Map();
  const sources = new Map();
  function index(nodes, map) {
    for (const node of nodes) {
      map.set(node.id, node);
      index(node.children || [], map);
    }
  }
  index(tree, sources);
  index(result, targets);
  function indexSources(lists, inheritedFolder) {
    for (const list of lists) {
      const folder = list.folder ?? inheritedFolder;
      sources.set(list.playlist?.id || list.id, { ...list, folder });
      indexSources(list.children || [], folder);
    }
  }
  indexSources(sourcePlaylists);
  function collect(list, visiting = new Set()) {
    const id = list.playlist?.id || list.id;
    if (visiting.has(id)) throw new Error(`Recursive playlist cycle: ${id}`);
    const next = new Set(visiting).add(id);
    const ids = [];
    for (const item of list.items || []) {
      if (typeof item === 'string') { ids.push(item); continue; }
      const video = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (video) ids.push(video);
      const nested = item.snippet?.resourceId?.playlistId;
      if (nested && sources.has(nested)) ids.push(...collect(sources.get(nested), next));
    }
    for (const child of list.children || []) ids.push(...collect(child, next));
    return [...new Set(ids)];
  }
  function assign(rule, ids) {
    for (const id of rule.playlistIds) {
      const node = targets.get(id);
      if (!node) throw new Error(`Unknown target playlist: ${id}`);
      node.items = [...new Set([...(node.items || []), ...ids])];
    }
  }
  const available = new Set(mediaItems.map(item => item.id));
  for (const rule of [...(rules.groups.records ?? []), ...(rules.groups.items ?? [])]) {
    const candidates = rule.folder === undefined ? mediaItems : (folderMedia.get(rule.folder) || []);
    const matching = candidates.filter(item => matchesRule(rule, item.id, {
      title: item.title, description: (item.description || []).join('\n')
    }));
    assign(rule, matching.map(item => item.id));
  }
  for (const rule of rules.groups.playlists ?? []) {
    const matching = [...sources].filter(([id, source]) =>
      (rule.folder === undefined || rule.folder === source.folder) && matchesRule(rule, id,
      source.playlist?.snippet || { title: source.title,
        description: Array.isArray(source.description) ? source.description.join('\n') : source.description }));
    assign(rule, matching.flatMap(([, source]) => collect(source)));
  }
  for (const rule of rules.groups.folders ?? []) {
    assign(rule, (folderMedia.get(rule.folder) || []).map(item => item.id));
  }
  // Rules define membership; upload order defines the final display order.
  const uploadOrder = new Map(mediaItems.map((item, index) => [item.id, index]));
  for (const node of targets.values()) {
    node.items = [...new Set(node.items || [])].sort((a, b) =>
      (uploadOrder.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (uploadOrder.get(b) ?? Number.MAX_SAFE_INTEGER));
  }
  const counts = [];
  function count(node) {
    const ids = new Set((node.items || []).filter(id => available.has(id)));
    for (const child of node.children || []) for (const id of count(child)) ids.add(id);
    counts.push({ id: node.id, count: ids.size });
    return ids;
  }
  result.forEach(count);
  return { tree: result, counts };
}
