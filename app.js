/* ===== ค่าคงที่/ตั้งค่า ===== */
const PAGE_SIZE = 5;
let lawsData = [];

// --------------------------------------------------------
// 1. รายชื่อไฟล์ JSON ทั้งหมดที่คุณแยกไว้ (เพิ่มลดได้ที่นี่)
// --------------------------------------------------------
const DATA_SOURCES = [
  "./pamon.json",        // ประมวลกฎหมาย
  "./ratathammanoon.json", // รัฐธรรมนูญ
  "./teka.json",       // พระราชกฤษฎีกา
  "./ ",    // พระราชกำหนด
  "./pharaschabunyad.json",          // พระราชบัญญัติ
  "./kodkasong.json"   // กฎกระทรวง/ระเบียบ
];

async function loadJsonAndStart() {
  listEl.innerHTML = `<div class="empty">กำลังโหลดฐานข้อมูลจากหลายแหล่ง...</div>`;
  
  try {
    // 2. สั่งโหลดทุกไฟล์พร้อมกัน
    const requests = DATA_SOURCES.map(url => 
      fetch(url, { cache: "no-store" })
        .then(res => {
            if (!res.ok) {
                console.warn(`หาไฟล์ ${url} ไม่เจอ หรือโหลดไม่ได้`);
                return []; // ถ้าไฟล์ไหนเสีย ให้ส่งค่าว่างกลับมาแทน โปรแกรมจะได้ไม่พัง
            }
            return res.json();
        })
        .catch(err => {
            console.warn(`Error loading ${url}:`, err);
            return [];
        })
    );

    // 3. รอให้เสร็จทั้งหมด แล้วรวมร่างข้อมูล (Merge)
    const results = await Promise.all(requests);
    
    // results จะได้ออกมาเป็น array ซ้อน array [[...], [...], [...]]
    // เราใช้ .flat() เพื่อตบให้แบนเป็น array เดียวกันหมด
    lawsData = results.flat(); 

    if (lawsData.length === 0) {
        listEl.innerHTML = `<div class="empty">ไม่พบข้อมูลในไฟล์ JSON ใดๆ เลย</div>`;
        return;
    }

    // 4. เริ่มทำงานตามปกติ
    renderChips();
    loadAllData();
    
    const u = new URL(location.href);
    const initQ = u.searchParams.get("q") || "";
    if (initQ) { document.querySelector("#q").value = initQ; doSearch(); }

  } catch (e) {
    console.error("Critical Error:", e);
    document.getElementById("list").innerHTML =
      `<div class="empty">เกิดข้อผิดพลาดร้ายแรงในการรวมไฟล์</div>`;
  }
}

/* ========================================================
   ส่วนด้านล่างนี้เหมือนเดิมทุกอย่าง ไม่ต้องแก้ครับ
   ======================================================== */

const COLS = { 
  category: "หมวด", 
  title: "ชื่อกฎหมาย", 
  date: "วันที่", 
  volume: "เล่มตอน", 
  url: "URL_PD"
};
const col = k => COLS[k];

const FIXED_CATS = [
  {key:"ประมวลกฎหมาย",      label:"ประมวลกฎหมาย",      emoji:"book_2"},
  {key:"รัฐธรรมนูญ",         label:"รัฐธรรมนูญ",         emoji:"gavel"},
  {key:"พระราชกฤษฎีกา",    label:"พระราชกฤษฎีกา",    emoji:"account_balance"},
  {key:"พระราชกำหนด",       label:"พระราชกำหนด",       emoji:"assignment_late"},
  {key:"พระราชบัญญัติ",     label:"พระราชบัญญัติ",     emoji:"menu_book"},
  {key:"ระเบียบคณะกรรมการ",      label:"กฎกระทรวง",         emoji:"policy"}
];

