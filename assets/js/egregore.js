/* Egregore – moteur commun
 * Aléatoire à graine, tables JSON (data/), dés, utilitaires et en-tête partagé.
 * Aucune dépendance. Tout tourne dans le navigateur.
 */
(() => {
'use strict';

const SCRIPT = document.currentScript.src;
const ROOT = new URL('../../', SCRIPT).href;          // racine du site (marche aussi sous /Egregore/)
const REPO = 'https://github.com/Spidergost/Egregore';
const THEME_KEY = 'egregore-theme';

/* ---------- thème (appliqué tout de suite pour éviter le flash) ---------- */
function applyTheme() {
  let t = '';
  try { t = localStorage.getItem(THEME_KEY) || ''; } catch (_) {}
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
function toggleTheme() {
  const dark = matchMedia('(prefers-color-scheme:dark)').matches;
  const now = document.documentElement.dataset.theme || (dark ? 'dark' : 'light');
  try { localStorage.setItem(THEME_KEY, now === 'dark' ? 'light' : 'dark'); } catch (_) {}
  applyTheme();
}
applyTheme();

/* ---------- aléatoire à graine ---------- */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Générateur déterministe : même graine → mêmes tirages, sur tous les navigateurs. */
function makeRng(seed) {
  const f = mulberry32(xmur3(String(seed))());
  return { seed: String(seed), next: f, int: n => Math.floor(f() * n), pick: a => a[Math.floor(f() * a.length)] };
}
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
function newSeed() {
  const a = new Uint32Array(6); crypto.getRandomValues(a);
  return Array.from(a, x => ALPHA[x % ALPHA.length]).join('');
}
const getParam = k => new URLSearchParams(location.search).get(k);
function getSeed() { return getParam('seed') || newSeed(); }
/** Met à jour des paramètres de l'URL sans recharger ; renvoie l'URL complète partageable. */
function setParams(obj) {
  const u = new URL(location.href);
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === '') u.searchParams.delete(k); else u.searchParams.set(k, v);
  }
  try { history.replaceState(null, '', u); } catch (_) {}
  return u.href;
}

/* ---------- dés ---------- */
/** Formules : NdF, +/-, kh/kl.  Ex. 2d6+3, 4d6kh3, 2d20kl1-1, d100 */
function dice(expr, rng) {
  const src = String(expr).toLowerCase().replace(/\s+/g, '').replace(/d%/g, 'd100').replace(/−/g, '-');
  if (!src) throw new Error('Formule vide');
  const terms = src.replace(/-/g, '+-').split('+').filter(Boolean);
  let total = 0; const parts = [];
  for (const t of terms) {
    const m = t.match(/^(-?)(\d*)d(\d+)(?:(kh|kl)(\d+))?$/);
    if (m) {
      const sign = m[1] ? -1 : 1, n = m[2] === '' ? 1 : +m[2], f = +m[3];
      if (n < 1 || n > 100 || f < 2 || f > 1000) throw new Error('Limites : 1 à 100 dés, 2 à 1000 faces');
      const rolls = Array.from({ length: n }, () => rng.int(f) + 1);
      const keep = rolls.map(() => true);
      if (m[4]) {
        const k = +m[5];
        const order = rolls.map((_, i) => i).sort((a, b) => rolls[a] - rolls[b]);
        const drop = m[4] === 'kh' ? order.slice(0, Math.max(0, n - k)) : order.slice(Math.min(n, k));
        drop.forEach(i => keep[i] = false);
      }
      total += sign * rolls.reduce((a, v, i) => a + (keep[i] ? v : 0), 0);
      parts.push({ label: t, rolls, keep, faces: f });
    } else if (/^-?\d+$/.test(t)) { total += +t; parts.push({ mod: +t }); }
    else throw new Error('Formule non reconnue : « ' + t + ' »');
  }
  return { expr: src, total, parts };
}

/* ---------- tables ---------- */
const cache = new Map();
async function getJson(path) {
  const r = await fetch(ROOT + path);
  if (!r.ok) throw new Error(path + ' : HTTP ' + r.status);
  return r.json();
}
const loadIndex = () => { if (!cache.has('#index')) cache.set('#index', getJson('data/index.json')); return cache.get('#index'); };
const loadTable = id => {
  if (!/^[a-z0-9-]+$/.test(id)) return Promise.reject(new Error('Identifiant de table invalide : ' + id));
  if (!cache.has(id)) cache.set(id, getJson('data/' + id + '.json'));
  return cache.get(id);
};
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Remplace {@table} par un tirage et {2d6+1} par un jet, dans l'ordre (déterministe). */
async function resolve(text, rng, depth = 0) {
  if (depth > 8) return text;
  let out = '', last = 0;
  for (const m of text.matchAll(/\{([^{}]+)\}/g)) {
    out += text.slice(last, m.index); last = m.index + m[0].length;
    let e = m[1].trim(), up = false;
    if (e[0] === '^') { up = true; e = e.slice(1).trim(); }          // {^@table} : première lettre en majuscule
    if (e[0] === '@') { const v = await pickEntry(e.slice(1), rng, depth + 1); out += up ? cap(v) : v; }
    else { try { out += dice(e, rng).total; } catch (_) { out += m[0]; } }
  }
  return out + text.slice(last);
}
async function pickEntry(id, rng, depth = 0) {
  const t = await loadTable(id);
  if (!t.entrees) throw new Error('« ' + id + ' » n’est pas une table simple');
  const items = t.entrees.map(e => typeof e === 'string' ? { t: e, w: 1 } : { t: e.t, w: e.w || 1 });
  let r = rng.int(items.reduce((a, i) => a + i.w, 0)), it = items[0];
  for (const i of items) { if (r < i.w) { it = i; break; } r -= i.w; }
  return resolve(it.t, rng, depth);
}
/** Tire un champ précis d'une fiche (pour « relancer ce champ »). */
async function rollChamp(id, i, rng) {
  const t = await loadTable(id);
  return cap(await resolve(t.champs[i].t, rng));
}
/** Tire une table simple ({text}) ou une fiche ({fields:[{k,v}]}). */
async function roll(id, rng) {
  const t = await loadTable(id);
  if (t.champs) {
    const fields = [];
    for (const c of t.champs) fields.push({ k: c.k, v: cap(await resolve(c.t, rng)) });
    return { titre: t.titre, fields };
  }
  return { titre: t.titre, text: cap(await pickEntry(id, rng)) };
}
function toText(res) {
  return res.fields ? res.fields.map((f, i) => i === 0 ? `${f.k} : ${f.v}` : `- ${f.k} : ${f.v}`).join('\n') : res.text;
}

/* ---------- utilitaires ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let toastT;
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1800);
}
async function copy(txt, msg) {
  try { await navigator.clipboard.writeText(txt); }
  catch (_) {
    const a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); } catch (__) {} a.remove();
  }
  toast(msg || 'Copié dans le presse-papiers');
}
function download(name, text, type) {
  const u = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
  const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
};

/* ---------- fiche de personnage (format d'échange joueur ⇄ MJ) ---------- */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
function ficheBlank() {
  return { format: 'egregore-fiche', version: 1, id: uid(), maj: '', nom: '', concept: '',
    stats: ['Corps', 'Esprit', 'Adresse', 'Charme', 'Instinct', 'Volonté'].map(n => ({ n, v: 0 })),
    tracks: [{ n: 'Santé', cur: 10, max: 10 }, { n: 'Moral', cur: 10, max: 10 }],
    effets: [], capacites: '', inventaire: '', notes: '', journal: [] };
}
const isFiche = d => !!d && typeof d === 'object' && Array.isArray(d.stats) && Array.isArray(d.tracks);
/** Complète une fiche (ancienne version comprise) avec les champs manquants. */
function ficheNorm(d) {
  const f = Object.assign(ficheBlank(), d, { format: 'egregore-fiche', version: 1 });
  if (!d.id) f.id = uid();
  for (const k of ['effets', 'journal']) if (!Array.isArray(f[k])) f[k] = [];
  return f;
}
/** Copie propre pour l'export : sans les champs internes (préfixe _). */
const ficheClean = f => JSON.parse(JSON.stringify(f, (k, v) => k[0] === '_' ? undefined : v));

/* ---------- en-tête et pied de page ---------- */
function mount(active) {
  const links = [['home', 'Accueil', ''], ['player', 'Joueur', 'player/'], ['mj', 'MJ', 'game-master/'], ['commun', 'Commun', 'commun/'], ['templates', 'Templates', 'templates/']];
  const hdr = document.getElementById('hdr') || document.body.insertBefore(document.createElement('div'), document.body.firstChild);
  hdr.className = 'top noprint';
  hdr.innerHTML = `<div class="wrap"><a class="brand" href="${ROOT}">Egre<span>gore</span></a>
    <nav class="main" aria-label="Navigation">${links.map(([k, l, p]) => `<a href="${ROOT}${p}"${k === active ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
    <button class="btn mini" id="themeBtn" title="Changer de thème" aria-label="Changer de thème">🌓</button></div>`;
  document.getElementById('themeBtn').onclick = toggleTheme;
  if (!document.getElementById('ftr')) {
    const f = document.createElement('footer'); f.id = 'ftr'; f.className = 'noprint';
    f.innerHTML = `<div class="wrap">Egregore · outils et ressources libres pour le jeu de rôle · <a href="${REPO}">Code source et contributions</a></div>`;
    document.body.appendChild(f);
  }
}

window.Egregore = { ROOT, makeRng, newSeed, getSeed, getParam, setParams, dice, loadIndex, loadTable, roll, rollChamp, toText, esc, cap, toast, copy, download, store, mount, uid, ficheBlank, ficheNorm, ficheClean, isFiche };
})();
