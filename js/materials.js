
const Materials = {
  current:null,
  renderList(){
    const view=$('#view');
    const list=Auth.mIndex?.materials||[];
    view.innerHTML=`
      <div class="grid cols3">${list.map(m=>`
        <div class="card" style="cursor:pointer" onclick="Materials.open('${m.id}')">
          <div class="kpi"><div class="kpi-icon"><span class="material-symbols-outlined">${m.type==='pdf'?'picture_as_pdf':m.type==='md'||m.type==='txt'?'description':'image'}</span></div><div><h3>${esc(m.title)}</h3><span class="badge">${esc(m.type.toUpperCase())}</span></div></div>
          <p style="margin-top:10px">${esc(m.description||'')}</p>
          <p style="color:var(--primary);font-weight:600;margin-top:10px">Open →</p>
        </div>`).join('')}
      </div>
      <div class="card" style="margin-top:16px"><h3>How to add material</h3><p>Add file to <code>/materials/</code> and add entry to <code>materials/index.json</code>, then push to GitHub. Supported: PDF, PNG, JPG, TXT, MD.</p></div>
    `;
  },
  async open(id){
    const m=(Auth.mIndex?.materials||[]).find(x=>x.id===id); if(!m) return;
    this.current=m;
    const view=$('#view');
    view.innerHTML='<div class="card"><p class="muted">Loading…</p></div>';
    try{
      let viewer='';
      if(m.type==='pdf'){
        viewer='<div class="material-viewer"><iframe src="'+esc(m.file)+'"></iframe></div><p class="muted" style="margin-top:8px">If PDF does not load, use Download.</p>';
      } else if(m.type==='png'||m.type==='jpg'||m.type==='jpeg'){
        viewer='<div class="material-viewer"><img src="'+esc(m.file)+'" alt="'+esc(m.title)+'"></div>';
      } else if(m.type==='md'){
        const txt=await fetchText(m.file);
        viewer='<div class="card md">'+mdToHtml(txt)+'</div>';
      } else {
        const txt=await fetchText(m.file);
        viewer='<pre class="pre">'+esc(txt)+'</pre>';
      }
      view.innerHTML='<div class="row between"><button class="btn ghost" onclick="Materials.renderList()">← Materials</button><a class="btn primary" href="'+esc(m.file)+'" download>Download</a></div><h3 style="margin:14px 0 6px">'+esc(m.title)+'</h3><p class="muted" style="margin:0 0 12px">'+esc(m.description||'')+' • '+esc(m.type.toUpperCase())+'</p>'+viewer;
    }catch(e){
      view.innerHTML='<div class="card"><h3>Cannot load file</h3><p>'+esc(e.message)+'</p><p class="muted">Check that <code>'+esc(m.file)+'</code> exists in the repo.</p><button class="btn ghost" onclick="Materials.renderList()">Back</button></div>';
    }
  }
};
