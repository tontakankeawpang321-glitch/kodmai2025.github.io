/* ======================================================
   CONFIG
====================================================== */
const DATA_SOURCES = [
  "./pamon.json",
  "./ratathammanoon.json",
  "./pharaschabunyad.json",
];

/* ======================================================
   GLOBAL STATE
====================================================== */
let ALL_LAWS = [];
let CURRENT_FILTER = "all";

/* ======================================================
   HELPERS
====================================================== */
const $ = (s, el = document) => el.querySelector(s);

function sanitizeUrl(u=''){
  try{
    const url = new URL(u);
    if(url.protocol === 'http:' || url.protocol === 'https:')
      return url.href;
  }catch{}
  return '';
}

/* ======================================================
   FAVORITES
====================================================== */
const FAV_KEY = "favLaws";

function getFavs(){
  return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
}

function saveFavs(data){
  localStorage.setItem(FAV_KEY, JSON.stringify(data));
}

function isFav(id){
  return getFavs().some(f => String(f.id) === String(id));
}

function toggleFav(id, title){

  const sid = String(id);
  let favs = getFavs();
  const idx = favs.findIndex(f => String(f.id) === sid);

  if(idx > -1){
    favs.splice(idx,1);
  }else{
    favs.push({
      id: sid,
      title: title,
      time: new Date().toLocaleDateString('th-TH')
    });
  }

  saveFavs(favs);

  // อัปเดตปุ่มเฉพาะตัว
  const btn = document.querySelector(`.fav-btn[data-id="${sid}"]`);
  if(btn){
    const active = isFav(sid);
    btn.classList.toggle("active", active);
    btn.querySelector("span").textContent =
      active ? "favorite" : "favorite_border";
  }
}

/* ======================================================
   LOAD JSON
====================================================== */
async function loadJsonAndStart(){

  const listEl = $("#list");
  if(listEl) listEl.innerHTML = "กำลังโหลดข้อมูล...";

  const res = await Promise.all(
    DATA_SOURCES.map(u =>
      fetch(u).then(r=>r.ok ? r.json() : []).catch(()=>[])
    )
  );

  ALL_LAWS = res.flat();

  renderLawsByFilter();
}

/* ======================================================
   FILTER SYSTEM
====================================================== */
function filterCat(cat, btn){

  document.querySelectorAll('.chip')
    .forEach(c => c.classList.remove('active'));

  if(btn) btn.classList.add('active');

  CURRENT_FILTER = cat;

  renderLawsByFilter();
}

function renderLawsByFilter(){

  if(CURRENT_FILTER === "all"){
    renderLaws(ALL_LAWS);
    return;
  }

  const filtered = ALL_LAWS.filter(law => {

    const cat = law["หมวด"] || "";

    if(CURRENT_FILTER === "code")
      return cat.includes("ประมวล");

    if(CURRENT_FILTER === "const")
      return cat.includes("รัฐธรรมนูญ");

    if(CURRENT_FILTER === "act")
      return cat.includes("พระราชบัญญัติ");

    return true;
  });

  renderLaws(filtered);
}

/* ======================================================
   RENDER
====================================================== */
function renderLaws(data){

  const listEl = $("#list");
  if(!listEl) return;

  listEl.innerHTML = "";

  if(!data || data.length === 0){
    listEl.innerHTML = `
      <div class="text-center py-20 text-slate-400">
        ไม่พบข้อมูล
      </div>`;
    return;
  }

  data.forEach(law => {

    const title = law["ชื่อกฎหมาย"] || "";
    const date  = law["วันที่"] || "";
    const cat   = law["หมวด"] || "";
    const url   = sanitizeUrl(law["URL_PD"] || "");

    const id = encodeURIComponent(title + "_" + date);
    const active = isFav(id);

    const el = document.createElement("div");
    el.id = "law-item-" + id;

    el.innerHTML = `
      <div class="fav-btn-container">
        <button class="fav-btn ${active ? "active" : ""}"
          data-id="${id}"
          data-title="${title}">
          <span class="material-symbols-rounded">
            ${active ? "favorite" : "favorite_border"}
          </span>
        </button>
      </div>

      <div class="font-bold text-slate-800 text-lg mb-1 pr-10 leading-tight">
        ${title}
      </div>

      <div class="text-xs text-slate-400 mb-2">
        ${cat} ${date ? "• " + date : ""}
      </div>

      ${
        url
        ? `<a href="${url}" target="_blank"
             class="text-blue-600 text-sm font-bold hover:underline">
             อ่านฉบับเต็ม
           </a>`
        : ""
      }
    `;

    listEl.appendChild(el);
  });

  bindFavButtons();
}

/* ======================================================
   FAVORITE BUTTON BINDING
====================================================== */
function bindFavButtons(){

  document.querySelectorAll(".fav-btn").forEach(btn => {

    btn.onclick = function(){

      const id = this.dataset.id;
      const title = this.dataset.title;

      toggleFav(id, title);
    };

  });
}

/* ======================================================
   JUMP TO ITEM
====================================================== */
function jumpToItem(id){

  // ถ้าอยู่หมวดอื่น ให้กลับ all ก่อน
  if(CURRENT_FILTER !== "all"){
    CURRENT_FILTER = "all";
    document.querySelectorAll('.chip')
      .forEach(c => c.classList.remove('active'));

    const firstChip = document.querySelector('.chip');
    if(firstChip) firstChip.classList.add('active');

    renderLawsByFilter();
  }

  setTimeout(()=>{
    const target = document.getElementById("law-item-" + id);
    if(!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    target.classList.add("target-highlight");

    setTimeout(()=>{
      target.classList.remove("target-highlight");
    },1500);

  },100);
}

/* ======================================================
   INIT
====================================================== */
document.addEventListener("DOMContentLoaded", ()=>{
  loadJsonAndStart();
});
