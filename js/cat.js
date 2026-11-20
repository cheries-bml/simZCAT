let cat={questions:[],index:0,answers:{},timer:null,secondsLeft:0,meta:null};
async function initCAT(){
  const idx=await loadJSON('questions/index.json');
  el('catFile').innerHTML=idx.files.map(f=>'<option value="'+f.file+'">'+escapeHtml(f.title)+'</option>').join('');
}
async function startCAT(){
  const file=el('catFile').value, diff=el('catDifficulty').value, count=parseInt(el('catCount').value||'5');
  const data=await loadJSON('questions/'+file);
  let qs=data.questions||[];
  if(diff!=='all') qs=qs.filter(q=>q.difficulty===diff);
  qs=shuffle(qs).slice(0,count);
  if(!qs.length){alert('No questions for this filter.');return;}
  cat.questions=qs; cat.index=0; cat.answers={}; cat.meta=data.meta||{};
  cat.secondsLeft=qs.length*60;
  el('catSetup').hidden=true; el('catTest').hidden=false; el('catResult').hidden=true;
  clearInterval(cat.timer);
  cat.timer=setInterval(()=>{cat.secondsLeft--; el('catTimer').textContent=fmtTime(Math.max(0,cat.secondsLeft)); if(cat.secondsLeft<=0){clearInterval(cat.timer); submitCAT();}},1000);
  el('catTimer').textContent=fmtTime(cat.secondsLeft);
  renderCAT();
}
function renderCAT(){
  const q=cat.questions[cat.index];
  el('catProgress').textContent='Question '+(cat.index+1)+' of '+cat.questions.length+' • '+q.topic+' • '+q.difficulty;
  el('catBar').style.width=((cat.index+1)/cat.questions.length*100)+'%';
  el('catQTitle').textContent=q.id+' — '+q.topic;
  el('catQText').textContent=q.question;
  el('catOptions').innerHTML=q.options.map((o,i)=>'<label class="opt '+(cat.answers[cat.index]===i?'selected':'')+'"><input type="radio" name="catOpt" '+(cat.answers[cat.index]===i?'checked':'')+' onclick="selectCAT('+i+')"> '+escapeHtml(o)+'</label>').join('');
  el('catNav').innerHTML=cat.questions.map((_,i)=>'<button class="'+(i===cat.index?'current':'')+' '+(cat.answers[i]!==undefined?'answered':'')+'" onclick="goCAT('+i+')">'+(i+1)+'</button>').join('');
  el('catPrev').disabled=cat.index===0;
}
function selectCAT(i){cat.answers[cat.index]=i; renderCAT();}
function goCAT(i){cat.index=i; renderCAT();}
function submitCAT(){
  clearInterval(cat.timer);
  let correct=0;
  cat.questions.forEach((q,i)=>{if(cat.answers[i]===q.answerIndex) correct++;});
  const score=Math.round(correct/cat.questions.length*100);
  el('catTest').hidden=true;
  el('catResult').hidden=false;
  el('catResult').innerHTML='<h3><i class="fa-solid fa-chart-simple"></i> Result</h3><div class="stat-num">'+score+'%</div><p class="muted">'+correct+' correct out of '+cat.questions.length+'</p><p class="muted small">Review is available in Teaching mode. Result is stored locally only — to save it, download or push an update to GitHub.</p><div class="row wrap"><button class="btn primary" onclick="backToCATSetup()">Take another test</button><button class="btn" onclick="downloadCATResult()">Download result JSON</button></div>';
  window._lastCAT={score,correct,total:cat.questions.length,answers:cat.answers,questions:cat.questions.map(q=>({id:q.id,topic:q.topic,difficulty:q.difficulty,question:q.question}))};
}
function backToCATSetup(){el('catSetup').hidden=false; el('catTest').hidden=true; el('catResult').hidden=true;}
function downloadCATResult(){if(window._lastCAT) downloadJSON('cat-result.json',window._lastCAT);}
