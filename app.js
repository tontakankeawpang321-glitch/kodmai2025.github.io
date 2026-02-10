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
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

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
   DOM
====================================================== */
const catbar     = $("#catbar");
const listEl     = $("#list");
const btnNext    = $("#btnNext");
const btnPrev    = $("#btnPrev");
const panelTitle = $("#panelTitle");
const elQ        = $("#q");
const elBtnSearch= $("#btnSearch");

/* ======================================================
   FAVORITES
====================================================== */
const FAV_KEY = "thai_law_lite_favs";

function getFavs(){
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; }
  catch { return []; }
}
function isFav(id){
  return getFavs().some(f => f.id === id);
}
function toggleFav(id, title){
  let favs = getFavs();
  const i = favs.findIndex(f => f.id === id);
  if(i > -1) favs.splice(i,1);
  else favs.push({ id, title, date: new Date().toLocaleDateString('th-TH') });
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}
function renderFavList(){
  const box = $("#favContainer");
  if(!box) return;

  const favs = getFavs();
  if(!favs.length){
    box.innerHTML = `<div class="py-12 text-center text-slate-400 text-sm italic">
      ยังไม่มีรายการที่บันทึกไว้
    </div>`;
    return;
  }

  box.innerHTML = favs.map(f=>`
    <div class="p-3 border border-slate-200 rounded-xl flex justify-between items-center">
      <div>
        <div class="text-sm font-bold">${escapeHtml(f.title)}</div>
        <div class="text-[10px] text-slate-400">บันทึกเมื่อ ${f.date}</div>
      </div>
      <button class="material-symbols-rounded text-slate-300 hover:text-red-500"
        onclick="removeFav('${f.id}')">delete</button>
    </div>
  `).join('');
}
window.removeFav = (id)=>{
  localStorage.setItem(
    FAV_KEY,
    JSON.stringify(getFavs().filter(f=>f.id!==id))
  );
  renderFavList();
  document.querySelector(`.fav-add-btn[data-id="${id}"]`)
    ?.classList.remove('active');
};

/* ======================================================
   COLUMN MAP
====================================================== */
const COLS = {
  category : "หมวด",
  title    : "ชื่อกฎหมาย",
  date     : "วันที่",
  url      : "URL_PD"
};
const col = k => COLS[k];

/* ======================================================
   CATEGORY
====================================================== */
function normalizeCatName(raw=""){
  if(raw.includes("ประมวล")) return "ประมวลกฎหมาย";
  if(raw.includes("รัฐธรรมนูญ")) return "รัฐธรรมนูญ";
  if(raw.includes("พระราชบัญญัติ")) return "พระราชบัญญัติ";
  return raw;
}
const FIXED_CATS = ["ประมวลกฎหมาย","รัฐธรรมนูญ","พระราชบัญญัติ"];

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
  const id = btoa(unescape(encodeURIComponent(t)));
  const fav = isFav(id);

  return `
  <article class="law-card relative">
    <span class="fav-add-btn material-symbols-rounded ${fav?'active':''}"
      data-id="${id}" data-title="${escapeHtml(t)}">favorite</span>

    <div class="font-semibold">${escapeHtml(t)}</div>
    <div class="text-sm text-gray-500 mt-1">
      ${escapeHtml(c)} ${d ? ' • '+escapeHtml(d):''}
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
  catbar.innerHTML = FIXED_CATS.map(c=>`
    <button class="chip ${c===selectedCat?'active':''}" data-cat="${c}">
      ${c}
    </button>`).join('');
}

function renderList(){
  const state = CatState[selectedCat];
  const start = state.page * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  listEl.innerHTML = state.rows.slice(start,end).map(renderCard).join('');
  btnPrev.classList.toggle('hidden', state.page===0);
  btnNext.classList.toggle('hidden', end>=state.rows.length);
  panelTitle.textContent = selectedCat;
}

/* ======================================================
   ✅ LATEST (ล่าสุดรายหมวด – แก้ตรงนี้)
====================================================== */
function renderLatest(){
  const track = $("#latestTrack");
  if(!track) return;

  const latestByCat = {};

  lawsData.forEach(r=>{
    const cat = normalizeCatName(r[col('category')]||'');
    const date = r[col('date')];
    if(!cat || !date) return;

    if(
      !latestByCat[cat] ||
      new Date(date) > new Date(latestByCat[cat][col('date')])
    ){
      latestByCat[cat] = r;
    }
  });

  track.innerHTML = Object.values(latestByCat).map(r=>`
    <div class="w-full py-3 px-3">
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
        <div class="text-[10px] font-bold text-blue-600 mb-1">
          ${escapeHtml(normalizeCatName(r[col('category')]))}
        </div>
        <div class="text-sm font-semibold text-slate-800 line-clamp-2">
          ${escapeHtml(r[col('title')])}
        </div>
        <div class="text-[10px] text-slate-400 mt-1">
          ${escapeHtml(r[col('date')])}
        </div>
      </div>
    </div>
  `).join('');
}

/* ======================================================
   LOAD
====================================================== */
async function loadJsonAndStart(){
  listEl.innerHTML = "กำลังโหลดข้อมูล…";

  const res = await Promise.all(
    DATA_SOURCES.map(u=>fetch(u).then(r=>r.ok?r.json():[]).catch(()=>[]))
  );
  lawsData = res.flat();

  FIXED_CATS.forEach(c=>CatState[c]={rows:[],page:0});
  lawsData.forEach(r=>{
    const cat = normalizeCatName(r[col('category')]||'');
    if(CatState[cat]) CatState[cat].rows.push(r);
  });

  selectedCat = FIXED_CATS[0];
  renderChips();
  renderLatest();
  renderList();
}

/* ======================================================
   EVENTS
====================================================== */
on(catbar,'click',e=>{
  const b=e.target.closest('[data-cat]');
  if(b){
    selectedCat=b.dataset.cat;
    CatState[selectedCat].page=0;
    renderChips();
    renderList();
  }
});
on(listEl,'click',e=>{
  const b=e.target.closest('.fav-add-btn');
  if(b){
    toggleFav(b.dataset.id,b.dataset.title);
    b.classList.toggle('active');
  }
});
on(btnNext,'click',()=>{ CatState[selectedCat].page++; renderList(); });
on(btnPrev,'click',()=>{ CatState[selectedCat].page--; renderList(); });
on(elBtnSearch,'click',doSearch);
on(elQ,'keydown',e=>e.key==='Enter'&&doSearch());

function doSearch(){
  const q=(elQ.value||'').trim();
  if(!q) return renderList();

  const hits=lawsData.filter(r=>
    Object.values(COLS).some(k=>(r[k]||'').includes(q))
  );
  listEl.innerHTML = hits.map(renderCard).join('');
  btnPrev.classList.add('hidden');
  btnNext.classList.add('hidden');
  panelTitle.textContent=`ผลการค้นหา "${q}"`;
}

/* ======================================================
   INIT
====================================================== */
document.addEventListener("DOMContentLoaded",()=>{
  loadJsonAndStart();
  $("#btnOpenFavs")?.addEventListener('click',()=>{
    $("#modalFavs").style.display='flex';
    renderFavList();
  });
  $("#btnCloseFavs")?.addEventListener('click',()=>{
    $("#modalFavs").style.display='none';
  });
})
