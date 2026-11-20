
function $(s, el){ return (el||document).querySelector(s); }
function $$(s, el){ return Array.from((el||document).querySelectorAll(s)); }
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
async function fetchJSON(path){
  const r = await fetch(path, {method:'GET', cache:'no-store'});
  if(!r.ok) throw new Error('Failed to load '+path+' ('+r.status+')');
  return r.json();
}
async function fetchText(path){
  const r = await fetch(path, {method:'GET', cache:'no-store'});
  if(!r.ok) throw new Error('Failed to load '+path);
  return r.text();
}
async function sha256Hex(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function levelOf(q){ return (q.config && q.config.level) || 1; }
function levelLabel(level){ if(level<=2) return 'Easy'; if(level===3) return 'Intermediate'; return 'Advanced'; }
function levelClass(level){ if(level<=2) return 'easy'; if(level===3) return 'intermediate'; return 'Advanced'.toLowerCase(); }
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function norm(s){ return String(s||'').trim().toLowerCase().replace(/\s+/g,' '); }
function mdToHtml(md){
  let h = esc(md);
  h = h.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>');
  h = h.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/^- (.*)$/gm,'<div>• $1</div>');
  h = h.replace(/\n/g,'<br>');
  return h;
}
function fmtTime(sec){ const m=Math.floor(sec/60), s=sec%60; return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); }
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }
