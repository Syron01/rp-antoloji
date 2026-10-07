'use strict';

/* ---------- State ---------- */
let BOTS = [];
let state = { tab: 'discover', cat: 'all', query: '', page: 1, detail: null };
const PAGE_SIZE = 12;
const FAV_KEY = 'rpantoloji.favs';
const COUNT_KEY = 'rpantoloji.counts';

const CATEGORIES = {
  romance:      { label: 'Romantik',      icon: 'favorite' },
  dark_romance: { label: 'Karanlık Romantik', icon: 'dark_mode' },
  fantasy:      { label: 'Fantastik',     icon: 'auto_stories' },
  anime:        { label: 'Anime',         icon: 'animation' },
  thriller:     { label: 'Gerilim',       icon: 'psychology_alt' },
  sliceoflife:  { label: 'Günlük Yaşam',  icon: 'coffee' },
  scifi:        { label: 'Bilim Kurgu',   icon: 'rocket_launch' },
  comfort:      { label: 'Huzur',         icon: 'spa' },
  historical:   { label: 'Tarihi',        icon: 'castle' },
  comedy:       { label: 'Komedi',        icon: 'sentiment_very_satisfied' },
  horror:       { label: 'Korku',         icon: 'skull' },
  roleplay:     { label: 'Rol Yapma',     icon: 'theater_comedy' },
  adventure:    { label: 'Macera',        icon: 'explore' },
};

const FIELDS = [
  { key: 'description',         title: 'Açıklama' },
  { key: 'greeting',            title: 'Karşılama / Açılış Sahnesi' },
  { key: 'personality',         title: 'Kişilik' },
  { key: 'scenarioProgression', title: 'Senaryo İlerleyişi' },
  { key: 'soul',                title: 'Öz / Ruh' },
];

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const esc = (s) => s.replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const getFavs = () => JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
const setFavs = (a) => localStorage.setItem(FAV_KEY, JSON.stringify(a));
const isFav = (id) => getFavs().includes(id);
const toggleFav = (id) => {
  const f = getFavs();
  const i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  setFavs(f);
  return f.includes(id);
};

