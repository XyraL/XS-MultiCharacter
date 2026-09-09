const $ = (selector) => document.querySelector(selector);
const nui = (name, data = {}) => fetch(`https://${GetParentResourceName()}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

let config = {};
let characters = [];
let slotCount = 1;
let deleting = null;

const text = (key) => config.locale?.[key] || key;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);
const money = (amount) => `${config.ui.currency}${Number(amount || 0).toLocaleString()}`;

function formatDate(timestamp) {
    if (!timestamp) return text('never');
    const styles = ['short', 'medium', 'long'];
    const dateStyle = styles.includes(config.ui.activityDateStyle) ? config.ui.activityDateStyle : 'short';
    return new Date(Number(timestamp) * 1000).toLocaleDateString(undefined, { dateStyle });
}

function formatPlaytime(seconds) {
    const totalMinutes = Math.floor(Number(seconds || 0) / 60);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days) return `${days}${text('dayShort')} ${hours}${text('hourShort')}`;
    if (hours) return `${hours}${text('hourShort')} ${minutes}${text('minuteShort')}`;
    return `${minutes}${text('minuteShort')}`;
}

function closeModals() {
    document.querySelectorAll('.modal').forEach((element) => element.classList.add('hidden'));
}

function applyLocale() {
    const bindings = {
        selectProfile: 'selectProfile', yourCharacters: 'yourCharacters', newProfile: 'newProfile',
        createHeading: 'createCharacter', firstNameLabel: 'firstName', lastNameLabel: 'lastName',
        birthdateLabel: 'dateOfBirth', nationalityLabel: 'nationality', genderLabel: 'gender',
        createBack: 'back', createButton: 'create', permanentAction: 'permanentAction',
        deleteHeading: 'deleteQuestion', deleteWarning: 'deleteWarning', deleteCancel: 'cancel',
        confirmDelete: 'delete', arrival: 'arrival', chooseSpawn: 'chooseSpawn', spawnDistrictLabel: 'district'
    };
    Object.entries(bindings).forEach(([id, key]) => { $(`#${id}`).textContent = text(key); });
    $('#gender').options[0].textContent = text('male');
    $('#gender').options[1].textContent = text('female');
    $('#birthdate').placeholder = config.characters.dateFormatHint;
    $('#nationality').value = config.characters.defaultNationality;
}

function renderCharacters() {
    const bySlot = {};
    characters.forEach((character) => { bySlot[character.cid] = character; });
    $('#slots').innerHTML = '';
    for (let slot = 1; slot <= slotCount; slot += 1) {
        const character = bySlot[slot];
        const button = document.createElement('button');
        button.className = `slot ${character ? '' : 'empty'}`;
        button.innerHTML = character
            ? `<span class="slot-index">0${slot}</span><strong>${escapeHtml(character.charinfo.firstname)} ${escapeHtml(character.charinfo.lastname)}</strong><span>${escapeHtml(character.job?.label || text('unemployed'))}</span>`
            : `<span class="slot-index">0${slot}</span><strong>+ ${escapeHtml(text('emptySlot'))}</strong><span>${escapeHtml(text('newProfile'))}</span>`;
        button.onclick = () => character ? selectCharacter(character) : createCharacter(slot);
        $('#slots').appendChild(button);
    }
    $('#count').textContent = `${characters.length} / ${slotCount}`;
    $('#emptyText').textContent = characters.length ? '' : text('noCharacters');
}

function dossierField(label, value) {
    if (value === undefined || value === null || value === '') return '';
    return `<div class="dossier-field"><small>${escapeHtml(label)}</small><span>${escapeHtml(value)}</span></div>`;
}

