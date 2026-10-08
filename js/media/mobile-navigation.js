export class MobileMediaNavigation {
    constructor() {
        this.mobile = matchMedia('(max-width: 760px)');
        this.sidebar = document.querySelector('.media-sidebar');
        this.main = document.getElementById('main-content');
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'media-mobile-selection';
        this.trigger = document.createElement('button');
        this.trigger.type = 'button';
        this.trigger.className = 'media-mobile-menu-button';
        this.trigger.textContent = 'Рубрики и плейлисты ▾';
        this.trigger.setAttribute('aria-haspopup', 'dialog');
        this.selected = document.createElement('span');
        this.selected.className = 'media-mobile-current';
        this.placeholder.append(this.trigger, this.selected);
        this.sidebar.before(this.placeholder);
        this.dialog = document.createElement('dialog');
        this.dialog.className = 'media-mobile-menu';
        this.dialog.setAttribute('aria-labelledby', 'media-mobile-menu-title');
        const header = document.createElement('div');
        header.className = 'media-mobile-menu-heading';
        const title = document.createElement('h2');
        title.id = 'media-mobile-menu-title';
        title.textContent = 'Рубрики и плейлисты';
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Закрыть';
        close.addEventListener('click', () => this.dialog.close());
        header.append(title, close);
        this.dialog.append(header);
        document.body.append(this.dialog);
        this.trigger.addEventListener('click', () => this.dialog.showModal());
        this.dialog.addEventListener('close', () => {
            (this.returnToResults ? this.main : this.trigger).focus({ preventScroll: true });
            this.returnToResults = false;
        });
        this.dialog.addEventListener('click', event => {
            if (event.target === this.dialog) {
                const bounds = this.dialog.getBoundingClientRect();
                if (event.clientX < bounds.left || event.clientX > bounds.right ||
                    event.clientY < bounds.top || event.clientY > bounds.bottom) this.dialog.close();
            }
        });
        this.sidebar.addEventListener('click', event => {
            const link = event.target.closest('#media-category-nav a');
            if (!this.mobile.matches || !link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            try { sessionStorage.setItem('media-show-results', '1'); } catch {}
        });
        this.updateLayout();
        this.mobile.addEventListener('change', () => this.updateLayout());
    }
    updateLayout() {
        if (this.dialog.open) this.dialog.close();
        this.placeholder.hidden = !this.mobile.matches;
        if (this.mobile.matches) this.dialog.append(this.sidebar);
        else this.placeholder.after(this.sidebar);
        document.getElementById('media-rubrics-disclosure').open = true;
    }
    setSelection(title) {
        this.selected.textContent = title;
        let requested = false;
        try {
            requested = sessionStorage.getItem('media-show-results') === '1';
            sessionStorage.removeItem('media-show-results');
        } catch {}
        if (requested && this.mobile.matches) this.showResults();
    }
    showResults() {
        if (this.dialog.open) {
            this.returnToResults = true;
            this.dialog.close();
        }
        this.main.scrollIntoView({ block: 'start', behavior: 'instant' });
        this.main.focus({ preventScroll: true });
    }
}
