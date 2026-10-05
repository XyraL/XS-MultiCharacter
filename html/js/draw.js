const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

const Draw = (() => {
    let uid = 0;
    const next = (prefix) => `${prefix}${++uid}`;

    const PLANE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 19h19v2h-19v-2zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06L14.92 10l-6.9-6.43-1.93.51 4.14 7.17-4.97 1.33-1.97-1.54-1.45.39 2.59 4.49L21 11.49c.81-.23 1.28-1.05 1.07-1.85z"/></svg>';
    const CHIP = '<svg viewBox="0 0 34 22" aria-hidden="true"><rect x="1" y="1" width="32" height="20" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="6" y1="5.5" x2="28" y2="5.5" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="11" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="6" y1="16.5" x2="28" y2="16.5" stroke="currentColor" stroke-width="1.6"/></svg>';
    const SILHOUETTE = '<svg class="silhouette" viewBox="0 0 60 75" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><circle cx="30" cy="27" r="13" fill="currentColor"/><path d="M4 75c1-16 12-25 26-25s25 9 26 25z" fill="currentColor"/></svg>';

    function svgUrl(w, h, body) {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`;
        const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/[(]/g, '%28').replace(/[)]/g, '%29');
        return `url('data:image/svg+xml;utf8,${encoded}')`;
    }

    function waves(w, h, color, options = {}) {
        const { lines = 30, amp = 9, wavelength = 150, step = 6, phase = 0.36, width = 0.55, opacity = 0.5 } = options;
        let paths = '';
        for (let i = 0; i < lines; i += 1) {
            const y0 = (h / lines) * (i + 0.5);
            let d = '';
            for (let x = 0; x <= w; x += step) {
                const y = y0 + amp * Math.sin((x / wavelength) * 2 * Math.PI + i * phase) + amp * 0.45 * Math.sin((x / (wavelength * 0.41)) * 2 * Math.PI - i * 0.8);
                d += `${x === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
            }
            paths += `<path d='${d}' fill='none' stroke='${color}' stroke-width='${width}' opacity='${opacity}'/>`;
        }
        return svgUrl(w, h, paths);
    }

    function rosette(size, color, options = {}) {
        const { loops = 14, petals = 14, radius = 0.36, swing = 0.07, width = 0.5, opacity = 0.55 } = options;
        const centre = size / 2;
        let paths = '';
        for (let j = 0; j < loops; j += 1) {
            const offset = (j / loops) * (2 * Math.PI / petals);
            let d = '';
            for (let t = 0; t <= 360; t += 1) {
                const theta = (t / 360) * 2 * Math.PI;
                const r = size * (radius + swing * Math.sin(petals * (theta + offset)) + 0.03 * Math.sin(3 * petals * theta));
                d += `${t === 0 ? 'M' : 'L'}${(centre + Math.cos(theta) * r).toFixed(1)} ${(centre + Math.sin(theta) * r).toFixed(1)} `;
            }
            paths += `<path d='${d}Z' fill='none' stroke='${color}' stroke-width='${width}' opacity='${opacity}'/>`;
        }
        return svgUrl(size, size, paths);
    }

    function paperPatterns(root) {
        root.style.setProperty('--visa-paper', waves(582, 330, '#7aa58f', { opacity: 0.42 }));
        root.style.setProperty('--data-paper', waves(582, 404, '#7f9ac8', { opacity: 0.32, amp: 7, wavelength: 120 }));
        root.style.setProperty('--rosette', rosette(520, '#c7849b', { opacity: 0.32 }));
    }

    function seal(size, ring) {
        const id = next('seal');
        let rays = '';
        for (let i = 0; i < 32; i += 1) {
            const a = (i / 32) * Math.PI * 2;
            const r1 = 19;
            const r2 = i % 2 ? 24 : 27;
            rays += `<line x1="${(50 + Math.cos(a) * r1).toFixed(2)}" y1="${(50 + Math.sin(a) * r1).toFixed(2)}" x2="${(50 + Math.cos(a) * r2).toFixed(2)}" y2="${(50 + Math.sin(a) * r2).toFixed(2)}" stroke="currentColor" stroke-width="1.1"/>`;
        }
        const star = [];
        for (let i = 0; i < 10; i += 1) {
            const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
            const r = i % 2 ? 6.5 : 15;
            star.push(`${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`);
        }
        return `<svg class="seal" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" stroke-width="2.2"/>
            <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="1"/>
            <path id="${id}" d="M50,50 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0" fill="none"/>
            <text font-family="Cinzel, serif" font-weight="700" font-size="8.2" letter-spacing="1.3" fill="currentColor"><textPath href="#${id}">${esc(ring)}</textPath></text>
            ${rays}
            <polygon points="${star.join(' ')}" fill="currentColor"/>
        </svg>`;
    }

    function stampCircle(ring, title, sub) {
        const id = next('ring');
        return `<svg width="170" height="170" viewBox="0 0 170 170" class="ink blue">
            <circle cx="85" cy="85" r="80" fill="none" stroke="currentColor" stroke-width="4"/>
            <circle cx="85" cy="85" r="72" fill="none" stroke="currentColor" stroke-width="1.4"/>
            <circle cx="85" cy="85" r="47" fill="none" stroke="currentColor" stroke-width="1.4"/>
            <path id="${id}" d="M85,85 m-60,0 a60,60 0 1,1 120,0 a60,60 0 1,1 -120,0" fill="none"/>
            <text font-family="Inter, sans-serif" font-weight="800" font-size="11.5" letter-spacing="2.6" fill="currentColor"><textPath href="#${id}">${esc(ring)}</textPath></text>
            <text x="85" y="65" text-anchor="middle" font-size="12" fill="currentColor">★</text>
            <text x="85" y="88" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="${fit(title, 25, 84)}" letter-spacing="1" fill="currentColor">${esc(title)}</text>
            ${sub ? `<text x="85" y="106" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="${fit(sub, 9.5, 80, 0.72)}" letter-spacing="2" fill="currentColor">${esc(sub)}</text>` : ''}
        </svg>`;
    }

    function stampRect(top, middle, bottom) {
        return `<svg width="214" height="112" viewBox="0 0 214 112" class="ink red">
            <rect x="2" y="2" width="210" height="108" rx="6" fill="none" stroke="currentColor" stroke-width="3.2"/>
            <rect x="9" y="9" width="196" height="94" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
            <text x="107" y="34" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="17" letter-spacing="5" fill="currentColor">${esc(top)}</text>
            <line x1="22" y1="44" x2="192" y2="44" stroke="currentColor" stroke-width="1.2"/>
            <text x="107" y="68" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="${fit(middle, 22, 180)}" letter-spacing="1.5" fill="currentColor">${esc(middle)}</text>
            <text x="107" y="92" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-weight="700" font-size="15" letter-spacing="1.5" fill="currentColor">${esc(bottom)}</text>
        </svg>`;
    }

    function stampOval(top, big, line) {
        return `<svg width="176" height="104" viewBox="0 0 176 104" class="ink green">
            <ellipse cx="88" cy="52" rx="85" ry="49" fill="none" stroke="currentColor" stroke-width="3.2"/>
            <ellipse cx="88" cy="52" rx="77" ry="42" fill="none" stroke="currentColor" stroke-width="1.1"/>
            <text x="88" y="27" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="7.5" letter-spacing="1.8" fill="currentColor">${esc(top)}</text>
            <text x="88" y="57" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="${fit(big, 40, 130)}" fill="currentColor">${esc(big)}</text>
            <text x="88" y="76" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="8.5" letter-spacing="2.2" fill="currentColor">${esc(line)}</text>
        </svg>`;
    }

    function stampFunds(title, lines) {
        const rows = lines.map((text, index) => `<text x="16" y="${lines.length === 1 ? 56 : 50 + index * 17}" font-family="IBM Plex Mono, monospace" font-weight="700" font-size="15" fill="currentColor">${esc(text)}</text>`).join('');
        return `<svg width="232" height="78" viewBox="0 0 232 78" class="ink violet">
            <rect x="2" y="2" width="228" height="74" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="7 3"/>
            <text x="116" y="22" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="10" letter-spacing="3.2" fill="currentColor">${esc(title)}</text>
            ${rows}
        </svg>`;
    }

    function stampHex(top, middle) {
        return `<svg width="140" height="86" viewBox="0 0 140 86" class="ink rust">
            <polygon points="22,3 118,3 137,43 118,83 22,83 3,43" fill="none" stroke="currentColor" stroke-width="3"/>
            <polygon points="27,10 113,10 129,43 113,76 27,76 11,43" fill="none" stroke="currentColor" stroke-width="1.1"/>
            <text x="70" y="32" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="8.5" letter-spacing="2.4" fill="currentColor">${esc(top)}</text>
            <text x="70" y="56" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="${fit(middle, 20, 104)}" letter-spacing="1" fill="currentColor">${esc(middle)}</text>
        </svg>`;
    }

    function stampRound(ring, word, size = 150) {
        const id = next('round');
        return `<svg width="${size}" height="${size}" viewBox="0 0 150 150" class="ink red">
            <circle cx="75" cy="75" r="70" fill="none" stroke="currentColor" stroke-width="3.5"/>
            <circle cx="75" cy="75" r="62" fill="none" stroke="currentColor" stroke-width="1.2"/>
            <path id="${id}" d="M75,75 m-52,0 a52,52 0 1,1 104,0 a52,52 0 1,1 -104,0" fill="none"/>
            <text font-family="Inter, sans-serif" font-weight="800" font-size="10" letter-spacing="3" fill="currentColor"><textPath href="#${id}">${esc(ring)}</textPath></text>
            <text x="75" y="84" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="${fit(word, 30, 98)}" letter-spacing="2" fill="currentColor">${esc(word)}</text>
        </svg>`;
    }

    function stampBox(word) {
        return `<svg width="240" height="96" viewBox="0 0 240 96" class="ink red">
            <rect x="3" y="3" width="234" height="90" rx="8" fill="none" stroke="currentColor" stroke-width="5"/>
            <text x="120" y="70" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="${fit(word, 66, 210, 0.62)}" letter-spacing="10" fill="currentColor">${esc(word)}</text>
        </svg>`;
    }

    function fit(text, size, width, ratio = 0.5) {
        const length = String(text || '').length || 1;
        return Math.max(8, Math.min(size, Math.floor(width / (length * ratio))));
    }

    function flaps(text, count) {
        const chars = [...String(text || '').toUpperCase()].slice(0, count);
        while (chars.length < count) chars.push(' ');
        return `<span class="cell">${chars.map((character) => `<i class="f">${character === ' ' ? '&nbsp;' : esc(character)}</i>`).join('')}</span>`;
    }

    const GLYPHS = {
        A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.',
        C: '.###.|#...#|#....|#....|#....|#...#|.###.', D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
        E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
        G: '.###.|#...#|#....|#.###|#...#|#...#|.###.', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
        I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.', J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
        K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
        M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
        O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.', P: '####.|#...#|#...#|####.|#....|#....|#....',
        Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
        S: '.###.|#...#|#....|.###.|....#|#...#|.###.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
        U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.', V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
        W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
        Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####'
    };

    function holes(word, width, height) {
        const letters = [...String(word || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()].slice(0, 12);
        const pitch = Math.min(9, Math.floor((width - 80) / (letters.length * 6)));
        const radius = pitch * 0.35;
        const x0 = (width - (letters.length * 6 - 1) * pitch) / 2;
        const y0 = height * 0.37;
        let dots = '';
        letters.forEach((letter, index) => {
            const glyph = GLYPHS[letter];
            if (!glyph) return;
            glyph.split('|').forEach((row, ry) => {
                [...row].forEach((cell, rx) => {
                    if (cell !== '#') return;
                    const cx = x0 + index * pitch * 6 + rx * pitch;
                    const cy = y0 + ry * pitch;
                    dots += `<circle cx="${(cx + 0.7).toFixed(1)}" cy="${(cy + 0.9).toFixed(1)}" r="${radius.toFixed(2)}" fill="rgba(255,255,255,.75)"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(2)}" fill="#0a0d16" stroke="rgba(245,241,230,.9)" stroke-width=".9"/>`;
                });
            });
        });
        return `<svg class="holes" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">${dots}</svg>`;
    }

    const NATIONS = {
        AMERICAN: 'USA', CANADIAN: 'CAN', MEXICAN: 'MEX', BRITISH: 'GBR', ENGLISH: 'GBR', SCOTTISH: 'GBR', WELSH: 'GBR',
        IRISH: 'IRL', FRENCH: 'FRA', GERMAN: 'DEU', ITALIAN: 'ITA', SPANISH: 'ESP', PORTUGUESE: 'PRT', DUTCH: 'NLD',
        BELGIAN: 'BEL', SWEDISH: 'SWE', NORWEGIAN: 'NOR', DANISH: 'DNK', FINNISH: 'FIN', POLISH: 'POL', RUSSIAN: 'RUS',
        UKRAINIAN: 'UKR', AUSTRALIAN: 'AUS', BRAZILIAN: 'BRA', ARGENTINIAN: 'ARG', ARGENTINE: 'ARG', COLOMBIAN: 'COL',
        CUBAN: 'CUB', 'PUERTO RICAN': 'PRI', JAMAICAN: 'JAM', JAPANESE: 'JPN', CHINESE: 'CHN', KOREAN: 'KOR',
        INDIAN: 'IND', FILIPINO: 'PHL', VIETNAMESE: 'VNM', NIGERIAN: 'NGA', 'SOUTH AFRICAN': 'ZAF', TURKISH: 'TUR',
        GREEK: 'GRC', ALBANIAN: 'ALB', ARMENIAN: 'ARM', ISRAELI: 'ISR', PAKISTANI: 'PAK', THAI: 'THA'
    };

    function mrzText(value) {
        return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '<');
    }

    function check(text) {
        const weights = [7, 3, 1];
        let total = 0;
        [...text].forEach((character, index) => {
            const value = character === '<' ? 0 : /[0-9]/.test(character) ? Number(character) : character.charCodeAt(0) - 55;
            total += value * weights[index % 3];
        });
        return String(total % 10);
    }

    function nationCode(nationality) {
        const key = String(nationality || '').trim().toUpperCase();
        if (NATIONS[key]) return NATIONS[key];
        return mrzText(key).replace(/</g, '').slice(0, 3).padEnd(3, '<');
    }

    function yymmdd(date) {
        if (!date) return '<<<<<<';
        return String(date.y % 100).padStart(2, '0') + String(date.m).padStart(2, '0') + String(date.d).padStart(2, '0');
    }

    function mrz({ code, surname, given, number, nationality, birth, sex, expiry }) {
        const line1 = (`P<${mrzText(code).slice(0, 3).padEnd(3, '<')}${mrzText(surname)}<<${mrzText(given)}`).padEnd(44, '<').slice(0, 44);
        const doc = mrzText(number).slice(0, 9).padEnd(9, '<');
        const birthText = yymmdd(birth);
        const expiryText = yymmdd(expiry);
        const personal = '<'.repeat(14);
        const a = doc + check(doc);
        const b = birthText + check(birthText);
        const e = expiryText + check(expiryText);
        const p = personal + check(personal);
        const line2 = a + nationCode(nationality) + b + (sex || '<') + e + p + check(a + b + e + p);
        return [line1, line2];
    }

    return {
        PLANE, CHIP, SILHOUETTE, paperPatterns, seal, stampCircle, stampRect, stampOval, stampFunds, stampHex,
        stampRound, stampBox, flaps, holes, mrz, fit
    };
})();