function selectCharacter(character) {
    nui('preview', { citizenid: character.citizenid });
    const dossier = character.dossier || {};
    const detail = $('#detailView');
    const gang = config.ui.showGang && dossier.gang?.name !== 'none' ? dossier.gang?.label : null;
    const activity = dossier.activity;
    const extra = (dossier.extra || []).map((field) => dossierField(field.label, field.value)).join('');
    detail.classList.remove('hidden');
    detail.innerHTML = `
        <div class="dossier-top"><div><small>${escapeHtml(text('identityFile'))}</small><h2>${escapeHtml(character.charinfo.firstname)} ${escapeHtml(character.charinfo.lastname)}</h2></div><span class="verified"><i></i>${escapeHtml(text('identityVerified'))}</span></div>
        <div class="xs-line"><span></span></div>
        <div class="dossier-grid">
            ${config.ui.showCitizenId ? dossierField(text('citizenId'), dossier.citizenid) : ''}
            ${dossierField(text('job'), dossier.job?.label)}
            ${config.ui.showJobGrade ? dossierField(text('jobGrade'), dossier.job?.grade) : ''}
            ${config.ui.showBirthdate ? dossierField(text('born'), dossier.birthdate) : ''}
            ${config.ui.showPhone ? dossierField(text('phone'), dossier.phone) : ''}
            ${config.ui.showNationality ? dossierField(text('nationality'), dossier.nationality) : ''}
            ${config.ui.showGang ? dossierField(text('gang'), gang) : ''}
            ${config.ui.showAccount ? dossierField(text('account'), dossier.account) : ''}
            ${config.ui.showCash ? dossierField(text('cash'), money(character.money?.cash)) : ''}
            ${config.ui.showBank ? dossierField(text('bank'), money(character.money?.bank)) : ''}
            ${config.ui.showActivity && activity ? dossierField(text('lastPlayed'), formatDate(activity.lastPlayed)) : ''}
            ${config.ui.showActivity && activity ? dossierField(text('playtime'), formatPlaytime(activity.playtimeSeconds)) : ''}
            ${config.ui.showActivity && activity ? dossierField(text('trackedSince'), formatDate(activity.createdAt)) : ''}
            ${config.ui.showActivity && activity ? dossierField(text('lastDistrict'), activity.lastDistrict) : ''}
            ${extra}
        </div>
        <div class="actions">
            ${config.characters.allowDelete ? `<button class="ghost" id="deleteBtn">${escapeHtml(text('delete'))}</button>` : ''}
            <button id="playBtn">${escapeHtml(text('play'))}</button>
        </div>`;
    $('#playBtn').onclick = () => nui('play', { citizenid: character.citizenid });
    if ($('#deleteBtn')) $('#deleteBtn').onclick = () => askDelete(character);
}

function createCharacter(slot) {
    $('#cid').value = slot;
    $('#createView').classList.remove('hidden');
    nui('preview', { gender: 0 });
}

function askDelete(character) {
    deleting = character;
    $('#deleteInput').value = '';
    $('#deleteInstruction').textContent = text('typeToConfirm').replace('%{word}', config.characters.deleteConfirmation);
    $('#deleteView').classList.remove('hidden');
}

function focusSpawn(location) {
    $('#spawnFocus').classList.remove('hidden');
    $('#spawnFocusTitle').textContent = location.label;
    $('#spawnFocusDistrict').textContent = location.district || location.description || '';
    nui('previewSpawn', { id: location.id });
}

function spawnButton(location, index) {
    const element = document.createElement('button');
    element.className = 'spawn';
    element.innerHTML = `<span class="spawn-number">${String(index + 1).padStart(2, '0')}</span><span><strong>${escapeHtml(location.label)}</strong><em>${escapeHtml(location.description || '')}</em></span><b>&rarr;</b>`;
    element.onmouseenter = () => focusSpawn(location);
    element.onfocus = () => focusSpawn(location);
    element.onclick = () => nui('spawn', { id: location.id });
    return element;
}

function renderSpawns(locations, categories) {
    $('#characterView').classList.add('hidden');
    $('#detailView').classList.add('hidden');
    $('#spawnView').classList.remove('hidden');
    $('#spawns').innerHTML = '';
    let number = 0;
    let firstRendered = null;
    (categories || []).forEach((category) => {
        const grouped = locations.filter((location) => (location.category || 'city') === category.id);
        if (!grouped.length) return;
        const heading = document.createElement('div');
        heading.className = 'spawn-category';
        heading.textContent = category.label;
        $('#spawns').appendChild(heading);
        grouped.forEach((location) => {
            if (!firstRendered) firstRendered = location;
            $('#spawns').appendChild(spawnButton(location, number));
            number += 1;
        });
    });
    const known = new Set((categories || []).map((category) => category.id));
    locations.filter((location) => !known.has(location.category || 'city')).forEach((location) => {
        if (!firstRendered) firstRendered = location;
        $('#spawns').appendChild(spawnButton(location, number));
        number += 1;
    });
    if (firstRendered) focusSpawn(firstRendered);
}

