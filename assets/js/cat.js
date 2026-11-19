// CAT v4 — Test discovery + CAT. GET only, with fallback for file://
(function(){
"use strict";
const CAT={tests:[],loaded:false,loading:false,current:null,index:0,answers:{},flagged:new Set(),startedAt:null,timerId:null,qTimeLeft:0,checked:false,noErrorSelected:false,segInputs:{}};
window.CAT=CAT;
const $c=(id)=>document.getElementById(id);
function norm(s){return String(s||'').toLowerCase().trim().replace(/\s+/g,' ').replace(/[.\s]+$/,'');}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function fetchJSON(url){const r=await fetch(url,{method:'GET',headers:{Accept:'application/json'},cache:'no-store'}); if(!r.ok) throw new Error(url+' '+r.status); return r.json();}
// Fallback test (same as sample_question.json) if fetch fails on file://
const FALLBACK_TEST={meta:{title:"Test title",description:"Question Description",info:"Additional information about the test.",author:"Author Name",config:{show_answer:false,show_explanation:false,no_timer:true,active:true}},questions:[{id:1,type:"multiple_choice",data:{hint:"Choose the correct verb form to complete the sentence.",image:{url:"https://via.placeholder.com/400x200/sample-image.jpg",orientation:"landscape"},passage:"She is a fitness enthusiast and maintains a strict routine. <br>Every morning, she wakes up early and heads to the gym for her workout session. She <b>believes</b> that regular exercise is essential for a healthy lifestyle.",question:"She ___ to the gym every morning."},options:{A:{text:"gone"},B:{text:"going",correct:false},C:{text:"goes",correct:true},D:{text:"go"},E:{text:"always goes",correct:true}},explanation:{text:"Third person singular subject 'She' requires the verb form 'goes' in the simple present tense. Also, 'always goes' is correct as it indicates a habitual action.",topic:"Simple Present Tense",concept:"Subject-Verb Agreement",formula:"Subject (He/She/It) + Verb (base form + s/es)",examples:["He goes to school every day.","She likes to read books."]},config:{show_answer:true,show_explanation:true,level:1,time_in_seconds:{fast:15,normal:30,easy:60}}},{id:2,type:"correction",data:{hint:"Click the incorrect parts and type the correct form (may contain 0, 1 or multiple errors). If no error, choose No Error.",multiErrorSegments:[{id:"s1",text:"Having",clickable:false},{id:"s2",text:"warning",clickable:true,isError:true,correctAnswers:["been warned"]},{id:"s3",text:"about the risks,",clickable:false},{id:"s4",text:"the team,",clickable:true,isError:false},{id:"s5",text:"which were responsible",clickable:true,isError:true,correctAnswers:["which was responsible","that was responsible"]},{id:"s6",text:"for the safety checks,",clickable:false},{id:"s7",text:"proceeded cautiously,",clickable:true,isError:false},{id:"s8",text:"neither of the supervisors being aware",clickable:true,isError:false},{id:"s9",text:"of the final decision.",clickable:false}]},explanation:{text:"The correct forms are 'been warned' instead of 'warning' and 'which was responsible' or 'that was responsible' instead of 'which were responsible'.",topic:"Subject-Verb Agreement",concept:"Correcting verb forms to match subject number and tense.",formula:"Subject (singular/plural) + Verb (correct form)",examples:["The team, which was responsible for the project, completed it on time.","Having been warned about the risks, they proceeded cautiously."]},config:{show_answer:true,show_explanation:true,level:4,time_in_seconds:{fast:15,normal:30,easy:60}}} ]};

async function loadTests(force){
  if(CAT.loaded && !force){ renderTestCards(); return; }
  if(CAT.loading) return; CAT.loading=true;
  const loadingEl=$c('testLoading'); if(loadingEl) loadingEl.hidden=false;
  let files=[];
  try{
    const manifest=await fetchJSON('questions/manifest.json');
    if(Array.isArray(manifest)) files=manifest;
    else if(Array.isArray(manifest.tests)) files=manifest.tests;
    else if(Array.isArray(manifest.files)) files=manifest.files;
  }catch(e){ console.warn('manifest failed, fallback',e); files=['sample_question.json']; }
  files=files.map(f=> typeof f==='string'?f:(f.path||f.file||f.url)).filter(Boolean);
  const tests=[];
  for(const f of files){
    const path=f.startsWith('questions/')?f:'questions/'+f;
    try{ const data=await fetchJSON(path); if(data&&data.questions) tests.push({file:f,path,data,meta:data.meta||{},questions:data.questions||[]}); }
    catch(e){ console.warn('test load failed',path,e); }
  }
  if(!tests.length){ tests.push({file:'sample_question.json (built-in)',path:'built-in',data:FALLBACK_TEST,meta:FALLBACK_TEST.meta,questions:FALLBACK_TEST.questions}); }
  CAT.tests=tests; CAT.loaded=true; CAT.loading=false;
  if(loadingEl) loadingEl.hidden=true;
  const stat=$c('testCountStat'); if(stat) stat.textContent=String(tests.length);
  const sub=$c('testCountSub'); if(sub) sub.textContent=tests.reduce((a,t)=>a+t.questions.length,0)+' questions total';
  const pill=$c('testTotalPill'); if(pill) pill.textContent=tests.length+' tests';
  renderTestCards();
}
CAT.loadTests=loadTests;
function getTestTypes(t){return [...new Set(t.questions.map(q=>q.type))];}
function getTestLevel(t){const lv=t.questions.map(q=>q.config?.level||1); return lv.length?Math.round(lv.reduce((a,b)=>a+b,0)/lv.length):1;}
function getTestTime(t){return t.questions.reduce((a,q)=>a+((q.config&&q.config.time_in_seconds&&q.config.time_in_seconds.normal)||30),0);}
function formatTime(sec){const m=Math.floor(sec/60), s=sec%60; return m+':'+String(s).padStart(2,'0');}
function renderTestCards(){
  const grid=$c('testGrid'), empty=$c('testEmpty'); if(!grid) return;
  const q=($c('testSearch')?.value||'').toLowerCase();
  const filter=$c('testFilter')?.value||'all';
  let list=CAT.tests.filter(t=>{
    const meta=t.meta||{}; const hay=((meta.title||'')+' '+(meta.description||'')+' '+(meta.author||'')).toLowerCase();
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
  grid.innerHTML=list.map(t=>{
    const meta=t.meta||{}; const types=getTestTypes(t); const totalSec=getTestTime(t);
    const typeLabel=types.length>1?'Mixed':(types[0]||'Test');
    const icon=typeLabel==='correction'?'✏️':typeLabel==='Mixed'?'🧩':'✅';
    const idx=CAT.tests.indexOf(t);
    return '<article class="test-card" data-idx="'+idx+'"><div style="display:flex;justify-content:space-between"><span style="font-size:22px">'+icon+'</span><span class="pill">'+escapeHtml(typeLabel)+'</span></div><h3>'+escapeHtml(meta.title||t.file)+'</h3><p>'+escapeHtml(meta.description||meta.info||'')+'</p><div class="test-meta"><span>📝 '+t.questions.length+' questions</span><span>⏱ ~'+Math.ceil(totalSec/60)+' min</span><span>⭐ Level '+getTestLevel(t)+'</span><span>👤 '+escapeHtml(meta.author||'Unknown')+'</span></div><button class="btn-primary" data-start="'+idx+'">Start Test →</button></article>';
  }).join('');
  grid.querySelectorAll('.test-card').forEach(card=>{
    card.addEventListener('click',(e)=>{ if(e.target.closest('button')) return; openTest(parseInt(card.dataset.idx,10)); });
  });
  grid.querySelectorAll('[data-start]').forEach(b=>b.addEventListener('click',(e)=>{ e.stopPropagation(); openTest(parseInt(b.dataset.start,10)); }));
}
function openTest(idx){
  const t=CAT.tests[idx]; if(!t) return;
  CAT.current=t; CAT.index=0; CAT.answers={}; CAT.flagged=new Set(); CAT.checked=false; CAT.noErrorSelected=false; CAT.segInputs={};
  const app=document.getElementById('appView'); if(app) app.hidden=true;
  const nav=document.getElementById('mainNav'); if(nav) nav.hidden=true;
  const cat=document.getElementById('catView'); if(cat) cat.hidden=false;
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
function startTest(){ CAT.startedAt=Date.now(); CAT.index=0; CAT.answers={}; CAT.checked=false; $c('catIntro').hidden=true; $c('catBody').hidden=false; $c('catResult').hidden=true; renderQuestion(); }
function getCurrentQ(){ return CAT.current.questions[CAT.index]; }
function shouldShowAnswer(q){ const m=(CAT.current.meta&&CAT.current.meta.config)||{}; if(q.config && typeof q.config.show_answer==='boolean') return q.config.show_answer; return m.show_answer!==false; }
function shouldShowExplanation(q){ const m=(CAT.current.meta&&CAT.current.meta.config)||{}; if(q.config && typeof q.config.show_explanation==='boolean') return q.config.show_explanation; return m.show_explanation!==false; }
function isNoTimer(){ return CAT.current.meta && CAT.current.meta.config && CAT.current.meta.config.no_timer===true; }
function startTimer(){
  stopTimer();
  const q=getCurrentQ(); const total=(q.config&&q.config.time_in_seconds&&q.config.time_in_seconds.normal)||30;
  CAT.qTimeLeft=total; const el=$c('catTimer'); if(!el) return;
  const wrap=el.parentElement; if(wrap) wrap.classList.remove('warn');
  if(isNoTimer()){ el.textContent='No timer'; CAT.timerId=setInterval(()=>{ const elapsed=Math.floor((Date.now()-CAT.startedAt)/1000); el.textContent=formatTime(elapsed); },1000); return; }
  el.textContent=formatTime(CAT.qTimeLeft);
  CAT.timerId=setInterval(()=>{
    CAT.qTimeLeft--; el.textContent=formatTime(Math.max(0,CAT.qTimeLeft));
    if(wrap){ if(CAT.qTimeLeft<=10) wrap.classList.add('warn'); else wrap.classList.remove('warn'); }
    if(CAT.qTimeLeft<=0){ stopTimer(); if(!CAT.checked){ checkCurrent(); } setTimeout(()=>{ if(CAT.current) goNext(true); }, 1200); }
  },1000);
}
function stopTimer(){ if(CAT.timerId){ clearInterval(CAT.timerId); CAT.timerId=null; } }
function renderQuestion(){
  const q=getCurrentQ(); if(!q) return;
  CAT.checked=false; CAT.noErrorSelected=false; CAT.segInputs={};
  const total=CAT.current.questions.length;
  $c('catCounter').textContent='Q '+(CAT.index+1)+' / '+total;
  $c('catTypePill').textContent=q.type;
  $c('catLevel').textContent='Level '+((q.config&&q.config.level)||1);
  $c('catProgressBar').style.width=((CAT.index)/total*100)+'%';
  const flagBtn=$c('catFlag'); if(flagBtn) flagBtn.textContent=CAT.flagged.has(q.id)?'🚩 Flagged':'🚩 Flag';
  const hintEl=$c('catHint'); if(hintEl){ hintEl.hidden=true; hintEl.textContent=(q.data&&q.data.hint)||'No hint'; }
  const pc=$c('catPassageCard');
  if(q.data&&q.data.passage){ if(pc) pc.hidden=false; const pp=$c('catPassage'); if(pp) pp.innerHTML=q.data.passage; } else if(pc) pc.hidden=true;
  const iw=$c('catImageWrap'); const img=q.data&&q.data.image&&q.data.image.url;
  if(img){ if(iw) iw.hidden=false; const im=$c('catImage'); if(im) im.src=img; const cap=$c('catImageCap'); if(cap) cap.textContent=(q.data.image.orientation||''); } else if(iw) iw.hidden=true;
  const qt=$c('catQuestionText'); if(qt) qt.textContent=(q.data&&q.data.question)||'Question';
  const fb=$c('catFeedback'); if(fb){ fb.hidden=true; fb.innerHTML=''; }
  const optsEl=$c('catOptions'); if(optsEl) optsEl.innerHTML='';
  const sw=$c('catSegmentsWrap'); if(sw) sw.hidden=true;
  const segEl=$c('catSegments'); if(segEl) segEl.innerHTML='';
  const cb=$c('catCorrectionBox'); if(cb) cb.innerHTML='';
  // Restore previous answers for back navigation
  const prev=CAT.answers[q.id];
  if(q.type==='multiple_choice'){ renderMCQ(q, prev); }
  else if(q.type==='correction'){ renderCorrection(q, prev); }
  else if(optsEl){ optsEl.innerHTML='<p class="muted">Unsupported type: '+escapeHtml(q.type)+'</p>'; }
  const dots=$c('catDots'); if(dots){
    dots.innerHTML=CAT.current.questions.map((qq,i)=>{
      const cls=['dot-btn']; if(i===CAT.index) cls.push('active'); if(CAT.answers[qq.id]) cls.push('done'); if(CAT.flagged.has(qq.id)) cls.push('flagged');
      return '<button class="'+cls.join(' ')+'" data-dot="'+i+'">'+(i+1)+'</button>';
    }).join('');
    dots.querySelectorAll('[data-dot]').forEach(b=>b.addEventListener('click',()=>{ stopTimer(); CAT.index=parseInt(b.dataset.dot,10); renderQuestion(); }));
  }
  const prevBtn=$c('catPrev'); if(prevBtn) prevBtn.disabled=CAT.index===0;
  updatePrimaryButton();
  startTimer();
}
function updatePrimaryButton(){
  const btn=$c('catPrimary'); if(!btn) return;
  const q=getCurrentQ(); const isLast=CAT.index===CAT.current.questions.length-1;
  if(!CAT.checked && shouldShowAnswer(q)) btn.textContent='Check answer';
  else if(isLast) btn.textContent='Finish ✓';
  else btn.textContent='Next →';
}
function renderMCQ(q, prev){
  const opts=q.options||{}; const keys=Object.keys(opts);
  const correctKeys=keys.filter(k=>opts[k].correct===true);
  const multi=correctKeys.length>1;
  const container=$c('catOptions'); if(!container) return;
  if(multi){ const p=document.createElement('p'); p.className='muted small'; p.textContent='Select all that apply ('+correctKeys.length+' correct)'; container.appendChild(p); }
  keys.forEach(k=>{
    const o=opts[k]; const btn=document.createElement('button'); btn.className='opt'; btn.setAttribute('data-opt',k);
    const selected = multi ? (prev&&Array.isArray(prev.selected)&&prev.selected.includes(k)) : (prev&&prev.selected===k);
    if(selected) btn.classList.add('selected');
    btn.innerHTML='<span class="opt-letter">'+escapeHtml(k)+'</span><span>'+escapeHtml(o.text)+'</span>';
    btn.addEventListener('click',()=>{
      if(CAT.checked) return;
      if(multi){
        const cur=CAT.answers[q.id]&&Array.isArray(CAT.answers[q.id].selected)?[...CAT.answers[q.id].selected]:[];
        const next=cur.includes(k)?cur.filter(x=>x!==k):[...cur,k];
        CAT.answers[q.id]={selected:next,checked:false};
        btn.classList.toggle('selected');
      }else{
        container.querySelectorAll('.opt').forEach(o=>o.classList.remove('selected'));
        btn.classList.add('selected');
        CAT.answers[q.id]={selected:k,checked:false};
      }
      updatePrimaryButton();
    });
    container.appendChild(btn);
  });
}
function renderCorrection(q, prev){
  const sw=$c('catSegmentsWrap'); if(sw) sw.hidden=false;
  const segs=(q.data&&q.data.multiErrorSegments)||[];
  const segEl=$c('catSegments'); if(!segEl) return;
  // Restore
  if(prev&&prev.selected){ CAT.segInputs={...(prev.inputs||{})}; }
  if(prev&&prev.noError){ CAT.noErrorSelected=true; const nb=$c('catNoError'); if(nb) nb.textContent='✓ No Error selected'; }
  segs.forEach(s=>{
    const btn=document.createElement('button'); btn.className='seg'; btn.setAttribute('data-seg',s.id);
    const isSel=prev&&prev.selected&&prev.selected.includes(s.id);
    if(isSel) btn.classList.add('selected');
    btn.textContent=s.text;
    if(s.clickable===false){ btn.disabled=true; btn.style.opacity='0.6'; btn.style.cursor='default'; }
    btn.addEventListener('click',()=>{
      if(CAT.checked) return;
      const wasSel=btn.classList.contains('selected');
      btn.classList.toggle('selected');
      CAT.noErrorSelected=false; const nb=$c('catNoError'); if(nb) nb.textContent='No Error';
      if(!wasSel){
        const box=document.createElement('div'); box.className='corr-input'; box.id='corr-'+s.id;
        box.innerHTML='<span>Correct “'+escapeHtml(s.text)+'” →</span>';
        const inp=document.createElement('input'); inp.type='text'; inp.placeholder='Type correction…'; inp.value=CAT.segInputs[s.id]||'';
        inp.addEventListener('input',e=>{ CAT.segInputs[s.id]=e.target.value; });
        box.appendChild(inp);
        const hint=document.createElement('span'); hint.className='muted small'; hint.textContent='Accepted: '+((s.correctAnswers||[]).join(' / '));
        box.appendChild(hint);
        const cb=$c('catCorrectionBox'); if(cb) cb.appendChild(box);
      }else{
        const el=document.getElementById('corr-'+s.id); if(el) el.remove(); delete CAT.segInputs[s.id];
      }
    });
    segEl.appendChild(btn);
    if(isSel){
      const box=document.createElement('div'); box.className='corr-input'; box.id='corr-'+s.id;
      box.innerHTML='<span>Correct “'+escapeHtml(s.text)+'” →</span>';
      const inp=document.createElement('input'); inp.type='text'; inp.placeholder='Type correction…'; inp.value=CAT.segInputs[s.id]||'';
      inp.addEventListener('input',e=>{ CAT.segInputs[s.id]=e.target.value; });
      box.appendChild(inp);
      const cb=$c('catCorrectionBox'); if(cb) cb.appendChild(box);
    }
  });
  const noBtn=$c('catNoError'); if(noBtn){
    noBtn.onclick=()=>{
      if(CAT.checked) return;
      CAT.noErrorSelected=!CAT.noErrorSelected;
      noBtn.textContent=CAT.noErrorSelected?'✓ No Error selected':'No Error';
      if(CAT.noErrorSelected){
        segEl.querySelectorAll('.seg').forEach(b=>b.classList.remove('selected'));
        const cb=$c('catCorrectionBox'); if(cb) cb.innerHTML=''; CAT.segInputs={};
      }
    };
  }
}
function checkCurrent(){
  const q=getCurrentQ(); if(!q) return false;
  if(CAT.checked) return CAT.answers[q.id]&&CAT.answers[q.id].correct;
  let isCorrect=false; let userAns=null;
  if(q.type==='multiple_choice'){
    const opts=q.options||{}; const keys=Object.keys(opts); const correctKeys=keys.filter(k=>opts[k].correct===true);
    const prev=CAT.answers[q.id];
    if(!prev || prev.selected==null || (Array.isArray(prev.selected)&&prev.selected.length===0)){
      const fb=$c('catFeedback'); if(fb){ fb.hidden=false; fb.className='feedback bad'; fb.innerHTML='<h4>Pick an answer first</h4><p>Select an option, then click Check.</p>'; }
      return false;
    }
    const multi=correctKeys.length>1;
    if(multi){
      const sel=[...(Array.isArray(prev.selected)?prev.selected:[])].sort();
      const cor=[...correctKeys].sort();
      isCorrect=JSON.stringify(sel)===JSON.stringify(cor);
      userAns={selected:sel};
    }else{
      isCorrect=prev.selected===correctKeys[0]; userAns={selected:prev.selected};
    }
    CAT.answers[q.id]={...userAns,correct:isCorrect};
  }else if(q.type==='correction'){
    const segs=(q.data&&q.data.multiErrorSegments)||[]; const expected=segs.filter(s=>s.isError);
    if(CAT.noErrorSelected){
      isCorrect=expected.length===0; userAns={noError:true};
    }else{
      const selectedIds=[...document.querySelectorAll('#catSegments .seg.selected')].map(b=>b.getAttribute('data-seg'));
      const expectedIds=expected.map(s=>s.id);
      const sameSet=JSON.stringify([...selectedIds].sort())===JSON.stringify([...expectedIds].sort());
      let allCorr=sameSet;
      if(sameSet){
        for(const id of expectedIds){
          const seg=expected.find(s=>s.id===id); const typed=CAT.segInputs[id]||'';
          const ok=(seg.correctAnswers||[]).some(a=>norm(a)===norm(typed));
          if(!ok) allCorr=false;
        }
      }
      isCorrect=allCorr; userAns={selected:selectedIds,inputs:{...CAT.segInputs}};
    }
    CAT.answers[q.id]={...userAns,correct:isCorrect};
  }else{
    CAT.answers[q.id]={correct:false};
  }
  CAT.checked=true;
  $c('catProgressBar').style.width=(((CAT.index+1)/CAT.current.questions.length)*100)+'%';
  if(shouldShowAnswer(q)||shouldShowExplanation(q)){
    showFeedback(q,isCorrect);
    if(q.type==='multiple_choice'){
      const opts=q.options||{}; Object.keys(opts).forEach(k=>{
        const btn=document.querySelector('[data-opt="'+k+'"]'); if(!btn) return;
        if(opts[k].correct) btn.classList.add('correct');
        const sel=CAT.answers[q.id]&&CAT.answers[q.id].selected; const isSel=Array.isArray(sel)?sel.includes(k):sel===k;
        if(isSel && !opts[k].correct) btn.classList.add('wrong');
      });
    }
  }
  updatePrimaryButton();
  return isCorrect;
}
function showFeedback(q,isCorrect){
  const fb=$c('catFeedback'); if(!fb) return; fb.hidden=false; fb.className='feedback '+(isCorrect?'ok':'bad');
  let html='<h4>'+(isCorrect?'✅ Correct':'❌ Incorrect')+'</h4>';
  if(q.type==='multiple_choice'){
    const opts=q.options||{}; const correctKeys=Object.keys(opts).filter(k=>opts[k].correct);
    html+='<p><strong>Correct:</strong> '+correctKeys.map(k=>k+' — '+escapeHtml(opts[k].text)).join(', ')+'</p>';
  }else if(q.type==='correction'){
    const segs=(q.data&&q.data.multiErrorSegments)||[]; const expected=segs.filter(s=>s.isError);
    if(!expected.length) html+='<p><strong>Correct:</strong> No Error — the sentence is correct.</p>';
    else html+='<p><strong>Errors:</strong><br>'+expected.map(s=>'“'+escapeHtml(s.text)+'” → '+(s.correctAnswers||[]).join(' / ')).join('<br>')+'</p>';
  }
  if(shouldShowExplanation(q)&&q.explanation){
    const ex=q.explanation;
    html+='<hr style="border:0;border-top:1px solid var(--border);margin:10px 0"><p>'+(ex.text||'')+'</p>';
    if(ex.topic||ex.concept) html+='<p><strong>Topic:</strong> '+escapeHtml(ex.topic||'')+' • <strong>Concept:</strong> '+escapeHtml(ex.concept||'')+'</p>';
    if(ex.formula) html+='<div class="formula">'+escapeHtml(ex.formula)+'</div>';
    if(ex.examples&&ex.examples.length) html+='<p><strong>Examples:</strong><br>'+ex.examples.map(e=>'• '+e).join('<br>')+'</p>';
  }
  fb.innerHTML=html;
}
function goNext(fromTimer){
  const q=getCurrentQ(); if(!q) return;
  // If show_answer and not checked, check first (except if called from timer after auto-check)
  if(shouldShowAnswer(q) && !CAT.checked && !fromTimer){
    const ok=checkCurrent();
    if(!CAT.checked) return; // need pick
    // Stay on same question, button now says Next/Finish. User clicks again to move.
    return;
  }
  if(!CAT.checked){
    // Silent evaluation for no-show-answer mode
    // Temporarily check without feedback: use checkCurrent then hide feedback if needed
    const prevShow=shouldShowAnswer(q);
    checkCurrent();
    if(!prevShow){ const fb=$c('catFeedback'); if(fb) fb.hidden=true; }
  }
  stopTimer();
  if(CAT.index < CAT.current.questions.length-1){ CAT.index++; renderQuestion(); }
  else finishTest();
}
function goPrev(){ if(CAT.index===0) return; stopTimer(); CAT.index--; renderQuestion(); }
function finishTest(){
  stopTimer();
  const q=getCurrentQ(); if(q && !CAT.checked){ checkCurrent(); const fb=$c('catFeedback'); if(fb && !shouldShowAnswer(q)) fb.hidden=true; }
  const total=CAT.current.questions.length;
  let correct=0; const review=[];
  CAT.current.questions.forEach((qq,i)=>{
    const a=CAT.answers[qq.id]; const ok=a&&a.correct===true; if(ok) correct++;
    review.push({q:qq,ans:a,ok});
  });
  const pct=total?Math.round((correct/total)*100):0;
  const elapsed=Math.floor((Date.now()-CAT.startedAt)/1000);
  $c('catBody').hidden=true; $c('catResult').hidden=false;
  $c('resultScore').textContent=pct+'%';
  $c('resultTitle').textContent=pct>=80?'Excellent! 🎉':pct>=50?'Good job! 👍':'Keep practicing 💪';
  $c('resultSub').textContent='You got '+correct+' of '+total+' correct in '+formatTime(elapsed);
  $c('resultCorrect').textContent=String(correct); $c('resultTotal').textContent=String(total); $c('resultTime').textContent=formatTime(elapsed);
  $c('resultReview').innerHTML=review.map((r,i)=>{
    const ex=r.q.explanation||{}; const qtext=(r.q.data&&r.q.data.question)||('Q'+(i+1));
    let ansText='—';
    if(r.q.type==='multiple_choice'){ const sel=r.ans&&r.ans.selected; ansText=Array.isArray(sel)?sel.join(', '):(sel||'Skipped'); }
    else if(r.q.type==='correction'){ ansText=r.ans&&r.ans.noError?'No Error':'Selected: '+((r.ans&&r.ans.selected)||[]).join(', ')+' • Typed: '+Object.values((r.ans&&r.ans.inputs)||{}).join(', '); }
    return '<div class="review-item"><h4>'+(i+1)+'. '+escapeHtml(qtext)+' '+(r.ok?'✅':'❌')+'</h4><p>Your answer: '+escapeHtml(ansText)+'</p><p>'+escapeHtml(ex.text||'')+'</p>'+(ex.formula?'<p><strong>Formula:</strong> '+escapeHtml(ex.formula)+'</p>':'')+'</div>';
  }).join('');
  try{
    const topics=[...new Set(review.map(r=>r.q.explanation&&r.q.explanation.topic).filter(Boolean))];
    const all=JSON.parse(localStorage.getItem('simpleauth_reports')||'[]');
    all.push({title:CAT.current.meta.title||CAT.current.file,total,correct,time:formatTime(elapsed),date:new Date().toISOString(),topics});
    localStorage.setItem('simpleauth_reports', JSON.stringify(all.slice(-20)));
  }catch(e){}
  if(window.renderReports) window.renderReports();
}
function closeCat(){
  stopTimer(); const cv=$c('catView'); if(cv) cv.hidden=true;
  const app=document.getElementById('appView'); if(app) app.hidden=false;
  const nav=document.getElementById('mainNav'); if(nav) nav.hidden=false;
  loadTests(false);
}
document.addEventListener('DOMContentLoaded',()=>{
  const s=$c('testSearch'); if(s) s.addEventListener('input',renderTestCards);
  const f=$c('testFilter'); if(f) f.addEventListener('change',renderTestCards);
  const rl=$c('reloadTests'); if(rl) rl.addEventListener('click',()=>loadTests(true));
  const st=$c('catStart'); if(st) st.addEventListener('click',startTest);
  const cl=$c('catClose'); if(cl) cl.addEventListener('click',closeCat);
  const bk=$c('catBack'); if(bk) bk.addEventListener('click',closeCat);
  const rt=$c('catRetake'); if(rt) rt.addEventListener('click',()=>{ const idx=CAT.tests.indexOf(CAT.current); openTest(idx); startTest(); });
  const pr=$c('catPrimary'); if(pr) pr.addEventListener('click',()=>goNext(false));
  const pv=$c('catPrev'); if(pv) pv.addEventListener('click',goPrev);
  const hb=$c('catHintBtn'); if(hb) hb.addEventListener('click',()=>{ const h=$c('catHint'); if(h) h.hidden=!h.hidden; });
  const fl=$c('catFlag'); if(fl) fl.addEventListener('click',()=>{
    const q=getCurrentQ(); if(!q) return;
    if(CAT.flagged.has(q.id)) CAT.flagged.delete(q.id); else CAT.flagged.add(q.id);
    fl.textContent=CAT.flagged.has(q.id)?'🚩 Flagged':'🚩 Flag';
    // Update dots without re-rendering question (keeps inputs)
    const dots=$c('catDots'); if(dots){
      dots.querySelectorAll('[data-dot]').forEach(b=>{
        const i=parseInt(b.getAttribute('data-dot'),10);
        const qq=CAT.current.questions[i];
        b.classList.toggle('flagged', CAT.flagged.has(qq.id));
      });
    }
  });
});
})();
