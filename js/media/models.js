/**
 * @typedef {Object} MediaItem
 * @property {'video'|'audio'|'image'} type
 * @property {string|null} [title]
 * @property {'youtube'|'s3'|'facebook'} source
 * @property {string} url
 * @property {string|null} [width] CSS size, e.g. '100%', '640px', '40rem'.
 * @property {string|null} [height] CSS size, e.g. '360px', 'auto'.
 * @property {string[]} description Paragraphs of plain text.
 * @property {string} id Unique media record ID.
 * @property {string|null} [date] YYYY-MM-DD.
 * @property {string[]} tags
 */

/**
 * @typedef {Object} Playlist
 * @property {string} id Unique throughout the entire tree.
 * @property {string} title
 * @property {Playlist[]} children Empty array for a leaf node.
 * @property {string[]} items IDs of media records in this playlist.
 * @property {string[]} tags
 */

export {};

