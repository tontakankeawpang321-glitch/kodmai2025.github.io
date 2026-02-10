/* ======================================================
   CONFIG
====================================================== */
const PAGE_SIZE = 5;
let lawsData = [];

const DATA_SOURCES = [
  "./pamon.json",
  "./ratathammanoon.json",
  "./pharaschabunyad.json",
];

/* ======================================================
   HELPERS
====================================================== */
const $ = (s, el = document) => el.querySelector(s);
function on(el, event, fn) { if (el) el.addEventListener(event, fn); }

/* ======================================================
   ELEMENTS (safe)
====================================================== */
const catbar     = $("#catbar");
const listEl     = $("#list");
const btnNext    = $("#btnNext");
const btnPrev    = $("#btnPrev");
const panelTitle = $("#panelTitle");
const panelNote  = $("#panelNote"); // optional

/* ======================================================
   DATA LOAD
====================================================== */
async function loadJsonAndStart() {
  if (listEl) listEl.innerHTML = `<div class="empty">กำลังโหลดข้อมูล...</div>`;

  try {
    const requests = DATA_SOURCES.map(url =>
      fetch(url, { cache: "no-store" })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
    );

    const results = await Promise.all(requests);
    lawsData = results.flat();

    if (!lawsData.length) {
      if (listEl) listEl.innerHTML = `<div class="empty">ไม่พบข้อมูล</div>`;
      return;
    }

    renderChips();
    loadAllData();

  } catch (e) {
    console.error(e);
    if (listEl) listEl.innerHTML = `<div class="empty">เกิดข้อผิดพลาด</div>`;
  }
}

/* ======================================================
   CONSTANTS
====================================================== */
const COLS = {
  category: "หมวด",
  title: "ชื่อกฎหมาย",
  date: "วันที่",
  volume: "เล่มตอน",
  url: "URL_PD"
};
const col = k => COLS[k];

const FIXED_CATS = [
  { key: "ประมวลกฎหมาย",  label: "ประมวลกฎหมาย",  emoji: "book_2" },
  { key: "รัฐธรรมนูญ",     label: "รัฐธรรมนูญ",     emoji: "gavel" },
  { key: "พระราชบัญญัติ", label: "พระราชบัญญัติ", emoji: "menu_book" },
];

const CatState = {};
let selectedCat = null;
const allIndex = [];

/* ======================================================
   UTILS
====================================================== */
function escapeHtml(s = "") {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function sanitizeUrl(u=''){
  try{
    const url=new URL(u);
    if(url.protocol==='http:'||url.protocol==='https:') return url.href;
  }catch{}
  return '';
}
function normalizeThai(s){
  return (s||'').toLowerCase().replace(/\s+/g,' ').trim();
}

/* ======================================================
   RENDER
====================================================== */
function renderCard(r){
  const t=r[col('title')]||'', d=r[col('date')]||'', c=r[col('category')]||'', u=r[col('url')]||'';
  const safe = sanitizeUrl(u);
  return `
  <article class="law-card">
    <div class="law-title">${escapeHtml(t)||'(ไม่มีชื่อ)'}</div>
    <div class="law-meta">
      ${c?`<span class="tag">${escapeHtml(c)}</span>`:''}
      ${d?`<span class="tag">${escapeHtml(d)}</span>`:''}
    </div>
    <div class="actions">
      ${safe?`<a href="${safe}" target="_blank">อ่านฉบับเต็ม</a>`:`<span class="text-gray-400">ไม่มีไฟล์</span>`}
    </div>
  </article>`;
}

function renderChips(){
  if (!catbar) return;
  catbar.innerHTML = FIXED_CATS.map(c=>`
    <button class="chip" data-cat="${c.key}">
      <span class="material-symbols-rounded">${c.emoji}</span>
      ${c.label}
    </button>
  `).join('');
}

/* ======================================================
   CORE LOGIC
====================================================== */
function loadAllData(){
  FIXED_CATS.forEach(({key})=>{
    CatState[key]={rows:[],page:0};
  });

  lawsData.forEach(item=>{
    const c=item[col('category')];
    if(CatState[c]){
      CatState[c].rows.push(item);
      allIndex.push(item);
    }
  });

  on(catbar,'click',e=>{
    const b=e.target.closest('[data-cat]');
    if(b) selectCategory(b.dataset.cat);
  });

  selectCategory(FIXED_CATS[0].key);
}

function renderPage(cat){
  const st=CatState[cat]; if(!st) return;
  const start=st.page*PAGE_SIZE, end=start+PAGE_SIZE;
  const slice=st.rows.slice(start,end);

  if (listEl)
    listEl.innerHTML = slice.length
      ? slice.map(renderCard).join('')
      : `<div class="empty">ไม่พบข้อมูล</div>`;

  if (btnPrev) btnPrev.style.display = st.page>0?'inline-flex':'none';
  if (btnNext) btnNext.style.display = end<st.rows.length?'inline-flex':'none';

  if (panelTitle) panelTitle.textContent = cat;
  if (panelNote) panelNote.textContent = `แสดง ${start+1}-${Math.min(end,st.rows.length)} จาก ${st.rows.length}`;
}

function selectCategory(cat){
  selectedCat=cat;
  if (catbar)
    [...catbar.children].forEach(b=>{
      b.classList.toggle('active',b.dataset.cat===cat);
    });
  renderPage(cat);
}

/* ======================================================
   EVENTS
====================================================== */
on(btnNext,'click',()=>{
  const st=CatState[selectedCat];
  if(st){ st.page++; renderPage(selectedCat); }
});
on(btnPrev,'click',()=>{
  const st=CatState[selectedCat];
  if(st && st.page>0){ st.page--; renderPage(selectedCat); }
});

const elQ=$("#q"), elBtnSearch=$("#btnSearch");
on(elBtnSearch,'click',doSearch);
on(elQ,'keydown',e=>{ if(e.key==='Enter') doSearch(); });

function doSearch(){
  const q=(elQ?.value||'').trim();
  if(!q){ renderPage(selectedCat); return; }
  const nq=normalizeThai(q);
  const results=allIndex.filter(o=>{
    return normalizeThai(o[col('title')]).includes(nq);
  });
  if (listEl)
    listEl.innerHTML = results.map(renderCard).join('') || `<div class="empty">ไม่พบ</div>`;
  if (btnNext) btnNext.style.display='none';
  if (btnPrev) btnPrev.style.display='none';
  if (panelTitle) panelTitle.textContent=`ผลการค้นหา: ${q}`;
  if (panelNote) panelNote.textContent=`พบ ${results.length} รายการ`;
}

/* ======================================================
   START
====================================================== */
loadJsonAndStart();