const getLocalCounts = () => JSON.parse(localStorage.getItem(COUNT_KEY) || '{}');
const bumpLocalCount = (id) => {
  const c = getLocalCounts();
  c[id] = (c[id] || 0) + 1;
  localStorage.setItem(COUNT_KEY, JSON.stringify(c));
  return c[id];
};
const localCount = (id) => getLocalCounts()[id] || 0;

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.innerHTML = `<span class="material-symbols-rounded">check_circle</span>${esc(msg)}`;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2000);
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast(label || 'Panoya kopyalandı');
  } catch {
    const ta = el('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast(label || 'Panoya kopyalandı');
  }
}

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = el('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- View counter (counterapi.dev + localStorage fallback) ---------- */
const COUNTER_NS = 'rpantoloji';
async function openBot(id) {
  const local = bumpLocalCount(id);
  setDetail(id);
  const num = $('#dViewsNum');
  num.textContent = local.toLocaleString('tr-TR');
  try {
    const r = await fetch(`https://abacus.jasoncameron.dev/hit/${COUNTER_NS}/bot-${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error();
    const j = await r.json();
    if (typeof j.value === 'number') num.textContent = j.value.toLocaleString('tr-TR');
  } catch { /* offline: yerel sayaç yeterli */ }
}

/* ---------- Filtering ---------- */
function filtered() {
  const q = state.query.trim().toLowerCase();
  return BOTS.filter((b) => {
    if (state.cat !== 'all' && b.category !== state.cat) return false;
    if (!q) return true;
    return (b.name + ' ' + b.description + ' ' + b.tags.join(' ') + ' ' + b.greeting)
      .toLowerCase().includes(q);
  });
}

/* ---------- Cards ---------- */
function cardHtml(b) {
  const cat = CATEGORIES[b.category] || { label: b.category };
  return `
    <div class="card-top">
      <span class="card-name">${esc(b.name)}</span>
      <button class="fav-toggle ${isFav(b.id) ? 'on' : ''}" data-fav="${b.id}" aria-label="Favori">
        <span class="material-symbols-rounded">bookmark</span>
      </button>
    </div>
    <div class="badges">
      <span class="badge">${esc(cat.label)}</span>
      <span class="badge gender-${b.gender}">${b.gender === 'female' ? 'Kadın' : 'Erkek'}</span>
    </div>
    <p class="card-desc">${esc(b.description)}</p>
    <div class="card-tags">${b.tags.slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
}

function renderGrid(container, list, metaEl, metaText, paging) {
  const shown = paging ? list.slice(0, state.page * PAGE_SIZE) : list;
  container.innerHTML = '';
  const frag = document.createDocumentFragment();
  let i=0;
  for (const b of shown) {
    const c = el('div', 'card', cardHtml(b));
    c.dataset.open = b.id;
    c.style.animationDelay = `${(i++ % PAGE_SIZE) * 35}ms`;
    frag.appendChild(c);
  }
  container.appendChild(frag);
  if (metaEl) metaEl.textContent = metaText.replace('{n}', list.length);
  const lm = $('#loadMore');
  if (paging) lm.classList.toggle('hidden', shown.length >= list.length);
}

function renderDiscover() {
  const list = filtered();
  const n = list.length;
  renderGrid($('#grid'), list, $('#resultMeta'),
    state.query
      ? `"${state.query}" için {n} bot bulundu`
      : (state.cat === 'all' ? `Toplam {n} bot` : `${CATEGORIES[state.cat].label} — {n} bot`),
    true);
}

function renderFavorites() {
  const favs = getFavs();
  const list = BOTS.filter((b) => favs.includes(b.id));
  $('#favEmpty').classList.toggle('hidden', list.length > 0);
  renderGrid($('#favGrid'), list, $('#favMeta'), `{n} favori bot`, false);
}

function renderCategories() {
  const wrap = $('#view-categories');
  const counts = {};
  for (const b of BOTS) counts[b.category] = (counts[b.category] || 0) + 1;
  const box = el('div', 'cat-list');
  const all = el('button', 'cat-row');
  all.innerHTML = `<span class="material-symbols-rounded">grid_view</span>
    <span class="cat-name">Tümü</span><span class="cat-count">${BOTS.length} bot</span>`;
  all.onclick = () => { state.cat = 'all'; state.page = 1; switchTab('discover'); };
  box.appendChild(all);
  for (const [key, c] of Object.entries(CATEGORIES)) {
    const row = el('button', 'cat-row');
    row.innerHTML = `<span class="material-symbols-rounded">${c.icon}</span>
      <span class="cat-name">${esc(c.label)}</span><span class="cat-count">${counts[key] || 0} bot</span>`;
    row.onclick = () => { state.cat = key; state.page = 1; switchTab('discover'); };
    box.appendChild(row);
  }
  wrap.innerHTML = '';
  wrap.appendChild(box);
}

function renderChips() {
  const wrap = $('#catChips');
  wrap.innerHTML = '';
  const mk = (val, label, icon) => {
    const b = el('button', 'chip' + (state.cat === val ? ' active' : ''));
    b.innerHTML = `${icon ? `<span class="material-symbols-rounded">${icon}</span>` : ''}${esc(label)}`;
    b.onclick = () => { state.cat = val; state.page = 1; renderChips(); renderDiscover(); };
    wrap.appendChild(b);
  };
  mk('all', 'Tümü', 'apps');
  for (const [key, c] of Object.entries(CATEGORIES)) mk(key, c.label, c.icon);
}

/* ---------- Detail ---------- */
function setDetail(id) {
  const b = BOTS.find((x) => x.id === id);
  if (!b) return;
  state.detail = b;
  $('#dName').textContent = b.name;
  $('#dTags').innerHTML = `<span class="tag">${esc((CATEGORIES[b.category] || {}).label || b.category)}</span>` +
    b.tags.slice(0, 6).map((t) => `<span class="tag">${esc(t)}</span>`).join('');
  const fields = $('#dFields');
  fields.innerHTML = '';
  for (const f of FIELDS) {
    const val = b[f.key];
    if (!val) continue;
    const box = el('div', 'field');
    box.innerHTML = `
      <div class="field-head">
        <span class="field-title">${esc(f.title)}</span>
        <button class="field-copy" aria-label="Kopyala"><span class="material-symbols-rounded">content_copy</span></button>
      </div>
      <div class="field-body">${esc(val)}</div>`;
    box.querySelector('.field-copy').onclick = () => copyText(val, `${f.title} kopyalandı`);
    fields.appendChild(box);
  }
  $('#detailFav').querySelector('.material-symbols-rounded').textContent =
    isFav(b.id) ? 'bookmark' : 'bookmark_border';
  $('#detail').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  $('#detail').classList.add('hidden');
  document.body.style.overflow = '';
  state.detail = null;
}

/* ---------- Tabs ---------- */
function switchTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
  $(`#view-${tab}`).classList.remove('hidden');
  if (tab === 'favorites') renderFavorites();
  if (tab === 'categories') renderCategories();
  if (tab === 'discover') renderDiscover();
  window.scrollTo({ top: 0 });
}

/* ---------- Events ---------- */
document.addEventListener('click', (e) => {
  const favBtn = e.target.closest('[data-fav]');
  if (favBtn) {
    e.stopPropagation();
    const on = toggleFav(favBtn.dataset.fav);
    favBtn.classList.toggle('on', on);
    if (state.tab === 'favorites') renderFavorites();
    toast(on ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı');
    return;
  }
  const card = e.target.closest('[data-open]');
  if (card) openBot(card.dataset.open);
});

document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => switchTab(t.dataset.tab)));

$('#search').addEventListener('input', (e) => {
  state.query = e.target.value;
  state.page = 1;
  $('#clearSearch').classList.toggle('hidden', !state.query);
  renderDiscover();
});
$('#clearSearch').addEventListener('click', () => {
  state.query = ''; $('#search').value = ''; state.page = 1;
  $('#clearSearch').classList.add('hidden');
  renderDiscover();
});
$('#loadMore').addEventListener('click', () => { state.page++; renderDiscover(); });
$('#detailClose').addEventListener('click', closeDetail);
$('#detailFav').addEventListener('click', () => {
  if (!state.detail) return;
  const on = toggleFav(state.detail.id);
  $('#detailFav').querySelector('.material-symbols-rounded').textContent =
    on ? 'bookmark' : 'bookmark_border';
  toast(on ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı');
});
$('#btnCopyAll').addEventListener('click', () => {
  if (!state.detail) return;
  const b = state.detail;
  const all = FIELDS.map((f) => `## ${f.title}\n${b[f.key]}`).join('\n\n');
  copyText(all, 'Bot içeriğinin tamamı kopyalandı');
});
$('#btnDlJson').addEventListener('click', () => {
  if (!state.detail) return;
  downloadJson(state.detail, `bot-${state.detail.name.toLowerCase().replace(/\s+/g, '-')}.json`);
});
$('#btnAboutTop').addEventListener('click', () => switchTab('about'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });

/* ---------- Init ---------- */
fetch('data/bots.json')
  .then((r) => r.json())
  .then((data) => {
    BOTS = data;
    renderChips();
    renderDiscover();
  })
  .catch(() => {
    $('#resultMeta').textContent = 'Veri yüklenemedi. Sayfayı yenilemeyi dene.';
  });
