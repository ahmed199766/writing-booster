// ====== Storage per user ======
const G='wb34lite_global', DEFAULT_USER='guest';
function g(){ try{return JSON.parse(localStorage.getItem(G))||{currentUser:DEFAULT_USER};}catch{return{currentUser:DEFAULT_USER};} }
function sg(v){ localStorage.setItem(G, JSON.stringify(v)); }
function key(k){ return `wb34lite_${(g().currentUser||DEFAULT_USER)}_${k}`; }
function saveK(k,v){ localStorage.setItem(key(k), JSON.stringify(v)); }
function loadK(k,f){ try{ return JSON.parse(localStorage.getItem(key(k))) ?? f; }catch{ return f; } }

// ====== Auth ======
const authModal=document.getElementById('authModal');
document.getElementById('switchUser').addEventListener('click',()=>{ authModal.classList.remove('hidden'); document.getElementById('usernameInput').focus(); });
document.getElementById('closeAuth').addEventListener('click',()=> authModal.classList.add('hidden'));
document.getElementById('loginBtn').addEventListener('click',()=>{
  const name=(document.getElementById('usernameInput').value||'').trim().toLowerCase();
  if(!name) return alert('Enter username');
  const gg=g(); gg.currentUser=name; sg(gg);
  document.getElementById('currentUserLabel').textContent=name;
  authModal.classList.add('hidden');
  if(loadK('miss',null)===null) saveK('miss',[]);
  if(loadK('hist',null)===null) saveK('hist',[]);
  renderMiss(); renderHistory();
});
document.getElementById('currentUserLabel').textContent=g().currentUser||'guest';

// ====== Tabs ======
document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+b.dataset.tab).classList.add('active');
  if(b.dataset.tab==='progress') renderHistory();
  if(b.dataset.tab==='images') autoImg();
  if(b.dataset.tab==='writing') ensurePrompt();
}));

// ====== CEFR texts ======
const CEFR={
 A1:[
  "My name is Sara. I live with my family in a small house near the river. Every morning I wake up early, make tea, and walk to work. I like reading simple stories in English and learning new words.",
  "This is my friend Ali. He has a bike and rides it to school. After class we play football in the park. On the weekend we visit our grandparents and cook dinner together."
 ],
 A2:[
  "Last year I moved to a new city to start a different job. At first I felt nervous because I did not know anyone. I explored the streets, found a cozy cafe, and slowly built a routine that helped me feel at home.",
  "Learning a language takes patience. I watch short videos with subtitles and repeat the sentences out loud. When I make mistakes, I write them down and practice the correct spelling."
 ],
 B1:[
  "Many people believe that success depends only on talent, but consistent effort often matters more. When we practice a little every day, we build habits that make difficult tasks feel easier over time.",
  "Public transport can reduce traffic and pollution if it is reliable. Cities should invest in safe buses and clean stations so more people will choose to leave their cars at home."
 ],
 B2:[
  "Technology has changed the way we communicate. Messages travel instantly, yet misunderstandings still occur. To write clearly, we need structure, examples, and transitions that guide the reader from one idea to the next.",
  "Group projects can be frustrating when responsibilities are unclear. Setting a shared goal, agreeing on deadlines, and reviewing progress weekly can turn a messy team into an effective one."
 ],
 C1:[
  "When resources are limited, prioritization becomes a leadership test. The best managers communicate trade‑offs transparently, invite feedback, and document the reasoning behind each decision to maintain trust.",
  "Curiosity drives innovation. Teams that ask precise questions and test small hypotheses learn faster than those who pursue grand plans without evidence."
 ],
 C2:[
  "Democracies depend on citizens who can evaluate claims critically. Rather than accepting confident opinions, we should examine assumptions, compare sources, and update our views when the facts demand it.",
  "In complex systems, outcomes emerge from many small interactions. Improving such systems requires iterative changes, careful measurement, and a willingness to reverse course when results contradict expectations."
 ]
};

