const $ = (selector) => document.querySelector(selector);
const nui = (name, data = {}) => fetch(`https://${GetParentResourceName()}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
}).catch(() => null);

const state = {
    config: { ui: {}, characters: {}, locale: {} },
    characters: [],
    slots: 1,
    kit: null,
    selected: null,
    playing: null,
    photos: {},
    spawns: [],
    categories: [],
    focusSpawn: null,
    createSlot: null,
    createGender: 0,
    deleting: null,
    view: 'select',
    busy: false
};

const ui = () => state.config.ui || {};
const pad2 = (value) => String(value).padStart(2, '0');
const PLACE_COLOURS = ['#8fc8ff', '#ff7ad9', '#ffc65c', '#7ef0a5', '#c3a6ff', '#ff9f6b'];

function t(key, vars) {
    let value = state.config.locale?.[key];
    if (value === undefined || value === null) return key;
    value = String(value);
    if (vars) Object.entries(vars).forEach(([name, replacement]) => { value = value.split(`%{${name}}`).join(String(replacement)); });
    return value;
}

function fit() {
    const scale = Math.min(window.innerHeight / 1080, window.innerWidth / 1700);
    ['#app', '#arrival', '#admin'].forEach((selector) => { $(selector).style.zoom = scale; });
}

function hexRgb(hex) {
    const match = String(hex || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return null;
    const value = match[1].length === 3 ? [...match[1]].map((character) => character + character).join('') : match[1];
    return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}

function applyTheme() {
    const root = document.documentElement;
    const first = hexRgb(ui().accent) || [255, 122, 217];
    const second = hexRgb(ui().accentTo) || [139, 123, 255];
    root.style.setProperty('--accent', `rgb(${first.join(',')})`);
    root.style.setProperty('--accent-rgb', first.join(','));
    root.style.setProperty('--accent2', `rgb(${second.join(',')})`);
    root.style.setProperty('--accent2-rgb', second.join(','));
}

function months() {
    return String(t('months')).split(',').map((month) => month.trim());
}

function validDate(y, m, d) {
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const check = new Date(y, m - 1, d);
    if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) return null;
    return { y, m, d };
}

function hintParts() {
    const hint = String(state.config.characters?.dateFormatHint || 'MM/DD/YYYY').toUpperCase();
    const parts = hint.match(/Y+|M+|D+|[^YMD]+/g) || ['MM', '/', 'DD', '/', 'YYYY'];
    return parts.map((part) => (/^[YMD]/.test(part)
        ? { key: part[0].toLowerCase(), length: part[0] === 'Y' ? 4 : 2, hint: part }
        : { separator: part }));
}

function parseBirth(value) {
    const text = String(value || '').trim();
    const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    const numbers = text.split(/[^0-9]+/).filter(Boolean).map(Number);
    const keys = hintParts().filter((part) => part.key).map((part) => part.key);
    if (numbers.length !== 3 || keys.length !== 3) return null;
    const date = {};
    keys.forEach((key, index) => { date[key] = numbers[index]; });
    return validDate(date.y, date.m, date.d);
}

function today() {
    const date = new Date();
    return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function niceDate(date) {
    if (!date) return '—';
    return `${date.d} ${months()[date.m - 1] || ''} ${date.y}`;
}

function money(amount) {
    return `${ui().currency || '$'}${Math.floor(Number(amount || 0)).toLocaleString('en-US')}`;
}

function firstName(character) { return character?.charinfo?.firstname || ''; }
function lastName(character) { return character?.charinfo?.lastname || ''; }
function fullName(character) { return `${firstName(character)} ${lastName(character)}`.trim(); }

function jobOf(character) {
    const job = character?.dossier?.job || {};
    return { label: job.label || character?.job?.label || t('unemployed'), grade: job.grade || '' };
}

function jobText(job) {
    return ui().showJobGrade && job.grade ? [job.label, job.grade].join(' · ') : job.label;
}

function activityOf(character) {
    return ui().showActivity ? (character?.dossier?.activity || null) : null;
}

function gangOf(character) {
    const gang = character?.dossier?.gang;
    if (!ui().showGang || !gang || !gang.name || gang.name === 'none' || !gang.label) return null;
    return gang.label;
}

function playtime(seconds) {
    const minutes = Math.floor(Number(seconds || 0) / 60);
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        return t(hours === 1 ? 'hourLong' : 'hoursLong', { n: hours });
    }
    return t('minutesLong', { n: minutes });
}

function ago(seconds) {
    if (!seconds) return t('agoNever');
    const diff = Math.max(0, Date.now() / 1000 - Number(seconds));
    if (diff < 120) return t('agoNow');
    if (diff < 3600) return t('agoMinutes', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('agoHours', { n: Math.floor(diff / 3600) });
    return t('agoDays', { n: Math.floor(diff / 86400) });
}

function clock() {
    const now = new Date();
    return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

function photoHtml(key) {
    const url = state.photos[key];
    return url ? `<img src="${esc(url)}" alt="">` : Icons.silhouette;
}

function photoHolder(className, key) {
    return `<span class="${className}${state.photos[key] ? ' has-photo' : ''}" data-photo="${esc(key)}">${photoHtml(key)}</span>`;
}

function bindPhotos(root) {
    root.querySelectorAll('[data-photo] img').forEach((image) => {
        image.addEventListener('error', () => {
            const holder = image.closest('[data-photo]');
            if (holder) {
                holder.classList.remove('has-photo');
                holder.innerHTML = Icons.silhouette;
            }
        }, { once: true });
    });
}

function setPhoto(key, url) {
    if (!key) return;
    state.photos[key] = url || null;
    document.querySelectorAll('[data-photo]').forEach((holder) => {
        if (holder.dataset.photo !== key) return;
        holder.innerHTML = photoHtml(key);
        holder.classList.toggle('has-photo', !!url);
    });
    bindPhotos(document);
}

function renderPills() {
    const label = state.view === 'create' ? t('pillCreate')
        : state.view === 'spawn' ? (state.playing ? t('pillSpawnNamed', { name: firstName(state.playing) }) : t('pillSpawn'))
        : t('pillSelect');
    $('#brand').innerHTML = `<span class="logo"></span><b>${esc(ui().title)}</b><i></i><span class="muted">${esc(label)}</span>`;
    renderStatus();
}

function renderStatus() {
    const slots = state.view === 'spawn' ? '' : `${esc(t('slotsUsed', { count: state.characters.length, total: state.slots }))}<i></i>`;
    $('#status').innerHTML = `${slots}${esc(clock())}`;
}

function showView(name) {
    state.view = name;
    ['select', 'create', 'spawn'].forEach((view) => $(`#${view}View`).classList.toggle('hidden', view !== name));
    $('#app').dataset.view = name;
    renderPills();
}

