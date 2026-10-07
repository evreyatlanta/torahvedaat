import { readArray } from '../data.js';

export function loadNews() {
    return readArray('/test/data/news.js');
}
