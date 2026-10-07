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
