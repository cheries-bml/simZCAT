// CAT Engine v3 — Test discovery + Computer Assisted Test
// Discovers tests from /questions/manifest.json via GET only
const CAT = {
  tests: [], loaded: false, loading: false,
  current: null, index: 0, answers: {}, flagged: new Set(), startedAt: null, timerId: null, qTimeLeft: 0, qStartedAt: null, checked: false, noErrorSelected: false, segInputs: {}
};
window.CAT = CAT;

const $c = (id) => document.getElementById(id);
function norm(s){ return (s||'').toString().toLowerCase().trim().replace(/\s+/g,' ').replace(/[.\s]+$/,''); }

async function fetchJSON(url){ const r=await fetch(url,{method:'GET',headers:{Accept:'application/json'},cache:'no-store'}); if(!r.ok) throw new Error(url); return r.json(); }

async function loadTests(force=false){
  if(CAT.loaded && !force) { renderTestCards(); return; }
  if(CAT.loading) return; CAT.loading=true;
  const loadingEl=$c('testLoading'); if(loadingEl) loadingEl.hidden=false;
  let files=[];
  try{
    const manifest=await fetchJSON('questions/manifest.json');
    if(Array.isArray(manifest)) files=manifest;
    else if(Array.isArray(manifest.tests)) files=manifest.tests;
    else if(Array.isArray(manifest.files)) files=manifest.files;
    else if(manifest.file) files=[manifest.file];
  }catch(e){ console.warn('No manifest, trying fallback'); files=['sample_question.json']; }
  // If manifest entries are objects {path/file}, normalize
  files=files.map(f=> typeof f==='string'? f : (f.path||f.file||f.url)).filter(Boolean);
  const tests=[];
  for(const f of files){
    const path = f.startsWith('questions/') ? f : 'questions/'+f;
    try{
      const data=await fetchJSON(path);
      if(data && data.questions) tests.push({file:f, path, data, meta:data.meta||{}, questions:data.questions||[]});
    }catch(e){ console.warn('Failed', path); }
  }
  CAT.tests=tests; CAT.loaded=true; CAT.loading=false;
  if(loadingEl) loadingEl.hidden=true;
  const stat=$c('testCountStat'); if(stat) stat.textContent=tests.length+'';
  const sub=$c('testCountSub'); if(sub) sub.textContent= tests.reduce((a,t)=>a+t.questions.length,0)+' questions total';
  const pill=$c('testTotalPill'); if(pill) pill.textContent=tests.length+' tests';
  renderTestCards();
}
CAT.loadTests=loadTests;

function getTestTypes(t){
  const s=new Set(t.questions.map(q=>q.type)); return [...s];
}
function getTestLevel(t){
  const lv=t.questions.map(q=>q.config?.level||1); return lv.length? Math.round(lv.reduce((a,b)=>a+b,0)/lv.length):1;
}
function getTestTime(t){
  return t.questions.reduce((a,q)=>a+(q.config?.time_in_seconds?.normal||30),0);
}
function formatTime(sec){ const m=Math.floor(sec/60), s=sec%60; return m+':'+String(s).padStart(2,'0'); }

