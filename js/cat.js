
const CAT = {
  meta:null, questions:[], answers:{}, idx:0, timerId:null, secondsLeft:0, useTimer:false, onFinish:null, sourceTitle:'',
  async loadFile(filePath){
    return await loadQuestionsFile(filePath);
  },
  async startFromFile(filePath, opts={}){
    const data = await this.loadFile(filePath);
    let qs = data.questions||[];
    if(opts.difficulty && opts.difficulty!=='all'){
      qs = qs.filter(q=>{
        const l=levelOf(q);
        if(opts.difficulty==='easy') return l<=2;
        if(opts.difficulty==='intermediate') return l===3;
        if(opts.difficulty==='advanced') return l>=4;
        return true;
      });
    }
    if(opts.count && opts.count>0) qs = shuffle(qs).slice(0, Math.min(opts.count, qs.length));
    else qs = shuffle(qs);
    this.begin(data.meta||{}, qs, data.meta?.title||'Test', opts);
  },
  begin(meta, questions, title, opts={}){
    this.meta=meta; this.questions=questions; this.answers={}; this.idx=0; this.sourceTitle=title;
    const noTimer = meta?.config?.no_timer;
    this.useTimer = !noTimer && !opts.noTimer;
    if(this.useTimer){
      const per = opts.timerMode==='fast'?15: opts.timerMode==='easy'?60:30;
      this.secondsLeft = questions.length*per;
    }
    this.render();
    this.startTimer();
  },
  startTimer(){
    clearInterval(this.timerId);
    if(!this.useTimer) return;
    this.timerId=setInterval(()=>{
      this.secondsLeft--;
      const el=$('#catTimer'); if(el){ el.textContent=fmtTime(Math.max(0,this.secondsLeft)); el.classList.toggle('warn', this.secondsLeft<=60); }
      if(this.secondsLeft<=0){ clearInterval(this.timerId); this.submit(true); }
    },1000);
  },
  render(){
    const view=$('#view');
    if(!this.questions.length){ view.innerHTML='<div class="card"><h3>No questions</h3><p>No questions match the selected filters. Try another difficulty or count.</p><button class="btn ghost" onclick="App.navigate(\'cat\')">Back</button></div>'; return; }
    const q=this.questions[this.idx];
    const total=this.questions.length;
    const answered = Object.keys(this.answers).length;
    const timerHtml = this.useTimer ? '<span class="timer" id="catTimer">'+fmtTime(this.secondsLeft)+'</span>' : '<span class="pill">No timer</span>';
    view.innerHTML = `
      <div class="row between"><div><h3 style="margin:0">${esc(this.sourceTitle)}</h3><p class="muted" style="margin:2px 0 0">Question ${this.idx+1} of ${total} • ${answered} answered</p></div>${timerHtml}</div>
      <div class="progress" style="margin:12px 0"><div style="width:${((this.idx+1)/total*100).toFixed(1)}%"></div></div>
      <div id="catQ"></div>
      <div class="row between" style="margin-top:14px">
        <button class="btn ghost" ${this.idx===0?'disabled':''} onclick="CAT.prev()">← Previous</button>
        <div class="row">${this.idx<total-1 ? '<button class="btn primary" onclick="CAT.next()">Next →</button>' : '<button class="btn success" onclick="CAT.submit()">Submit test</button>'}</div>
      </div>
      <div class="row" style="margin-top:10px">${this.questions.map((_,i)=>'<button class="chip '+(i===this.idx?'active':'')+' '+(this.answers[i]?'':'')+'" onclick="CAT.go('+i+')">'+(i+1)+'</button>').join('')}</div>
    `;
    this.renderQuestion(q);
  },
  renderQuestion(q){
    const box=$('#catQ'); if(!box) return;
    const hint = q.data?.hint ? '<div class="alert info">'+esc(q.data.hint)+'</div>' : '';
    const passage = q.data?.passage ? '<div class="passage">'+q.data.passage+'</div>' : '';
    const qText = q.data?.question ? '<p style="font-size:16px;font-weight:600;margin:10px 0">'+esc(q.data.question)+'</p>' : '';
    let body='';
    if(q.type==='multiple_choice'){
      const opts=q.options||{};
      const correctKeys=Object.keys(opts).filter(k=>opts[k].correct===true);
      const multi = correctKeys.length>1;
      const saved = this.answers[this.idx];
      const savedSet = saved?.selected || [];
      body = '<p class="muted">'+(multi?'Select all correct answers.':'Select one answer.')+'</p>' + Object.keys(opts).map(k=>{
        const checked = savedSet.includes(k)?'checked':'';
        const inputType = multi?'checkbox':'radio';
        return '<label class="option '+(savedSet.includes(k)?'selected':'')+'"><input type="'+inputType+'" name="mc" value="'+k+'" '+checked+' onchange="CAT.saveMC()"> <strong>'+k+'.</strong> <span>'+esc(opts[k].text)+'</span></label>';
      }).join('');
    } else if(q.type==='correction'){
      const segs=q.multiErrorSegments||[];
      const saved=this.answers[this.idx]||{selected:[], corrections:{}, noError:false};
      body = '<p class="muted">Tap the parts you think are wrong, then type the correction. If there is no error, choose No Error.</p>';
      body += '<div style="line-height:2">'+segs.map(s=>{
        if(!s.clickable) return '<span class="seg">'+esc(s.text)+'</span>';
        const sel=saved.selected.includes(s.id)?'selected':'';
        return '<span class="seg clickable '+sel+'" onclick="CAT.toggleSeg(\''+s.id+'\')">'+esc(s.text)+'</span>';
      }).join(' ')+'</div>';
      body += '<div id="corrInputs" style="margin-top:12px">'+ saved.selected.map(id=>{
        const seg=segs.find(x=>x.id===id);
        return '<label style="display:block;font-size:13px;font-weight:600;margin-top:8px">Correction for “'+esc(seg?.text||id)+'”</label><input class="corr-input" data-corr="'+id+'" value="'+esc(saved.corrections?.[id]||'')+'" placeholder="Type correct form" oninput="CAT.saveCorr()" />';
      }).join('') + '</div>';
      body += '<label class="option" style="margin-top:12px"><input type="checkbox" id="noErrorBox" '+(saved.noError?'checked':'')+' onchange="CAT.toggleNoError(this.checked)"> <span><strong>No Error</strong> — sentence is correct</span></label>';
    } else {
      body='<p class="muted">Unsupported question type: '+esc(q.type)+'</p>';
    }
    box.innerHTML = '<div class="q-card"><div class="row between"><span class="badge '+levelClass(levelOf(q))+'">'+levelLabel(levelOf(q))+'</span><span class="muted">Q'+esc(q.id)+' • '+esc(q.type.replace('_',' '))+'</span></div>'+hint+passage+qText+body+'</div>';
  },
  saveMC(){
    const checked=$$('input[name="mc"]:checked').map(i=>i.value);
    this.answers[this.idx]={selected:checked};
    this.renderNavOnly();
  },
  renderNavOnly(){ /* keep idx, just update chips */ },
  toggleSeg(id){
    const cur=this.answers[this.idx]||{selected:[], corrections:{}, noError:false};
    if(cur.noError) cur.noError=false;
    const ix=cur.selected.indexOf(id);
    if(ix>=0){ cur.selected.splice(ix,1); delete cur.corrections[id]; } else cur.selected.push(id);
    this.answers[this.idx]=cur;
    this.render();
  },
  saveCorr(){
    const cur=this.answers[this.idx]; if(!cur) return;
    $$('[data-corr]').forEach(inp=>{ cur.corrections[inp.dataset.corr]=inp.value; });
    this.answers[this.idx]=cur;
  },
  toggleNoError(v){
    const cur=this.answers[this.idx]||{selected:[], corrections:{}, noError:false};
    cur.noError=v; if(v){ cur.selected=[]; cur.corrections={}; }
    this.answers[this.idx]=cur; this.render();
  },
  go(i){ this.idx=i; this.render(); },
  next(){ if(this.idx<this.questions.length-1){ this.idx++; this.render(); } },
  prev(){ if(this.idx>0){ this.idx--; this.render(); } },
  score(){
    let correct=0; const details=[];
    this.questions.forEach((q,i)=>{
      const a=this.answers[i];
      let ok=false;
      if(q.type==='multiple_choice'){
        const correctKeys=Object.keys(q.options||{}).filter(k=>q.options[k].correct===true);
        const sel=(a?.selected||[]).slice().sort();
        ok = JSON.stringify(sel)===JSON.stringify(correctKeys.slice().sort());
      } else if(q.type==='correction'){
        const trueErr=(q.multiErrorSegments||[]).filter(s=>s.clickable && s.isError).map(s=>s.id).sort();
        if(a?.noError){ ok = trueErr.length===0; }
        else {
          const sel=(a?.selected||[]).slice().sort();
          if(JSON.stringify(sel)===JSON.stringify(trueErr)){
            ok=true;
            for(const id of trueErr){
              const seg=(q.multiErrorSegments||[]).find(s=>s.id===id);
              const given=norm(a?.corrections?.[id]);
              const allowed=(seg?.correctAnswers||[]).map(norm);
              if(!allowed.includes(given)) ok=false;
            }
          }
        }
      }
      if(ok) correct++;
      details.push({q, ans:a, ok});
    });
    return {correct, total:this.questions.length, details};
  },
  submit(auto=false){
    clearInterval(this.timerId);
    const res=this.score();
    const pct=res.total?Math.round(res.correct/res.total*100):0;
    const showAns=this.meta?.config?.show_answer!==false;
    const showExp=this.meta?.config?.show_explanation!==false;
    let html='<div class="card"><h3>Result</h3><div class="stat">'+res.correct+' / '+res.total+'</div><p>'+pct+'% correct</p><p class="muted">'+(auto?'Time is up. ':'')+'Review below. '+(showAns?'Answers shown per test settings.':'')+'</p><div class="row" style="margin-top:12px"><button class="btn primary" onclick="App.navigate(\'cat\')">New test</button><button class="btn ghost" onclick="App.navigate(\'dashboard\')">Dashboard</button></div></div>';
    html+='<div class="grid" style="margin-top:16px">'+res.details.map((d,idx)=>{
      const q=d.q;
      let ansHtml='';
      if(q.type==='multiple_choice'){
        const opts=q.options||{};
        ansHtml=Object.keys(opts).map(k=>{
          const isCorr=opts[k].correct===true;
          const isSel=(d.ans?.selected||[]).includes(k);
          let cls='option'; if(showAns && isCorr) cls+=' correct'; if(isSel && !isCorr) cls+=' wrong'; if(isSel && isCorr) cls+=' selected';
          return '<div class="'+cls+'"><strong>'+k+'.</strong> '+esc(opts[k].text)+' '+(showAns && isCorr?'✓':'')+' '+(isSel?'• your answer':'')+'</div>';
        }).join('');
      } else {
        const segs=q.multiErrorSegments||[];
        ansHtml='<div>'+segs.map(s=>'<span class="seg '+(s.clickable?'clickable ':'')+(showAns && s.isError?'selected':'')+'">'+esc(s.text)+(showAns && s.isError && s.correctAnswers?' → '+esc(s.correctAnswers.join(' / ')):'')+'</span>').join(' ')+'</div>';
        if(d.ans?.corrections) ansHtml+='<p class="muted" style="margin-top:8px">Your corrections: '+esc(JSON.stringify(d.ans.corrections))+'</p>';
        if(d.ans?.noError) ansHtml+='<p class="muted">You chose: No Error</p>';
      }
      const exp = showExp && q.explanation ? '<div class="explain"><h4>Explanation • '+esc(q.explanation.topic||'')+'</h4><p>'+(q.explanation.text||'')+'</p>'+(q.explanation.formula?'<p><strong>Formula:</strong> '+esc(q.explanation.formula)+'</p>':'')+(q.explanation.examples?'<p><strong>Examples:</strong><br>'+q.explanation.examples.join('<br>')+'</p>':'')+'</div>' : '';
      return '<div class="q-card"><div class="row between"><strong>Q'+(idx+1)+' • '+esc(q.data?.question||'Correction')+'</strong><span class="badge '+(d.ok?'easy':'advanced')+'">'+(d.ok?'Correct':'Incorrect')+'</span></div>'+(q.data?.passage?'<div class="passage">'+q.data.passage+'</div>':'')+ansHtml+exp+'</div>';
    }).join('')+'</div>';
    $('#view').innerHTML=html;
    window.scrollTo({top:0, behavior:'smooth'});
  }
};
