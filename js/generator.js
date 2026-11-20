// Generate Test - from /questions/*.json, difficulty + count. Client-side only.
let genPool=[], genResult=null;
async function initGenerator(){
  const sel=$('#genSource'); sel.innerHTML='';
  (CONFIG.questionFiles||['questions/sample.json']).forEach(f=>{ const o=document.createElement('option'); o.value=f; o.textContent=f; sel.appendChild(o); });
  genPool = await loadQuestionFile(sel.value);
  sel.onchange=async()=>{ genPool = await loadQuestionFile(sel.value); };
  $('#genFile').onchange = async (e)=>{ const file=e.target.files[0]; if(!file) return; try{ const txt=await file.text(); genPool=normalizeQuestions(JSON.parse(txt)); alert(`${genPool.length} soal dimuat dari file lokal.`); }catch{ alert('File JSON tidak valid.'); } };
  $('#genBtn').onclick=generateTest;
  $('#genPrint').onclick=()=>window.print();
  $('#genDownload').onclick=downloadGen;
}
function generateTest(){
  const diff=$('#genDifficulty').value, count=parseInt($('#genCount').value||'10',10);
  const filtered = diff==='all' ? [...genPool] : filterByDifficulty(genPool, diff);
  // If mixed, try to balance difficulties
  let picked = diff==='all' ? shuffle(filtered).slice(0,count) : shuffle(filtered).slice(0,count);
  if(diff==='all' && filtered.length>=count){
    const by={easy:[],intermediate:[],advanced:[]};
    filtered.forEach(q=>{ const d=(q.difficulty||'easy').toLowerCase(); if(by[d]) by[d].push(q); });
    const per=Math.floor(count/3); picked=[...shuffle(by.easy).slice(0,per),...shuffle(by.intermediate).slice(0,per),...shuffle(by.advanced).slice(0,count-per*2)];
    picked=shuffle(picked);
  }
  genResult={ title:$('#genTitle').value||'Latihan CAT', generatedAt:new Date().toISOString().slice(0,10), difficulty:diff, questions:picked };
  $('#genOutput').classList.remove('hidden'); $('#genOutputTitle').textContent=`${genResult.title} — ${picked.length} soal`;
  const list=$('#genList'); list.innerHTML='';
  picked.forEach((q,i)=>{ const d=document.createElement('div'); d.className='card'; d.innerHTML=`<strong>${i+1}. ${escapeHtml(q.question||'')}</strong><span class="chip">${escapeHtml(q.difficulty||'')}</span><div class="options">${(q.options||[]).map((o,j)=>`<div class="opt">${String.fromCharCode(65+j)}. ${escapeHtml(o)}</div>`).join('')}</div>`; list.appendChild(d); });
  refreshIcons();
}
function downloadGen(){
  if(!genResult) return;
  const blob=new Blob([JSON.stringify(genResult,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='generated-test.json'; a.click(); URL.revokeObjectURL(a.href);
}
