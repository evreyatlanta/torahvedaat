import { readArray } from './data.js';

export function loadProfiles() {
    return readArray('/data/profiles.js');
}

export function resolveLessonAuthors(classes, profiles) {
    const byId = new Map(profiles.map(profile => [profile.id, profile]));
    return classes.map(lesson => {
        const profile = lesson.authorId ? byId.get(lesson.authorId) : null;
        if (!profile) return lesson;
        return {
            ...lesson,
            author: profile.name,
            short_author: profile.shortName || profile.name
        };
    });
}
