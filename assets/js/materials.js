// materials.js - list + viewer for pdf/png/jpg/txt/md
const MATERIALS = {
  list:[],
  async load(){
    try{ this.list=await fetchJSON('data/materials.json'); }catch{ this.list=[]; }
    return this.list;
  },
  iconFor(type){
    if(type==='pdf') return 'picture_as_pdf';
    if(type==='png'||type==='jpg'||type==='jpeg') return 'image';
    if(type==='md') return 'article';
    return 'description';
  },
  renderList(){
    const el=document.getElementById('materialsList');
    if(!this.list.length){ el.innerHTML='<li>No materials yet. Add files to <code>materials/</code> and list them in <code>data/materials.json</code></li>'; return; }
    el.innerHTML=this.list.map(m=>`<li><div style="display:flex;gap:10px;align-items:center"><span class="material-symbols-outlined" style="color:#4F46E5">${this.iconFor(m.type)}</span><div><b>${esc(m.title)}</b><div class="meta">${esc(m.type||'').toUpperCase()} • ${esc(m.file)}</div><div class="small muted">${esc(m.description||'')}</div></div></div><button class="btn btn-outline btn-sm" onclick="MATERIALS.open('${m.id}')">Open</button></li>`).join('');
  },
  async open(id){
    const m=this.list.find(x=>x.id===id); if(!m) return;
    document.getElementById('materialPreviewTitle').textContent=m.title+' — '+m.file;
    const viewer=document.getElementById('materialViewer');
    viewer.innerHTML='<div class="material-viewer"><div style="padding:16px" class="muted">Loading…</div></div>';
    const type=(m.type||'').toLowerCase();
    try{
      if(type==='pdf'){
        viewer.innerHTML=`<div class="material-viewer"><iframe src="${esc(m.file)}"></iframe><div style="padding:10px"><a class="btn btn-outline btn-sm" href="${esc(m.file)}" target="_blank" rel="noopener">Open PDF in new tab</a></div></div>`;
      } else if(['png','jpg','jpeg','webp'].includes(type)){
        viewer.innerHTML=`<div class="material-viewer"><img src="${esc(m.file)}" alt="${esc(m.title)}"></div>`;
      } else if(type==='txt'){
        const txt=await fetchText(m.file);
        viewer.innerHTML=`<div class="material-viewer"><pre>${esc(txt)}</pre></div>`;
      } else if(type==='md'){
        const md=await fetchText(m.file);
        viewer.innerHTML=`<div class="material-viewer">${mdToHtml(md)}</div>`;
      } else {
        viewer.innerHTML=`<div class="material-viewer"><div style="padding:16px"><a href="${esc(m.file)}" target="_blank" rel="noopener">Download / open file</a></div></div>`;
      }
    }catch(e){
      viewer.innerHTML=`<div class="material-viewer"><div style="padding:16px" class="alert error">Could not load file. Check that <code>${esc(m.file)}</code> exists in the repo.</div></div>`;
    }
  }
};
