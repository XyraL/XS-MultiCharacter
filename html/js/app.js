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
const passportConfig = () => ui().passport || {};

function t(key, vars) {
    let value = state.config.locale?.[key];
    if (value === undefined || value === null) return key;
    value = String(value);
    if (vars) Object.entries(vars).forEach(([name, replacement]) => { value = value.split(`%{${name}}`).join(String(replacement)); });
    return value;
}

function alt(key) {
    if (passportConfig().secondLanguage === false) return '';
    return state.config.locale?.[`${key}Alt`] || '';
}

function label(key) {
    const second = alt(key);
    return `${esc(t(key))}${second ? ` <i>/ ${esc(second)}</i>` : ''}`;
}

function fit() {
    const scale = Math.min(window.innerHeight / 1080, window.innerWidth / 1700);
    ['#app', '#arrival', '#admin'].forEach((selector) => { $(selector).style.zoom = scale; });
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

function fromUnix(seconds) {
    if (!seconds) return null;
    const date = new Date(Number(seconds) * 1000);
    return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function today() {
    const date = new Date();
    return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function longDate(date) {
    if (!date) return '—';
    return `${String(date.d).padStart(2, '0')} ${months()[date.m - 1] || ''} ${date.y}`;
}

function shortDate(date) {
    if (!date) return '—';
    return `${String(date.d).padStart(2, '0')} ${months()[date.m - 1] || ''}`;
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

function jobLine(character) {
    return jobText(jobOf(character));
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
    const total = Math.floor(Number(seconds || 0) / 60);
    if (total >= 60) return `${Math.floor(total / 60)} ${t('hoursShort')}`;
    return `${total} ${t('minutesShort')}`;
}

function photoHtml(key) {
    const url = state.photos[key];
    return url ? `<img src="${esc(url)}" alt="">` : Draw.SILHOUETTE;
}

function bindPhotos(root) {
    root.querySelectorAll('[data-photo] img').forEach((image) => {
        image.addEventListener('error', () => {
            const holder = image.closest('[data-photo]');
            if (holder) {
                holder.classList.remove('has-photo');
                holder.innerHTML = Draw.SILHOUETTE;
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

function photoHolder(className, key) {
    return `<span class="${className}${state.photos[key] ? ' has-photo' : ''}" data-photo="${esc(key)}">${photoHtml(key)}</span>`;
}

function sealRing() {
    return `${passportConfig().issuer || ''} ★ ${ui().title || ''} ★ `;
}

function renderBrand() {
    $('#brand').innerHTML = `${Draw.seal(50, sealRing())}<div><b>${esc(ui().title)}</b><span>${esc(ui().subtitle)}</span></div>`;
}

function hexRgb(hex) {
    const match = String(hex || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return null;
    const value = match[1].length === 3 ? [...match[1]].map((character) => character + character).join('') : match[1];
    return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}

function mixRgb(rgb, target, amount) {
    return rgb.map((value, index) => Math.round(value + (target[index] - value) * amount));
}

function applyTheme() {
    const root = document.documentElement;
    const cover = hexRgb(passportConfig().cover) || [20, 33, 61];
    const foil = hexRgb(passportConfig().foil) || [214, 180, 106];
    const foilHi = mixRgb(foil, [255, 255, 255], 0.45);
    const rgb = (value) => `rgb(${value.join(',')})`;
    root.style.setProperty('--cover', rgb(cover));
    root.style.setProperty('--cover-rgb', cover.join(','));
    root.style.setProperty('--cover-hi', rgb(mixRgb(cover, [70, 110, 190], 0.12)));
    root.style.setProperty('--cover-hi2', rgb(mixRgb(cover, [255, 255, 255], 0.12)));
    root.style.setProperty('--cover-lo', rgb(mixRgb(cover, [0, 0, 0], 0.4)));
    root.style.setProperty('--foil', rgb(foil));
    root.style.setProperty('--foil-rgb', foil.join(','));
    root.style.setProperty('--foil-hi', rgb(foilHi));
    root.style.setProperty('--foil-hi-rgb', foilHi.join(','));
    root.style.setProperty('--foil-lo', rgb(mixRgb(foil, [0, 0, 0], 0.27)));
    Draw.paperPatterns(root);
}

function showView(name) {
    state.view = name;
    ['select', 'create', 'spawn'].forEach((view) => $(`#${view}View`).classList.toggle('hidden', view !== name));
    $('#shade').className = `shade ${name}`;
    $('#app').dataset.view = name;
}

function bySlot() {
    const slots = {};
    state.characters.forEach((character) => { slots[character.cid] = character; });
    return slots;
}

function selectedCharacter() {
    return state.characters.find((character) => character.citizenid === state.selected) || null;
}

function nameSize(text, width, size, ratio) {
    const length = String(text).length || 1;
    return Math.max(15, Math.min(size, Math.floor(width / (length * ratio))));
}

function passHtml(slot, character) {
    const seat = String(slot).padStart(2, '0');
    if (!character) {
        return `<button type="button" class="pass-wrap empty" data-slot="${slot}">
            <span class="pass empty"><span class="eyebrow">${esc(t('openSeat', { seat }))}</span><strong><em>+</em>${esc(t('applyPassport'))}</strong></span>
        </button>`;
    }
    const name = `${lastName(character).toUpperCase()} / ${firstName(character).toUpperCase()}`;
    const activity = activityOf(character);
    const meta = [`<span class="grow"><small>${esc(t('passClass'))}</small>${esc(jobLine(character).toUpperCase())}</span>`];
    if (activity) {
        meta.push(`<span><small>${esc(t('passFrom'))}</small>${esc(String(activity.lastDistrict || '—').toUpperCase())}</span>`);
        meta.push(`<span><small>${esc(t('passLast'))}</small>${esc(shortDate(fromUnix(activity.lastPlayed)))}</span>`);
    }
    return `<button type="button" class="pass-wrap${character.citizenid === state.selected ? ' sel' : ''}" data-slot="${slot}" data-citizenid="${esc(character.citizenid)}">
        <span class="pass">
            <span class="pass-top"><span class="logo">${esc(ui().title)}</span>${Draw.PLANE}<span>${esc(t('boardingPass'))}</span></span>
            <span class="pass-body">
                ${photoHolder('pass-photo', character.citizenid)}
                <span class="pass-main">
                    <span class="pass-name" style="font-size:${nameSize(name, 262, 29, 0.47)}px">${esc(lastName(character).toUpperCase())}<i>/</i>${esc(firstName(character).toUpperCase())}</span>
                    <span class="pass-meta">${meta.join('')}</span>
                </span>
                <span class="pass-stub"><small>${esc(t('seat'))}</small><b>${seat}</b><span class="bars"></span></span>
            </span>
        </span>
    </button>`;
}

function renderPasses() {
    const slots = bySlot();
    let html = '';
    for (let slot = 1; slot <= state.slots; slot += 1) html += passHtml(slot, slots[slot]);
    $('#passes').innerHTML = html;
    $('#count').innerHTML = esc(t('seatsTaken', { count: state.characters.length, total: state.slots }));
    bindPhotos($('#passes'));
}

function visaPage(character) {
    const stamps = [];
    const job = jobOf(character);
    stamps.push(`<div class="stamp s-job">${Draw.stampCircle(`${t('stampEmployment')} ★ ${ui().title || ''} ★ `.toUpperCase(), job.label.toUpperCase(), ui().showJobGrade && job.grade ? String(job.grade).toUpperCase() : '')}</div>`);
    const activity = activityOf(character);
    if (activity && activity.lastPlayed) {
        stamps.push(`<div class="stamp s-entry">${Draw.stampRect(t('stampAdmitted').toUpperCase(), String(activity.lastDistrict || ui().title || '').toUpperCase(), longDate(fromUnix(activity.lastPlayed)))}</div>`);
    }
    if (activity) {
        const since = fromUnix(activity.createdAt);
        stamps.push(`<div class="stamp s-time">${Draw.stampOval(since ? t('stampSince', { date: longDate(since) }).toUpperCase() : '', playtime(activity.playtimeSeconds), t('stampInCity').toUpperCase())}</div>`);
    }
    const funds = [];
    if (ui().showCash) funds.push(`${t('stampCash').toUpperCase()} ${money(character.money?.cash)}`);
    if (ui().showBank) funds.push(`${t('stampBank').toUpperCase()} ${money(character.money?.bank)}`);
    if (funds.length) stamps.push(`<div class="stamp s-funds">${Draw.stampFunds(t('stampFunds').toUpperCase(), funds)}</div>`);
    const gang = gangOf(character);
    if (gang) stamps.push(`<div class="stamp s-gang">${Draw.stampHex(t('stampAffiliated').toUpperCase(), String(gang).toUpperCase())}</div>`);
    const extra = (character.dossier?.extra || []).filter((field) => field && field.label);
    const observations = extra.map((field) => `${esc(field.label)}: ${esc(field.value)}`).join('  ·  ');
    return `<div class="page visa">
        <div class="page-label">${label('visas')}</div><div class="page-no">${String(character.cid).padStart(2, '0')}</div>
        ${stamps.join('')}
        ${observations ? `<div class="obs"><small>${label('observations')}</small><div>${observations}</div></div>` : ''}
    </div>`;
}

function field(key, value, className = '') {
    return `<div class="field ${className}"><small>${label(key)}</small><b>${esc(value)}</b></div>`;
}

function dataPage(character, overlay = '') {
    const config = ui();
    const passport = passportConfig();
    const activity = character.dossier?.activity || null;
    const birth = parseBirth(character.charinfo?.birthdate);
    const sex = Number(character.charinfo?.gender) === 1 ? t('sexFemale') : t('sexMale');
    const job = jobOf(character);
    const issued = config.showActivity ? fromUnix(activity?.createdAt) : null;
    const expiry = issued ? { y: issued.y + 10, m: issued.m, d: issued.d } : null;
    const number = config.showCitizenId ? character.citizenid : '';
    const fields = [
        `<div class="field trio"><div class="field"><small>${label('fieldType')}</small><b>P</b></div><div class="field"><small>${label('fieldCode')}</small><b>${esc(passport.code || '')}</b></div><div class="field"><small>${label('fieldNumber')}</small><b>${esc(number || '—')}</b></div></div>`,
        field('fieldSurname', lastName(character).toUpperCase(), 'wide big'),
        field('fieldGiven', firstName(character).toUpperCase(), 'wide big')
    ];
    if (config.showNationality) fields.push(field('fieldNationality', String(character.charinfo?.nationality || '—').toUpperCase()));
    fields.push(field('fieldSex', sex));
    if (config.showBirthdate) fields.push(field('fieldBirth', birth ? longDate(birth) : String(character.charinfo?.birthdate || '—').toUpperCase()));
    if (config.showPhone) fields.push(field('fieldPhone', character.dossier?.phone || character.charinfo?.phone || '—'));
    fields.push(field('fieldOccupation', jobText(job).toUpperCase()));
    if (config.showAccount) fields.push(field('fieldAccount', character.dossier?.account || character.charinfo?.account || '—'));
    if (issued) fields.push(field('fieldIssued', longDate(issued)));
    if (config.showGang) fields.push(field('fieldAffiliation', (gangOf(character) || '—').toUpperCase()));
    const [line1, line2] = Draw.mrz({
        code: passport.code || '',
        surname: lastName(character),
        given: firstName(character),
        number,
        nationality: config.showNationality ? character.charinfo?.nationality : '',
        birth: config.showBirthdate ? birth : null,
        sex: Number(character.charinfo?.gender) === 1 ? 'F' : 'M',
        expiry
    });
    return `<div class="page data">
        <div class="data-head"><span>${label('passport')}</span><span class="chip">${esc(ui().title)} ${Draw.CHIP}</span></div>
        ${photoHolder('photo', character.citizenid)}
        <div class="holo">${Draw.seal(64, sealRing())}</div>
        <div class="sig"><div>${esc(fullName(character))}</div><small>${label('signature')}</small></div>
        <div class="fields">${fields.join('')}</div>
        ${photoHolder('ghost', character.citizenid)}
        <div class="mrz">${esc(line1)}\n${esc(line2)}</div>
        ${overlay}
    </div>`;
}

function closedCover() {
    return `<div class="cover-closed">
        <div class="cover-face">
            <div class="cover-issuer">${esc(passportConfig().issuer || '')}</div>
            ${Draw.seal(150, sealRing())}
            <div class="cover-word">${esc(t('passport').toUpperCase())}</div>
            <div class="cover-chip">${Draw.CHIP}</div>
        </div>
        <p>${esc(t('noCharacters'))}</p>
    </div>`;
}

function renderPassport() {
    const character = selectedCharacter();
    const holder = $('#passport');
    if (!character) {
        holder.innerHTML = closedCover();
        return;
    }
    const allowDelete = state.config.characters?.allowDelete;
    holder.innerHTML = `<div class="booklet">${visaPage(character)}<div class="stitch"></div>${dataPage(character)}</div>
        <div class="pp-actions">
            ${allowDelete ? `<button type="button" class="btn-ghost-red" id="deleteOpen">${esc(t('cancelPassport'))}</button>` : '<span></span>'}
            <button type="button" class="btn-go" id="playButton"${state.busy ? ' disabled' : ''}>${esc(t('play'))} <span>→</span></button>
        </div>`;
    $('#playButton').addEventListener('click', () => play(character));
    if (allowDelete) $('#deleteOpen').addEventListener('click', () => openDelete(character));
    bindPhotos(holder);
}

function select(citizenid) {
    if (!citizenid || state.busy) return;
    const changed = state.selected !== citizenid;
    state.selected = citizenid;
    document.querySelectorAll('.pass-wrap').forEach((pass) => pass.classList.toggle('sel', pass.dataset.citizenid === citizenid));
    renderPassport();
    if (changed) nui('preview', { citizenid });
}

function defaultSelection() {
    if (state.characters.some((character) => character.citizenid === state.selected)) return state.selected;
    const visible = state.characters.filter((character) => character.cid <= state.slots);
    if (!visible.length) return null;
    const recent = [...visible].sort((a, b) => (b.dossier?.activity?.lastPlayed || 0) - (a.dossier?.activity?.lastPlayed || 0))[0];
    return (recent && recent.dossier?.activity?.lastPlayed ? recent : visible.sort((a, b) => a.cid - b.cid)[0]).citizenid;
}

function renderSelect() {
    renderPasses();
    const pick = defaultSelection();
    if (pick && pick !== state.selected) {
        state.selected = null;
        select(pick);
    } else {
        renderPassport();
    }
}

function play(character) {
    if (state.busy) return;
    state.busy = true;
    state.playing = character;
    const button = $('#playButton');
    if (button) button.disabled = true;
    nui('play', { citizenid: character.citizenid });
}

function combHtml(id, length, cell, value = '', extra = '') {
    const size = Math.max(12, Math.min(19, (cell - 6) / 0.6));
    return `<span class="comb" style="--cells:${length};--cell:${cell}px;--fs:${size.toFixed(1)}px"><input id="${id}" maxlength="${length}" value="${esc(value)}" spellcheck="false" ${extra}></span>`;
}

function renderCreate() {
    const characters = state.config.characters || {};
    const nameLength = Math.max(2, Number(characters.nameMaxLength) || 18);
    const nameCell = Math.min(25, Math.floor(450 / nameLength));
    const issuerLine = t('formIssuer', { issuer: passportConfig().issuer || '', title: ui().title || '' });
    const dateParts = hintParts().map((part, index) => (part.key
        ? `<span class="comb" style="--cells:${part.length};--cell:25px;--fs:19px"><input class="dob" data-key="${part.key}" data-index="${index}" maxlength="${part.length}" inputmode="numeric" spellcheck="false" placeholder="${esc(part.hint)}"></span>`
        : `<em>${esc(part.separator)}</em>`)).join('');
    $('#createForm').innerHTML = `
        <div class="af-head">${Draw.seal(64, sealRing())}<div><small>${esc(issuerLine)}</small><h2>${esc(t('applicationTitle'))}</h2></div><div class="af-form-no">${esc(t('formNumber'))}</div></div>
        <p class="af-note">${esc(t('formNote'))}</p>
        <div class="band"><b>1</b> ${esc(t('sectionApplicant'))}</div>
        <div class="af-grid">
            <div>
                <div class="af-field"><label for="lastname"><b>1</b>${label('fieldSurname')}</label>${combHtml('lastname', nameLength, nameCell)}</div>
                <div class="af-field"><label for="firstname"><b>2</b>${label('fieldGiven')}</label>${combHtml('firstname', nameLength, nameCell)}</div>
                <div class="af-field"><label><b>3</b>${label('fieldBirth')} <i>· ${esc(characters.dateFormatHint || 'MM/DD/YYYY')}</i></label><span class="comb-date">${dateParts}</span></div>
                <div class="af-field"><label><b>4</b>${label('fieldSex')}</label><div class="checks">
                    <button type="button" class="check" data-gender="0"><i></i>${esc(t('male'))}</button>
                    <button type="button" class="check" data-gender="1"><i></i>${esc(t('female'))}</button>
                </div></div>
                <div class="af-field"><label for="nationality"><b>5</b>${label('fieldNationality')}</label>${combHtml('nationality', 24, 18, characters.defaultNationality || '')}</div>
            </div>
            <div class="photo-box"><span class="photo-tag">${esc(t('photoBox'))}</span>${photoHolder('ph', 'new')}<small>${esc(t('photoNote'))}</small></div>
        </div>
        <div class="band"><b>2</b> ${esc(t('sectionDeclaration'))}</div>
        <div class="declare"><span class="check static"><i id="declareTick"></i></span><span>${esc(t('declaration'))}</span></div>
        <div class="sign-row"><div><span class="sigtext" id="signature"></span></div><div><span class="datetext">${esc(longDate(today()))}</span></div></div>
        <div class="sign-row labels"><small>${esc(t('signatureApplicant'))}</small><small>${esc(t('formDate'))}</small></div>
        <p class="af-error hidden" id="createError"></p>
        <div class="af-actions"><span class="micro">${esc(t('formFooter', { slot: String(state.createSlot).padStart(2, '0') }))}</span><div class="btns">
            <button type="button" class="btn-plain" id="createBack">${esc(t('back'))}</button>
            <button type="submit" class="btn-navy" id="createSubmit" disabled>${esc(t('submitApplication'))}</button>
        </div></div>`;
    bindPhotos($('#createForm'));
    setGender(state.createGender, true);
    $('#createBack').addEventListener('click', closeCreate);
    document.querySelectorAll('#createForm .check[data-gender]').forEach((button) => {
        button.addEventListener('click', () => setGender(Number(button.dataset.gender)));
    });
    ['lastname', 'firstname', 'nationality'].forEach((id) => $(`#${id}`).addEventListener('input', validateCreate));
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
    renderCustoms();
    validateCreate();
}

function createValues() {
    const characters = state.config.characters || {};
    const minimum = Math.max(1, Number(characters.nameMinLength) || 2);
    const firstname = $('#firstname').value.trim();
    const lastname = $('#lastname').value.trim();
    const nationality = $('#nationality').value.trim();
    const parts = hintParts();
    const inputs = [...document.querySelectorAll('#createForm .dob')];
    const date = {};
    let birthdate = '';
    let inputIndex = 0;
    parts.forEach((part) => {
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
    $('#signature').textContent = `${values.firstname} ${values.lastname}`.trim();
    $('#createSubmit').disabled = !values.valid || state.busy;
    $('#declareTick').classList.toggle('tick', values.valid);
    const error = $('#createError');
    error.classList.toggle('hidden', !values.dateProblem);
    error.textContent = values.dateProblem ? t('invalidDate') : '';
    return values;
}

function setGender(gender, quiet) {
    state.createGender = gender === 1 ? 1 : 0;
    document.querySelectorAll('#createForm .check[data-gender]').forEach((button) => {
        button.classList.toggle('on', Number(button.dataset.gender) === state.createGender);
    });
    if (!quiet) nui('preview', { gender: state.createGender });
}

function renderCustoms() {
    const holder = $('#customs');
    const kit = state.kit;
    if (!kit || (!kit.cash && !kit.bank && !(kit.items || []).length)) {
        holder.innerHTML = '';
        holder.classList.add('hidden');
        return;
    }
    holder.classList.remove('hidden');
    const rows = [];
    if (kit.cash) rows.push([t('customsCash'), t('customsCashNote'), money(kit.cash)]);
    if (kit.bank) rows.push([t('customsBank'), t('customsBankNote'), money(kit.bank)]);
    (kit.items || []).forEach((item) => rows.push([item.label || item.name, '', String(item.amount)]));
    holder.innerHTML = `
        <div class="eyebrow">${esc(t('onArrival'))}</div>
        <div class="h2">${esc(t('startWith'))}</div>
        <div class="customs">
            <div class="cd-head"><b>${esc(t('customsTitle'))}</b><span>${esc(t('customsForm'))}</span></div>
            <p class="cd-lead">${esc(t('customsLead'))}</p>
            <div class="cd-table">
                <div class="cd-row head"><span>${esc(t('customsArticle'))}</span><span>${esc(t('customsQty'))}</span><span></span></div>
                ${rows.map(([name, note, quantity]) => `<div class="cd-row"><span class="art">${esc(name)}${note ? `<small>${esc(note)}</small>` : ''}</span><span class="qty">${esc(quantity)}</span><span class="tk">✓</span></div>`).join('')}
            </div>
            <div class="cd-foot">${esc(t('customsFoot'))}</div>
            <div class="cleared">${Draw.stampRound(t('customsRing').toUpperCase(), t('customsCleared').toUpperCase(), 128)}</div>
        </div>`;
}

function openCreate(slot) {
    if (state.busy) return;
    state.createSlot = slot;
    state.createGender = 0;
    showView('create');
    renderCreate();
    nui('preview', { gender: 0 });
    setTimeout(() => $('#lastname')?.focus(), 30);
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
    const cell = word.length > 8 ? 36 : 46;
    const view = $('#deleteView');
    view.innerHTML = `<div class="del">
        <div class="booklet single">${dataPage(character, `${Draw.holes(t('cancelledWord'), 582, 404)}<div class="void">${Draw.stampBox(t('voidWord'))}</div>`)}</div>
        <div class="del-text">
            <div class="eyebrow">${esc(t('permanentAction'))}</div>
            <h2>${esc(t('deleteQuestion', { name: fullName(character) }))}</h2>
            <p>${esc(t('deleteWarning'))} ${esc(t('typeToConfirm', { word }))}</p>
            <span class="comb dark" style="--cells:${word.length};--cell:${cell}px;--fs:${cell > 40 ? 30 : 24}px"><input id="deleteInput" maxlength="${word.length}" spellcheck="false" autocomplete="off"></span>
            <div class="del-actions"><button type="button" class="btn-ghost" id="deleteKeep">${esc(t('keepIt'))}</button><button type="button" class="btn-red" id="deleteConfirm" disabled>${esc(t('cancelPassport'))}</button></div>
        </div>
    </div>`;
    view.classList.remove('hidden');
    bindPhotos(view);
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
    state.deleting = null;
    state.view = 'select';
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

function gateFor(categoryIndex, index) {
    return `${String.fromCharCode(65 + (categoryIndex % 26))}${index}`;
}

function spawnRows() {
    const rows = [];
    const known = new Set();
    let categoryIndex = 0;
    const groups = state.categories.map((category) => ({ category, list: state.spawns.filter((spawn) => (spawn.category || 'city') === category.id) }));
    state.categories.forEach((category) => known.add(category.id));
    const loose = state.spawns.filter((spawn) => !known.has(spawn.category || 'city'));
    if (loose.length) groups.push({ category: { id: '_other', label: '' }, list: loose });
    groups.forEach(({ category, list }) => {
        if (!list.length) return;
        rows.push({ heading: category.label });
        list.forEach((spawn, index) => rows.push({ spawn, gate: gateFor(categoryIndex, index + 1), region: category.label }));
        categoryIndex += 1;
    });
    return rows;
}

function renderBoard() {
    const rows = spawnRows();
    const width = (count) => `width:${count * 20 - 2}px`;
    const body = rows.map((row) => {
        if (row.heading !== undefined) return row.heading ? `<div class="cat">${esc(row.heading.toUpperCase())}</div>` : '<div class="cat"></div>';
        const spawn = row.spawn;
        const focus = spawn.id === state.focusSpawn;
        const status = focus ? ['statusBoarding', 'st-boarding'] : spawn.id === 'last' ? ['statusReturn', 'st-return'] : ['statusOnTime', 'st-time'];
        return `<button type="button" class="row${focus ? ' focus' : ''}" data-id="${esc(spawn.id)}">${Draw.flaps(spawn.label, 18)}${Draw.flaps(spawn.district || '', 14)}${Draw.flaps(row.gate, 3)}<span class="${status[1]}">${Draw.flaps(t(status[0]), 9)}</span></button>`;
    }).join('');
    const now = new Date();
    const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    $('#board').innerHTML = `
        <div class="board-head">${Draw.PLANE}<b>${esc(t('departures').toUpperCase())}</b>${alt('departures') ? `<span class="es">${esc(alt('departures').toUpperCase())}</span>` : ''}<span class="clock">${Draw.flaps(clock, 5)}</span></div>
        <div class="cols"><span style="${width(18)}">${esc(t('colDestination'))}</span><span style="${width(14)}">${esc(t('colDistrict'))}</span><span style="${width(3)}">${esc(t('colGate'))}</span><span style="${width(9)}">${esc(t('colStatus'))}</span></div>
        <div class="board-rows">${body}</div>
        <div class="board-foot"><span>${esc(t('boardHint'))}</span><span>${esc(t('boardClick'))}</span></div>`;
    return rows;
}

function renderBoardingPass() {
    const rows = spawnRows();
    const row = rows.find((entry) => entry.spawn && entry.spawn.id === state.focusSpawn);
    const holder = $('#boardingPass');
    if (!row) {
        holder.innerHTML = '';
        return;
    }
    const character = state.playing;
    const spawn = row.spawn;
    holder.innerHTML = `<div class="bpass">
        <div class="bp-main">
            <div class="bp-top"><span class="logo">${esc(ui().title)}</span>${Draw.PLANE}<span>${esc(t('boardingPass'))}</span>${alt('boardingPass') ? `<span class="r">${esc(alt('boardingPass'))}</span>` : ''}</div>
            <div class="bp-grid">
                <div class="half"><small>${esc(t('passenger'))}</small><b>${esc(character ? `${lastName(character).toUpperCase()} / ${firstName(character).toUpperCase()}` : '—')}</b></div>
                <div><small>${esc(t('seat'))}</small><b>${esc(character ? String(character.cid).padStart(2, '0') : '—')}</b></div>
                <div><small>${esc(t('colGate'))}</small><b>${esc(row.gate)}</b></div>
                <div class="wide to"><small>${esc(t('passTo'))}</small><b style="font-size:${nameSize(spawn.label, 470, 38, 0.46)}px">${esc(String(spawn.label).toUpperCase())}</b>${spawn.description ? `<em>${esc(spawn.description)}</em>` : ''}</div>
                <div class="half"><small>${esc(t('colDistrict'))}</small><b>${esc(String(spawn.district || '—').toUpperCase())}</b></div>
                <div class="half"><small>${esc(t('passRegion'))}</small><b>${esc(String(row.region || '—').toUpperCase())}</b></div>
            </div>
        </div>
        <div class="bp-stub"><div class="barcode"></div><button type="button" id="boardButton"${state.busy ? ' disabled' : ''}>${esc(t('board').toUpperCase())} →<span>${esc(t('tearHere').toUpperCase())}</span></button></div>
    </div>`;
    $('#boardButton').addEventListener('click', () => board(spawn.id));
}

function focusSpawn(id, quiet) {
    if (!id || state.focusSpawn === id) return;
    state.focusSpawn = id;
    renderBoard();
    renderBoardingPass();
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
    const character = state.playing;
    $('#spawnHead').innerHTML = `<div class="eyebrow">${esc(character ? t('arrivalEyebrow', { name: fullName(character) }) : t('arrivalEyebrowPlain'))}</div><div class="h1">${esc(t('chooseSpawn'))}</div>`;
    const first = spawnRows().find((row) => row.spawn);
    state.focusSpawn = null;
    if (first) focusSpawn(first.spawn.id);
    else {
        renderBoard();
        renderBoardingPass();
    }
}

function showArrival(data) {
    const holder = $('#arrival');
    const date = longDate(today());
    holder.innerHTML = `
        <div class="letterbox top"></div><div class="letterbox bottom"></div>
        <div class="arr-card">
            <div class="page visa">
                <div class="page-label">${label('visas')}</div>
                <div class="arr-stamp stamp">${Draw.stampRect(t('stampAdmitted').toUpperCase(), String(data.place || '').toUpperCase(), date)}</div>
                <div class="arr-note">${esc(t('arrivalWelcome', { name: data.firstname || '' }))}</div>
            </div>
        </div>
        <div class="arr-skip">${esc(t('arrivalSkip'))}</div>`;
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
    renderBrand();
    $('#manifestLabel').textContent = t('manifest');
    $('#yourCharacters').textContent = t('yourCharacters');
    $('#passes').innerHTML = '';
    $('#passport').innerHTML = '';
    $('#count').textContent = '';
    $('#app').classList.remove('hidden');
    showView('select');
}

function onCharacters(data) {
    state.characters = data.characters || [];
    state.slots = Math.max(1, Number(data.slots) || 1);
    state.kit = data.kit || null;
    state.busy = false;
    if (state.view === 'select') renderSelect();
    if (state.view === 'create') {
        showView('select');
        renderSelect();
    }
}

function moveSelection(step) {
    const filled = [...document.querySelectorAll('.pass-wrap[data-citizenid]')];
    if (!filled.length) return;
    const index = filled.findIndex((pass) => pass.dataset.citizenid === state.selected);
    const next = filled[(index + step + filled.length) % filled.length];
    select(next.dataset.citizenid);
    next.focus();
}

function moveSpawn(step) {
    const rows = [...document.querySelectorAll('#board .row')];
    if (!rows.length) return;
    const index = rows.findIndex((row) => row.dataset.id === state.focusSpawn);
    const next = rows[(index + step + rows.length) % rows.length];
    focusSpawn(next.dataset.id);
    $(`#board .row[data-id="${CSS.escape(next.dataset.id)}"]`)?.focus();
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
            if (state.view === 'select') renderPassport();
            if (state.view === 'create') validateCreate();
            if (state.view === 'spawn') renderBoardingPass();
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

$('#passes').addEventListener('click', (event) => {
    const pass = event.target.closest('.pass-wrap');
    if (!pass) return;
    if (pass.dataset.citizenid) select(pass.dataset.citizenid);
    else openCreate(Number(pass.dataset.slot));
});

$('#createForm').addEventListener('submit', submitCreate);

let spawnDwell = null;
$('#board').addEventListener('mouseover', (event) => {
    const row = event.target.closest('.row');
    if (!row) return;
    clearTimeout(spawnDwell);
    spawnDwell = setTimeout(() => focusSpawn(row.dataset.id), 180);
});
$('#board').addEventListener('mouseleave', () => clearTimeout(spawnDwell));
$('#board').addEventListener('click', (event) => {
    const row = event.target.closest('.row');
    if (row) board(row.dataset.id);
});

document.addEventListener('keydown', (event) => {
    if (Admin.isOpen()) {
        if (event.key === 'Escape') nui('adminClose');
        return;
    }
    if ($('#app').classList.contains('hidden')) return;
    if (state.view === 'delete') {
        if (event.key === 'Escape') closeDelete();
        return;
    }
    if (state.view === 'create') {
        if (event.key === 'Escape') closeCreate();
        return;
    }
    if (state.view === 'select') {
        if (event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1); }
        if (event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1); }
        if (event.key === 'Enter' && document.activeElement?.tagName !== 'INPUT') {
            const character = selectedCharacter();
            if (character) { event.preventDefault(); play(character); }
        }
        return;
    }
    if (state.view === 'spawn') {
        if (event.key === 'ArrowDown') { event.preventDefault(); moveSpawn(1); }
        if (event.key === 'ArrowUp') { event.preventDefault(); moveSpawn(-1); }
        if (event.key === 'Enter') { event.preventDefault(); board(state.focusSpawn); }
    }
});

window.addEventListener('resize', fit);
fit();