function renderTestCards(){
  const grid=$c('testGrid'); const empty=$c('testEmpty'); if(!grid) return;
  const q=($c('testSearch')?.value||'').toLowerCase();
  const filter=$c('testFilter')?.value||'all';
  let list=CAT.tests.filter(t=>{
    const meta=t.meta||{}; const hay=(meta.title+' '+meta.description+' '+meta.author+' '+(t.questions.map(x=>x.data?.question||'').join(' '))).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(filter!=='all'){
      const types=getTestTypes(t);
      if(filter==='mixed' && types.length<2) return false;
      if(filter!=='mixed' && !types.includes(filter)) return false;
    }
    return true;
  });
  if(!list.length){ grid.innerHTML=''; if(empty) empty.hidden=false; return; }
  if(empty) empty.hidden=true;
  grid.innerHTML=list.map((t,idx)=>{
    const meta=t.meta||{}; const types=getTestTypes(t); const totalSec=getTestTime(t);
    const typeLabel=types.length>1?'Mixed':types[0]||'Test';
    const icon=typeLabel==='correction'?'✏️':typeLabel==='Mixed'?'🧩':'✅';
    return '<article class="test-card" data-idx="'+CAT.tests.indexOf(t)+'">'
      +'<div class="tc-top"><span class="test-icon">'+icon+'</span><span class="pill">'+typeLabel+'</span></div>'
      +'<h3>'+escapeHtml(meta.title||t.file)+'</h3>'
      +'<p>'+escapeHtml(meta.description||meta.info||'No description')+'</p>'
      +'<div class="test-meta"><span>📝 '+t.questions.length+' questions</span><span>⏱ ~'+Math.ceil(totalSec/60)+' min</span><span>⭐ Level '+getTestLevel(t)+'</span><span>👤 '+(meta.author||'Unknown')+'</span></div>'
      +'<button class="btn-primary" data-start="'+CAT.tests.indexOf(t)+'">Start Test →</button></article>';
  }).join('');
  grid.querySelectorAll('.test-card').forEach(card=>{
    card.addEventListener('click',(e)=>{
      const i=card.dataset.idx; if(e.target.closest('button')) return; openTest(parseInt(i,10));
    });
  });
  grid.querySelectorAll('[data-start]').forEach(b=> b.addEventListener('click',(e)=>{ e.stopPropagation(); openTest(parseInt(b.dataset.start,10)); }));
}
function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---- CAT Runner ----
function openTest(idx){
  const t=CAT.tests[idx]; if(!t) return;
  CAT.current=t; CAT.index=0; CAT.answers={}; CAT.flagged=new Set(); CAT.checked=false; CAT.noErrorSelected=false; CAT.segInputs={};
  // hide app pages, show CAT
  document.getElementById('appView').hidden=true;
  document.getElementById('mainNav').hidden=true;
  const cat=document.getElementById('catView'); cat.hidden=false;
  $c('catTitle').textContent=t.meta.title||t.file;
  $c('catMeta').textContent=(t.meta.author||'')+' • '+t.questions.length+' questions';
  $c('catIntroTitle').textContent=t.meta.title||'Ready?';
  $c('catIntroDesc').textContent=t.meta.description||t.meta.info||'';
  $c('catIntroCount').textContent='📝 '+t.questions.length+' questions';
  $c('catIntroTime').textContent='⏱ ~'+Math.ceil(getTestTime(t)/60)+' min';
  $c('catIntroTypes').textContent='🧩 '+getTestTypes(t).join(' + ');
  $c('catIntro').hidden=false; $c('catBody').hidden=true; $c('catResult').hidden=true;
  $c('catCounter').textContent='Q 1 / '+t.questions.length;
  window.scrollTo({top:0});
}
function startTest(){
  CAT.startedAt=Date.now(); CAT.index=0; CAT.answers={}; CAT.checked=false;
  $c('catIntro').hidden=true; $c('catBody').hidden=false; $c('catResult').hidden=true;
  renderQuestion();
}
function getCurrentQ(){ return CAT.current.questions[CAT.index]; }
function getQConfig(q){ return q.config||{}; }
function shouldShowAnswer(q){ const m=CAT.current.meta.config||{}; if(q.config && typeof q.config.show_answer==='boolean') return q.config.show_answer; return m.show_answer!==false; }
function shouldShowExplanation(q){ const m=CAT.current.meta.config||{}; if(q.config && typeof q.config.show_explanation==='boolean') return q.config.show_explanation; return m.show_explanation!==false; }
function isNoTimer(){ return CAT.current.meta.config?.no_timer===true; }

function startTimer(){
  stopTimer();
  const q=getCurrentQ(); const total=q.config?.time_in_seconds?.normal||30;
  CAT.qTimeLeft=total; CAT.qStartedAt=Date.now();
  const el=$c('catTimer'); if(!el) return;
  if(isNoTimer()){ el.textContent='No timer'; $c('catTimer').parentElement.classList.remove('warn'); CAT.timerId=setInterval(()=>{ const elapsed=Math.floor((Date.now()-CAT.startedAt)/1000); el.textContent=formatTime(elapsed); },1000); return; }
  el.textContent=formatTime(CAT.qTimeLeft);
  CAT.timerId=setInterval(()=>{
    CAT.qTimeLeft--; el.textContent=formatTime(Math.max(0,CAT.qTimeLeft));
    if(CAT.qTimeLeft<=10) $c('catTimer').parentElement.classList.add('warn'); else $c('catTimer').parentElement.classList.remove('warn');
    if(CAT.qTimeLeft<=0){ stopTimer(); if(!CAT.checked) checkCurrent(true); setTimeout(()=> nextQuestion(), 800); }
  },1000);
}
function stopTimer(){ if(CAT.timerId){ clearInterval(CAT.timerId); CAT.timerId=null; } }

