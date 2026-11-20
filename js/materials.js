async function initMaterials(){
  const data=await loadJSON('data/materials.json');
  el('materialList').innerHTML=data.materials.map((m,i)=>'<div class="mat-item"><div><strong>'+escapeHtml(m.title)+'</strong><br><span class="muted small">'+escapeHtml(m.description||'')+' • '+m.type.toUpperCase()+'</span></div><button class="btn" onclick="openMaterial('+i+')">Open</button></div>').join('');
  window._materials=data.materials;
}
async function openMaterial(i){
  const m=window._materials[i]; const v=el('materialViewer');
  const url='materials/'+m.file;
  if(m.type==='pdf'){ v.innerHTML='<iframe src="'+url+'"></iframe>'; }
  else if(m.type==='png'||m.type==='jpg'||m.type==='jpeg'){ v.innerHTML='<img src="'+url+'" alt="'+escapeHtml(m.title)+'">'; }
  else if(m.type==='md'){ const t=await loadText(url); v.innerHTML=mdToHtml(t); }
  else { const t=await loadText(url); v.innerHTML='<pre>'+escapeHtml(t)+'</pre>'; }
}
