
const Generator = {
  generated:null, meta:null, sourceFile:'',
  render(){
    const view=$('#view');
    const files=Auth.qIndex?.files||[];
    view.innerHTML=`
      <div class="card"><h3>Generate test</h3><p>Pick a question file, difficulty, and count. Questions are sampled from <code>/questions/</code>.</p>
        <div class="form-grid" style="margin-top:14px">
          <label class="field-label">Question file</label><select id="genFile" class="select">${files.map(f=>'<option value="'+esc(f.file)+'">'+esc(f.title)+' ('+esc(f.count)+' Q)</option>').join('')}</select>
          <div class="grid cols2">
            <div><label class="field-label">Difficulty</label><select id="genDiff" class="select"><option value="all">All levels</option><option value="easy">Easy (Level 1-2)</option><option value="intermediate">Intermediate (Level 3)</option><option value="advanced">Advanced (Level 4-5)</option></select></div>
            <div><label class="field-label">How many questions?</label><input id="genCount" type="number" min="1" max="50" value="10" class="text-input"></div>
          </div>
          <div class="grid cols2">
            <div><label class="field-label">Timer</label><select id="genTimer" class="select"><option value="normal">Normal (30s / Q)</option><option value="fast">Fast (15s / Q)</option><option value="easy">Easy (60s / Q)</option><option value="none">No timer</option></select></div>
            <div><label class="field-label">Order</label><select id="genOrder" class="select"><option value="shuffle">Shuffle</option><option value="keep">Keep file order</option></select></div>
          </div>
          <button class="btn primary" onclick="Generator.generate()">Generate test <span class="material-symbols-outlined">auto_awesome</span></button>
          <div id="genResult"></div>
        </div>
      </div>`;
  },
  async generate(){
    const file=$('#genFile').value; const diff=$('#genDiff').value; const count=parseInt($('#genCount').value||'10',10); const timer=$('#genTimer').value; const order=$('#genOrder').value;
    const out=$('#genResult'); out.innerHTML='<div class="alert info">Generating…</div>';
    try{
      const data=await fetchJSON(file);
      let qs=data.questions||[];
      const before=qs.length;
      if(diff!=='all') qs=qs.filter(q=>{ const l=levelOf(q); if(diff==='easy') return l<=2; if(diff==='intermediate') return l===3; return l>=4; });
      if(order==='shuffle') qs=shuffle(qs);
      qs=qs.slice(0, Math.min(count, qs.length));
      this.generated=qs; this.meta=data.meta||{}; this.sourceFile=file;
      const byLevel={easy:qs.filter(q=>levelOf(q)<=2).length, intermediate:qs.filter(q=>levelOf(q)===3).length, advanced:qs.filter(q=>levelOf(q)>=4).length};
      out.innerHTML='<div class="alert success">Generated '+qs.length+' questions from '+before+' available.</div><div class="row"><span class="badge easy">Easy '+byLevel.easy+'</span><span class="badge intermediate">Intermediate '+byLevel.intermediate+'</span><span class="badge advanced">Advanced '+byLevel.advanced+'</span></div><div class="row" style="margin-top:12px"><button class="btn success" onclick="Generator.start()">Start this test →</button><button class="btn ghost" onclick="Generator.render()">Reset</button></div>';
      this._timer=timer;
    }catch(e){ out.innerHTML='<div class="alert error">'+esc(e.message)+'</div>'; }
  },
  start(){
    if(!this.generated?.length) return;
    const noTimer=this._timer==='none';
    CAT.begin(this.meta, this.generated, this.meta.title||'Generated test', {noTimer, timerMode: this._timer==='none'?'normal':this._timer});
    App.setTitle('Test', 'Generated test');
  }
};