function renderQuestion(){
  const q=getCurrentQ(); if(!q) return;
  CAT.checked=false; CAT.noErrorSelected=false; CAT.segInputs={};
  const total=CAT.current.questions.length;
  $c('catCounter').textContent='Q '+(CAT.index+1)+' / '+total;
  $c('catTypePill').textContent=q.type;
  $c('catLevel').textContent='Level '+(q.config?.level||1);
  $c('catProgressBar').style.width=((CAT.index)/total*100)+'%';
  $c('catFlag').textContent= CAT.flagged.has(q.id)? '🚩 Flagged' : '🚩 Flag';
  $c('catHint').hidden=true;
  $c('catHint').textContent=q.data?.hint||'No hint';
  // passage
  const pc=$c('catPassageCard'); if(q.data?.passage){ pc.hidden=false; $c('catPassage').innerHTML=q.data.passage; } else pc.hidden=true;
  // image
  const iw=$c('catImageWrap'); const img=q.data?.image?.url;
  if(img && !img.includes('placeholder')){ iw.hidden=false; $c('catImage').src=img; $c('catImageCap').textContent=q.data.image.orientation||''; } else if(img){ iw.hidden=false; $c('catImage').src=img; $c('catImageCap').textContent='Sample image'; } else iw.hidden=true;
  $c('catQuestionText').textContent=q.data?.question||'Question';
  $c('catFeedback').hidden=true; $c('catFeedback').innerHTML='';
  // render by type
  $c('catOptions').innerHTML=''; $c('catSegmentsWrap').hidden=true; $c('catSegments').innerHTML=''; $c('catCorrectionBox').innerHTML='';
  if(q.type==='multiple_choice'){ renderMCQ(q); }
  else if(q.type==='correction'){ renderCorrection(q); }
  else { $c('catOptions').innerHTML='<p class="muted">Unsupported type: '+escapeHtml(q.type)+'</p>'; }
  // dots
  const dots=$c('catDots'); dots.innerHTML=CAT.current.questions.map((qq,i)=>{
    const cls=['dot-btn']; if(i===CAT.index) cls.push('active'); if(CAT.answers[qq.id]) cls.push('done'); if(CAT.flagged.has(qq.id)) cls.push('flagged');
    return '<button class="'+cls.join(' ')+'" data-dot="'+i+'">'+(i+1)+'</button>';
  }).join('');
  dots.querySelectorAll('[data-dot]').forEach(b=> b.addEventListener('click',()=>{ stopTimer(); CAT.index=parseInt(b.dataset.dot,10); renderQuestion(); }));
  // footer buttons
  $c('catPrev').disabled=CAT.index===0;
  const isLast=CAT.index===total-1;
  $c('catNext').hidden=isLast; $c('catFinish').hidden=!isLast;
  if(shouldShowAnswer(q) && q.type==='multiple_choice'){ $c('catNext').textContent='Next →'; }
  else $c('catNext').textContent='Next →';
  startTimer();
}

function renderMCQ(q){
  const opts=q.options||{};
  const keys=Object.keys(opts);
  const correctKeys=keys.filter(k=>opts[k].correct===true);
  const multi=correctKeys.length>1;
  $c('catOptions').innerHTML = (multi? '<p class="muted small">Select all that apply ('+correctKeys.length+' correct)</p>':'') + keys.map(k=>{
    const o=opts[k]; const prev=CAT.answers[q.id];
    const selected = multi ? (Array.isArray(prev?.selected) && prev.selected.includes(k)) : (prev?.selected===k);
    return '<button class="opt'+(selected?' selected':'')+'" data-opt="'+k+'"><span class="opt-letter">'+k+'</span><span>'+escapeHtml(o.text)+'</span></button>';
  }).join('');
  $c('catOptions').querySelectorAll('[data-opt]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(CAT.checked) return;
      const k=btn.dataset.opt;
      if(multi){
        const cur=CAT.answers[q.id]?.selected||[]; const next=cur.includes(k)? cur.filter(x=>x!==k) : [...cur,k];
        CAT.answers[q.id]={selected:next, checked:false};
        btn.classList.toggle('selected');
      } else {
        $c('catOptions').querySelectorAll('.opt').forEach(o=>o.classList.remove('selected'));
        btn.classList.add('selected');
        CAT.answers[q.id]={selected:k, checked:false};
        if(shouldShowAnswer(q)){ checkCurrent(false); }
      }
    });
  });
}

