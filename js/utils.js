
function $(s, el){ return (el||document).querySelector(s); }
function $$(s, el){ return Array.from((el||document).querySelectorAll(s)); }
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
async function fetchJSON(path){
  const r = await fetch(path, {method:'GET', cache:'no-store'});
  if(!r.ok) throw new Error('Failed to load '+path+' ('+r.status+')');
  return r.json();
}
async function fetchText(path){
  const r = await fetch(path, {method:'GET', cache:'no-store'});
  if(!r.ok) throw new Error('Failed to load '+path);
  return r.text();
}
async function fetchJSONOrNull(path){
  try{ return await fetchJSON(path); }catch(e){ return null; }
}
function sha256Fallback(ascii){
  function rightRotate(value, amount){ return (value>>>amount) | (value<<(32-amount)); }
  var mathPow = Math.pow; var maxWord = mathPow(2, 32);
  var lengthProperty = 'length'; var i, j;
  var result = '';
  var words = []; var asciiBitLength = ascii[lengthProperty]*8;
  var hash = sha256Fallback.h = sha256Fallback.h || [];
  var k = sha256Fallback.k = sha256Fallback.k || [];
  var primeCounter = k[lengthProperty];
  var isComposite = {};
  for(var candidate=2; primeCounter<64; candidate++){
    if(!isComposite[candidate]){
      for(i=0;i<313;i+=candidate){ isComposite[i+candidate]=true; }
      hash[primeCounter]=(mathPow(candidate,.5)*maxWord)|0;
      k[primeCounter]=(mathPow(candidate,1/3)*maxWord)|0;
      primeCounter++;
    }
  }
  ascii += '\x80';
  while(ascii[lengthProperty]%64-56) ascii += '\x00';
  for(i=0;i<ascii[lengthProperty];i++){
    j=ascii.charCodeAt(i);
    if(j>>8) return;
    words[i>>2] |= j << ((3 - i)%4)*8;
  }
  words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
  words[words[lengthProperty]] = (asciiBitLength);
  for(j=0;j<words[lengthProperty];){
    var w = words.slice(j, j+=16);
    var oldHash = hash;
    hash = hash.slice(0);
    for(i=0;i<64;i++){
      var i2=i+j;
      var w15=w[i-15], w2=w[i-2];
      var a=oldHash[0], e=oldHash[4];
      var temp1=oldHash[7]+(rightRotate(e,6)^rightRotate(e,11)^rightRotate(e,25))+((e&oldHash[5])^((~e)&oldHash[6]))+k[i]+(w[i]=i<16?w[i]:w[i-16]+(rightRotate(w15,7)^rightRotate(w15,18)^(w15>>>3))+w[i-7]+(rightRotate(w2,17)^rightRotate(w2,19)^(w2>>>10))|0);
      var temp2=(rightRotate(a,2)^rightRotate(a,13)^rightRotate(a,22))+((a&oldHash[1])^(a&oldHash[2])^(oldHash[1]&oldHash[2]));
      oldHash=[temp1+temp2|0].concat(oldHash);
      oldHash[4]=oldHash[4]+temp1|0;
    }
    for(i=0;i<8;i++){ hash[i]=hash[i]+oldHash[i]|0; }
  }
  for(i=0;i<8;i++){
    for(j=3;j+1;j--){ var b=(hash[i]>>(j*8))&255; result+=((b<16)?0:'')+b.toString(16); }
  }
  return result;
}
async function sha256Hex(str){
  try{
    if(window.crypto && window.crypto.subtle && window.crypto.subtle.digest){
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
  }catch(e){}
  try{ return sha256Fallback(unescape(encodeURIComponent(str))); }
  catch(e2){ return sha256Fallback(str); }
}
function levelOf(q){ return (q.config && q.config.level) || 1; }
function levelLabel(level){ if(level<=2) return 'Easy'; if(level===3) return 'Intermediate'; return 'Advanced'; }
function levelClass(level){ if(level<=2) return 'easy'; if(level===3) return 'intermediate'; return 'advanced'; }
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function norm(s){ return String(s||'').trim().toLowerCase().replace(/\s+/g,' '); }
function mdToHtml(md){
  let h = esc(md);
  h = h.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>');
  h = h.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/^- (.*)$/gm,'<div>• $1</div>');
  h = h.replace(/\n/g,'<br>');
  return h;
}
function fmtTime(sec){ const m=Math.floor(sec/60), s=sec%60; return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); }
function show(el){ if(el) el.classList.remove('hidden'); }
function hide(el){ if(el) el.classList.add('hidden'); }
function safeSessionGet(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
function safeSessionSet(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} }
function safeSessionRemove(k){ try{ sessionStorage.removeItem(k); }catch(e){} }