function bySlot() {
    const slots = {};
    state.characters.forEach((character) => { slots[character.cid] = character; });
    return slots;
}

function selectedCharacter() {
    return state.characters.find((character) => character.citizenid === state.selected) || null;
}

function cardHtml(slot, character) {
    const seat = pad2(slot);
    if (!character) {
        return `<button type="button" class="card new" data-slot="${slot}"><span class="inner"><span class="plus">${Icons.svg('plus')}</span><b>${esc(t('newCharacter'))}</b><small>${esc(t('slotLabel', { slot: seat }))}</small></span></button>`;
    }
    const activity = activityOf(character);
    const meta = activity ? `${jobOf(character).label} · ${ago(activity.lastPlayed)}` : jobOf(character).label;
    return `<button type="button" class="card${character.citizenid === state.selected ? ' sel' : ''}" data-slot="${slot}" data-citizenid="${esc(character.citizenid)}"><span class="inner">
        ${photoHolder('photo', character.citizenid)}<span class="fade"></span><span class="seat">${seat}</span>
        <span class="body"><b>${esc(fullName(character))}</b><small>${esc(meta)}</small></span>
    </span></button>`;
}

function renderCards() {
    const slots = bySlot();
    let html = '';
    for (let slot = 1; slot <= state.slots; slot += 1) html += cardHtml(slot, slots[slot]);
    $('#cards').innerHTML = `<div class="rail-inner">${html}</div>`;
    bindPhotos($('#cards'));
    revealSelected();
}