function renderCorrection(q){
  $c('catSegmentsWrap').hidden=false;
  const segs=q.data.multiErrorSegments||[];
  $c('catSegments').innerHTML=segs.map(s=>{
    const clickable=s.clickable!==false;
    return '<button class="seg'+(clickable?'':' is-error')+'" data-seg="'+s.id+'" '+(clickable?'':'disabled')+'>'+escapeHtml(s.text)+'</button>';
  }).join('');
  $c('catSegments').querySelectorAll('[data-seg]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(CAT.checked) return;
      const id=btn.dataset.seg; const seg=segs.find(x=>x.id===id);
      const isSel=btn.classList.contains('selected');
      btn.classList.toggle('selected');
      CAT.noErrorSelected=false; $c('catNoError').textContent='No Error';
      if(!isSel){
        // add input
        const box=document.createElement('div'); box.className='corr-input'; box.id='corr-'+id;
        box.innerHTML='<span>Correct “'+escapeHtml(seg.text)+'” →</span><input type="text" placeholder="Type correction…" /><span class="muted small">Accepted: '+(seg.correctAnswers||[]).join(' / ')+'</span>';
        $c('catCorrectionBox').appendChild(box);
        CAT.segInputs[id]='';
        box.querySelector('input').addEventListener('input', e=>{ CAT.segInputs[id]=e.target.value; });
      } else {
        const el=document.getElementById('corr-'+id); if(el) el.remove(); delete CAT.segInputs[id];
      }
    });
  });
  $c('catNoError').onclick=()=>{
    if(CAT.checked) return;
    CAT.noErrorSelected=!CAT.noErrorSelected;
    $c('catNoError').textContent=CAT.noErrorSelected?'✓ No Error selected':'No Error';
    if(CAT.noErrorSelected){
      // clear selections
      $c('catSegments').querySelectorAll('.seg').forEach(b=>b.classList.remove('selected'));
      $c('catCorrectionBox').innerHTML=''; CAT.segInputs={};
    }
  };
}

function checkCurrent(auto=false){
  const q=getCurrentQ(); if(!q) return false;
  if(CAT.checked) return true;
  let isCorrect=false; let userAns=null;
  if(q.type==='multiple_choice'){
    const opts=q.options||{}; const keys=Object.keys(opts); const correctKeys=keys.filter(k=>opts[k].correct===true);
    const prev=CAT.answers[q.id];
    if(!prev) { if(!auto){ $c('catFeedback').hidden=false; $c('catFeedback').className='feedback bad'; $c('catFeedback').innerHTML='<h4>Pick an answer first</h4>'; return false; } else { CAT.answers[q.id]={selected:null, correct:false, skipped:true}; return false; } }
    const multi=correctKeys.length>1;
    if(multi){
      const sel=Array.isArray(prev.selected)? [...prev.selected].sort():[];
      const cor=[...correctKeys].sort();
      isCorrect=JSON.stringify(sel)===JSON.stringify(cor);
      userAns={selected:sel};
    } else {
      isCorrect=prev.selected===correctKeys[0]; userAns={selected:prev.selected};
    }
    CAT.answers[q.id]={...userAns, correct:isCorrect};
  } else if(q.type==='correction'){
    const segs=q.data.multiErrorSegments||[]; const expected=segs.filter(s=>s.isError);
    if(CAT.noErrorSelected){
      isCorrect=expected.length===0; userAns={noError:true};
    } else {
      // collect selected ids from UI
      const selectedIds=[...document.querySelectorAll('#catSegments .seg.selected')].map(b=>b.dataset.seg);
      const expectedIds=expected.map(s=>s.id);
      const sameSet=JSON.stringify([...selectedIds].sort())===JSON.stringify([...expectedIds].sort());
      let allCorr=true;
      if(!sameSet) allCorr=false;
      else {
        for(const id of expectedIds){
          const seg=expected.find(s=>s.id===id); const typed=CAT.segInputs[id]||'';
          const ok=(seg.correctAnswers||[]).some(a=> norm(a)===norm(typed));
          if(!ok) allCorr=false;
        }
      }
      isCorrect=allCorr; userAns={selected:selectedIds, inputs:{...CAT.segInputs}};
    }
    CAT.answers[q.id]={...userAns, correct:isCorrect};
  }
  CAT.checked=true;
  $c('catProgressBar').style.width=(((CAT.index+1)/CAT.current.questions.length)*100)+'%';
  if(shouldShowAnswer(q) || shouldShowExplanation(q)){
    showFeedback(q, isCorrect);
    // mark options
    if(q.type==='multiple_choice'){
      const opts=q.options||{}; Object.keys(opts).forEach(k=>{
        const btn=document.querySelector('[data-opt="'+k+'"]'); if(!btn) return;
        if(opts[k].correct) btn.classList.add('correct');
        const sel=CAT.answers[q.id]?.selected; const isSel=Array.isArray(sel)? sel.includes(k) : sel===k;
        if(isSel && !opts[k].correct) btn.classList.add('wrong');
      });
    }
  }
  return isCorrect;
}

