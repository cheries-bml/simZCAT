
const Teach = {
  meta:null, questions:[], idx:0, title:'',
  async open(filePath){
    const data = await fetchJSON(filePath);
    this.meta=data.meta||{}; this.questions=data.questions||[]; this.idx=0; this.title=data.meta?.title||'Teach';
    this.renderList();
  },
  renderList(){
    const view=$('#view');
    view.innerHTML = `
      <div class="card"><h3>${esc(this.title)}</h3><p>${esc(this.meta.description||'')}</p><p class="muted">${esc(this.meta.info||'')} • ${this.questions.length} questions • Teacher view shows answers + explanations</p></div>
      <div class="grid" style="margin-top:16px">${this.questions.map((q,i)=>`
        <div class="card" style="cursor:pointer" onclick="Teach.openDetail(${i})">
          <div class="row between"><span class="badge ${levelClass(levelOf(q))}">${levelLabel(levelOf(q))}</span><span class="muted">Q${esc(q.id)} • ${esc(q.type)}</span></div>
          <h3 style="margin-top:10px">${esc(q.data?.question || (q.multiErrorSegments||[]).map(s=>s.text).join(' ') || 'Question')}</h3>
          <p>${esc(q.explanation?.topic||'')}</p>
          <p style="color:var(--primary);font-weight:600;margin-top:8px">Open to discuss →</p>
        </div>`).join('')}
      </div>`;
  },
  openDetail(i){ this.idx=i; this.renderDetail(); },
  renderDetail(){
    const q=this.questions[this.idx]; if(!q) return;
    const view=$('#view');
    let ansHtml='';
    if(q.type==='multiple_choice'){
      const opts=q.options||{};
      ansHtml=Object.keys(opts).map(k=>{
        const isCorr=opts[k].correct===true;
        return '<div class="option '+(isCorr?'correct':'')+'"><strong>'+k+'.</strong> '+esc(opts[k].text)+' '+(isCorr?'✓ Correct':'')+'</div>';
      }).join('');
    } else {
      const segs=q.multiErrorSegments||[];
      ansHtml='<div>'+segs.map(s=>'<span class="seg '+(s.clickable?'clickable ':'')+(s.isError?'selected':'')+'">'+esc(s.text)+(s.isError && s.correctAnswers?' → '+esc(s.correctAnswers.join(' / ')):'')+'</span>').join(' ')+'</div>';
    }
    const exp=q.explanation?'<div class="explain"><h4>Explanation • '+esc(q.explanation.topic||'')+'</h4><p>'+(q.explanation.text||'')+'</p><p><strong>Concept:</strong> '+esc(q.explanation.concept||'')+'</p><p><strong>Formula:</strong> '+esc(q.explanation.formula||'')+'</p><p><strong>Examples:</strong><br>'+(q.explanation.examples||[]).join('<br>')+'</p></div>':'';
    view.innerHTML=`
      <div class="row between"><button class="btn ghost" onclick="Teach.renderList()">← All questions</button><span class="muted">${this.idx+1} / ${this.questions.length}</span></div>
      <div class="q-card" style="margin-top:12px">
        <div class="row between"><span class="badge ${levelClass(levelOf(q))}">${levelLabel(levelOf(q))}</span><span class="muted">Q${esc(q.id)} • ${esc(q.type)}</span></div>
        ${q.data?.hint?'<div class="alert info">'+esc(q.data.hint)+'</div>':''}
        ${q.data?.passage?'<div class="passage">'+q.data.passage+'</div>':''}
        ${q.data?.question?'<p style="font-size:18px;font-weight:700">'+esc(q.data.question)+'</p>':''}
        ${ansHtml}${exp}
      </div>
      <div class="row between" style="margin-top:14px"><button class="btn ghost" ${this.idx===0?'disabled':''} onclick="Teach.openDetail(${this.idx-1})">← Previous</button><button class="btn primary" ${this.idx>=this.questions.length-1?'disabled':''} onclick="Teach.openDetail(${this.idx+1})">Next →</button></div>
    `;
    window.scrollTo({top:0, behavior:'smooth'});
  }
};
