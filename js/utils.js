// FALLBACK DATA - used only if fetch() fails (e.g. opening index.html via file://)
// On GitHub Pages fetch() succeeds, so edits to JSON files always win.
const FALLBACK_DATA = {
  "data/config.json": {"appName":"CAT Learning","school":"Your School","version":"1.0.0","cat":{"defaultTimePerQuestionSec":60,"showResultImmediately":true},"questionsDir":"questions/","materialsDir":"materials/"},
  "data/roles.json": {"super":{"label":"Super Admin","canAccessAdmin":true,"canAccessCAT":true,"canAccessTeaching":true,"canAccessMaterials":true,"canAccessGenerator":true},"teacher":{"label":"Teacher","canAccessAdmin":false,"canAccessCAT":true,"canAccessTeaching":true,"canAccessMaterials":true,"canAccessGenerator":true},"student":{"label":"Student","canAccessAdmin":false,"canAccessCAT":true,"canAccessTeaching":true,"canAccessMaterials":true,"canAccessGenerator":false}},
  "data/users.json": [
    {"username":"super","name":"Super Admin","role":"super","passwordHash":"6eb7d4e93479f9534588ef1084e7862a45e98ac3b378f9c6862757941b220b88"},
    {"username":"teacher","name":"Teacher Demo","role":"teacher","passwordHash":"3641c3aac9354aa4b8ac3b3677d7b1a358c535aaafe160ce0821c8f89baa7f03"},
    {"username":"student","name":"Student Demo","role":"student","passwordHash":"cb2433073edb25ca77f0445dcdbd7e7c568196eef1cd54da7228ddd227240e2e"}
  ],
  "data/materials.json": {"materials":[{"title":"Sample Notes - Study Guide","file":"sample-notes.md","type":"md","description":"How to use CAT, Teaching and Generator."},{"title":"Sample Text - Instructions","file":"sample.txt","type":"txt","description":"Plain text instructions for students."}]},
  "questions/index.json": {"files":[{"file":"sample.json","title":"Sample - General Knowledge","description":"9 sample questions - 3 easy, 3 intermediate, 3 advanced"}]},
  "questions/sample.json": {"meta":{"title":"Sample - General Knowledge","subject":"General","version":"1.0"},"questions":[
    {"id":"Q01","topic":"Math","difficulty":"easy","question":"What is 7 + 8?","options":["13","15","16","14"],"answerIndex":1,"explanation":"7 + 8 = 15."},
    {"id":"Q02","topic":"Science","difficulty":"easy","question":"Which planet is known as the Red Planet?","options":["Venus","Jupiter","Mars","Saturn"],"answerIndex":2,"explanation":"Mars appears red due to iron oxide on its surface."},
    {"id":"Q03","topic":"English","difficulty":"easy","question":"Choose the correct plural of 'child'.","options":["Childs","Children","Childes","Childrens"],"answerIndex":1,"explanation":"The irregular plural of child is children."},
    {"id":"Q04","topic":"Math","difficulty":"intermediate","question":"What is 15% of 200?","options":["20","25","30","35"],"answerIndex":2,"explanation":"15% of 200 = 0.15 x 200 = 30."},
    {"id":"Q05","topic":"Science","difficulty":"intermediate","question":"What is the chemical symbol for water?","options":["CO2","O2","H2O","NaCl"],"answerIndex":2,"explanation":"Water is H2O: two hydrogen, one oxygen."},
    {"id":"Q06","topic":"Geography","difficulty":"intermediate","question":"What is the capital of Japan?","options":["Seoul","Beijing","Bangkok","Tokyo"],"answerIndex":3,"explanation":"Tokyo is the capital of Japan."},
    {"id":"Q07","topic":"Math","difficulty":"advanced","question":"Solve for x: 2x + 6 = 18","options":["5","6","7","12"],"answerIndex":1,"explanation":"2x = 12, so x = 6."},
    {"id":"Q08","topic":"Science","difficulty":"advanced","question":"Which gas is most abundant in Earth's atmosphere?","options":["Oxygen","Carbon Dioxide","Nitrogen","Hydrogen"],"answerIndex":2,"explanation":"Nitrogen is about 78% of the atmosphere."},
    {"id":"Q09","topic":"Logic","difficulty":"advanced","question":"Next number: 2, 6, 12, 20, 30, ?","options":["40","42","44","36"],"answerIndex":1,"explanation":"Differences increase by 2: +4, +6, +8, +10, +12 = 42."}
  ]}
};
const FALLBACK_TEXT = {
  "materials/sample.txt": "CAT Learning - Instructions\n\n1. Login as student, teacher or super.\n2. CAT Test: choose a question file, difficulty and count, then start.\n3. Teaching: teacher opens the same questions and reveals answers + explanations.\n4. Materials: open PDF / image / TXT / MD files.\n5. Generator: create a new test set and download it as JSON.\n",
  "materials/sample-notes.md": "# Sample Notes\n\n## How this app works\n- **No database.** All data lives in `data/`, `questions/` and `materials/`.\n- **GET only.** The app only uses `fetch()` GET to read JSON files. No POST.\n- **To update:** edit a file locally, commit and push to GitHub.\n"
};
function cloneFallback(v){ return JSON.parse(JSON.stringify(v)); }