// ====== Dictation (CEFR + TED embed) ======
const dictCefr=document.getElementById('dictCefr'), dictVariant=document.getElementById('dictVariant');
function loadVariants(){ const L=dictCefr.value; dictVariant.innerHTML=''; CEFR[L].forEach((t,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=`${L} #${i+1}`; dictVariant.appendChild(o); }); }
loadVariants(); dictCefr.addEventListener('change', loadVariants);
let lastRef=CEFR.A1[0], currentClip=null;
document.getElementById('playCefr').addEventListener('click',()=>{ lastRef=CEFR[dictCefr.value][parseInt(dictVariant.value||'0')]; tts(lastRef); });
document.getElementById('useCefr').addEventListener('click',()=>{ lastRef=CEFR[dictCefr.value][parseInt(dictVariant.value||'0')]; alert('Selected text will be used for checking.'); });

const TED_IDS=["Ks-_Mh1QhMc","oHg5SJYRHA0"]; // demo IDs; replace with TED IDs you prefer
const ytWrap=document.getElementById('ytPlayerWrap'), tedTranscript=document.getElementById('tedTranscript'), clipInfo=document.getElementById('clipInfo');
function loadTed(id,start=0){ const ifr=document.createElement('iframe'); ifr.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"; ifr.src=`https://www.youtube.com/embed/${id}?start=${start}`; ytWrap.innerHTML=""; ytWrap.appendChild(ifr); ytWrap.dataset.videoId=id; }
document.getElementById('loadRandomTed').addEventListener('click',()=> loadTed(TED_IDS[Math.floor(Math.random()*TED_IDS.length)], Math.floor(Math.random()*180)));
document.getElementById('randomizeStart').addEventListener('click',()=>{ const id=ytWrap.dataset.videoId || TED_IDS[0]; loadTed(id, Math.floor(Math.random()*240)); });

document.getElementById('useTedTranscript').addEventListener('click',()=>{ const t=(tedTranscript.value||'').trim(); if(!t) return alert('Transcript empty'); lastRef=t; alert('Transcript set for checking.'); });
document.getElementById('pickClip').addEventListener('click',()=>{
  const raw=(tedTranscript.value||'').trim(); if(!raw) return alert('Paste transcript first');
  const items=parseTranscript(raw); const clip=pickRandomClip(items); if(!clip) return alert('Could not pick clip');
  currentClip=clip; lastRef=clip.text; clipInfo.textContent=`Selected: ${clip.text.slice(0,120)}...`;
  const id=ytWrap.dataset.videoId; if(id && clip.start!=null){ const ifr=document.createElement('iframe'); ifr.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"; ifr.src=`https://www.youtube.com/embed/${id}?start=${clip.start}&end=${clip.end}`; ytWrap.innerHTML=""; ytWrap.appendChild(ifr); }
});
document.getElementById('playClipTTS').addEventListener('click',()=>{ if(!currentClip) return alert('Pick a clip first'); tts(currentClip.text); });

document.getElementById('checkDictation').addEventListener('click',()=>{
  const typed=(document.getElementById('dictationInput').value||'').trim();
  const res=diffWords(lastRef, typed);
  addMiss(res.misspelled);
  document.getElementById('dictationFeedback').innerHTML=`Accuracy: <b>${res.accuracy}%</b> • Misspelled: ${res.misspelled.join(', ')||'None'}`;
  pushHist({ ts:Date.now(), type:'dictation', words: typed.split(/\s+/).filter(Boolean).length, accuracy: res.accuracy });
  renderHistory();
});
document.getElementById('clearDictation').addEventListener('click',()=>{ document.getElementById('dictationInput').value=""; document.getElementById('dictationFeedback').textContent=""; });

function tts(t){ if(!window.speechSynthesis) return alert('No speechSynthesis'); const u=new SpeechSynthesisUtterance(t); u.lang='en-US'; u.rate=0.95; speechSynthesis.cancel(); speechSynthesis.speak(u); }
function normalize(t){ return t.toLowerCase().replace(/\u00A0/g,' ').replace(/[“”‘’]/g,"'").replace(/[^a-z\s]/g,'').replace(/\s+/g,' ').trim(); }
function toks(t){ const n=normalize(t); return n? n.split(' ') : []; }
function lcs(a,b){ const m=a.length,n=b.length; const dp=Array.from({length:m+1},()=>Array(n+1).fill(0)); for(let i=1;i<=m;i++){ for(let j=1;j<=n;j++){ dp[i][j]=a[i-1]===b[j-1]? dp[i-1][j-1]+1 : Math.max(dp[i-1][j], dp[i][j-1]); } } let i=m,j=n,ok=[]; while(i>0&&j>0){ if(a[i-1]===b[j-1]){ ok.push(a[i-1]); i--; j--; } else if(dp[i-1][j]>=dp[i][j-1]) i--; else j--; } ok.reverse(); return {count:ok.length, set:new Set(ok)}; }
function diffWords(ref, typed){ const A=toks(ref), B=toks(typed); const {count,set}=lcs(A,B); const miss=B.filter(w=>!set.has(w)); const acc=Math.max(0,Math.round((count/Math.max(A.length,1))*100)); return {accuracy:acc, misspelled:[...new Set(miss)]}; }
function parseTranscript(raw){ const lines=raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); const items=[]; const re=/^\[?(\d{1,2}:)?\d{1,2}:\d{2}\]?/; let last=0; for(const line of lines){ const m=line.match(re); if(m){ const ts=m[0].replace(/[\[\]]/g,''); const sec=toSec(ts); const text=line.slice(m[0].length).trim(); items.push({t:sec,text}); last=sec; }else{ last+=3; items.push({t:last,text:line}); } } return items; }
function toSec(ts){ const p=ts.split(':').map(Number); return p.length===3? p[0]*3600+p[1]*60+p[2] : p[0]*60+p[1]; }
function pickRandomClip(items){ const min=15,max=30; for(let k=0;k<100;k++){ const i=Math.floor(Math.random()*Math.max(1,items.length-1)); let start=items[i].t, text=items[i].text, j=i+1; while(j<items.length && (items[j].t-start)<max){ text+=' '+items[j].text; if((items[j].t-start)>=min) break; j++; } const end=j<items.length? items[j].t : start+min; if(end-start>=min && end-start<=max){ return {start,end,text:text.replace(/\s+/g,' ').trim()}; } } const all=items.map(it=>it.text).join(' '); const w=all.split(/\s+/).filter(Boolean); if(w.length<40) return null; const s=Math.floor(Math.random()*(w.length-70)); return {start:null,end:null,text:w.slice(s,s+70).join(' ')}; }

// ====== Typing ======
const typeCefr=document.getElementById('typeCefr'), typeLength=document.getElementById('typeLength'), typeTime=document.getElementById('typeTime');
const typingText=document.getElementById('typingText'), typingInput=document.getElementById('typingInput'), typingTimeEl=document.getElementById('typingTime');
let tTimer=null, tLeft=60, tTarget="";
document.getElementById('startTypingTest').addEventListener('click',()=>{
  const level=typeCefr.value, length=typeLength.value;
  const base=CEFR[level][Math.floor(Math.random()*CEFR[level].length)];
  const mul= length==='short'?1 : (length==='med'?2:3);
  tTarget=(base+" ").repeat(mul).trim();
  typingText.textContent=tTarget; typingInput.disabled=false; typingInput.value="";
  tLeft=parseInt(typeTime.value||"60"); typingTimeEl.textContent=tLeft;
  if(tTimer) clearInterval(tTimer);
  tTimer=setInterval(()=>{ tLeft--; typingTimeEl.textContent=tLeft; if(tLeft<=0){ clearInterval(tTimer); tTimer=null; typingInput.disabled=true; const wpm=parseInt(document.getElementById('wpm').textContent||"0"); const acc=parseInt((document.getElementById('accuracy').textContent||"0").replace('%','')); pushHist({ts:Date.now(), type:'typing', wpm, accuracy:acc}); renderHistory(); } stats(); },1000);
  stats(); typingInput.focus();
});
typingInput.addEventListener('input', stats);
function stats(){ const typed=typingInput.value; const total=parseInt(typeTime.value||"60"); const passed=total-tLeft; const minutes=Math.max(passed/60,1/60); const wpm=Math.round((typed.length/5)/minutes); let ok=0; for(let i=0;i<typed.length && i<tTarget.length;i++){ if(typed[i]===tTarget[i]) ok++; } const acc=typed.length? Math.round((ok/typed.length)*100):100; document.getElementById('wpm').textContent=wpm; document.getElementById('accuracy').textContent=acc+'%'; }

// ====== Writing (5:00 default) ======
const connectors=["First of all","In addition","Moreover","However","On the other hand","Therefore","As a result","For example","For instance","In my opinion","In conclusion","To sum up","Although","Even though","Because","Since","While","Whereas","Consequently","Furthermore","Overall","Besides","Specifically","In contrast","Similarly"];
const chips=document.getElementById('connectors');
if(chips){ connectors.forEach(c=>{ const s=document.createElement('span'); s.className='badge'; s.textContent=c; s.addEventListener('click',()=>{ const ta=document.getElementById('writingArea'); ta.value+=(ta.value.endsWith(' ')||!ta.value?'':' ')+c+' '; saveK('wtext', ta.value); wcount(); }); chips.appendChild(s); }); }
const wArea=document.getElementById('writingArea'), pInput=document.getElementById('promptInput'), wMin=document.getElementById('writingMinutes');
const prompts=["Describe a challenge you faced and how you overcame it.","Do you prefer studying alone or with others? Explain with examples.","What is a valuable skill you learned recently and why is it useful?","Should schools require uniforms? Give reasons and examples.","Explain a routine you follow every day and why it matters to you.","Describe a place you would like to visit and why."];
if(wArea){ wArea.value=loadK('wtext',""); pInput.value=loadK('prompt',""); wArea.addEventListener('input',()=>{ saveK('wtext', wArea.value); wcount(); }); pInput.addEventListener('input',()=> saveK('prompt', pInput.value)); }
function ensurePrompt(){ if(!pInput) return; if(!pInput.value.trim()){ const p=prompts[Math.floor(Math.random()*prompts.length)]; pInput.value=p; saveK('prompt',p);} }
function wcount(){ const n=(wArea.value.trim().match(/\S+/g)||[]).length; document.getElementById('wordCount').textContent="Words: "+n; } if(wArea) wcount();
let wTimer=null, wSecs=5*60; const tDisp=document.getElementById('timerDisplay');
function setW(){ wSecs=parseInt((wMin&&wMin.value)||"5")*60; renderW(); } setW();
document.getElementById('startTimer').addEventListener('click',()=>{ if(wTimer) return; wTimer=setInterval(()=>{ wSecs--; renderW(); if(wSecs<=0){ clearInterval(wTimer); wTimer=null; alert("Time's up!"); } },1000); });
document.getElementById('resetTimer').addEventListener('click',()=>{ if(wTimer){ clearInterval(wTimer); wTimer=null; } setW(); });
if(wMin) wMin.addEventListener('change', setW);
function renderW(){ const m=String(Math.floor(wSecs/60)).padStart(2,'0'); const s=String(wSecs%60).padStart(2,'0'); tDisp.textContent=`${m}:${s}`; }

function analyzeTextToMiss(t){ const words=t.split(/[\s,.;:!?()"']/).filter(w=>w.length>0); const uniq=[...new Set(words.map(w=>w.toLowerCase()))]; const miss=uniq.filter(w=>/^[a-z]{3,}$/.test(w)===false); return miss; } // simple heuristic
function addMiss(arr){ const set=new Set(loadK('miss',[])); arr.forEach(w=>{ if(w&&w.length>1) set.add(w.toLowerCase()); }); saveK('miss',[...set]); renderMiss(); }
document.getElementById('finishAnalyze').addEventListener('click',()=>{ const text=wArea.value; const miss=analyzeTextToMiss(text); addMiss(miss); pushHist(buildDet(text,'writing')); renderHistory(); document.getElementById('analysis').textContent=`Saved. Potential mistakes: ${miss.length}`; });
document.getElementById('clearWriting').addEventListener('click',()=>{ wArea.value=""; saveK('wtext',""); wcount(); document.getElementById('analysis').textContent=""; });

// ====== Images (1:00) ======
let iTimer=null, iSecs=60; const iDisp=document.getElementById('imgTimerDisplay');
function renderI(){ const m=String(Math.floor(iSecs/60)).padStart(2,'0'); const s=String(iSecs%60).padStart(2,'0'); iDisp.textContent=`${m}:${s}`; } renderI();
document.getElementById('startImgTimer').addEventListener('click',()=>{ if(iTimer) return; iTimer=setInterval(()=>{ iSecs--; renderI(); if(iSecs<=0){ clearInterval(iTimer); iTimer=null; alert("Time's up!"); } },1000); });
document.getElementById('resetImgTimer').addEventListener('click',()=>{ if(iTimer){ clearInterval(iTimer); iTimer=null; } iSecs=60; renderI(); });
document.getElementById('imageDescription').addEventListener('input',()=>{ const n=(document.getElementById('imageDescription').value.trim().match(/\S+/g)||[]).length; document.getElementById('imgWordCount').textContent="Words: "+n; });
const imgEl=document.getElementById('practiceImage'); function autoImg(){ imgEl.src="https://picsum.photos/seed/"+Math.floor(Math.random()*99999)+"/600/400"; }
document.getElementById('randomImage').addEventListener('click', autoImg);
document.getElementById('uploadImage').addEventListener('change',e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=> imgEl.src=r.result; r.readAsDataURL(f); });
document.getElementById('saveImageDesc').addEventListener('click',()=>{ const t=document.getElementById('imageDescription').value; const miss=analyzeTextToMiss(t); addMiss(miss); pushHist(buildDet(t,'image')); renderHistory(); document.getElementById('imgAnalysis').textContent=`Saved. Found ${miss.length} potential misspellings.`; });
document.getElementById('clearImageDesc').addEventListener('click',()=>{ document.getElementById('imageDescription').value=""; document.getElementById('imgWordCount').textContent="Words: 0"; document.getElementById('imgAnalysis').textContent=""; });

// ====== Spelling ======
function renderMiss(){ const list=document.getElementById('misspelledList'); list.innerHTML=""; const arr=loadK('miss',[]); if(arr.length===0){ list.innerHTML="<li>No words yet.</li>"; return; } arr.forEach(w=>{ const li=document.createElement('li'); const s=document.createElement('span'); s.textContent=w; const del=document.createElement('button'); del.textContent="Remove"; del.addEventListener('click',()=>{ const set=new Set(loadK('miss',[])); set.delete(w); saveK('miss',[...set]); renderMiss(); }); li.appendChild(s); li.appendChild(del); list.appendChild(li); }); }
renderMiss();
document.getElementById('clearMisspelled').addEventListener('click',()=>{ if(confirm("Clear your misspelled words list?")){ saveK('miss',[]); renderMiss(); } });
document.getElementById('exportWords').addEventListener('click',()=>{ const arr=loadK('miss',[]); const blob=new Blob([arr.join('\\n')],{type:'text/plain'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='misspelled_words.txt'; a.click(); URL.revokeObjectURL(url); });
let spi=-1, spp=[]; document.getElementById('startSpelling').addEventListener('click',()=>{ spp=loadK('miss',[]); if(spp.length===0) return alert('No words'); spi=-1; nextS(); document.getElementById('spellingFeedback').textContent=""; });
function nextS(){ if(spp.length===0) return; spi=(spi+1)%spp.length; document.getElementById('spellingTarget').textContent="Type this word: "+spp[spi]; document.getElementById('spellingInput').value=""; document.getElementById('spellingInput').focus(); }
document.getElementById('nextSpelling').addEventListener('click', nextS);
document.getElementById('checkSpelling').addEventListener('click',()=>{ const target=spp[spi]||""; const val=document.getElementById('spellingInput').value.trim(); const fb=document.getElementById('spellingFeedback'); fb.textContent=(val.toLowerCase()===target.toLowerCase())?"✅ Correct!":"❌ Not yet. Try again."; });

// ====== Progress ======
function hist(){ return loadK('hist',[]); } function saveHist(a){ saveK('hist',a); } function pushHist(e){ const a=hist(); a.push(e); saveHist(a); }
function detScore(m){ const len=Math.min(m.words/80,1); const ttr=Math.max(0,Math.min(m.ttr,1)); const ttrS=Math.max(0,(ttr-0.25)/0.45); const con=Math.min(m.conn/6,1); const miss=Math.max(0,1-(m.miss/0.2)); const comp=0.3*len+0.3*ttrS+0.2*con+0.2*miss; return Math.max(10,Math.min(160,Math.round(10+comp*150))); }
function buildDet(text,type='writing'){ const arr=text.trim().split(/\s+/).filter(Boolean); const words=arr.length; const uniq=new Set(arr.map(w=>w.toLowerCase())); const ttr=words? uniq.size/words:0; const miss=analyzeTextToMiss(text).length/Math.max(1,words); const conn=connectors.filter(c=>text.includes(c)).length; const det=detScore({words,miss,ttr,conn}); return { ts:Date.now(), type, words, missRate:miss, ttr, connectors:conn, detScore:det }; }
function renderSpark(scores){ const box=document.getElementById('sparkline'); box.innerHTML=""; if(scores.length===0){ box.textContent="No data yet."; return; } const w=600,h=70,p=6; const min=Math.min(...scores), max=Math.max(...scores); const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("width",w); svg.setAttribute("height",h); const pts=scores.map((s,i)=>{ const x=p+i*((w-2*p)/Math.max(scores.length-1,1)); const y=h-p-((s-min)/Math.max(max-min,1))*(h-2*p); return [x,y]; }); const d=pts.map((v,i)=>(i?'L':'M')+` ${v[0]} ${v[1]}`).join(' '); const path=document.createElementNS("http://www.w3.org/2000/svg","path"); path.setAttribute("d",d); path.setAttribute("fill","none"); path.setAttribute("stroke","currentColor"); path.setAttribute("stroke-width","2"); svg.appendChild(path); box.appendChild(svg); }
function renderHistory(){ const tb=document.querySelector('#historyTable tbody'); tb.innerHTML=""; const h=hist(); let sumW=0,sumS=0,c=0, cw=0, cs=0; h.forEach(x=>{ const tr=document.createElement('tr'); [new Date(x.ts).toLocaleString(), x.type, x.words??"", (x.missRate!=null? Math.round(x.missRate*100):""), (x.ttr!=null? x.ttr.toFixed(2):""), x.connectors??"", x.wpm??"", x.accuracy??"", x.detScore??""].forEach(v=>{ const td=document.createElement('td'); td.textContent=v; tr.appendChild(td); }); tb.appendChild(tr); if(x.wpm!=null){ sumW+=x.wpm; cw++; } if(x.detScore!=null){ sumS+=x.detScore; cs++; } c++; }); document.getElementById('sumSessions').textContent=c; document.getElementById('sumWPM').textContent=cw? Math.round(sumW/cw):0; document.getElementById('sumScore').textContent=cs? Math.round(sumS/cs):0; renderSpark(h.filter(x=>x.detScore!=null).map(x=>x.detScore)); }
document.getElementById('exportHistory').addEventListener('click',()=>{ const h=hist(); if(h.length===0) return alert('No history'); const header=["ts","type","words","missRate","ttr","connectors","wpm","accuracy","detScore"]; const rows=h.map(x=>[x.ts,x.type||'writing',x.words,x.missRate,x.ttr,x.connectors,x.wpm,x.accuracy,x.detScore]); const csv=[header.join(","), ...rows.map(r=>r.join(","))].join("\\n"); const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='history.csv'; a.click(); URL.revokeObjectURL(url); });

// init
if(loadK('miss',null)===null) saveK('miss',[]);
if(loadK('hist',null)===null) saveK('hist',[]);
ensurePrompt(); renderHistory();