function showFeedback(q, isCorrect){
  const fb=$c('catFeedback'); fb.hidden=false; fb.className='feedback '+(isCorrect?'ok':'bad');
  let html='<h4>'+(isCorrect?'✅ Correct':'❌ Incorrect')+'</h4>';
  if(q.type==='multiple_choice'){
    const opts=q.options||{}; const correctKeys=Object.keys(opts).filter(k=>opts[k].correct);
    html+='<p><strong>Correct:</strong> '+correctKeys.map(k=>k+' — '+escapeHtml(opts[k].text)).join(', ')+'</p>';
  } else if(q.type==='correction'){
    const segs=q.data.multiErrorSegments||[]; const expected=segs.filter(s=>s.isError);
    if(!expected.length) html+='<p><strong>Correct:</strong> No Error — the sentence is correct.</p>';
    else html+='<p><strong>Errors:</strong> '+expected.map(s=> '“'+escapeHtml(s.text)+'” → '+(s.correctAnswers||[]).join(' / ')).join('<br>')+'</p>';
  }
  if(shouldShowExplanation(q) && q.explanation){
    const ex=q.explanation;
    html+='<hr style="border:0;border-top:1px solid var(--border);margin:10px 0"><p>'+(ex.text||'')+'</p>';
    if(ex.topic||ex.concept) html+='<p><strong>Topic:</strong> '+escapeHtml(ex.topic||'')+' • <strong>Concept:</strong> '+escapeHtml(ex.concept||'')+'</p>';
    if(ex.formula) html+='<div class="formula">'+escapeHtml(ex.formula)+'</div>';
    if(ex.examples && ex.examples.length) html+='<p><strong>Examples:</strong><br>'+ex.examples.map(e=> '• '+e).join('<br>')+'</p>';
  }
  fb.innerHTML=html;
}

function nextQuestion(){
  const q=getCurrentQ();
  // If show_answer and not yet checked, check first
  if(shouldShowAnswer(q) && !CAT.checked){
    const ok=checkCurrent(false);
    if(!ok && !CAT.answers[q.id]) return; // need pick
    // if checked, second click will move — but we already checked, so move now only if user clicks again? To keep one-click flow, if we just checked, stay and let user click Next again.
    // So return and change button to indicate next
    $c('catNext').textContent='Next → (checked)';
    return;
  }
  // If not show_answer, just record correctness silently for final score
  if(!CAT.checked){
    // evaluate silently without feedback
    const wasChecked=CAT.checked;
    // temporarily allow check without showing? Use checkCurrent but hide feedback
    const prevHidden=$c('catFeedback').hidden;
    checkCurrent(false);
    if(!shouldShowAnswer(q)) $c('catFeedback').hidden=true;
  }
  stopTimer();
  if(CAT.index < CAT.current.questions.length-1){ CAT.index++; renderQuestion(); }
  else finishTest();
}
function prevQuestion(){ if(CAT.index===0) return; stopTimer(); CAT.index--; renderQuestion(); }