function normalizeCatName(raw=""){
  const s = (raw||"").trim();
  const map = new Map([
    ["ประมวลกฎหมาย","ประมวลกฎหมาย"], ["ประมวลกฏหมาย","ประมวลกฎหมาย"],
    ["รัฐธรรมนูญ","รัฐธรรมนูญ"],
    ["พระราชกฤษฎีกา","พระราชกฤษฎีกา"], ["พระรากฎีกา","พระราชกฤษฎีกา"], ["พระราชกฎีกา","พระราชกฤษฎีกา"],
    ["พระราชกำหนด","พระราชกำหนด"],
    ["พระราชบัญญัติ","พระราชบัญญัติ"],
    ["ระเบียบคณะกรรมการ","ระเบียบคณะกรรมการ"], ["กฎกระทรวง","ระเบียบคณะกรรมการ"]
  ]);
  return map.get(s) || s;
}
const $ = (s,el=document)=>el.querySelector(s);

function sanitizeUrl(u=''){
  try{ 
    const url=new URL(u, location.origin); 
    if(url.protocol==='http:'||url.protocol==='https:') return url.href; 
  }catch{}
  return '';
}

const TH_MONTHS={'ม.ค.':1,'ก.พ.':2,'มี.ค.':3,'เม.ย.':4,'พ.ค.':5,'มิ.ย.':6,'ก.ค.':7,'ส.ค.':8,'ก.ย.':9,'ต.ค.':10,'พ.ย.':11,'ธ.ค.':12,'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12};
function thDigitsToArabic(s=''){const m={'๐':'0','๑':'1','๒':'2','๓':'3','๔':'4','๕':'5','๖':'6','๗':'7','๘':'8','๙':'9'}; return s.replace(/[๐-๙]/g,ch=>m[ch]??ch);}
function parseDateTS(s){
  if(!s) return 0; s=s.trim();
  const onlyBuddhist = s.match(/^พ\.ศ\.?\s*([0-9๐-๙]{4})$/);
  if(onlyBuddhist){ let y=parseInt(thDigitsToArabic(onlyBuddhist[1]),10)-543; return new Date(y,0,1).getTime(); }
  const th = s.match(/^([0-9๐-๙]{1,2})\s+([ก-๙\.]+)\s+([0-๙0-9]{4})$/);
  if(th){
    const d=parseInt(thDigitsToArabic(th[1]),10);
    const m=TH_MONTHS[th[2]]||0;
    let y=parseInt(thDigitsToArabic(th[3]),10);
    if(y>2400) y-=543;
    return (m&&d&&y)? new Date(y,m-1,d).getTime():0;
  }
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){ let [y,m,d]=s.split('-').map(n=>+n); if(y>2400) y-=543; return new Date(y,(m||1)-1,(d||1)).getTime(); }
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){ let [d,m,y]=s.split('/').map(n=>+n); if(y>2400) y-=543; return new Date(y,(m||1)-1,(d||1)).getTime(); }
  return 0;
}
function fmtDateThai(s){
  if(!s) return '';
  if(/^[0-9]{4}-/.test(s)||/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){
    let y,m,d;
    if(s.includes('-')){[y,m,d]=s.split('-').map(n=>+n);} else{[d,m,y]=s.split('/').map(n=>+n);}
    if(y<2400) y+=543;
    const mm=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return `${d} ${mm[(m||1)-1]} ${y}`;
  }
  return s;
}

const catbar = $("#catbar");
const listEl = $("#list");
const btnNext = $("#btnNext");
const btnPrev = $("#btnPrev");
const panelTitle = $("#panelTitle");
const panelNote = $("#panelNote");
const CatState = {};
let selectedCat = null;
const allIndex = [];
let LatestData = [];