async function loadJSON(path){
  // Try real fetch first - on GitHub Pages this always wins
  try{
    const r = await fetch(path, {cache:'no-store'});
    if(r.ok) return await r.json();
  }catch(e){ /* file:// blocks fetch - fall through to fallback */ }
  if(FALLBACK_DATA[path]) return cloneFallback(FALLBACK_DATA[path]);
  throw new Error('Cannot load ' + path + ' - serve via http / GitHub Pages, or use fallback data');
}
async function loadText(path){
  try{
    const r = await fetch(path, {cache:'no-store'});
    if(r.ok) return await r.text();
  }catch(e){}
  if(FALLBACK_TEXT[path]) return FALLBACK_TEXT[path];
  throw new Error('Cannot load ' + path);
}

// Pure-JS SHA-256 (ASCII + UTF-8 via encodeURIComponent) - used when crypto.subtle is unavailable (file:// / http)
function sha256Pure(str){
  var ascii = unescape(encodeURIComponent(str));
  function rightRotate(value, amount){ return (value>>>amount) | (value<<(32-amount)); }
  var mathPow = Math.pow, maxWord = mathPow(2,32), i, j, result='', words=[], asciiBitLength = ascii.length*8;
  var hash=[], k=[], primeCounter=0, isComposite={};
  for(var candidate=2; primeCounter<64; candidate++){
    if(!isComposite[candidate]){
      for(i=0;i<313;i+=candidate) isComposite[i]=candidate;
      hash[primeCounter]=(mathPow(candidate,.5)*maxWord)|0;
      k[primeCounter++]=(mathPow(candidate,1/3)*maxWord)|0;
    }
  }
  ascii+='\x80';
  while(ascii.length%64-56) ascii+='\x00';
  for(i=0;i<ascii.length;i++){
    j=ascii.charCodeAt(i);
    if(j>>8) return;
    words[i>>2]|=j<<((3-i)%4)*8;
  }
  words[words.length]=((asciiBitLength/maxWord)|0);
  words[words.length]=(asciiBitLength);
  for(j=0;j<words.length;){
    var w=words.slice(j, j+=16);
    var oldHash=hash; hash=hash.slice(0);
    for(i=0;i<64;i++){
      var w15=w[i-15], w2=w[i-2];
      var a=hash[0], e=hash[4];
      var temp1=hash[7]+(rightRotate(e,6)^rightRotate(e,11)^rightRotate(e,25))+((e&hash[5])^((~e)&hash[6]))+k[i]+(w[i]=(i<16)?w[i]:(w[i-16]+(rightRotate(w15,7)^rightRotate(w15,18)^(w15>>>3))+w[i-7]+(rightRotate(w2,17)^rightRotate(w2,19)^(w2>>>10)))|0);
      var temp2=(rightRotate(a,2)^rightRotate(a,13)^rightRotate(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
      hash=[(temp1+temp2)|0].concat(hash);
      hash[4]=(hash[4]+temp1)|0;
    }
    for(i=0;i<8;i++) hash[i]=(hash[i]+oldHash[i])|0;
  }
  for(i=0;i<8;i++){ for(j=3;j+1;j--){ var b=(hash[i]>>(j*8))&255; result+=((b<16)?0:'')+b.toString(16); } }
  return result;
}
async function sha256Hex(text){
  try{
    if(window.crypto && window.crypto.subtle && window.isSecureContext){
      const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
    }
  }catch(e){}
  return sha256Pure(text);
}
function shuffle(a){const arr=[...a];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function mdToHtml(md){let h=escapeHtml(md);h=h.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^- (.*)$/gm,'<li>$1</li>');h=h.replace(/(<li>.*<\/li>)/s,'<ul>$1</ul>');return h.split(/\n\n+/).map(p=>p.trim().startsWith('<')?p:'<p>'+p.replace(/\n/g,'<br>')+'</p>').join('');}
function el(id){return document.getElementById(id);}
function fmtTime(sec){const m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function downloadJSON(filename,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);}
