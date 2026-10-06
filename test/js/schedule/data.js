async function readArray(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Schedule data unavailable');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid schedule data');
    return data;
}

export async function loadSchedule(today) {
    const [classes, notes] = await Promise.all([
        readArray('/test/data/classes.js'), readArray('/test/data/class-notes.js')
    ]);
    const activeNotes = notes
        .map(note => ({ ...note, type: note.type ?? 'note' }))
        .filter(note => note.expiration === null || note.expiration >= today);
    return { classes, notesFor: id => activeNotes.filter(note => note.classId === id) };
}
