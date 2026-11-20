let generated=null;
async function initGenerator(){
  const idx=await loadJSON('questions/index.json');
  el('genFile').innerHTML=idx.files.map(f=>'<option value="'+f.file+'">'+escapeHtml(f.title)+'</option>').join('');
}
async function generateTest(){
  const file=el('genFile').value, diff=el('genDifficulty').value, count=parseInt(el('genCount').value||'5');
  const data=await loadJSON('questions/'+file);
  let qs=data.questions||[];
  if(diff!=='all') qs=qs.filter(q=>q.difficulty===diff);
  qs=shuffle(qs).slice(0,count);
  if(!qs.length){alert('No questions for this filter.');return;}
  generated={meta:{title:'Generated Test',source:file,difficulty:diff,generatedAt:new Date().toISOString()},questions:qs};
  const prev=el('genPreview'); prev.hidden=false;
  prev.innerHTML='<h3>Preview — '+qs.length+' questions</h3><table><tr><th>#</th><th>Topic</th><th>Difficulty</th><th>Question</th></tr>'+qs.map((q,i)=>'<tr><td>'+(i+1)+'</td><td>'+escapeHtml(q.topic)+'</td><td>'+q.difficulty+'</td><td>'+escapeHtml(q.question)+'</td></tr>').join('')+'</table><p class="muted small">To save permanently, download this JSON as <code>questions/your-name.json</code>, add it to <code>questions/index.json</code>, and push to GitHub.</p>';
  el('genStartCat').hidden=false; el('genDownload').hidden=false;
}
function startGeneratedAsCAT(){
  if(!generated) return;
  cat.questions=generated.questions; cat.index=0; cat.answers={}; cat.secondsLeft=generated.questions.length*60;
  clearInterval(cat.timer);
  cat.timer=setInterval(()=>{cat.secondsLeft--; el('catTimer').textContent=fmtTime(Math.max(0,cat.secondsLeft)); if(cat.secondsLeft<=0){clearInterval(cat.timer); submitCAT();}},1000);
  showView('cat'); el('catSetup').hidden=true; el('catTest').hidden=false; el('catResult').hidden=true; el('catTimer').textContent=fmtTime(cat.secondsLeft); renderCAT();
}
function downloadGenerated(){ if(generated) downloadJSON('generated-test.json',generated); }
