// Teaching Mode - teacher discusses each question, shows answer + explanation
let teachPool=[], teachFiltered=[], teachIdx=0, teachAnswerShown=false;

async function initTeach(){
  const sel=$('#teachSource'); sel.innerHTML='';
  (CONFIG.questionFiles||['questions/sample.json']).forEach(f=>{ const o=document.createElement('option'); o.value=f; o.textContent=f; sel.appendChild(o); });
  const load = async ()=>{ teachPool = await loadQuestionFile(sel.value); applyTeachFilter(); };
  sel.onchange=load; $('#teachDifficulty').onchange=applyTeachFilter; $('#teachSearch').oninput=applyTeachFilter;
  $('#teachPrev').onclick=()=>{ if(teachIdx>0){teachIdx--; renderTeach();} };
  $('#teachNext').onclick=()=>{ if(teachIdx<teachFiltered.length-1){teachIdx++; renderTeach();} };
  $('#teachShow').onclick=()=>{ teachAnswerShown=true; renderTeach(); };
  await load();
}
function applyTeachFilter(){
  const diff=$('#teachDifficulty').value, q=$('#teachSearch').value.toLowerCase();
  teachFiltered = filterByDifficulty(teachPool, diff).filter(item=>!q || (item.question||'').toLowerCase().includes(q) || (item.topic||'').toLowerCase().includes(q));
  teachIdx=0; teachAnswerShown=false; renderTeach();
}
function renderTeach(){
  $('#teachCount').textContent = teachFiltered.length ? `Soal ${teachIdx+1} / ${teachFiltered.length}` : 'Tidak ada soal';
  const item = teachFiltered[teachIdx]; if(!item){ $('#teachQ').textContent='—'; $('#teachOptions').innerHTML=''; return; }
  $('#teachQ').textContent = item.question||'';
  const ansIdx = typeof item.answer==='number' ? item.answer : (item.options||[]).indexOf(item.answer);
  const box=$('#teachOptions'); box.innerHTML='';
  (item.options||[]).forEach((opt,i)=>{ const d=document.createElement('div'); d.className='opt'+(teachAnswerShown && i===ansIdx?' correct':''); d.innerHTML=`<span><strong>${String.fromCharCode(65+i)}.</strong> ${escapeHtml(opt)}</span>${teachAnswerShown && i===ansIdx?' <strong>✓ Benar</strong>':''}`; box.appendChild(d); });
  const ex=$('#teachExplain'); if(teachAnswerShown && item.explanation){ ex.classList.remove('hidden'); $('#teachExplainText').textContent=item.explanation; } else { ex.classList.add('hidden'); }
  $('#teachShow').textContent = teachAnswerShown ? 'Jawaban Ditampilkan' : 'Tampilkan Jawaban';
  $('#teachShow').disabled = teachAnswerShown;
}
