/* ======================================================
   CONFIG
====================================================== */
const PAGE_SIZE = 5;

const DATA_SOURCES = [
  "./pamon.json",
  "./ratathammanoon.json",
  "./pharaschabunyad.json",
];

/* ======================================================
   HELPERS
====================================================== */
const $ = (s, el = document) => el.querySelector(s);
const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };

function escapeHtml(s = "") {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function sanitizeUrl(u=''){
  try{
    const url = new URL(u);
    if(url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  }catch{}
  return '';
}

/* ======================================================
   DOM ELEMENTS
====================================================== */
const catbar     = $("#catbar");
const listEl     = $("#list");
const btnNext    = $("#btnNext");
const btnPrev    = $("#btnPrev");
const panelTitle = $("#panelTitle");

const elQ        = $("#q");
const elBtnSearch= $("#btnSearch");

/* ======================================================
   COLUMN MAP (ตรงกับ JSON)
====================================================== */
const COLS = {
  category : "หมวด",
  title    : "ชื่อกฎหมาย",
  date     : "วันที่",
  volume   : "เล่มตอน",
  url      : "URL_PD"
};
const col = k => COLS[k];

/* ======================================================
   CATEGORY NORMALIZE
====================================================== */
function normalizeCatName(raw=""){
  const s = (raw || "").trim();
  if (s.includes("ประมวล")) return "ประมวลกฎหมาย";
  if (s.includes("รัฐธรรมนูญ")) return "รัฐธรรมนูญ";
  if (s.includes("พระราชบัญญัติ")) return "พระราชบัญญัติ";
  return s;
}

const FIXED_CATS = [
  "ประมวลกฎหมาย",
  "รัฐธรรมนูญ",
  "พระราชบัญญัติ"
];

/* ======================================================
   STATE
====================================================== */
let lawsData = [];
const CatState = {};
let selectedCat = null;

/* ======================================================
   RENDER
====================================================== */
function renderCard(r){
  const t = r[col('title')] || '(ไม่มีชื่อ)';
  const d = r[col('date')] || '';
  const c = r[col('category')] || '';
  const u = r[col('url')] || '';
  const safe = sanitizeUrl(u);

  return `
  <article class="law-card">
    <div class="law-title font-semibold">${escapeHtml(t)}</div>
    <div class="text-sm text-gray-500 mt-1">
      ${c ? escapeHtml(c) : ''} ${d ? ' • ' + escapeHtml(d) : ''}
    </div>
    <div class="mt-2">
      ${safe
        ? `<a href="${safe}" target="_blank" class="text-blue-700 font-semibold">อ่านฉบับเต็ม</a>`
        : `<span class="text-gray-400">ไม่มีไฟล์แนบ</span>`
      }
    </div>
  </article>`;
}

function renderChips(){
  if(!catbar) return;
  catbar.innerHTML = FIXED_CATS.map(c=>`
    <button class="chip ${c===selectedCat?'active':''}" data-cat="${c}">
      ${c}
    </button>
  `).join('');
}

/* ======================================================
   CORE
====================================================== */
async function loadJsonAndStart(){
  if(listEl) listEl.innerHTML = `<div class="empty">กำลังโหลดข้อมูล…</div>`;

  try{
    const reqs = DATA_SOURCES.map(u =>
      fetch(u).then(r=>r.ok?r.json():[]).catch(()=>[])
    );
    const results = await Promise.all(reqs);
    lawsData = results.flat();

    if(!lawsData.length){
      listEl.innerHTML = `<div class="empty">ไม่พบข้อมูล</div>`;
      return;
    }

    buildIndex();
    selectedCat = FIXED_CATS[0];
    renderChips();
    renderList();

  }catch(e){
    console.error(e);
    listEl.innerHTML = `<div class="empty">โหลดข้อมูลไม่สำเร็จ</div>`;
  }
}

function buildIndex(){
  FIXED_CATS.forEach(c=>{
    CatState[c] = { rows: [], page: 0 };
  });

  lawsData.forEach(item=>{
    const rawCat = item[col('category')] || '';
    const norm = normalizeCatName(rawCat);
    if(CatState[norm]){
      CatState[norm].rows.push(item);
    }
  });
}

function renderList(){
  if(!selectedCat) return;

  const state = CatState[selectedCat];
  const start = state.page * PAGE_SIZE;
  const end   = start + PAGE_SIZE;
  const rows  = state.rows.slice(start, end);

  listEl.innerHTML = rows.map(renderCard).join('');

  btnPrev.classList.toggle('hidden', state.page === 0);
  btnNext.classList.toggle('hidden', end >= state.rows.length);

  if(panelTitle) panelTitle.textContent = selectedCat;
}

function selectCategory(cat){
  selectedCat = cat;
  CatState[cat].page = 0;
  renderChips();
  renderList();
}

/* ======================================================
   EVENTS
====================================================== */
on(catbar, 'click', e=>{
  const btn = e.target.closest('[data-cat]');
  if(btn) selectCategory(btn.dataset.cat);
});

on(btnNext, 'click', ()=>{
  CatState[selectedCat].page++;
  renderList();
});

on(btnPrev, 'click', ()=>{
  CatState[selectedCat].page--;
  renderList();
});

on(elBtnSearch, 'click', doSearch);
on(elQ, 'keydown', e=> e.key==='Enter' && doSearch());

function doSearch(){
  const q = (elQ.value || '').trim();
  if(!q){
    selectCategory(selectedCat);
    return;
  }

  const hits = lawsData.filter(r =>
    Object.values(COLS).some(k =>
      (r[k]||'').toString().includes(q)
    )
  );

  listEl.innerHTML = hits.map(renderCard).join('');
  btnPrev.classList.add('hidden');
  btnNext.classList.add('hidden');
  if(panelTitle) panelTitle.textContent = `ผลการค้นหา: "${q}"`;
}

/* ======================================================
   INIT
====================================================== */
document.addEventListener("DOMContentLoaded", loadJsonAndStart);