function escapeHtml(s){return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// Render Card function
function renderCard(r){
  const t=r[col('title')]||'', d=r[col('date')]||'', v=r[col('volume')]||'', c=r[col('category')]||'', u=r[col('url')]||'';
  const safe = sanitizeUrl(u);
  return `<article class="law-card">
    <div class="law-title">${escapeHtml(t)||'(ไม่มีชื่อเรื่อง)'}</div>
    <div class="law-meta">
      ${c?`<span class="tag"><span class="material-symbols-rounded" style="font-size:14px;margin-right:2px">folder</span> ${escapeHtml(c)}</span>`:''}
      ${d?`<span class="tag"><span class="material-symbols-rounded" style="font-size:14px;margin-right:2px">calendar_today</span> ${escapeHtml(fmtDateThai(d))}</span>`:''}
      ${v?`<span class="tag"><span class="material-symbols-rounded" style="font-size:14px;margin-right:2px">book</span> ${escapeHtml(v)}</span>`:''}
    </div>
    <div class="actions">
      ${safe?`<a class="action-btn" href="${safe}" target="_blank" rel="noopener noreferrer">
        <span class="material-symbols-rounded" style="font-size:18px">visibility</span> อ่านฉบับเต็ม
      </a>`:`<span class="text-xs text-gray-400">ไม่มีไฟล์แนบ</span>`}
    </div>
  </article>`;
}

function renderChips(){
  catbar.innerHTML = FIXED_CATS.map(c => `
    <button class="chip" type="button" role="tab" aria-selected="false" data-cat="${c.key}">
      <span class="material-symbols-rounded" style="font-size:18px">${c.emoji}</span><span>${c.label}</span>
    </button>
  `).join('');
}

function loadAllData(){
  try {
    FIXED_CATS.forEach(({key}) => {
        CatState[key] = {rows: [], page: 0, loaded: true};
    });
    lawsData.forEach(item => {
        const normCat = normalizeCatName(item[col('category')]);
        if (CatState[normCat]) {
            const processedItem = {...item, _ts: parseDateTS(item[col('date')])};
            CatState[normCat].rows.push(processedItem);
            allIndex.push(processedItem);
        }
    });
    FIXED_CATS.forEach(({key}) => {
        if (CatState[key].rows.length > 0) {
            CatState[key].rows.sort((a, b) => (b._ts || 0) - (a._ts || 0));
            LatestData.push({cat: key, row: CatState[key].rows[0]});
        }
    });
    catbar.addEventListener('click', e=>{
      const b=e.target.closest('button[data-cat]'); if(!b) return;
      selectCategory(b.dataset.cat); 
      // Scroll chip into view
      b.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'});
    });
    selectCategory(FIXED_CATS[0].key);
    buildLatestSlider();
  } catch(e) {
    listEl.innerHTML=`<div class="empty">เกิดข้อผิดพลาดในการประมวลผล</div>`;
    console.error(e);
  }
}

function renderPage(cat){
  const st=CatState[cat]; if(!st) return;
  const start=st.page*PAGE_SIZE, end=start+PAGE_SIZE;
  const slice=st.rows.slice(start,end);
  listEl.innerHTML = slice.length? slice.map(renderCard).join('') : `<div class="empty">ไม่พบรายการในหมวดนี้</div>`;
  btnPrev.style.display = (st.page>0)? 'inline-flex':'none';
  btnNext.style.display = (end < st.rows.length)? 'inline-flex':'none';
  panelTitle.textContent = `${cat}`;
  panelNote.textContent  = `แสดง ${start+1}-${Math.min(end, st.rows.length)} จาก ${st.rows.length}`;
}

function selectCategory(cat){
  if(selectedCat===cat) return;
  selectedCat=cat;
  [...catbar.querySelectorAll('.chip')].forEach(b=>{
    const on = b.dataset.cat===cat;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on?'true':'false');
  });
  if(CatState[cat]){
    CatState[cat].page=0;
    renderPage(cat);
  } else {
    listEl.innerHTML = `<div class="empty">ไม่พบหมวดหมู่ "${cat}"</div>`;
  }
}

btnNext.addEventListener('click', ()=>{
  if(!selectedCat) return;
  const st=CatState[selectedCat]; if(!st) return;
  st.page+=1; renderPage(selectedCat);
  listEl.scrollIntoView({behavior:'smooth', block:'start'});
});
btnPrev.addEventListener('click', ()=>{
  if(!selectedCat) return;
  const st=CatState[selectedCat]; if(!st) return;
  if(st.page>0){ st.page-=1; renderPage(selectedCat); }
  listEl.scrollIntoView({behavior:'smooth', block:'start'});
});

