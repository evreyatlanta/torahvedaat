import { readArray } from '../data.js';
import { renderCategoryNavigation } from './navigation.js';

const target = document.getElementById('media-categories');
try {
    const categories = await readArray('/data/media-groups.js');
    renderCategoryNavigation(target, categories);
} catch {
    target.closest('section').hidden = true;
}