function revealSelected() {
    const card = $('#cards .card.sel');
    if (card) card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function row(icon, label, value) {
    return `<div class="row">${Icons.svg(icon)}<span>${esc(label)}</span><b>${esc(value)}</b></div>`;
}

function renderDetails() {
    const character = selectedCharacter();
    const holder = $('#details');
    if (!character) {
        holder.innerHTML = `<h2 class="solo">${esc(t('welcomeTitle'))}</h2><p class="empty-note">${esc(t('noCharacters'))}</p>`;
        return;
    }
    const config = ui();
    const activity = activityOf(character);
    const info = character.charinfo || {};
    const rows = [row('job', t('rowJob'), jobText(jobOf(character)))];
    if (config.showCash) rows.push(row('cash', t('rowCash'), money(character.money?.cash)));
    if (config.showBank) rows.push(row('bank', t('rowBank'), money(character.money?.bank)));
    if (activity) rows.push(row('clock', t('rowPlayed'), playtime(activity.playtimeSeconds)));
    if (activity && activity.lastDistrict) rows.push(row('pin', t('rowLastSeen'), activity.lastDistrict));
    if (config.showBirthdate) {
        const birth = parseBirth(info.birthdate);
        rows.push(row('cal', t('rowBorn'), birth ? niceDate(birth) : (info.birthdate || '—')));
    }
    if (config.showPhone) rows.push(row('phone', t('rowPhone'), character.dossier?.phone || info.phone || '—'));
    if (config.showNationality) rows.push(row('flag', t('rowNationality'), info.nationality || '—'));
    if (config.showAccount) rows.push(row('card', t('rowAccount'), character.dossier?.account || info.account || '—'));
    const gang = gangOf(character);
    if (gang) rows.push(row('crew', t('rowGang'), gang));
    (character.dossier?.extra || []).filter((field) => field && field.label).forEach((field) => rows.push(row('info', field.label, field.value)));
    const allowDelete = state.config.characters?.allowDelete;
    holder.innerHTML = `
        <div class="p-head">${photoHolder('avatar', character.citizenid)}<div><h2>${esc(fullName(character))}</h2>${config.showCitizenId ? `<span class="chip"><i></i>${esc(character.citizenid)}</span>` : ''}</div></div>
        <div class="rows">${rows.join('')}</div>
        <div class="acts">
            <button type="button" class="btn" id="playButton"${state.busy ? ' disabled' : ''}>${esc(t('playAs', { name: firstName(character) }))}</button>
            ${allowDelete ? `<button type="button" class="icon-btn glass" id="deleteOpen" aria-label="${esc(t('deleteCharacter'))}">${Icons.svg('trash')}</button>` : ''}
        </div>`;
    $('#playButton').addEventListener('click', () => play(character));
    if (allowDelete) $('#deleteOpen').addEventListener('click', () => openDelete(character));
    bindPhotos(holder);
    const list = holder.querySelector('.rows');
    const hint = () => list.classList.toggle('more', list.scrollTop + list.clientHeight < list.scrollHeight - 2);
    list.addEventListener('scroll', hint);
    hint();
}

function markSelected() {
    document.querySelectorAll('#cards .card').forEach((card) => {
        card.classList.toggle('sel', !!card.dataset.citizenid && card.dataset.citizenid === state.selected);
    });
    revealSelected();
}

function select(citizenid) {
    if (!citizenid || state.busy) return;
    const changed = state.selected !== citizenid;
    state.selected = citizenid;
    markSelected();
    renderDetails();
    if (changed) nui('preview', { citizenid });
}

function defaultSelection() {
    if (state.characters.some((character) => character.citizenid === state.selected && character.cid <= state.slots)) return state.selected;
    const visible = state.characters.filter((character) => character.cid <= state.slots);
    if (!visible.length) return null;
    const recent = [...visible].sort((a, b) => (b.dossier?.activity?.lastPlayed || 0) - (a.dossier?.activity?.lastPlayed || 0))[0];
    return (recent && recent.dossier?.activity?.lastPlayed ? recent : visible.sort((a, b) => a.cid - b.cid)[0]).citizenid;
}

function renderSelect() {
    const pick = defaultSelection();
    const changed = pick !== state.selected;
    state.selected = pick;
    renderCards();
    renderDetails();
    renderStatus();
    if (pick && changed) nui('preview', { citizenid: pick });
}

function play(character) {
    if (state.busy) return;
    state.busy = true;
    state.playing = character;
    const button = $('#playButton');
    if (button) button.disabled = true;
    nui('play', { citizenid: character.citizenid });
}

function renderCreate() {
    const characters = state.config.characters || {};
    const nameLength = Math.max(2, Number(characters.nameMaxLength) || 18);
    const labels = { m: t('month'), d: t('day'), y: t('year') };
    const dateParts = hintParts().filter((part) => part.key);
    const columns = dateParts.map((part) => (part.key === 'y' ? '1.6fr' : '1fr')).join(' ');
    $('#createForm').innerHTML = `
        <h2>${esc(t('newCharacter'))}</h2>
        <div class="sub">${esc(t('createSub', { slot: pad2(state.createSlot) }))}</div>
        <div class="two">
            <label class="in"><small>${esc(t('firstName'))}</small><input id="firstname" maxlength="${nameLength}" spellcheck="false"></label>
            <label class="in"><small>${esc(t('lastName'))}</small><input id="lastname" maxlength="${nameLength}" spellcheck="false"></label>
        </div>
        <div class="three" style="grid-template-columns:${columns}">
            ${dateParts.map((part) => `<label class="in date"><small>${esc(labels[part.key])}</small><input class="dob" data-key="${part.key}" maxlength="${part.length}" inputmode="numeric" placeholder="${esc(part.hint)}" spellcheck="false"></label>`).join('')}
        </div>
        <label class="in"><small>${esc(t('nationality'))}</small><input id="nationality" maxlength="24" value="${esc(characters.defaultNationality || '')}" spellcheck="false"></label>
        <div class="segc">
            <button type="button" data-gender="0">${esc(t('male'))}</button>
            <button type="button" data-gender="1">${esc(t('female'))}</button>
        </div>
        <p class="error hidden" id="createError"></p>
        <div class="acts">
            <button type="button" class="ghost-btn glass" id="createBack">${esc(t('back'))}</button>
            <button type="submit" class="btn" id="createSubmit" disabled>${esc(t('createCharacter'))}</button>
        </div>`;
    setGender(state.createGender, true);
    $('#createBack').addEventListener('click', closeCreate);
    document.querySelectorAll('#createForm .segc button').forEach((button) => {
        button.addEventListener('click', () => setGender(Number(button.dataset.gender)));
    });
    ['firstname', 'lastname', 'nationality'].forEach((id) => $(`#${id}`).addEventListener('input', validateCreate));
    const dates = [...document.querySelectorAll('#createForm .dob')];
    dates.forEach((input, index) => {
        input.addEventListener('input', () => {
            input.value = input.value.replace(/[^0-9]/g, '').slice(0, Number(input.maxLength));
            if (input.value.length === Number(input.maxLength) && dates[index + 1]) dates[index + 1].focus();
            validateCreate();
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && !input.value && dates[index - 1]) dates[index - 1].focus();
        });
    });
    renderKit();
    validateCreate();
}

