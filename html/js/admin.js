const Admin = (() => {
    const root = () => document.getElementById('admin');
    let players = [];
    let maximum = 1;
    let rows = [];
    let editing = null;
    let tab = 'online';
    let built = false;

    function build() {
        root().innerHTML = `<div class="ad-card">
            <header class="ad-head">
                <div class="ad-brand">${Draw.seal(46, sealRing())}<div><small>${esc(t('adminEyebrow'))}</small><h2>${esc(t('adminTitle'))}</h2></div></div>
                <button type="button" class="ad-close" id="adClose" aria-label="${esc(t('adminClose'))}">×</button>
            </header>
            <nav class="ad-tabs">
                <button type="button" data-tab="online">${esc(t('adminTabOnline'))}</button>
                <button type="button" data-tab="records">${esc(t('adminTabRecords'))}</button>
            </nav>
            <section class="ad-pane" id="adOnline">
                <div class="ad-cols"><span>${esc(t('adminPlayer'))}</span><span>${esc(t('adminCharacters'))}</span><span>${esc(t('adminSlotsLabel'))}</span><span></span></div>
                <div class="ad-rows" id="adPlayers"></div>
            </section>
            <section class="ad-pane hidden" id="adRecords">
                <form class="ad-search" id="adSearch" autocomplete="off">
                    <input id="adQuery" maxlength="64" spellcheck="false" placeholder="${esc(t('adminSearchHint'))}">
                    <button type="submit">${esc(t('adminSearch'))}</button>
                </form>
                <div class="ad-split">
                    <div class="ad-results"><div class="ad-results-title" id="adResultsTitle"></div><div id="adResults"></div></div>
                    <div class="ad-editor" id="adEditor"></div>
                </div>
            </section>
        </div>`;
        document.getElementById('adClose').addEventListener('click', () => nui('adminClose'));
        root().querySelectorAll('.ad-tabs button').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
        document.getElementById('adSearch').addEventListener('submit', (event) => {
            event.preventDefault();
            const query = document.getElementById('adQuery').value.trim();
            if (query.length < 2) return;
            setTitle(t('adminSearching'));
            nui('adminSearch', { query });
        });
        document.getElementById('adPlayers').addEventListener('click', onPlayerClick);
        document.getElementById('adResults').addEventListener('click', (event) => {
            const row = event.target.closest('.ad-record');
            if (row) edit(row.dataset.citizenid);
        });
        built = true;
    }

    function switchTab(name) {
        tab = name === 'records' ? 'records' : 'online';
        root().querySelectorAll('.ad-tabs button').forEach((button) => button.classList.toggle('on', button.dataset.tab === tab));
        document.getElementById('adOnline').classList.toggle('hidden', tab !== 'online');
        document.getElementById('adRecords').classList.toggle('hidden', tab !== 'records');
        if (tab === 'records') setTimeout(() => document.getElementById('adQuery').focus(), 20);
    }

    function setTitle(text) {
        document.getElementById('adResultsTitle').textContent = text || '';
    }

    function renderPlayers() {
        const holder = document.getElementById('adPlayers');
        if (!players.length) {
            holder.innerHTML = `<p class="ad-empty">${esc(t('adminNoPlayers'))}</p>`;
            return;
        }
        holder.innerHTML = players.map((player) => `<div class="ad-row" data-license="${esc(player.license)}">
            <div><strong>${esc(player.name)}</strong><span>${esc(t('adminId'))} ${esc(player.source)}</span></div>
            <span class="ad-count">${esc(player.characters)}</span>
            <input type="number" min="1" max="${esc(maximum)}" value="${esc(player.override || player.slots)}" aria-label="${esc(t('adminSlotsLabel'))}">
            <div class="ad-actions">
                <button type="button" data-act="save">${esc(t('adminSet'))}</button>
                <button type="button" data-act="reset" class="ghost">${esc(t('adminReset'))}</button>
                <button type="button" data-act="records" class="ghost">${esc(t('adminRecords'))}</button>
            </div>
        </div>`).join('');
    }

    function onPlayerClick(event) {
        const button = event.target.closest('button[data-act]');
        if (!button) return;
        const row = button.closest('.ad-row');
        const license = row.dataset.license;
        const player = players.find((entry) => entry.license === license);
        if (button.dataset.act === 'save') {
            nui('adminSetSlots', { license, slots: Number(row.querySelector('input').value), reset: false });
        } else if (button.dataset.act === 'reset') {
            nui('adminSetSlots', { license, reset: true });
        } else if (button.dataset.act === 'records') {
            switchTab('records');
            setTitle(t('adminSearching'));
            document.getElementById('adResults').innerHTML = '';
            nui('adminCharacters', { source: player ? player.source : null, license, name: player ? player.name : '' });
        }
    }

    function recordHtml(row) {
        return `<button type="button" class="ad-record${editing === row.citizenid ? ' on' : ''}" data-citizenid="${esc(row.citizenid)}">
            <span class="ad-rname">${esc(`${row.firstname || ''} ${row.lastname || ''}`.trim() || row.citizenid)}${row.online ? `<em>${esc(t('adminInPlay'))}</em>` : ''}</span>
            <span class="ad-rmeta">${esc(row.citizenid)} · ${esc(t('adminSlot'))} ${esc(row.cid)} · ${esc(row.job || t('unemployed'))}</span>
            <span class="ad-rowner">${esc(row.ownerName || row.license || '')}</span>
        </button>`;
    }

    function renderResults() {
        const holder = document.getElementById('adResults');
        holder.innerHTML = rows.length ? rows.map(recordHtml).join('') : `<p class="ad-empty">${esc(t('adminNoResults'))}</p>`;
    }

    function renderEditor(message, failed) {
        const holder = document.getElementById('adEditor');
        const row = rows.find((entry) => entry.citizenid === editing);
        if (!row) {
            holder.innerHTML = `<p class="ad-hint">${esc(t('adminPickRecord'))}</p>`;
            return;
        }
        const hint = state.config.characters?.dateFormatHint || 'MM/DD/YYYY';
        holder.innerHTML = `<form id="adEdit" autocomplete="off">
            <small>${esc(row.citizenid)} · ${esc(t('adminSlot'))} ${esc(row.cid)}</small>
            <h3>${esc(`${row.firstname || ''} ${row.lastname || ''}`.trim())}</h3>
            <label>${esc(t('firstName'))}<input id="adFirst" maxlength="${esc(state.config.characters?.nameMaxLength || 18)}" value="${esc(row.firstname || '')}" spellcheck="false"></label>
            <label>${esc(t('lastName'))}<input id="adLast" maxlength="${esc(state.config.characters?.nameMaxLength || 18)}" value="${esc(row.lastname || '')}" spellcheck="false"></label>
            <label>${esc(t('dateOfBirth'))}<input id="adBirth" maxlength="16" value="${esc(row.birthdate || '')}" placeholder="${esc(hint)}" spellcheck="false"></label>
            <p class="ad-note">${esc(row.online ? t('adminLiveNote') : t('adminOfflineNote'))}</p>
            ${message ? `<p class="ad-status${failed ? ' bad' : ''}">${esc(message)}</p>` : ''}
            <button type="submit">${esc(t('adminSave'))}</button>
        </form>`;
        document.getElementById('adEdit').addEventListener('submit', (event) => {
            event.preventDefault();
            const birthdate = document.getElementById('adBirth').value.trim();
            if (!parseBirth(birthdate)) {
                renderEditor(t('invalidDate'), true);
                return;
            }
            nui('adminEdit', {
                citizenid: row.citizenid,
                firstname: document.getElementById('adFirst').value.trim(),
                lastname: document.getElementById('adLast').value.trim(),
                birthdate
            });
        });
    }

    function edit(citizenid) {
        editing = citizenid;
        renderResults();
        renderEditor();
    }

    function open(data) {
        if (data.locale) state.config.locale = data.locale;
        if (data.ui) state.config.ui = data.ui;
        if (data.characters) state.config.characters = data.characters;
        players = data.players || [];
        maximum = data.maximum || 1;
        if (!built) build();
        root().classList.remove('hidden');
        renderPlayers();
        if (!root().querySelector('.ad-tabs button.on')) switchTab('online');
        if (tab === 'records') {
            renderResults();
            renderEditor();
        }
    }

    function records(data) {
        rows = data.rows || [];
        if (!rows.some((row) => row.citizenid === editing)) editing = null;
        if (!built) return;
        switchTab('records');
        setTitle(data.title || '');
        renderResults();
        renderEditor();
    }

    function edited(data) {
        if (data.row) {
            const index = rows.findIndex((row) => row.citizenid === data.row.citizenid);
            if (index >= 0) rows[index] = data.row;
        }
        if (!built) return;
        renderResults();
        renderEditor(data.ok ? t('adminEdited') : (data.message || t('adminEditFailed')), !data.ok);
    }

    function hide() {
        root().classList.add('hidden');
        editing = null;
    }

    function isOpen() {
        return !root().classList.contains('hidden');
    }

    return { open, records, edited, hide, isOpen };
})();
