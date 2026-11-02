// Valide les tables de data/ : JSON correct, champs requis, références {table} existantes.
// Usage : node scripts/validate-data.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const errors = [];
const err = m => errors.push(m);

const index = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8'));
const tables = {};

for (const f of index.fichiers) {
  let t;
  try { t = JSON.parse(readFileSync(join(root, f), 'utf8')); }
  catch (e) { err(`${f} : JSON invalide (${e.message})`); continue; }
  if (!t.id || typeof t.id !== 'string') err(`${f} : "id" manquant`);
  else if (basename(f, '.json') !== t.id) err(`${f} : "id" (${t.id}) différent du nom de fichier`);
  if (tables[t.id]) err(`${f} : id « ${t.id} » en double`);
  if (!t.titre) err(`${f} : "titre" manquant`);
  if (!t.categorie) err(`${f} : "categorie" manquante`);
  if (!Array.isArray(t.entrees) || !t.entrees.length) err(`${f} : "entrees" vide ou absent`);
  tables[t.id] = t;
}

// fichiers présents sur disque mais oubliés dans l'index
const listed = new Set(index.fichiers.map(f => basename(f)));
for (const f of readdirSync(join(root, 'tables'))) {
  if (f.endsWith('.json') && !listed.has(f)) err(`tables/${f} : absent de data/index.json`);
}

const DICE = /^\d*d(\d+|%)([+-]\d+)?$/i;
for (const t of Object.values(tables)) {
  for (const e of t.entrees || []) {
    const txt = typeof e === 'string' ? e : e && e.t;
    if (typeof txt !== 'string' || !txt) { err(`${t.id} : entrée invalide ${JSON.stringify(e)}`); continue; }
    if (typeof e === 'object' && e.w !== undefined && !(Number.isInteger(e.w) && e.w >= 1)) err(`${t.id} : poids invalide dans « ${txt} »`);
    for (const m of txt.matchAll(/\{([^{}]+)\}/g)) {
      const name = m[1].split('|')[0].trim();
      if (!DICE.test(name) && !tables[name]) err(`${t.id} : référence inconnue {${name}} dans « ${txt.slice(0, 50)} »`);
    }
  }
}

// cycles de références (tirage infini)
function cycle(id, path) {
  if (path.includes(id)) return [...path, id];
  for (const e of tables[id].entrees) {
    const txt = typeof e === 'string' ? e : e.t;
    for (const m of txt.matchAll(/\{([^{}]+)\}/g)) {
      const n = m[1].split('|')[0].trim();
      if (tables[n]) { const c = cycle(n, [...path, id]); if (c) return c; }
    }
  }
  return null;
}
for (const id of Object.keys(tables)) {
  const c = cycle(id, []);
  if (c) { err(`cycle de références : ${c.join(' → ')}`); break; }
}

if (errors.length) {
  console.error(errors.map(e => '✗ ' + e).join('\n'));
  process.exit(1);
}
console.log(`✓ ${Object.keys(tables).length} tables valides`);