function createValues() {
    const characters = state.config.characters || {};
    const minimum = Math.max(1, Number(characters.nameMinLength) || 2);
    const firstname = $('#firstname').value.trim();
    const lastname = $('#lastname').value.trim();
    const nationality = $('#nationality').value.trim();
    const inputs = [...document.querySelectorAll('#createForm .dob')];
    const date = {};
    let birthdate = '';
    let inputIndex = 0;
    hintParts().forEach((part) => {
        if (part.key) {
            const value = inputs[inputIndex]?.value || '';
            inputIndex += 1;
            date[part.key] = Number(value);
            birthdate += value.padStart(part.length, '0');
        } else {
            birthdate += part.separator;
        }
    });
    const complete = inputs.every((input) => input.value.length === Number(input.maxLength));
    const parsed = complete ? validDate(date.y, date.m, date.d) : null;
    const now = today();
    const inRange = parsed && parsed.y >= 1900 && (parsed.y < now.y || (parsed.y === now.y && (parsed.m < now.m || (parsed.m === now.m && parsed.d <= now.d))));
    return {
        firstname, lastname, nationality, birthdate, gender: state.createGender,
        valid: firstname.length >= minimum && lastname.length >= minimum && nationality.length >= 2 && !!inRange,
        dateProblem: complete && !inRange
    };
}

function validateCreate() {
    const values = createValues();
    $('#createSubmit').disabled = !values.valid || state.busy;
    document.querySelectorAll('#createForm .in.date').forEach((box) => box.classList.toggle('bad', values.dateProblem));
    const error = $('#createError');
    error.classList.toggle('hidden', !values.dateProblem);
    error.textContent = values.dateProblem ? t('invalidDate') : '';
    return values;
}

