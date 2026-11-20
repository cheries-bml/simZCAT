// CAT Test - student mode. Explanation only after finish (if allowed).
let catPool=[], catQuestions=[], catIdx=0, catAnswers={}, catTimerId=null, catSeconds=0;

async function loadQuestionFile(path){
  const data = await getJSON(path);
  return normalizeQuestions(data);
}
function filterByDifficulty(list, diff){
  if(!diff || diff==='all') return list;
  return list.filter(q=>String(q.difficulty||'').toLowerCase()===diff);
}
async function initCat(){
  const sel=$('#catSource'); sel.innerHTML='';
  (CONFIG.questionFiles||['questions/sample.json']).forEach(f=>{ const o=document.createElement('option'); o.value=f; o.textContent=f; sel.appendChild(o); });
  try{ catPool = await loadQuestionFile(sel.value); $('#catSetupInfo').textContent = `${catPool.length} soal dimuat dari ${sel.value}`; }catch{ $('#catSetupInfo').textContent='Gagal memuat soal.'; }
  sel.onchange = async ()=>{ catPool = await loadQuestionFile(sel.value); $('#catSetupInfo').textContent = `${catPool.length} soal dimuat`; };
  $('#catStart').onclick = startCat;
  $('#catNext').onclick = ()=>{ saveCatAnswer(); if(catIdx<catQuestions.length-1){catIdx++; renderCat();} };
  $('#catPrev').onclick = ()=>{ saveCatAnswer(); if(catIdx>0){catIdx--; renderCat();} };
  $('#catFinish').onclick = finishCat;
  $('#catRestart').onclick = ()=>{ $('#catResult').classList.add('hidden'); $('#catSetup').classList.remove('hidden'); };
}
function startCat(){
  const diff=$('#catDifficulty').value;
  const count=parseInt($('#catCount').value||'10',10);
  const filtered=filterByDifficulty(catPool, diff);
  if(!filtered.length){ alert('Tidak ada soal untuk filter ini.'); return; }
  catQuestions = shuffle(filtered).slice(0, Math.min(count, filtered.length));
  catAnswers={}; catIdx=0;
  $('#catSetup').classList.add('hidden'); $('#catResult').classList.add('hidden'); $('#catTest').classList.remove('hidden');
  if($('#catTimerOn').checked){ catSeconds = catQuestions.length * (CONFIG.secondsPerQuestion||60); startTimer(); } else { $('#catTimer').textContent='Tanpa timer'; }
  renderCat();
}
function startTimer(){ clearInterval(catTimerId); catTimerId=setInterval(()=>{ catSeconds--; $('#catTimer').textContent=fmtTime(Math.max(0,catSeconds)); if(catSeconds<=0){ clearInterval(catTimerId); finishCat(); } },1000); }
function saveCatAnswer(){ const checked=document.querySelector('input[name="catOpt"]:checked'); if(checked) catAnswers[catIdx]=parseInt(checked.value,10); }
function renderCat(){
  const q=catQuestions[catIdx];
  $('#catProgress').textContent = `Soal ${catIdx+1} / ${catQuestions.length}`;
  $('#catBar').style.width = ((catIdx+1)/catQuestions.length*100)+'%';
  $('#catTopic').textContent = [q.subject,q.topic,q.difficulty].filter(Boolean).join(' • ');
  $('#catQ').textContent = q.question || q.text || '';
  const box=$('#catOptions'); box.innerHTML='';
  (q.options||[]).forEach((opt,i)=>{ const label=document.createElement('label'); label.className='opt'+(catAnswers[catIdx]===i?' selected':''); label.innerHTML=`<input type="radio" name="catOpt" value="${i}" ${catAnswers[catIdx]===i?'checked':''}> <span>${escapeHtml(opt)}</span>`; label.onclick=()=>{ saveCatAnswer(); renderCat(); }; box.appendChild(label); });
  $('#catPrev').disabled = catIdx===0; $('#catNext').disabled = catIdx===catQuestions.length-1;
}
function finishCat(){
  clearInterval(catTimerId); saveCatAnswer();
  let correct=0; catQuestions.forEach((q,i)=>{ const ans = q.answer; const ansIdx = typeof ans==='number' ? ans : (q.options||[]).indexOf(ans); if(catAnswers[i]===ansIdx) correct++; });
  const score = catQuestions.length ? Math.round(correct/catQuestions.length*100) : 0;
  $('#catTest').classList.add('hidden'); const res=$('#catResult'); res.classList.remove('hidden');
  $('#catScore').textContent = `${score} / 100`;
  $('#catScoreDetail').textContent = `Benar ${correct} dari ${catQuestions.length} soal.`;
  const rev=$('#catReview'); rev.innerHTML='';
  if(CONFIG.allowReviewAfterTest!==false){
    catQuestions.forEach((q,i)=>{ const ansIdx = typeof q.answer==='number' ? q.answer : (q.options||[]).indexOf(q.answer); const ok = catAnswers[i]===ansIdx; const d=document.createElement('div'); d.className='card'; d.innerHTML=`<strong>${i+1}. ${escapeHtml(q.question||'')}</strong><p class="${ok?'':'error'}">Jawaban Anda: ${escapeHtml(q.options?.[catAnswers[i]] ?? '-')} • Benar: ${escapeHtml(q.options?.[ansIdx] ?? '')}</p>${q.explanation?`<p class="muted small">${escapeHtml(q.explanation)}</p>`:''}`; rev.appendChild(d); });
  }
}
