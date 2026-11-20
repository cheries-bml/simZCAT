// Shared helpers - no sensitive data here
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function normalizeQuestions(data){ if(Array.isArray(data)) return data; if(data?.questions) return data.questions; if(data?.data) return data.data; return []; }
function mdToHtml(md){ let h=escapeHtml(md); h=h.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>'); return h; }
function fmtTime(sec){ const m=Math.floor(sec/60), s=sec%60; return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); }
async function sha256(text){ const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
async function getJSON(path){ const r=await fetch(path); if(!r.ok) throw new Error('Gagal load '+path); return r.json(); }
function refreshIcons(){ if(window.lucide) lucide.createIcons(); }
