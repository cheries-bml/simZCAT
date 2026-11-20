async function loadJSON(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok) throw new Error('Cannot load '+path);return r.json();}
async function loadText(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok) throw new Error('Cannot load '+path);return r.text();}
async function sha256Hex(text){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function shuffle(a){const arr=[...a];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function mdToHtml(md){let h=escapeHtml(md);h=h.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^- (.*)$/gm,'<li>$1</li>');h=h.replace(/(<li>.*<\/li>)/s,'<ul>$1</ul>');return h.split(/\n\n+/).map(p=>p.trim().startsWith('<')?p:'<p>'+p.replace(/\n/g,'<br>')+'</p>').join('');}
function el(id){return document.getElementById(id);}
function fmtTime(sec){const m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function downloadJSON(filename,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);}
