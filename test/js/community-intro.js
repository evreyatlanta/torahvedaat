const RETURN_AFTER_DAYS = 30;
const LAST_VISIT_KEY = 'evreyatlanta:test:last-home-visit';
const intro = document.getElementById('community-intro');

if (intro) {
    try {
        const now = Date.now();
        const storedVisit = localStorage.getItem(LAST_VISIT_KEY);
        const lastVisit = Number(storedVisit);
        const returnAfter = RETURN_AFTER_DAYS * 24 * 60 * 60 * 1000;
        const recentVisit = storedVisit !== null && Number.isFinite(lastVisit)
            && lastVisit > 0 && lastVisit <= now && now - lastVisit < returnAfter;
        intro.open = !recentVisit;
        localStorage.setItem(LAST_VISIT_KEY, String(now));
    } catch {
        // Keep the introduction accessible when browser storage is unavailable.
        intro.open = true;
    }
}
