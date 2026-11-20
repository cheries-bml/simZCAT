// Materials - PDF, PNG, JPG, TXT, MD via GET only
let MATERIALS=[];
async function initMaterials(){
  try{ MATERIALS = await getJSON('data/materials.json'); }catch{ MATERIALS=[]; }
  renderMaterials();
}
function renderMaterials(){
  const grid=$('#materialsGrid'); grid.innerHTML='';
  if(!MATERIALS.length){ grid.innerHTML='<p class="muted">Belum ada materi. Tambah di <code>data/materials.json</code> + file di <code>materials/</code>.</p>'; return; }
  MATERIALS.forEach(m=>{
    const card=document.createElement('div'); card.className='material-card';
    const icon = m.type==='pdf'?'file-text':(m.type==='md'?'file-code':(m.type==='txt'?'align-left':'image'));
    card.innerHTML=`<i data-lucide="${icon}"></i><h3>${escapeHtml(m.title)}</h3><p class="muted small">${escapeHtml(m.subject||'')} • ${escapeHtml(m.type.toUpperCase())}</p>`;
    card.onclick=()=>openMaterial(m); grid.appendChild(card);
  }); refreshIcons();
}
async function openMaterial(m){
  $('#materialViewer').classList.remove('hidden'); $('#viewerTitle').textContent=m.title; const body=$('#viewerBody'); body.innerHTML='Memuat...';
  try{
    if(m.type==='pdf'){ body.innerHTML=`<iframe class="viewer-pdf" src="${m.file}"></iframe>`; }
    else if(['png','jpg','jpeg','webp'].includes(m.type)){ body.innerHTML=`<img class="viewer-img" src="${m.file}" alt="">`; }
    else if(m.type==='md'){ const t=await (await fetch(m.file)).text(); body.innerHTML=`<div>${mdToHtml(t)}</div>`; }
    else { const t=await (await fetch(m.file)).text(); body.innerHTML=`<pre>${escapeHtml(t)}</pre>`; }
  }catch{ body.innerHTML='<p class="error">Gagal memuat file.</p>'; }
  document.getElementById('materialViewer').scrollIntoView({behavior:'smooth'});
}
