import { readArray } from '../data.js';
import { loadProfiles, resolveLessonAuthors } from '../profiles.js';

export async function loadSchedule(today) {
    const [classes, notes, profiles] = await Promise.all([
        readArray('/data/classes.js'), readArray('/data/class-notes.js'), loadProfiles()
    ]);
    const activeNotes = notes
        .map(note => ({ ...note, type: note.type ?? 'note' }))
        .filter(note => note.expiration === null || note.expiration >= today);
    return {
        profiles,
        classes: resolveLessonAuthors(classes, profiles),
        notesFor: id => activeNotes.filter(note => note.classId === id)
    };
}