function setGender(gender, quiet) {
    state.createGender = gender === 1 ? 1 : 0;
    document.querySelectorAll('#createForm .segc button').forEach((button) => {
        button.classList.toggle('on', Number(button.dataset.gender) === state.createGender);
    });
    if (!quiet) nui('preview', { gender: state.createGender });
}

function kitTile(entry) {
    const icon = Icons.forItem(entry.name);
    return `<div class="tile"><span class="ic">${icon}</span><span class="t"><b>×${esc(entry.amount)}</b><span>${esc(entry.label || entry.name)}</span></span></div>`;
}

function renderKit() {
    const holder = $('#kit');
    const kit = state.kit;
    if (!kit || (!kit.cash && !kit.bank && !(kit.items || []).length)) {
        holder.innerHTML = '';
        holder.classList.add('hidden');
        return;
    }
    holder.classList.remove('hidden');
    const lead = kit.cash
        ? `<div class="money">${esc(money(kit.cash))}</div><span class="money-note">${esc(t('kitCash'))}${kit.bank ? ` · ${esc(t('kitBank', { amount: money(kit.bank) }))}` : ''}</span>`
        : kit.bank ? `<div class="money">${esc(money(kit.bank))}</div><span class="money-note">${esc(t('kitBankOnly'))}</span>` : '';
    const tiles = (kit.items || []).map(kitTile).join('');
    holder.innerHTML = `
        <div class="label">${esc(t('kitTitle'))}</div>
        ${lead}
        ${tiles ? `<div class="tiles">${tiles}</div>` : ''}
        <p>${esc(t('kitNote'))}</p>`;
}

function openCreate(slot) {
    if (state.busy) return;
    state.createSlot = slot;
    state.createGender = 0;
    showView('create');
    renderCreate();
    nui('preview', { gender: 0 });
    setTimeout(() => $('#firstname')?.focus(), 30);
}

function closeCreate() {
    if (state.busy) return;
    showView('select');
    renderSelect();
    const character = selectedCharacter();
    nui('preview', character ? { citizenid: character.citizenid } : { gender: 0 });
}

function submitCreate(event) {
    event.preventDefault();
    const values = validateCreate();
    if (!values.valid || state.busy) return;
    state.busy = true;
    $('#createSubmit').disabled = true;
    nui('create', {
        cid: state.createSlot, firstname: values.firstname, lastname: values.lastname,
        birthdate: values.birthdate, nationality: values.nationality, gender: values.gender
    });
}

function openDelete(character) {
    state.deleting = character;
    state.view = 'delete';
    const word = String(state.config.characters?.deleteConfirmation || 'DELETE');
    const view = $('#deleteView');
    view.innerHTML = `<section class="alert glass">
        <div class="bad">${Icons.svg('trash')}</div>
        <h2>${esc(t('deleteQuestion', { name: fullName(character) }))}</h2>
        <p>${esc(t('deleteWarning'))}</p>
        <label class="in"><small>${esc(t('typeToConfirm', { word }))}</small><input id="deleteInput" maxlength="${word.length}" spellcheck="false" autocomplete="off"></label>
        <div class="split"><button type="button" class="cancel" id="deleteKeep">${esc(t('cancel'))}</button><button type="button" class="delete" id="deleteConfirm" disabled>${esc(t('delete'))}</button></div>
    </section>`;
    view.classList.remove('hidden');
    const input = $('#deleteInput');
    input.addEventListener('input', () => {
        $('#deleteConfirm').disabled = input.value.trim().toUpperCase() !== word.toUpperCase();
    });
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !$('#deleteConfirm').disabled) confirmDelete();
    });
    $('#deleteKeep').addEventListener('click', closeDelete);
    $('#deleteConfirm').addEventListener('click', confirmDelete);
    setTimeout(() => input.focus(), 30);
}

function closeDelete() {
    if (state.view === 'delete') state.view = 'select';
    state.deleting = null;
    $('#deleteView').classList.add('hidden');
    $('#deleteView').innerHTML = '';
}