const elQ = $("#q"), elBtnSearch=$("#btnSearch");
elBtnSearch.addEventListener('click', doSearch);
elQ.addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });

function normalizeThai(s){ return (s||'').toLowerCase().replace(/\s+/g,' ').trim().normalize('NFC').replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g,''); }
function doSearch(){
  const q=(elQ.value||'').trim();
  if(!q){ if(selectedCat) renderPage(selectedCat); return; }
  const nq=normalizeThai(q);
  const results = allIndex.filter(o=>{
    const t=normalizeThai(o[col('title')]||''),
          v=normalizeThai(o[col('volume')]||''),
          c=normalizeThai(o[col('category')]||'');
    return t.includes(nq)||v.includes(nq)||c.includes(nq);
  }).sort((a,b)=>(b._ts||0)-(a._ts||0));
  
  listEl.innerHTML = results.slice(0,50).map(renderCard).join('') || `<div class="empty">ไม่พบข้อมูลที่ค้นหา</div>`;
  btnNext.style.display='none';
  btnPrev.style.display='none';
  panelTitle.textContent = `ผลการค้นหา: “${q}”`;
  panelNote.textContent  = `พบ ${results.length} รายการ`;
}

const latestViewport = $("#latestViewport");
const latestTrack = $("#latestTrack");
const dotsEl = $("#dots");
let latestSlides=[]; let latestIndex=0; let autoTimer=null;

function updateLatestSlider(){
  const w = latestViewport.getBoundingClientRect().width;
  latestTrack.style.transform = `translateX(${-latestIndex*w}px)`;
  [...dotsEl.children].forEach((d,i)=>d.classList.toggle('active', i===latestIndex));
}
function nextLatest(){ if(!latestSlides.length) return; latestIndex = (latestIndex + 1) % latestSlides.length; updateLatestSlider(); }
function startAuto(){ stopAuto(); autoTimer = setInterval(nextLatest, 5000); }
function stopAuto(){ if(autoTimer){ clearInterval(autoTimer); autoTimer=null; } }

document.addEventListener('visibilitychange', ()=>{ document.hidden ? stopAuto() : startAuto(); });
latestViewport.addEventListener('mouseenter', stopAuto);
latestViewport.addEventListener('mouseleave', startAuto);
window.addEventListener('resize', updateLatestSlider);

function buildLatestSlider(){
  latestTrack.innerHTML=''; dotsEl.innerHTML='';
  latestSlides = LatestData.filter(Boolean).sort((a,b)=>(b.row._ts||0) - (a.row._ts||0));
  if(!latestSlides.length){
    latestTrack.innerHTML = `<div class="latest-slide"><div class="text-gray-400 text-center py-4">ยังไม่มีข้อมูลอัปเดต</div></div>`;
    return;
  }
  latestTrack.innerHTML = latestSlides.map(({cat,row})=>{
    const t=row[col('title')]||'', d=row[col('date')]||'', u=row[col('url')]||'#';
    const safe = sanitizeUrl(u);
    return `<div class="latest-slide">
      <div class="slide-title">${escapeHtml(t)}</div>
      <div class="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">${escapeHtml(cat)}</span>
        <span>${escapeHtml(fmtDateThai(d))}</span>
      </div>
      ${safe?`<a class="text-sm font-semibold text-blue-700 hover:underline flex items-center gap-1" href="${safe}" target="_blank">อ่านต่อ <span class="material-symbols-rounded" style="font-size:14px">arrow_forward</span></a>`:''}
    </div>`;
  }).join('');
  dotsEl.innerHTML = latestSlides.map((_,i)=>`<span class="dot ${i===0?'active':''}"></span>`).join('');
  latestIndex=0; updateLatestSlider(); startAuto();
}

// เริ่มต้นทำงาน
loadJsonAndStart();
