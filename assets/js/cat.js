// cat.js - CAT generation, run, scoring
const CAT = {
  meta:null, allQuestions:[], selected:[], answers:{}, current:0, timerId:null, remaining:0, noTimer:false,
  async loadFile(filePath){
    const data = await fetchJSON(filePath);
    this.meta=data.meta||{};
    this.allQuestions=data.questions||[];
    return data;
  },
  filtered(difficulty){
    if(difficulty==='all') return this.allQuestions;
    return this.allQuestions.filter(q=>levelToDifficulty(q.config?.level)===difficulty);
  },
  generate(difficulty, count){
    const pool=this.filtered(difficulty);
    const shuffled=shuffle(pool);
    const n = count==='all' ? shuffled.length : Math.min(parseInt(count)||10, shuffled.length);
    this.selected=shuffled.slice(0,n);
    this.answers={}; this.current=0;
    this.noTimer = !!(this.meta?.config?.no_timer);
    // total time = sum of normal times, fallback 30s per q
    const total = this.selected.reduce((s,q)=> s + (Number(q.config?.time_in_seconds?.normal)||30), 0);
    this.remaining=total;
    return {pool:pool.length, selected:this.selected.length, total};
  },
  setAnswer(qid, val){ this.answers[qid]=val; },
  getAnswer(qid){ return this.answers[qid]; },
  isCorrect(q){
    const ans=this.answers[q.id];
    if(q.type==='multiple_choice'){
      const correctLetters = Object.entries(q.options||{}).filter(([_,o])=>o.correct).map(([k])=>k).sort();
      if(!ans) return false;
      const got = Array.isArray(ans)? [...ans].sort() : [ans];
      return JSON.stringify(got)===JSON.stringify(correctLetters);
    }
    if(q.type==='correction'){
      if(!ans) return false;
      if(ans.noError){
        const errs=(q.multiErrorSegments||[]).filter(s=>s.isError);
        return errs.length===0;
      }
      const errs=(q.multiErrorSegments||[]).filter(s=>s.isError);
      const selIds = Object.keys(ans.corrections||{});
      if(selIds.length!==errs.length) return false;
      // every selected must be an error and correction must match
      for(const seg of errs){
        const typed = ans.corrections?.[seg.id];
        if(!typed) return false;
        const ok = (seg.correctAnswers||[]).some(c=>normAnswer(c)===normAnswer(typed));
        if(!ok) return false;
      }
      // no extra non-error selected
      for(const id of selIds){
        const seg=(q.multiErrorSegments||[]).find(s=>s.id===id);
        if(!seg || !seg.isError) return false;
      }
      return true;
    }
    return false;
  },
  score(){
    let correct=0;
    for(const q of this.selected) if(this.isCorrect(q)) correct++;
    return {correct, total:this.selected.length, percent: this.selected.length? Math.round(correct/this.selected.length*100):0};
  },
  // --- rendering ---
  renderQuestion(q){
    const diff=levelToDifficulty(q.config?.level);
    const hint = q.data?.hint ? `<div class="alert info"><span class="material-symbols-outlined">lightbulb</span><span>${esc(q.data.hint)}</span></div>` : '';
    const passage = q.data?.passage ? `<div class="q-passage">${q.data.passage}</div>` : '';
    const img = q.data?.image?.url ? `<img class="q-image" src="${esc(q.data.image.url)}" alt="Question image" onerror="this.style.display='none'">` : '';
    let body='';
    if(q.type==='multiple_choice'){
      const correctCount = Object.values(q.options||{}).filter(o=>o.correct).length;
      const multi = correctCount>1;
      body += `<div class="small muted">${multi?'Select all that apply • Multiple answers':'Select one answer'}</div><div class="options">`;
      for(const [letter, opt] of Object.entries(q.options||{})){
        const ans=this.answers[q.id];
        const checked = multi ? (Array.isArray(ans)&&ans.includes(letter)) : ans===letter;
        body+=`<label class="opt ${checked?'selected':''}"><input type="${multi?'checkbox':'radio'}" name="q-${q.id}" value="${letter}" ${checked?'checked':''} onchange="CAT.onMCChange(${q.id}, '${letter}', this.checked, ${multi})"><span class="letter">${letter}</span><span>${esc(opt.text)}</span></label>`;
      }
      body+='</div>';
      body+=`<div class="q-question">${esc(q.data?.question||'')}</div>`;
    } else if(q.type==='correction'){
      body+=`<div class="small muted">Tap the incorrect parts, then type the correction. If there is no error, choose No Error.</div>`;
      const ans=this.answers[q.id]||{corrections:{}, noError:false};
      body+=`<div class="seg-wrap">`;
      for(const seg of (q.multiErrorSegments||[])){
        if(!seg.clickable){ body+=`<span class="seg">${esc(seg.text)}</span>`; }
        else{
          const sel = ans.corrections && ans.corrections[seg.id]!==undefined;
          body+=`<button type="button" class="seg clickable ${sel?'selected':''}" onclick="CAT.toggleSeg(${q.id}, '${seg.id}')">${esc(seg.text)}</button>`;
        }
      }
      body+='</div>';
      body+=`<div class="corr-inputs">`;
      for(const id of Object.keys(ans.corrections||{})){
        const seg=(q.multiErrorSegments||[]).find(s=>s.id===id);
        body+=`<div><label>Correction for “${esc(seg?seg.text:id)}”</label><input data-corr="${id}" value="${esc(ans.corrections[id])}" placeholder="Type correct form…" oninput="CAT.onCorrInput(${q.id}, '${id}', this.value)"></div>`;
      }
      body+='</div>';
      body+=`<button class="btn btn-outline btn-sm" onclick="CAT.toggleNoError(${q.id})">${ans.noError?'✓ No Error selected':'No Error'}</button>`;
      body+=`<div class="q-question" style="margin-top:14px">Find and correct the error(s) above.</div>`;
    } else {
      body+=`<div class="q-question">${esc(q.data?.question||'Question')}</div><p class="muted">Unsupported type: ${esc(q.type)}</p>`;
    }
    return `<div class="q-card">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span class="pill">${diffLabel(diff)} • Level ${q.config?.level??'-'}</span><span class="pill gray">${q.type==='multiple_choice'?'Multiple Choice':'Correction'} • Q${q.id}</span></div>
      ${hint}${passage}${img}
      ${body}
    </div>`;
  },
  onMCChange(qid, letter, checked, multi){
    if(multi){
      let cur = Array.isArray(this.answers[qid])? [...this.answers[qid]] : [];
      if(checked && !cur.includes(letter)) cur.push(letter);
      if(!checked) cur=cur.filter(x=>x!==letter);
      this.answers[qid]=cur;
    } else { this.answers[qid]=letter; }
    this.renderRun();
  },
  toggleSeg(qid, segId){
    const cur = this.answers[qid]||{corrections:{}, noError:false};
    cur.noError=false;
    if(cur.corrections[segId]!==undefined) delete cur.corrections[segId];
    else cur.corrections[segId]='';
    this.answers[qid]=cur;
    this.renderRun();
  },
  onCorrInput(qid, segId, val){
    const cur=this.answers[qid]||{corrections:{}, noError:false};
    cur.corrections[segId]=val; cur.noError=false;
    this.answers[qid]=cur;
  },
  toggleNoError(qid){
    const cur=this.answers[qid]||{corrections:{}, noError:false};
    cur.noError=!cur.noError;
    if(cur.noError) cur.corrections={};
    this.answers[qid]=cur;
    this.renderRun();
  },
  renderRun(){
    const box=document.getElementById('catQuestionBox');
    const q=this.selected[this.current];
    if(!q){ box.innerHTML='<p class="muted">No questions.</p>'; return; }
    document.getElementById('catProgressText').textContent=`Question ${this.current+1} of ${this.selected.length} — ${q.type==='multiple_choice'?'Multiple Choice':'Correction'}`;
    document.getElementById('catProgressBar').style.width = ((this.current+1)/this.selected.length*100)+'%';
    box.innerHTML=this.renderQuestion(q);
    // nav dots
    const nav=document.getElementById('catQNav');
    nav.innerHTML=this.selected.map((qq,i)=>{
      const answered = this.answers[qq.id]!==undefined && !(Array.isArray(this.answers[qq.id])&&this.answers[qq.id].length===0) && !(typeof this.answers[qq.id]==='object'&&!Array.isArray(this.answers[qq.id])&&Object.keys(this.answers[qq.id].corrections||{}).length===0 && !this.answers[qq.id].noError);
      return `<button class="btn btn-sm ${i===this.current?'btn-primary':'btn-outline'}" onclick="CAT.goTo(${i})">${i+1}${answered?' ✓':''}</button>`;
    }).join('');
    document.getElementById('catPrevBtn').disabled=this.current===0;
    document.getElementById('catNextBtn').textContent = this.current===this.selected.length-1 ? 'Review' : 'Next';
  },
  goTo(i){ this.current=Math.max(0, Math.min(i, this.selected.length-1)); this.renderRun(); },
  next(){ if(this.current<this.selected.length-1) this.current++; this.renderRun(); },
  prev(){ if(this.current>0) this.current--; this.renderRun(); },
  startTimer(){
    clearInterval(this.timerId);
    const el=document.getElementById('catTimer');
    if(this.noTimer){ el.textContent='No timer'; el.classList.remove('warn'); return; }
    const tick=()=>{
      el.textContent='⏱ '+fmtTime(this.remaining);
      el.classList.toggle('warn', this.remaining<=60);
      if(this.remaining<=0){ clearInterval(this.timerId); showToast('Time is up — submitting.'); this.submit(); }
      this.remaining--;
    };
    tick();
    this.timerId=setInterval(tick,1000);
  },
  stopTimer(){ clearInterval(this.timerId); },
  submit(){
    this.stopTimer();
    const s=this.score();
    const pass = s.percent >= (Auth.config?.passScorePercent ?? 60);
    const meta=this.meta||{};
    let reviewHtml='';
    // Review respects per-question show_answer / meta show_answer
    for(let i=0;i<this.selected.length;i++){
      const q=this.selected[i];
      const ok=this.isCorrect(q);
      const canShow = (q.config?.show_answer ?? meta.config?.show_answer ?? false) || Auth.user?.role==='teacher' || Auth.user?.role==='super';
      const canExplain = (q.config?.show_explanation ?? meta.config?.show_explanation ?? false) || Auth.user?.role==='teacher' || Auth.user?.role==='super';
      let detail='';
      if(q.type==='multiple_choice'){
        const correct = Object.entries(q.options||{}).filter(([_,o])=>o.correct).map(([k])=>k).join(', ');
        const mine = Array.isArray(this.answers[q.id])? this.answers[q.id].join(', ') : (this.answers[q.id]||'—');
        detail = `<div><b>Your answer:</b> ${esc(mine)} &nbsp; ${canShow?`<b>Correct:</b> ${esc(correct)}`:''}</div><div class="small muted">${esc(q.data?.question||'')}</div>`;
        if(canShow) detail+=`<div style="margin-top:8px">${Object.entries(q.options||{}).map(([k,o])=>`<span class="pill ${o.correct?'success':'gray'}">${k}: ${esc(o.text)} ${o.correct?'✓':''}</span>`).join(' ')}</div>`;
      } else {
        const errs=(q.multiErrorSegments||[]).filter(x=>x.isError);
        const mine=this.answers[q.id];
        let mineText='—';
        if(mine?.noError) mineText='No Error';
        else if(mine?.corrections) mineText=Object.entries(mine.corrections).map(([id,v])=>id+': '+v).join(' | ');
        detail=`<div><b>Your answer:</b> ${esc(mineText)}</div>`;
        if(canShow) detail+=`<div style="margin-top:6px"><b>Correct:</b> ${errs.map(e=>esc(e.text)+' → '+(e.correctAnswers||[]).join(' / ')).join(' • ')||'No error'}</div>`;
      }
      let exp='';
      if(canExplain && q.explanation){
        exp=`<div class="explain"><h4>Explanation — ${esc(q.explanation.topic||'')}</h4><p>${q.explanation.text||''}</p>${q.explanation.formula?`<p><b>Formula:</b> ${esc(q.explanation.formula)}</p>`:''}${q.explanation.concept?`<p><b>Concept:</b> ${esc(q.explanation.concept)}</p>`:''}${(q.explanation.examples||[]).length?`<p><b>Examples:</b><br>${q.explanation.examples.join('<br>')}</p>`:''}</div>`;
      }
      reviewHtml+=`<div class="card" style="margin-top:10px"><div style="display:flex;justify-content:space-between;gap:10px"><b>Q${i+1} — ${q.type==='multiple_choice'?'Multiple Choice':'Correction'}</b><span class="pill ${ok?'success':'danger'}">${ok?'Correct':'Incorrect'}</span></div>${detail}${exp}</div>`;
    }
    const resEl=document.getElementById('catResultCard');
    resEl.classList.remove('hidden');
    resEl.innerHTML=`<div class="card" style="text-align:center;padding:28px"><span class="material-symbols-outlined" style="font-size:44px;color:${pass?'#059669':'#DC2626'}">${pass?'verified':'info'}</span><h2 style="margin:8px 0 4px">Score: ${s.correct} / ${s.total} — ${s.percent}%</h2><p>${pass?'Passed 🎉':'Keep practising — review below and try again.'}</p><div style="display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap"><button class="btn btn-primary" onclick="CAT.retake()">Retake</button><button class="btn btn-outline" onclick="CAT.backToSetup()">Back to Setup</button></div></div><div style="margin-top:14px"><h3>Review</h3>${reviewHtml||'<p class="muted">No questions.</p>'}</div>`;
    document.getElementById('catRunCard').classList.add('hidden');
    resEl.scrollIntoView({behavior:'smooth'});
  },
  retake(){
    document.getElementById('catResultCard').classList.add('hidden');
    document.getElementById('catRunCard').classList.remove('hidden');
    const diff=document.getElementById('catDifficulty').value;
    const count=document.getElementById('catCount').value;
    const info=this.generate(diff, count);
    this.renderRun(); this.startTimer();
    showToast('New test generated — '+info.selected+' questions');
  },
  backToSetup(){
    this.stopTimer();
    document.getElementById('catResultCard').classList.add('hidden');
    document.getElementById('catRunCard').classList.add('hidden');
    document.getElementById('catSetupCard').classList.remove('hidden');
  }
};