function finishTest(){
  stopTimer();
  // ensure last question evaluated
  const q=getCurrentQ();
  if(!CAT.checked) checkCurrent(true);
  const total=CAT.current.questions.length;
  let correct=0; const review=[];
  CAT.current.questions.forEach((qq,i)=>{
    const a=CAT.answers[qq.id]; const ok=a?.correct===true; if(ok) correct++;
    review.push({q:qq, ans:a, ok});
  });
  const pct=Math.round((correct/total)*100);
  const elapsed=Math.floor((Date.now()-CAT.startedAt)/1000);
  $c('catBody').hidden=true; $c('catResult').hidden=false;
  $c('resultScore').textContent=pct+'%';
  $c('resultTitle').textContent=pct>=80?'Excellent! 🎉':pct>=50?'Good job! 👍':'Keep practicing 💪';
  $c('resultSub').textContent='You got '+correct+' of '+total+' correct in '+formatTime(elapsed);
  $c('resultCorrect').textContent=correct; $c('resultTotal').textContent=total; $c('resultTime').textContent=formatTime(elapsed);
  $c('resultReview').innerHTML=review.map((r,i)=>{
    const ex=r.q.explanation||{}; const qtext=r.q.data?.question||'Q'+(i+1);
    let ansText='—';
    if(r.q.type==='multiple_choice'){ const sel=r.ans?.selected; ansText=Array.isArray(sel)? sel.join(', ') : (sel||'Skipped'); }
    else if(r.q.type==='correction'){ ansText=r.ans?.noError? 'No Error' : 'Selected: '+(r.ans?.selected||[]).join(', ')+' • Typed: '+Object.values(r.ans?.inputs||{}).join(', '); }
    return '<div class="review-item"><h4>'+(i+1)+'. '+escapeHtml(qtext)+' '+(r.ok?'✅':'❌')+'</h4><p>Your answer: '+escapeHtml(ansText)+'</p><p>'+escapeHtml(ex.text||'')+'</p>'+(ex.formula?'<p><strong>Formula:</strong> '+escapeHtml(ex.formula)+'</p>':'')+'</div>';
  }).join('');
  // save to reports
  try{
    const topics=[...new Set(review.map(r=>r.q.explanation?.topic).filter(Boolean))];
    const all=JSON.parse(localStorage.getItem('simpleauth_reports')||'[]');
    all.push({title:CAT.current.meta.title||CAT.current.file, total, correct, time:formatTime(elapsed), date:new Date().toISOString(), topics});
    localStorage.setItem('simpleauth_reports', JSON.stringify(all.slice(-20)));
  }catch{}
  if(window.renderReports) window.renderReports();
}

function closeCat(){
  stopTimer(); $c('catView').hidden=true;
  const app=document.getElementById('appView'); app.hidden=false;
  document.getElementById('mainNav').hidden=false;
  if(window.CAT) loadTests();
}

// Bind CAT UI
document.addEventListener('DOMContentLoaded', ()=>{
  const s=$c('testSearch'); if(s) s.addEventListener('input', renderTestCards);
  const f=$c('testFilter'); if(f) f.addEventListener('change', renderTestCards);
  $c('reloadTests')?.addEventListener('click',()=> loadTests(true));
  $c('catStart')?.addEventListener('click', startTest);
  $c('catClose')?.addEventListener('click', closeCat);
  $c('catBack')?.addEventListener('click', closeCat);
  $c('catRetake')?.addEventListener('click', ()=>{ openTest(CAT.tests.indexOf(CAT.current)); startTest(); });
  $c('catNext')?.addEventListener('click', nextQuestion);
  $c('catFinish')?.addEventListener('click', ()=>{
    const q=getCurrentQ(); if(shouldShowAnswer(q) && !CAT.checked){ checkCurrent(false); $c('catFinish').textContent='Finish ✓ (checked) — click again'; return; }
    finishTest();
  });
  $c('catPrev')?.addEventListener('click', prevQuestion);
  $c('catHintBtn')?.addEventListener('click', ()=>{ $c('catHint').hidden=!$c('catHint').hidden; });
  $c('catFlag')?.addEventListener('click', ()=>{
    const q=getCurrentQ(); if(CAT.flagged.has(q.id)) CAT.flagged.delete(q.id); else CAT.flagged.add(q.id);
    $c('catFlag').textContent=CAT.flagged.has(q.id)?'🚩 Flagged':'🚩 Flag';
    renderQuestion(); // refresh dots but keep index — avoid timer reset double? renderQuestion resets timer, ok
  });
});
