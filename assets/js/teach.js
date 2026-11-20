// teach.js - Teaching mode: discuss each question, show answer + explanation
const TEACH = {
  meta:null, all:[], filtered:[], idx:0,
  async load(filePath){
    const data=await fetchJSON(filePath);
    this.meta=data.meta||{}; this.all=data.questions||[];
    this.applyFilter();
    return data;
  },
  applyFilter(){
    const f=document.getElementById('teachFilter')?.value||'all';
    this.filtered = f==='all' ? this.all : this.all.filter(q=>levelToDifficulty(q.config?.level)===f);
    this.idx=0;
  },
  render(){
    const box=document.getElementById('teachBox');
    if(!this.filtered.length){ box.innerHTML='<div class="alert info"><span class="material-symbols-outlined">info</span><span>No questions for this filter.</span></div>'; return; }
    const q=this.filtered[this.idx];
    const showA=document.getElementById('teachShowAnswer')?.checked ?? true;
    const showE=document.getElementById('teachShowExplain')?.checked ?? true;
    const diff=levelToDifficulty(q.config?.level);
    let answerHtml='';
    if(showA){
      if(q.type==='multiple_choice'){
        answerHtml=`<div class="answer-box"><b>Correct answer:</b> ${Object.entries(q.options||{}).filter(([_,o])=>o.correct).map(([k,o])=>`<span class="pill success">${k}: ${esc(o.text)}</span>`).join(' ')}<div style="margin-top:10px">${Object.entries(q.options||{}).map(([k,o])=>`<div class="opt ${o.correct?'correct':''}"><span class="letter">${k}</span><span>${esc(o.text)} ${o.correct?'✓ Correct':''}</span></div>`).join('')}</div></div>`;
      } else {
        const errs=(q.multiErrorSegments||[]).filter(s=>s.isError);
        answerHtml=`<div class="answer-box"><b>Correct:</b> ${errs.length? errs.map(e=>esc(e.text)+' → '+(e.correctAnswers||[]).join(' / ')).join(' • ') : 'No Error'}<div style="margin-top:10px" class="seg-wrap">${(q.multiErrorSegments||[]).map(s=>`<span class="seg ${s.isError?'selected':''}">${esc(s.text)} ${s.isError?'✓':''}</span>`).join('')}</div></div>`;
      }
    }
    let explainHtml='';
    if(showE && q.explanation){
      explainHtml=`<div class="explain"><h4>Explanation — ${esc(q.explanation.topic||'')}</h4><p>${q.explanation.text||''}</p>${q.explanation.formula?`<p><b>Formula:</b> ${esc(q.explanation.formula)}</p>`:''}${q.explanation.concept?`<p><b>Concept:</b> ${esc(q.explanation.concept)}</p>`:''}${(q.explanation.examples||[]).length?`<p><b>Examples:</b><br>${q.explanation.examples.join('<br>')}</p>`:''}</div>`;
    }
    const hint=q.data?.hint?`<div class="alert info"><span class="material-symbols-outlined">lightbulb</span><span>${esc(q.data.hint)}</span></div>`:'';
    const passage=q.data?.passage?`<div class="q-passage">${q.data.passage}</div>`:'';
    const img=q.data?.image?.url?`<img class="q-image" src="${esc(q.data.image.url)}" alt="" onerror="this.style.display='none'">`:'';
    let opts='';
    if(q.type==='multiple_choice'){
      opts=`<div class="options">${Object.entries(q.options||{}).map(([k,o])=>`<div class="opt"><span class="letter">${k}</span><span>${esc(o.text)}</span></div>`).join('')}</div>`;
    } else {
      opts=`<div class="seg-wrap">${(q.multiErrorSegments||[]).map(s=>`<span class="seg ${s.clickable?'clickable':''}">${esc(s.text)}</span>`).join('')}</div>`;
    }
    box.innerHTML=`
      <div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><b>Question ${this.idx+1} of ${this.filtered.length}</b><span class="pill">${diffLabel(diff)} • Level ${q.config?.level??'-'}</span></div>
      <div class="progress" style="margin-top:10px"><div style="width:${((this.idx+1)/this.filtered.length*100)}%"></div></div>
      <div class="chip-row" style="margin-top:12px">${this.filtered.map((_,i)=>`<button class="btn btn-sm ${i===this.idx?'btn-primary':'btn-outline'}" onclick="TEACH.go(${i})">${i+1}</button>`).join('')}</div></div>
      <div class="q-card">${hint}${passage}${img}<div class="q-question">${esc(q.data?.question||'Find and correct the error(s) above.')}</div>${opts}${answerHtml}${explainHtml}</div>
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-ghost" onclick="TEACH.prev()" ${this.idx===0?'disabled':''}><span class="material-symbols-outlined">arrow_back</span> Previous</button><button class="btn btn-primary" onclick="TEACH.next()" ${this.idx===this.filtered.length-1?'disabled':''}>Next <span class="material-symbols-outlined">arrow_forward</span></button></div>
    `;
  },
  go(i){ this.idx=i; this.render(); },
  next(){ if(this.idx<this.filtered.length-1) this.idx++; this.render(); },
  prev(){ if(this.idx>0) this.idx--; this.render(); }
};
