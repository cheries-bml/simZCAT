let teach={questions:[],index:0,revealed:false};
async function initTeaching(){
  const idx=await loadJSON('questions/index.json');
  el('teachFile').innerHTML=idx.files.map(f=>'<option value="'+f.file+'">'+escapeHtml(f.title)+'</option>').join('');
}
async function startTeaching(){
  const file=el('teachFile').value, diff=el('teachDifficulty').value, count=parseInt(el('teachCount').value||'5');
  const data=await loadJSON('questions/'+file);
  let qs=data.questions||[];
  if(diff!=='all') qs=qs.filter(q=>q.difficulty===diff);
  qs=shuffle(qs).slice(0,count);
  if(!qs.length){alert('No questions for this filter.');return;}
  teach.questions=qs; teach.index=0; teach.revealed=false;
  el('teachArea').hidden=false; renderTeaching();
}
function renderTeaching(){
  const q=teach.questions[teach.index];
  el('teachProgress').textContent='Question '+(teach.index+1)+' of '+teach.questions.length+' • '+q.topic+' • '+q.difficulty;
  el('teachQTitle').textContent=q.id+' — '+q.topic;
  el('teachQText').textContent=q.question;
  teach.revealed=false; el('teachAnswer').hidden=true; el('teachReveal').textContent='Show correct answer & explanation';
  el('teachOptions').innerHTML=q.options.map((o,i)=>'<div class="opt">'+escapeHtml(o)+'</div>').join('');
}
function toggleTeachReveal(){
  const q=teach.questions[teach.index];
  teach.revealed=!teach.revealed;
  el('teachAnswer').hidden=!teach.revealed;
  if(teach.revealed){
    el('teachAnswer').innerHTML='<strong>Correct:</strong> '+escapeHtml(q.options[q.answerIndex])+'<br><strong>Explanation:</strong> '+escapeHtml(q.explanation||'-');
    el('teachOptions').innerHTML=q.options.map((o,i)=>'<div class="opt '+(i===q.answerIndex?'correct':'')+'">'+escapeHtml(o)+(i===q.answerIndex?' ✓':'')+'</div>').join('');
    el('teachReveal').textContent='Hide answer';
  } else { renderTeaching(); }
}