function confirmDelete() {
    const character = state.deleting;
    if (!character) return;
    const word = String(state.config.characters?.deleteConfirmation || 'DELETE');
    if ($('#deleteInput').value.trim().toUpperCase() !== word.toUpperCase()) return;
    nui('delete', { citizenid: character.citizenid });
    if (state.selected === character.citizenid) state.selected = null;
    closeDelete();
}

function orderedSpawns() {
    const known = new Set(state.categories.map((category) => category.id));
    const list = [];
    state.categories.forEach((category, index) => {
        state.spawns.filter((spawn) => (spawn.category || 'city') === category.id)
            .forEach((spawn) => list.push({ spawn, category: category.label, colour: PLACE_COLOURS[index % PLACE_COLOURS.length] }));
    });
    state.spawns.filter((spawn) => !known.has(spawn.category || 'city'))
        .forEach((spawn) => list.push({ spawn, category: '', colour: PLACE_COLOURS[PLACE_COLOURS.length - 1] }));
    return list;
}

function renderPlaces() {
    const html = orderedSpawns().map(({ spawn, category, colour }) => `<button type="button" class="loc glass${spawn.id === state.focusSpawn ? ' sel' : ''}" data-id="${esc(spawn.id)}">
        <span class="cat"><i style="background:${colour}"></i>${esc(category)}</span>
        <span><b>${esc(spawn.label)}</b><small>${esc(spawn.district || spawn.description || '')}</small></span>
    </button>`).join('');
    $('#places').innerHTML = `<div class="rail-inner">${html}</div>`;
    const selected = $('#places .loc.sel');
    if (selected) selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function renderDestination() {
    const entry = orderedSpawns().find(({ spawn }) => spawn.id === state.focusSpawn);
    const holder = $('#destination');
    if (!entry) {
        holder.innerHTML = '';
        return;
    }
    const spawn = entry.spawn;
    holder.innerHTML = `
        <div class="k">${esc(spawn.district || entry.category || '')}</div>
        <h2 class="place">${esc(spawn.label)}</h2>
        ${spawn.description ? `<p class="desc">${esc(spawn.description)}</p>` : ''}
        <p class="desc">${esc(t('cameraNote'))}</p>
        <div class="acts"><button type="button" class="btn" id="boardButton"${state.busy ? ' disabled' : ''}>${esc(t('spawnHere'))}</button></div>`;
    $('#boardButton').addEventListener('click', () => board(spawn.id));
}

function focusSpawn(id, quiet) {
    if (!id || state.focusSpawn === id) return;
    state.focusSpawn = id;
    document.querySelectorAll('#places .loc').forEach((place) => place.classList.toggle('sel', place.dataset.id === id));
    const selected = $('#places .loc.sel');
    if (selected) selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    renderDestination();
    if (!quiet) nui('previewSpawn', { id });
}

function board(id) {
    if (state.busy || !id) return;
    state.busy = true;
    const button = $('#boardButton');
    if (button) button.disabled = true;
    nui('spawn', { id });
}

function renderSpawns(locations, categories) {
    state.spawns = locations || [];
    state.categories = categories || [];
    state.busy = false;
    closeDelete();
    showView('spawn');
    state.focusSpawn = null;
    renderPlaces();
    const first = orderedSpawns()[0];
    if (first) focusSpawn(first.spawn.id);
    else renderDestination();
}

function showArrival(data) {
    const holder = $('#arrival');
    const place = data.place || '';
    holder.innerHTML = `
        <div class="letterbox top"></div><div class="letterbox bottom"></div>
        <section class="arr-card glass">
            <div class="label"><i></i>${esc(t('arrivalLabel'))}</div>
            <h2>${esc(t('arrivalTitleStart'))} <span>${esc(t('arrivalTitleCity'))}</span></h2>
            <p>${esc(data.firstname ? t('arrivalLine', { name: data.firstname, place, date: niceDate(today()) }) : t('arrivalLinePlain', { place, date: niceDate(today()) }))}</p>
        </section>
        <div class="pill glass arr-skip">${esc(t('arrivalSkip'))}</div>`;
    holder.classList.remove('hidden');
    requestAnimationFrame(() => holder.classList.add('play'));
}

function hideArrival() {
    const holder = $('#arrival');
    holder.classList.remove('play');
    holder.classList.add('hidden');
    holder.innerHTML = '';
}

function closeAll() {
    $('#app').classList.add('hidden');
    closeDelete();
    state.busy = false;
    state.photos = {};
}

function onLoading(config) {
    state.config = config || { ui: {}, characters: {}, locale: {} };
    state.busy = false;
    applyTheme();
    $('#cards').innerHTML = '';
    $('#details').innerHTML = '';
    $('#app').classList.remove('hidden');
    showView('select');
}

function onCharacters(data) {
    state.characters = data.characters || [];
    state.slots = Math.max(1, Number(data.slots) || 1);
    state.kit = data.kit || null;
    state.busy = false;
    if (state.view === 'create') showView('select');
    if (state.view === 'select' || state.view === 'delete') renderSelect();
}

function moveSelection(step) {
    const filled = [...document.querySelectorAll('#cards .card[data-citizenid]')];
    if (!filled.length) return;
    const index = filled.findIndex((card) => card.dataset.citizenid === state.selected);
    const next = filled[(index + step + filled.length) % filled.length];
    select(next.dataset.citizenid);
    $(`#cards .card[data-citizenid="${CSS.escape(next.dataset.citizenid)}"]`)?.focus();
}

function moveSpawn(step) {
    const places = orderedSpawns();
    if (!places.length) return;
    const index = places.findIndex(({ spawn }) => spawn.id === state.focusSpawn);
    const next = places[(index + step + places.length) % places.length].spawn.id;
    focusSpawn(next);
    $(`#places .loc[data-id="${CSS.escape(next)}"]`)?.focus();
}

window.addEventListener('message', ({ data }) => {
    if (!data || typeof data !== 'object') return;
    switch (data.action) {
        case 'loading': onLoading(data.config); break;
        case 'characters': onCharacters(data); break;
        case 'photo': setPhoto(data.key, data.url); break;
        case 'spawns': renderSpawns(data.locations, data.categories); break;
        case 'ready':
            state.busy = false;
            if (state.view === 'select') renderDetails();
            if (state.view === 'create') validateCreate();
            if (state.view === 'spawn') renderDestination();
            break;
        case 'arrival': showArrival(data); break;
        case 'arrivalDone': hideArrival(); break;
        case 'close': closeAll(); break;
        case 'adminSlots': Admin.open(data); break;
        case 'adminRecords': Admin.records(data); break;
        case 'adminEdited': Admin.edited(data); break;
        case 'adminClosed': Admin.hide(); break;
        default: break;
    }
});

$('#cards').addEventListener('click', (event) => {
    const card = event.target.closest('.card');
    if (!card) return;
    if (card.dataset.citizenid) select(card.dataset.citizenid);
    else openCreate(Number(card.dataset.slot));
});

$('#cards').addEventListener('dblclick', (event) => {
    const card = event.target.closest('.card[data-citizenid]');
    const character = card && state.characters.find((entry) => entry.citizenid === card.dataset.citizenid);
    if (character) play(character);
});

$('#places').addEventListener('click', (event) => {
    const place = event.target.closest('.loc');
    if (place) focusSpawn(place.dataset.id);
});

$('#places').addEventListener('dblclick', (event) => {
    const place = event.target.closest('.loc');
    if (place) board(place.dataset.id);
});

$('#createForm').addEventListener('submit', submitCreate);

document.addEventListener('keydown', (event) => {
    if (Admin.isOpen()) {
        if (event.key === 'Escape') nui('adminClose');
        return;
    }
    if ($('#app').classList.contains('hidden')) return;
    const typing = document.activeElement?.tagName === 'INPUT';
    if (state.view === 'delete') {
        if (event.key === 'Escape') closeDelete();
        return;
    }
    if (state.view === 'create') {
        if (event.key === 'Escape') closeCreate();
        return;
    }
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (state.view === 'select') {
        if (step) { event.preventDefault(); moveSelection(step); }
        if (event.key === 'Enter' && !typing) {
            const character = selectedCharacter();
            if (character) { event.preventDefault(); play(character); }
        }
        return;
    }
    if (state.view === 'spawn') {
        if (step) { event.preventDefault(); moveSpawn(step); }
        if (event.key === 'Enter') { event.preventDefault(); board(state.focusSpawn); }
    }
});

window.addEventListener('resize', fit);
setInterval(() => { if (!$('#app').classList.contains('hidden')) renderStatus(); }, 30000);
fit();
