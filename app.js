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
    const url=new URL(u);
    if(url.protocol==='http:'||url.protocol==='https:') return url.href;
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
const panelNote  = $("#panelNote"); // optional

const elQ        = $("#q");
const elBtnSearch= $("#btnSearch");

/* ======================================================
   COLUMN MAP (ตรงกับ JSON คุณ)
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
   CATEGORY NORMALIZE (หัวใจสำคัญ)
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
const allIndex = [];

/* ======================================================
   DATE PARSE (รองรับ ISO + พ.ศ.)
====================================================== */
function parseDateTS(s){
  if(!s) return 0;
  try{
    if(s.includes("T")){
      const y = parseInt(s.slice(0,4),10);
      const iso = (y > 2400) ? (y-543)+s.slice(4) : s;
      return new Date(iso).getTime();
    }
    return new Date(s).getTime();
  }catch{
    return 0;
  }
}

/* ======================================================
   RENDER
====================================================== */
function renderCard(r){
  const t=r[col('title')]||'(ไม่มีชื่อ)';
  const d=r[col('date')]||'';
  const c=r[col('category')]||'';
  const u=r[col('url')]||'';
  const safe = sanitizeUrl(u);

  return `
  <article class="law-card">
    <div class="law-title">${escapeHtml(t)}</div>
    <div class="law-meta text-sm text-gray-500 mt-1">
      ${c?`<span>${escapeHtml(c)}</span>`:''}
      ${d?` • <span>${escapeHtml(d)}</span>`:''}
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
    <button class="chip" data-cat="${c}">
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

    renderChips();
    buildIndex();
    selectCategory(FIXED_CATS[0]);

  }catch(e){
    console.error(e);
    listEl.innerHTML = `<div class="empty">โหลดข้อมูลไม่สำเร็จ</div>`;
  }
}

function buildIndex(){
  FIXED_CATS.forEach(c=>{
    CatState[c]={rows:[],page:0};
  });
document.addEventListener("DOMContentLoaded", loadJsonAndStart);

  lawsData.forEach(item=>{
    const rawCat = item[col('category')];
    const norm =
