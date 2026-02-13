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
function $(selector, el = document){
  return el.querySelector(selector);
}

function showLoading(){
  const listEl = $("#list");
  if(listEl){
    listEl.innerHTML = `
      <div class="text-center py-20 text-slate-400 text-sm italic">
        กำลังโหลดข้อมูลกฎหมาย...
      </div>`;
  }
}

function showError(){
  const listEl = $("#list");
  if(listEl){
    listEl.innerHTML = `
      <div class="text-center py-20 text-red-400 text-sm">
        โหลดข้อมูลไม่สำเร็จ
      </div>`;
  }
}

/* ======================================================
   LOAD JSON
====================================================== */
async function loadJsonAndStart(){

  showLoading();

  try {

    const responses = await Promise.all(
      DATA_SOURCES.map(url =>
        fetch(url)
          .then(res => res.ok ? res.json() : [])
          .catch(() => [])
      )
    );

    ALL_LAWS = responses.flat();

    applyFilter("all");

  } catch (e) {
    showError();
  }
}

/* ======================================================
   FILTER SYSTEM
====================================================== */
function applyFilter(category){

  CURRENT_FILTER = category;

  if(!ALL_LAWS || ALL_LAWS.length === 0){
    return;
  }

  let filtered = ALL_LAWS;

  if(category !== "all"){

    filtered = ALL_LAWS.filter(law => {

      const cat = law["หมวด"] || "";

      if(category === "code")
        return cat.includes("ประมวล");

      if(category === "const")
        return cat.includes("รัฐธรรมนูญ");

      if(category === "act")
        return cat.includes("พระราชบัญญัติ");

      return true;
    });
  }

  // ส่งเข้า pagination system ใน HTML
  if(typeof renderLawsFromJson === "function"){
    renderLawsFromJson(filtered);
  }
}

/* ======================================================
   GLOBAL FILTER FUNCTION (HTML เรียกใช้)
====================================================== */
window.filterLawsData = function(cat){
  applyFilter(cat);
};

/* ======================================================
   SEARCH SYSTEM (ถ้ามีช่องค้นหา)
====================================================== */
function initSearch(){

  const input = $("#q");
  const btn = $("#btnSearch");

  if(!input || !btn) return;

  function doSearch(){

    const keyword = input.value.trim();

    if(!keyword){
      applyFilter(CURRENT_FILTER);
      return;
    }

    const result = ALL_LAWS.filter(law => {

      const title = law["ชื่อกฎหมาย"] || "";
      const cat   = law["หมวด"] || "";
      const date  = law["วันที่"] || "";

      return (
        title.includes(keyword) ||
        cat.includes(keyword) ||
        date.includes(keyword)
      );
    });

    if(typeof renderLawsFromJson === "function"){
      renderLawsFromJson(result);
    }
  }

  btn.onclick = doSearch;
  input.addEventListener("keypress", e => {
    if(e.key === "Enter") doSearch();
  });
}

/* ======================================================
   SAFE START (รอ HTML โหลดก่อน)
====================================================== */
document.addEventListener("DOMContentLoaded", () => {

  loadJsonAndStart();
  initSearch();

});