function renderAdmin(players, maximum) {
    $('#adminPlayers').innerHTML = '';
    if (!players.length) {
        $('#adminPlayers').innerHTML = `<p class="admin-empty">${escapeHtml(text('adminNoPlayers'))}</p>`;
        return;
    }
    players.forEach((player) => {
        const row = document.createElement('div');
        row.className = 'admin-row';
        row.innerHTML = `
            <div><strong>${escapeHtml(player.name)}</strong><span>${escapeHtml(text('adminId'))} ${player.source}</span></div>
            <span class="admin-count">${player.characters}</span>
            <input type="number" min="1" max="${maximum}" value="${player.override || player.slots}" aria-label="${escapeHtml(text('adminSlotsLabel'))}">
            <div class="admin-actions"><button class="admin-save">${escapeHtml(text('adminSet'))}</button><button class="ghost admin-reset">${escapeHtml(text('adminReset'))}</button></div>`;
        row.querySelector('.admin-save').onclick = () => nui('adminSetSlots', { license: player.license, slots: Number(row.querySelector('input').value), reset: false });
        row.querySelector('.admin-reset').onclick = () => nui('adminSetSlots', { license: player.license, reset: true });
        $('#adminPlayers').appendChild(row);
    });
}

window.addEventListener('message', ({ data }) => {
    if (data.action === 'loading') {
        config = data.config;
        document.documentElement.style.setProperty('--accent', config.ui.accent);
        document.documentElement.style.setProperty('--bg', config.ui.background);
        $('#title').textContent = config.ui.title;
        $('#subtitle').textContent = config.ui.subtitle;
        applyLocale();
        $('#app').classList.remove('hidden');
        $('#characterView').classList.remove('hidden');
        $('#spawnView').classList.add('hidden');
    }
    if (data.action === 'characters') {
        characters = data.characters || [];
        slotCount = data.slots || 1;
        renderCharacters();
    }
    if (data.action === 'spawns') renderSpawns(data.locations || [], data.categories || []);
    if (data.action === 'adminSlots') {
        config.locale = data.locale;
        config.ui = data.ui;
        $('#app').classList.remove('hidden');
        $('#adminView').classList.remove('hidden');
        $('#adminTitle').textContent = text('adminSlots');
        $('#adminEyebrow').textContent = text('adminEyebrow');
        $('#adminPlayerLabel').textContent = text('adminPlayer');
        $('#adminCharactersLabel').textContent = text('adminCharacters');
        $('#adminSlotsLabel').textContent = text('adminSlotsLabel');
        renderAdmin(data.players || [], data.maximum);
    }
    if (data.action === 'adminClosed') {
        $('#adminView').classList.add('hidden');
        $('#app').classList.add('hidden');
    }
    if (data.action === 'close') $('#app').classList.add('hidden');
});

$('#createForm').onsubmit = (event) => {
    event.preventDefault();
    nui('create', {
        cid: Number($('#cid').value), firstname: $('#firstname').value, lastname: $('#lastname').value,
        birthdate: $('#birthdate').value, nationality: $('#nationality').value, gender: Number($('#gender').value)
    });
    closeModals();
};
$('#gender').onchange = (event) => nui('preview', { gender: Number(event.target.value) });
document.querySelectorAll('[data-close]').forEach((button) => { button.onclick = closeModals; });
$('#confirmDelete').onclick = () => {
    if (!deleting || $('#deleteInput').value !== config.characters.deleteConfirmation) return;
    nui('delete', { citizenid: deleting.citizenid });
    deleting = null;
    $('#detailView').classList.add('hidden');
    closeModals();
};
$('#adminClose').onclick = () => nui('adminClose');
