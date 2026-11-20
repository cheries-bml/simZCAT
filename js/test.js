// test.js — generation, rendering, scoring, teaching peek
const TestEngine = {
  fileMeta:null, raw:null, questions:[], answers:{}, index:0, mode:"test", timerMode:"normal", timerId:null, remaining:0, totalTime:0, peekAll:false, finished:false, results:null,
  reset(){ this.questions=[]; this.answers={}; this.index=0; this.finished=false; this.results=null; this.peekAll=false; this.stopTimer(); document.getElementById("resultArea").style.display="none"; },
  stopTimer(){ if(this.timerId){ clearInterval(this.timerId); this.timerId=null; } },
  shuffle(a){ const arr=[...a]; for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; },
  levelOf(q){ return (q.config && q.config.level) || 1; },
  difficultyLabel(level){ if(level<=2) return "Easy"; if(level===3) return "Intermediate"; return "Advanced"; },
  async loadFile(fileId){
    const meta = Store.qIndex.find(x=>x.id===fileId) || Store.qIndex[0];
    this.fileMeta = meta;
    const data = await Store.getJSON("questions/"+meta.file);
    this.raw = data;
    return data;
  },
  async generate(fileId, difficultyId, count, timerMode, mode){
    this.reset();
    this.mode = mode; this.timerMode = timerMode;
    const data = await this.loadFile(fileId);
    let all = data.questions||[];
    const diff = (Store.config.test.difficulties||[]).find(d=>d.id===difficultyId) || {levels:[1,2,3,4,5]};
    let filtered = all.filter(q=> diff.levels.includes(this.levelOf(q)));
    if(filtered.length===0) filtered = all;
    filtered = this.shuffle(filtered);
    const n = Math.max(1, Math.min(count||10, filtered.length));
    this.questions = filtered.slice(0,n);
    // timer: sum of per-question times for chosen mode
    if(timerMode!=="none" && !(data.meta && data.meta.config && data.meta.config.no_timer && timerMode==="normal")){
      let total=0;
      this.questions.forEach(q=>{ const t=q.config&&q.config.time_in_seconds; if(t&&t[timerMode]) total+=t[timerMode]; else if(t&&t.normal) total+=t.normal; });
      this.totalTime = total; this.remaining = total;
    } else { this.totalTime=0; this.remaining=0; }
    this.index=0;
    this.renderShell(data);
    this.renderQuestion();
    this.startTimerIfNeeded();
  },
  startTimerIfNeeded(){
    this.stopTimer();
    const pill=document.getElementById("timerPill");
    if(this.totalTime<=0){ pill.style.display="none"; return; }
    pill.style.display="inline-flex";
    const update=()=>{ const m=Math.floor(this.remaining/60), s=this.remaining%60; document.getElementById("timerText").textContent = String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"); };
    update();
    this.timerId=setInterval(()=>{ this.remaining--; update(); if(this.remaining<=0){ this.stopTimer(); this.submit(); } },1000);
  },
  renderShell(data){
    document.getElementById("testTitle").textContent = data.meta?.title || this.fileMeta.title;
    document.getElementById("testMeta").textContent = (data.meta?.description||"") + " • " + this.questions.length + " questions";
    document.getElementById("modePill").textContent = this.mode==="teaching" ? "Teaching" : "Test";
    const canPeek = Store.can("canPeekAnswer") || Store.can("canPeekExplanation");
    const showBar = this.mode==="teaching" && canPeek;
    document.getElementById("teachingBar").style.display = showBar ? "flex" : "none";
    document.getElementById("resultArea").style.display="none";
    document.getElementById("resultArea").innerHTML="";
    document.getElementById("submitBtn").style.display="none";
    document.getElementById("nextBtn").style.display="inline-flex";
    document.getElementById("prevBtn").style.display="inline-flex";
  },
  canPeek(){ return this.mode==="teaching" && (Store.can("canPeekAnswer")||Store.can("canPeekExplanation")); },
  renderQuestion(){
    const q=this.questions[this.index]; if(!q) return;
    const area=document.getElementById("questionArea");
    const level=this.levelOf(q);
    const lvlLabel=this.difficultyLabel(level);
    const lvlClass= level<=2?"easy": level>=4?"adv":"";
    let html = `<div class="card q-card"><div class="q-meta"><span class="badge ${lvlClass}">${lvlLabel} • Level ${level}</span><span class="badge">${q.type==="correction"?"Correction":"Multiple Choice"}</span><span class="badge">Q ${this.index+1} / ${this.questions.length}</span></div>`;
    if(q.data?.hint) html += `<div class="hint"><span class="material-symbols-outlined">lightbulb</span><span>${Store.escape(q.data.hint)}</span></div>`;
    if(q.data?.passage) html += `<div class="passage">${q.data.passage}</div>`;
    if(q.data?.image?.url) html += `<img class="q-img" src="${Store.escape(q.data.image.url)}" alt="Question image" onerror="this.style.display='none'" />`;
    if(q.data?.question) html += `<div class="q-text">${q.data.question}</div>`;
    if(q.type==="correction"){
      html += `<p class="muted small">Click a part you think is wrong. Type the correction. If you think there is no error, choose “No Error”.</p><div class="segments" id="segments">`;
      (q.multiErrorSegments||[]).forEach(seg=>{
        const cls = seg.clickable ? "seg-word clickable" : "seg-word";
        const sel = (this.answers[q.id]?.selected||[]).includes(seg.id) ? " selected" : "";
        html += `<span class="${cls}${sel}" data-seg="${seg.id}">${Store.escape(seg.text)}</span>`;
      });
      html += `</div><div id="corrInputs"></div>`;
      html += `<label class="opt" style="margin-top:10px"><input type="checkbox" id="noErrorChk" ${this.answers[q.id]?.noError?"checked":""} /> <span><strong>No Error</strong> — the sentence is correct</span></label>`;
    } else if(q.type==="multiple_choice"){
      const opts = q.options||{};
      const correctCount = Object.values(opts).filter(o=>o.correct).length;
      const multi = correctCount>1;
      const sel = this.answers[q.id]?.selected||[];
      html += `<p class="muted small">${multi ? "Select all correct answers." : "Select one answer."}</p><div class="options">`;
      Object.entries(opts).forEach(([key,opt])=>{
        const checked = sel.includes(key) ? "checked" : "";
        const type = multi ? "checkbox" : "radio";
        const name = multi ? `q-${q.id}-${key}` : `q-${q.id}`;
        html += `<label class="opt"><input type="${type}" name="${name}" value="${key}" ${checked} /><span class="opt-key">${key}</span><span>${Store.escape(opt.text)}</span></label>`;
      });
      html += `</div>`;
    }
    // Peek area — only in teaching mode and only if role allows
    if(this.canPeek()){
      const peekOpen = this.peekAll || (this.answers[q.id]?.peek);
      html += `<div class="peek-box"><h4><span class="material-symbols-outlined">visibility</span> Teacher peek</h4>`;
      if(!peekOpen){
        html += `<button class="btn btn-ghost btn-sm" id="peekBtn">Peek answer &amp; explanation</button><p class="muted small">Visible only to teacher / super in Teaching mode. Students never see this.</p>`;
      } else {
        html += this.peekContent(q);
        html += `<button class="btn btn-ghost btn-sm" id="hidePeekBtn">Hide peek</button>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
    area.innerHTML = html;
    // Wire events
    if(q.type==="correction"){
      area.querySelectorAll("[data-seg]").forEach(el=>{
        el.addEventListener("click", ()=>{
          if(!el.classList.contains("clickable")) return;
          const segId=el.dataset.seg;
          const cur=this.answers[q.id]||{selected:[],corrections:{},noError:false};
          if(cur.noError) cur.noError=false;
          const idx=cur.selected.indexOf(segId);
          if(idx>=0){ cur.selected.splice(idx,1); delete cur.corrections[segId]; } else { cur.selected.push(segId); }
          this.answers[q.id]=cur;
          document.getElementById("noErrorChk").checked=false;
          this.renderQuestion();
        });
      });
      const chk=document.getElementById("noErrorChk");
      if(chk) chk.addEventListener("change", ()=>{
        this.answers[q.id]={selected:[],corrections:{},noError: chk.checked};
        this.renderQuestion();
      });
      this.renderCorrInputs(q);
    } else {
      area.querySelectorAll("input").forEach(inp=>{
        inp.addEventListener("change", ()=>{
          const cur=this.answers[q.id]||{selected:[]};
          if(inp.type==="radio"){ cur.selected=[inp.value]; }
          else { if(inp.checked && !cur.selected.includes(inp.value)) cur.selected.push(inp.value); if(!inp.checked) cur.selected=cur.selected.filter(x=>x!==inp.value); }
          this.answers[q.id]=cur;
          this.renderDots();
        });
      });
    }
    const peekBtn=document.getElementById("peekBtn");
    if(peekBtn) peekBtn.addEventListener("click", ()=>{ const cur=this.answers[q.id]||{selected:[]}; cur.peek=true; this.answers[q.id]=cur; this.renderQuestion(); });
    const hideBtn=document.getElementById("hidePeekBtn");
    if(hideBtn) hideBtn.addEventListener("click", ()=>{ if(this.answers[q.id]) this.answers[q.id].peek=false; this.peekAll=false; this.renderQuestion(); });
    // Progress + dots
    const pct = ((this.index+1)/this.questions.length)*100;
    document.getElementById("progressFill").style.width = pct+"%";
    document.getElementById("progressText").textContent = `${this.index+1} / ${this.questions.length}`;
    this.renderDots();
    document.getElementById("prevBtn").disabled = this.index===0;
    const isLast = this.index===this.questions.length-1;
    document.getElementById("nextBtn").style.display = isLast ? "none" : "inline-flex";
    document.getElementById("submitBtn").style.display = isLast ? "inline-flex" : "none";
  },
  renderCorrInputs(q){
    const wrap=document.getElementById("corrInputs"); if(!wrap) return;
    const cur=this.answers[q.id]||{selected:[],corrections:{}};
    let h="";
    cur.selected.forEach(segId=>{
      const seg=(q.multiErrorSegments||[]).find(s=>s.id===segId);
      if(!seg) return;
      const val=cur.corrections[segId]||"";
      h+=`<div class="corr-block"><strong>Correction for “${Store.escape(seg.text)}”</strong><input class="corr-input" data-corr="${segId}" placeholder="Type the correct form…" value="${Store.escape(val)}" /></div>`;
    });
    wrap.innerHTML=h;
    wrap.querySelectorAll("[data-corr]").forEach(inp=>{
      inp.addEventListener("input", ()=>{
        const c=this.answers[q.id]||{selected:[],corrections:{}};
        c.corrections[inp.dataset.corr]=inp.value;
        this.answers[q.id]=c;
      });
    });
  },
  peekContent(q){
    let h="";
    if(Store.can("canPeekAnswer")){
      if(q.type==="multiple_choice"){
        const correct=Object.entries(q.options||{}).filter(([,o])=>o.correct).map(([k,o])=>`${k}. ${Store.escape(o.text)}`).join(" • ");
        h+=`<p><strong>Correct answer:</strong> ${correct||"—"}</p>`;
      } else {
        const errs=(q.multiErrorSegments||[]).filter(s=>s.isError);
        if(errs.length===0) h+=`<p><strong>Correct answer:</strong> No Error</p>`;
        else h+=`<p><strong>Errors:</strong> ${errs.map(s=>`${Store.escape(s.text)} → ${(s.correctAnswers||[]).map(a=>Store.escape(a)).join(" / ")}`).join(" • ")}</p>`;
      }
    }
    if(Store.can("canPeekExplanation") && q.explanation){
      h+=`<div class="explain-box"><strong>Explanation</strong><p>${Store.escape(q.explanation.text||"")}</p>${q.explanation.topic?`<p><strong>Topic:</strong> ${Store.escape(q.explanation.topic)}</p>`:""}${q.explanation.concept?`<p><strong>Concept:</strong> ${Store.escape(q.explanation.concept)}</p>`:""}${q.explanation.formula?`<p><strong>Formula:</strong> ${Store.escape(q.explanation.formula)}</p>`:""}${(q.explanation.examples||[]).length?`<p><strong>Examples:</strong></p><ul>${q.explanation.examples.map(e=>`<li>${e}</li>`).join("")}</ul>`:""}</div>`;
    }
    return h;
  },
  renderDots(){
    const dots=document.getElementById("dots");
    dots.innerHTML = this.questions.map((q,i)=>{
      const a=this.answers[q.id];
      const answered = a && ((a.selected&&a.selected.length>0)||a.noError);
      return `<button class="dot ${i===this.index?"active":""} ${answered?"answered":""}" data-dot="${i}">${i+1}</button>`;
    }).join("");
    dots.querySelectorAll("[data-dot]").forEach(b=> b.addEventListener("click", ()=>{ this.index=parseInt(b.dataset.dot); this.renderQuestion(); }));
  },
  next(){ if(this.index<this.questions.length-1){ this.index++; this.renderQuestion(); } },
  prev(){ if(this.index>0){ this.index--; this.renderQuestion(); } },
  scoreOne(q){
    const ans=this.answers[q.id]||{selected:[],corrections:{},noError:false};
    if(q.type==="multiple_choice"){
      const correct=Object.entries(q.options||{}).filter(([,o])=>o.correct).map(([k])=>k).sort();
      const sel=[...(ans.selected||[])].sort();
      return JSON.stringify(correct)===JSON.stringify(sel);
    }
    if(q.type==="correction"){
      const trueErr=(q.multiErrorSegments||[]).filter(s=>s.isError).map(s=>s.id).sort();
      if(trueErr.length===0) return !!ans.noError;
      if(ans.noError) return false;
      const sel=[...(ans.selected||[])].sort();
      if(JSON.stringify(trueErr)!==JSON.stringify(sel)) return false;
      // check corrections (case-insensitive, trimmed)
      for(const segId of trueErr){
        const seg=(q.multiErrorSegments||[]).find(s=>s.id===segId);
        const typed=(ans.corrections?.[segId]||"").trim().toLowerCase();
        const ok=(seg.correctAnswers||[]).some(a=>a.trim().toLowerCase()===typed);
        if(!ok) return false;
      }
      return true;
    }
    return false;
  },
  submit(){
    this.stopTimer();
    this.finished=true;
    let correct=0;
    const details=this.questions.map(q=>{ const ok=this.scoreOne(q); if(ok) correct++; return {q, ok, ans:this.answers[q.id]||{}}; });
    this.results={correct, total:this.questions.length, details};
    const area=document.getElementById("resultArea");
    const pct = this.questions.length ? Math.round(correct/this.questions.length*100) : 0;
    const canSeeAnswers = this.mode==="teaching" && Store.can("canPeekAnswer");
    let html=`<div class="card result-card"><h2>Result</h2><div class="score-big">${correct} / ${this.questions.length}</div><p class="muted">${pct}% correct • ${this.mode==="teaching"?"Teaching":"Test"} mode</p>`;
    html+=`<div style="margin-top:12px;display:flex;gap:8px;justify-content:center"><button class="btn btn-primary" id="retryBtn"><span class="material-symbols-outlined">replay</span> Retry</button><button class="btn btn-ghost" id="backDashBtn">Dashboard</button></div></div>`;
    html+=`<div class="card" style="margin-top:12px"><h3>Review</h3>`;
    details.forEach((d,i)=>{
      const q=d.q;
      html+=`<div class="review-item ${d.ok?"correct":"wrong"}"><strong>Q${i+1}.</strong> ${q.data?.question ? q.data.question : (q.type==="correction" ? "Correction question" : "")} <span class="badge">${d.ok?"Correct":"Incorrect"}</span>`;
      if(canSeeAnswers || (q.config?.show_answer && this.mode!=="test")){
        // In test mode for students, do not leak answers unless config explicitly allows AND mode is teaching
      }
      if(canSeeAnswers){
        html+=`<div style="margin-top:8px">${this.peekContent(q)}</div>`;
      } else if(this.mode==="test"){
        html+=`<p class="muted small">Answers are hidden in Test mode. Ask your teacher to open Teaching mode to discuss.</p>`;
      }
      html+=`</div>`;
    });
    html+=`</div>`;
    area.innerHTML=html; area.style.display="block";
    document.getElementById("questionArea").innerHTML="";
    document.getElementById("test-nav")?.classList?.add("hidden");
    document.getElementById("nextBtn").style.display="none";
    document.getElementById("submitBtn").style.display="none";
    document.getElementById("prevBtn").style.display="none";
    document.getElementById("dots").innerHTML="";
    document.getElementById("progressFill").style.width="100%";
    const retry=document.getElementById("retryBtn");
    if(retry) retry.addEventListener("click", ()=>{ App.showView("test-setup"); });
    const back=document.getElementById("backDashBtn");
    if(back) back.addEventListener("click", ()=>{ App.showView("dashboard"); });
    window.scrollTo({top:0, behavior:"smooth"});
  }
};
