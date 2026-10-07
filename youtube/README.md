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
first, followed by matching playlist rules in their order in the rules file.
Once a main tag exists, playlist rules cannot add another main tag.
Non-main tags are combined without duplicates. Missing main tags default to
`other`, and the channel's `folder` is always added as a tag.
The generated media uses the actual `videoPublishedAt` date when available.
Changing test rules also triggers the test workflow. Production has no tagging
step yet. The test workflow assembles the channel media arrays into
`test/data/media.js` and updates tag and media group counts. Existing
`test/data/playlists.js` and playlist counts are preserved until the new playlist
generation is specified; no old source playlist builder runs for test.
