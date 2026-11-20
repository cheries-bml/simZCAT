// utils.js - shared helpers, GET only
async function fetchJSON(path){
  const res = await fetch(path, {method:'GET', cache:'no-store'});
  if(!res.ok) throw new Error('Failed to load '+path+' ('+res.status+')');
  return res.json();
}
async function fetchText(path){
  const res = await fetch(path, {method:'GET', cache:'no-store'});
  if(!res.ok) throw new Error('Failed to load '+path);
  return res.text();
}
async function sha256Hex(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showToast(msg, ms=3200){
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'), ms);
}
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function levelToDifficulty(level){
  const l=Number(level)||3;
  if(l<=2) return 'easy';
  if(l===3) return 'intermediate';
  return 'advanced';
}
function diffLabel(d){ return d==='easy'?'Easy':d==='intermediate'?'Intermediate':'Advanced'; }
function normAnswer(s){ return String(s||'').toLowerCase().trim().replace(/[.,!?;:\s]+/g,' ').trim(); }
function fmtTime(sec){
  sec=Math.max(0, Math.ceil(sec));
  const m=Math.floor(sec/60), s=sec%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function mdToHtml(md){
  let h=esc(md);
  h=h.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>');
  h=h.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/`(.+?)`/g,'<code>$1</code>');
  h=h.replace(/^- (.*)$/gm,'<li>$1</li>');
  h=h.replace(/(<li>.*<\/li>\n?)+/g, m=>'<ul>'+m+'</ul>');
  h=h.replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
  return '<div class="md-body"><p>'+h+'</p></div>';
}
