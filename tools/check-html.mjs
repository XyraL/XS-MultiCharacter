// Every tag in html/index.html closes where it opened, and every screen the
// page paints starts hidden.
//
// Ported from XS-Mechanic, where a two-line deletion left a closing tag behind
// and pulled the whole tablet out of the element that hides it. Nothing that
// parses JavaScript reads the markup, so this does.
//
//   node tools/check-html.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(HERE, '..', 'html', 'index.html');
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

// Inside #app, because the player screens are shown and hidden with it.
const INSIDE_APP = ['manifest', 'passport', 'app-form', 'board'];

const blank = (s) => s.replace(/[^\n]/g, ' ');
const raw = readFileSync(FILE, 'utf8');
const src = raw
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, body, close) => open + blank(body) + close)
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open, body, close) => open + blank(body) + close);

const stack = [];
const problems = [];
const parents = {};
const bodyChildren = [];
let elements = 0;
let line = 1;
let at = 0;

for (const m of src.matchAll(/<\/?([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
    line += (src.slice(at, m.index).match(/\n/g) || []).length;
    at = m.index;
    const tag = m[1].toLowerCase();
    const attrs = m[2] || '';

    if (m[0][1] === '/') {
        const top = stack.pop();
        if (!top) problems.push(`line ${line}: </${tag}> with nothing open`);
        else if (top.tag !== tag) {
            problems.push(`line ${line}: </${tag}> closes <${top.tag}${top.id ? '#' + top.id : ''}> opened on line ${top.line}`);
            stack.push(top);
        }
        continue;
    }
    if (VOID.has(tag) || attrs.trim().endsWith('/')) continue;

    const id = (attrs.match(/\bid="([^"]+)"/) || [])[1] || null;
    const classes = ((attrs.match(/\bclass="([^"]+)"/) || [])[1] || '').split(/\s+/).filter(Boolean);

    if (stack.length && stack[stack.length - 1].tag === 'body' && !['script', 'svg'].includes(tag)) {
        bodyChildren.push({ tag, id, classes, line });
    }
    for (const cls of classes) {
        if (INSIDE_APP.includes(cls)) parents[cls] = stack.map((s) => s.id).filter(Boolean);
    }
    stack.push({ tag, id, line });
    elements += 1;
}

for (const open of stack) {
    if (!['html', 'body'].includes(open.tag)) problems.push(`line ${open.line}: <${open.tag}${open.id ? '#' + open.id : ''}> is never closed`);
}
for (const child of bodyChildren) {
    if (!child.classes.includes('hidden')) {
        problems.push(`line ${child.line}: <${child.tag}${child.id ? '#' + child.id : ''}> sits on <body> without the hidden class, so it paints from the moment the page loads`);
    }
}
for (const cls of INSIDE_APP) {
    if (!(cls in parents)) problems.push(`.${cls} is not in the page at all`);
    else if (!parents[cls].includes('app')) problems.push(`.${cls} is not inside #app, so closing the screens would leave it up`);
}

if (problems.length) {
    console.error(`check-html — ${problems.length} problem(s) in html/index.html\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
}

console.log(`check-html ok — ${elements} elements balanced, ${bodyChildren.length} screens start hidden, ${INSIDE_APP.length} panels inside #app`);
