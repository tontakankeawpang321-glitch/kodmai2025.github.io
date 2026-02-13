/* ======================================================
   CONFIG
====================================================== */
const DATA_SOURCES = [
  "./pamon.json",
  "./ratathammanoon.json",
  "./pharaschabunyad.json",
];

/* ======================================================
   HELPERS
====================================================== */
const $ = (s, el = document) => el.querySelector(s);

function sanitizeUrl(u=''){
  try{
    const url = new URL(u);
    if(url.protocol === 'http:' || url.protocol === 'https:') return url.href;
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

  const laws = res.flat();

  renderLaws(laws);
}

/* ======================================================
   RENDER (ใช้รูปแบบ index เดิม)
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
    const active = isFav(id) ? "active" : "";

    const el = document.createElement("div");

    el.innerHTML = `
      <div class="fav-btn-container">
        <button class="fav-btn ${active}"
          data-id="${id}"
          data-title="${title}">
          <span class="material-symbols-rounded">favorite</span>
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
   BIND FAVORITE BUTTONS
====================================================== */
function bindFavButtons(){

  document.querySelectorAll(".fav-btn").forEach(btn => {

    btn.onclick = function(){

      const id = this.dataset.id;
      const title = this.dataset.title;

      toggleFav(id, title);

      this.classList.toggle("active", isFav(id));
    };

  });
}

/* ======================================================
   INIT
====================================================== */
document.addEventListener("DOMContentLoaded", ()=>{

  loadJsonAndStart();

});
