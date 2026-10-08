const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

const Icons = (() => {
    const paths = {
        job: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
        cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
        bank: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8"/><path d="M3 20h18"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
        cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
        phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
        flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
        card: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
        crew: '<circle cx="9" cy="8" r="3"/><path d="M3 20c.6-3.4 3-5 6-5s5.4 1.6 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.5.2 4.3 1.8 4.8 4.6"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
        trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
        food: '<path d="M4 11a8 6 0 0 1 16 0z"/><path d="M4 14h16"/><path d="M5 17h14a1 1 0 0 1-1 3H6a1 1 0 0 1-1-3z"/>',
        id: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h4M14 13h3"/>',
        car: '<path d="M5 14l2-5h10l2 5"/><rect x="3" y="14" width="18" height="5" rx="2"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/>',
        box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'
    };

    const svg = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.box}</svg>`;

    const ITEM_ICONS = [
        [/phone/, 'phone'],
        [/water|drink|cola|soda|coffee|juice|bottle|beer|milk/, 'water'],
        [/burger|sandwich|food|bread|taco|donut|hotdog|pizza|meal|snack/, 'food'],
        [/licen[cs]e/, 'car'],
        [/id_?card|identity|passport/, 'id'],
        [/money|cash|dollar/, 'cash']
    ];

    function forItem(name) {
        const key = String(name || '').toLowerCase();
        const match = ITEM_ICONS.find(([pattern]) => pattern.test(key));
        return svg(match ? match[1] : 'box');
    }

    const silhouette = '<svg class="silhouette" viewBox="0 0 60 75" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><circle cx="30" cy="27" r="13" fill="currentColor"/><path d="M4 75c1-16 12-25 26-25s25 9 26 25z" fill="currentColor"/></svg>';

    return { svg, forItem, silhouette };
})();
