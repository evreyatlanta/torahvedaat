# Raw YouTube data

`channels.json` defines monitored channels and their output folders.
The **Sync production YouTube channels** workflow runs when that file changes, every two
hours (at minute 17, UTC), or manually. GitHub may delay scheduled runs.
The API key is read from the repository secret `YOUTUBE_API_KEY`.

Test data is independent in `test/youtube/`, with its own `channels.json`.
**Sync test YouTube channels** runs only when that test file changes or manually,
without a schedule. Both workflows use the same script with an explicit root
directory and serialize their runs to avoid concurrent generated commits.

Each channel folder contains:

- `records.json`: raw upload playlist item objects, newest first. New entries
  are prepended until the first previously saved object's `id` is found.
  The first run reads all upload pages. Existing records are retained.
- `playlists.json`: an array of `{ "playlist": <raw playlist object>,
  "items": [<raw playlist item objects>] }`. Public playlists and all their
  contents are refreshed completely, preserving API order.
- `pages/uploads.json`: complete raw responses for the upload pages fetched
  during the latest run (which may stop after just one page).
- `pages/playlists.json`: complete raw responses listing the channel playlists.
- `pages/playlist-items.json`: `{ "id", "pages" }` entries holding the complete
  raw responses for each playlist's contents.

Responses request `snippet,contentDetails,status`, with 50 items per page.
No source fields are renamed, transformed, or removed. The API key and request
URLs are never written to these files. Data is committed only after a successful
workflow run. These files do not yet feed the website's media library.

## Test tagging rules

After downloading test data, the test workflow runs
`node scripts/build-youtube-media.mjs test/youtube` and creates a separate
`media.json` array in each channel folder. Raw downloads stay unchanged.
`test/youtube/rules.json` defines `mainTags` and `tags.records` / `tags.playlists`
arrays of `{ "id": "...", "tags": ["..."] }` rules. Record rule IDs are YouTube
video IDs, not the API's playlist item IDs. All matching record rules are applied
first, then `tags.folders` rules of `{ "folder": "rbari", "tags": ["torah"] }`,
followed by matching playlist rules in their order in the rules file.
Folder rules apply to all media in that channel folder. Main tags from explicit
record rules have priority over folder rules, which have priority over playlists.
Record rules may also be placed in `tags.items` (`tags.records` remains supported).
Record and playlist tag rules accept optional `name` and `description` strings.
When either is present, text matching replaces ID matching. `name` must be a
substring of the source title, and `description` a substring of its description,
ignoring case. When both are specified, both must match. Empty selectors are
rejected. Playlist text rules apply only to videos belonging to matching playlists.
Once a main tag exists, playlist rules cannot add another main tag.
Non-main tags are combined without duplicates. Missing main tags default to
`other`, and the channel's `folder` is always added as a tag.
The generated media uses the actual `videoPublishedAt` date when available.
Changing test rules also triggers the test workflow. Production has no tagging
step yet. The test workflow assembles the channel media arrays into
`test/data/media.js` and updates tag and media group counts. No old source
playlist builder runs for test.

`rules.json` also defines `groups.records` and `groups.playlists`, each an array
of `{ "id": "source ID", "playlistIds": ["existing tree node ID"] }`.
Record IDs are video IDs; playlist IDs identify downloaded YouTube playlists
(or existing tree nodes). Matching records are appended to the destination
node's `items`, without duplicates. Matching playlists contribute their items
in source order, recursively including children and playlist references.
Existing tree nodes, labels, tags, children, and manual item IDs are retained.
Unknown destination nodes fail the build instead of creating new nodes.
Playlist counts are updated using unique media IDs, including descendants.
`groups.folders` contains `{ "folder": "rbari", "playlistIds": ["rbari"] }`
rules. Every record loaded from that actual channel folder is added to the
listed existing tree nodes, regardless of its tags.
`groups.records` (or `groups.items`) and `groups.playlists` also accept `name`
and `description` with the same case-insensitive substring matching as tag rules.
Text selectors replace ID matching; both must match when both are present.
All matching records or all contents of matching playlists are added to targets.
After assigning membership, each node's items are sorted by the upload media
order (newest first), independently of rule order and source playlist order.
IDs missing from the upload library remain at the end in their existing order.
Record/items and playlist rules in both `tags` and `groups` accept optional
`folder`. When supplied, the rule only matches media/playlists loaded from that
actual channel folder. This restriction applies to both ID and text selectors.
When omitted, the rule applies across channels. Folder matching is exact.
