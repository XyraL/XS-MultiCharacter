// No function defined twice on the same side.
//
// Ported from XS-Mechanic, where a new Framework.JobGrades quietly replaced an
// older function of the same name further down the file: Lua runs top to
// bottom, so the old one won and every other checker passed. Sides come from
// fxmanifest.lua, globs included.
//
//   node tools/check-dupes.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === 'tools' || name.startsWith('.')) continue;
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (name.endsWith('.lua') && name !== 'fxmanifest.lua') out.push(full);
    }
    return out;
}

const manifest = readFileSync(path.join(ROOT, 'fxmanifest.lua'), 'utf8');
const patterns = [];

for (const [block, side] of [['client_scripts', 'client'], ['server_scripts', 'server'], ['shared_scripts', 'shared']]) {
    const m = manifest.match(new RegExp(`${block}\\s*\\{([\\s\\S]*?)\\}`));
    if (!m) continue;
    for (const entry of m[1].match(/'([^'@]+\.lua)'/g) || []) {
        const glob = entry.slice(1, -1).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.+').replace(/\*/g, '[^/]+');
        patterns.push({ re: new RegExp(`^${glob}$`), side });
    }
}

function sidesOf(rel) {
    const sides = new Set(patterns.filter((p) => p.re.test(rel)).map((p) => p.side));
    if (!sides.size) return null;
    if (sides.has('shared') || (sides.has('client') && sides.has('server'))) return 'shared';
    return sides.has('server') ? 'server' : 'client';
}

const seen = new Map();
const problems = [];
let defs = 0;
let files = 0;

for (const file of walk(ROOT)) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const side = sidesOf(rel);
    if (!side) continue;
    files += 1;
    readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        const m = line.match(/^\s*function\s+([A-Za-z_][\w]*(?:[.:][A-Za-z_]\w*)+)\s*\(/);
        if (!m) return;
        defs += 1;
        const name = m[1].replace(':', '.');
        const list = seen.get(name) || [];
        for (const other of list) {
            if (other.side === side || other.side === 'shared' || side === 'shared') {
                problems.push(`${name} is defined twice — ${other.where} and ${rel}:${i + 1}`);
            }
        }
        list.push({ side, where: `${rel}:${i + 1}` });
        seen.set(name, list);
    });
}

if (problems.length) {
    console.error(`check-dupes — ${problems.length} function(s) defined twice\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
}

console.log(`check-dupes ok — ${defs} function definitions across ${files} files, none defined twice on one side`);
