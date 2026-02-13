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
   FAVORITES (เสถียร)
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

  if(i > -1){
    favs.splice(i,1);
  }else{
    favs.push({
      id: id,
      title: title,
      date: new Date().toLocaleString('th-TH')
    });
  }

  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

function renderFavList(){
  const box = $("#favContainer");
  if(!box) return;

  const favs = getFavs();
  if(!favs.length){
    box.innerHTML = `
      <div class="py-12 text-center text-slate-400 text-sm italic">
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

  // ✅ id ใหม่ (ไม่ใช้ btoa)
  const id = encodeURIComponent(t + '_' + d);
  const fav = isFav(id);

  return `
  <article class="law-card relative bg-white p-4 rounded-xl border border-slate-200">
    <span class="fav-add-btn material-symbols-rounded ${fav?'active':''}"
      data-id="${id}"
      data-title="${escapeHtml(t)}">
      favorite
    </span>

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
    const id = b.dataset.id;
    const title = b.dataset.title;

    toggleFav(id,title);

    // sync กับ storage จริง
    b.classList.toggle('active', isFav(id));
  }
});

on(btnNext,'click',()=>{
  CatState[selectedCat].page++;
  renderList();
});

on(btnPrev,'click',()=>{
  CatState[selectedCat].page--;
  renderList();
});

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
});
