# Local YouTube playback history

`VideoHistory` in `video-history.js` owns persistence, seven-day expiry, removal,
and clearing. It stores only local playback metadata, not media files. Entries
expire seven days after their latest playback update. Expired entries are pruned
when history is accessed. Production and test use separate localStorage keys.
Storage errors fall back to memory and do not prevent video playback.

`youtube-history-player.js` loads the YouTube IFrame API on demand and connects
the existing visible iframe to history. It records every five seconds while
playing, on pause/end, page hide, and visibility changes. Removing a player
disposes its timers/listeners. Starting another video pauses the previous one.
No history entry is created by simply opening a card or loading an iframe.

The existing `youtube-player.js` only reads resume metadata, supplies the start
position, and connects the tracking module. Both environments share this code.

`history-page.js` renders `/media/history/` and `/test/media/history/`, using the
same player, with local deletion and clear controls. It does not fetch the full
media library or recreate a playing iframe for progress updates.

Run `node --test scripts/video-history.test.mjs` to test storage and expiry.
