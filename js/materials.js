// materials.js — GET only, preview PDF / image / TXT / MD
const Materials = {
  renderList(){
    const list=document.getElementById("materialsList");
    const dash=document.getElementById("dashboardMaterials");
    const items = Store.materials||[];
    const html = items.map(m=>{
      const icon = m.type==="pdf" ? "picture_as_pdf" : m.type==="md" ? "article" : m.type==="txt" ? "description" : "image";
      return `<div class="list-item"><div style="display:flex;gap:10px;align-items:center"><span class="material-symbols-outlined">${icon}</span><div><strong>${Store.escape(m.title)}</strong><small>${Store.escape(m.description||"")} • ${m.type.toUpperCase()} • ${Store.escape(m.subject||"")}</small></div></div><button class="btn btn-ghost btn-sm" data-mat="${m.id}">Open</button></div>`;
    }).join("") || "<p class='muted'>No materials yet. Add files to /materials/ and list them in data/materials.json.</p>";
    if(list) list.innerHTML=html;
    if(dash) dash.innerHTML = items.slice(0,3).map(m=>`<div class="list-item"><div><strong>${Store.escape(m.title)}</strong><small>${Store.escape(m.description||"")} • ${m.type.toUpperCase()}</small></div><button class="btn btn-ghost btn-sm" data-mat="${m.id}">Open</button></div>`).join("") || "<p class='muted'>No materials.</p>";
    document.querySelectorAll("[data-mat]").forEach(b=> b.addEventListener("click", ()=>{ App.showView("materials"); this.open(b.dataset.mat); }));
  },
  async open(id){
    const m=(Store.materials||[]).find(x=>x.id===id); if(!m) return;
    document.getElementById("viewerTitle").innerHTML = `<span class="material-symbols-outlined">preview</span> ${Store.escape(m.title)}`;
    const viewer=document.getElementById("materialViewer");
    const link=document.getElementById("downloadLink");
    link.href="materials/"+m.file; link.style.display="inline-flex"; link.textContent="Download / Open";
    link.innerHTML=`<span class="material-symbols-outlined">download</span> Download / Open`;
    const url="materials/"+m.file;
    if(m.type==="pdf"){
      viewer.innerHTML=`<embed src="${url}" type="application/pdf" /><p class="muted small">If PDF does not preview, use Download.</p>`;
    } else if(["png","jpg","jpeg"].includes(m.type)){
      viewer.innerHTML=`<img src="${url}" alt="${Store.escape(m.title)}" />`;
    } else if(m.type==="txt"){
      try{ const r=await fetch(url,{method:"GET"}); const t=await r.text(); viewer.innerHTML=`<pre style="background:#fff;color:#0f172a;border:1px solid #e2e8f0">${Store.escape(t)}</pre>`; }
      catch(e){ viewer.innerHTML=`<p class="muted">Could not load file.</p>`; }
    } else if(m.type==="md"){
      try{ const r=await fetch(url,{method:"GET"}); const t=await r.text(); viewer.innerHTML=this.md(t); }
      catch(e){ viewer.innerHTML=`<p class="muted">Could not load file.</p>`; }
    } else {
      viewer.innerHTML=`<p><a href="${url}" target="_blank" rel="noopener">Open file</a></p>`;
    }
  },
  md(src){
    let h=Store.escape(src);
    h=h.replace(/^### (.*)$/gm,"<h3>$1</h3>").replace(/^## (.*)$/gm,"<h2>$1</h2>").replace(/^# (.*)$/gm,"<h1>$1</h1>");
    h=h.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
    h=h.replace(/^- (.*)$/gm,"<li>$1</li>");
    h=h.replace(/(\n<li>.*<\/li>)+/g, m=>"<ul>"+m.replace(/\n/g,"")+"</ul>");
    h=h.replace(/\n\n/g,"<br><br>").replace(/\n/g,"<br>");
    return `<div>${h}</div>`;
  }
};
