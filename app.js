// ====== Config ======
const WORKER_URL = "https://ted-captions.YOUR_SUBDOMAIN.workers.dev"; // set after deploy

// ====== IndexedDB wrapper ======
const DB_NAME="wb35pro", DB_VER=1;
let dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise((res,rej)=>{ const r=indexedDB.open(DB_NAME,DB_VER);
  r.onupgradeneeded=e=>{ const d=e.target.result;
    if(!d.objectStoreNames.contains("kv")) d.createObjectStore("kv");
    if(!d.objectStoreNames.contains("history")) d.createObjectStore("history",{keyPath:"ts"});
    if(!d.objectStoreNames.contains("srs")) d.createObjectStore("srs",{keyPath:"word"});
  };
  r.onsuccess=e=>res(e.target.result); r.onerror=e=>rej(e.target.error);
}); return dbp;}
async function kvGet(k){ const d=await db(); return new Promise((res,rej)=>{ const t=d.transaction("kv","readonly").objectStore("kv").get(k); t.onsuccess=()=>res(t.result); t.onerror=()=>rej(t.error); }); }
async function kvSet(k,v){ const d=await db(); return new Promise((res,rej)=>{ const t=d.transaction("kv","readwrite").objectStore("kv").put(v,k); t.onsuccess=()=>res(); t.onerror=()=>rej(t.error); }); }
async function histAll(){ const d=await db(); return new Promise((res,rej)=>{ const out=[]; const c=d.transaction("history","readonly").objectStore("history").openCursor(); c.onsuccess=e=>{ const cur=e.target.result; if(cur){ out.push(cur.value); cur.continue(); } else res(out); }; c.onerror=()=>rej(c.error); }); }
async function histAdd(item){ const d=await db(); return new Promise((res,rej)=>{ const t=d.transaction("history","readwrite").objectStore("history").put(item); t.onsuccess=()=>res(); t.onerror=()=>rej(t.error); }); }
async function srsAll(){ const d=await db(); return new Promise((res,rej)=>{ const t=d.transaction("srs","readonly").objectStore("srs").getAll(); t.onsuccess=()=>res(t.result||[]); t.onerror=()=>rej(t.error); }); }
async function srsPut(x){ const d=await db(); return new Promise((res,rej)=>{ const t=d.transaction("srs","readwrite").objectStore("srs").put(x); t.onsuccess=()=>res(); t.onerror=()=>rej(t.error); }); }
async function srsDelete(w){ const d=await db(); return new Promise((res,rej)=>{ const t=d.transaction("srs","readwrite").objectStore("srs").delete(w); t.onsuccess=()=>res(); t.onerror=()=>rej(t.error); }); }

// ====== User ======
let currentUser="guest"; const userBadge=document.getElementById("userBadge");
function refreshUser(){ userBadge.textContent=currentUser; }
document.getElementById("btnSignin").addEventListener("click",()=>document.getElementById("auth").showModal());
document.getElementById("closeSignin").addEventListener("click",()=>document.getElementById("auth").close());
document.getElementById("doSignin").addEventListener("click",async ()=>{ const v=document.getElementById("username").value.trim().toLowerCase(); if(!v) return; currentUser=v; refreshUser(); document.getElementById("auth").close(); await kvSet("user",v); });
(async ()=>{ const u=await kvGet("user"); if(u){ currentUser=u; refreshUser(); }})();

// ====== Tabs ======
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.getElementById("tab-"+b.dataset.tab).classList.add("active");
  if(b.dataset.tab==="progress") renderProgress();
  if(b.dataset.tab==="spelling") renderSRS();
}));

// ====== CEFR texts ======
const CEFR={
  A1:[ "My name is Sara. I live with my family in a small house near the river. Every morning I wake up early, make tea, and walk to work. I like reading simple stories in English and learning new words.",
       "This is my friend Ali. He has a bike and rides it to school. After class we play football in the park. On the weekend we visit our grandparents and cook dinner together." ],
  A2:[ "Last year I moved to a new city to start a different job. At first I felt nervous because I did not know anyone. I explored the streets, found a cozy cafe, and slowly built a routine that helped me feel at home.",
       "Learning a language takes patience. I watch short videos with subtitles and repeat the sentences out loud. When I make mistakes, I write them down and practice the correct spelling." ],
  B1:[ "Many people believe that success depends only on talent, but consistent effort often matters more. When we practice a little every day, we build habits that make difficult tasks feel easier over time.",
       "Public transport can reduce traffic and pollution if it is reliable. Cities should invest in safe buses and clean stations so more people will choose to leave their cars at home." ],
  B2:[ "Technology has changed the way we communicate. Messages travel instantly, yet misunderstandings still occur. To write clearly, we need structure, examples, and transitions that guide the reader from one idea to the next.",
       "Group projects can be frustrating when responsibilities are unclear. Setting a shared goal, agreeing on deadlines, and reviewing progress weekly can turn a messy team into an effective one." ],
  C1:[ "When resources are limited, prioritization becomes a leadership test. The best managers communicate trade‑offs transparently, invite feedback, and document the reasoning behind each decision to maintain trust.",
       "Curiosity drives innovation. Teams that ask precise questions and test small hypotheses learn faster than those who pursue grand plans without evidence." ],
  C2:[ "Democracies depend on citizens who can evaluate claims critically. Rather than accepting confident opinions, we should examine assumptions, compare sources, and update our views when the facts demand it.",
       "In complex systems, outcomes emerge from many small interactions. Improving such systems requires iterative changes, careful measurement, and a willingness to reverse course when results contradict expectations." ]
};
const TOPICS={
  General:["Hobbies and routines","Travel memories","Learning languages"],
  Academic:["Education systems","Environmental policy","History and culture"],
  Tech:["Mobile apps","Cybersecurity basics","Future of AI"]
};

// ====== Helpers ======
function tts(text){ if(!window.speechSynthesis) return alert("No speechSynthesis"); const u=new SpeechSynthesisUtterance(text); u.lang="en-US"; u.rate=0.95; speechSynthesis.cancel(); speechSynthesis.speak(u); }
function norm(t){ return t.toLowerCase().replace(/\u00A0/g," ").replace(/[“”‘’]/g,"'").replace(/[^a-z\s]/g,"").replace(/\s+/g," ").trim(); }
function toks(t){ const n=norm(t); return n? n.split(" ") : []; }
function lcs(a,b){ const m=a.length,n=b.length; const dp=Array.from({length:m+1},()=>Array(n+1).fill(0)); for(let i=1;i<=m;i++){ for(let j=1;j<=n;j++){ dp[i][j]=a[i-1]===b[j-1]? dp[i-1][j-1]+1 : Math.max(dp[i-1][j],dp[i][j-1]); } } let i=m,j=n,ok=[]; while(i>0&&j>0){ if(a[i-1]===b[j-1]){ ok.push(a[i-1]); i--; j--; } else if(dp[i-1][j]>=dp[i][j-1]) i--; else j--; } ok.reverse(); return {count:ok.length,set:new Set(ok)}; }
function diffWords(ref,typed){ const A=toks(ref), B=toks(typed); const {count,set}=lcs(A,B); const miss=B.filter(w=>!set.has(w)); const acc=Math.max(0,Math.round((count/Math.max(A.length,1))*100)); return {accuracy:acc, miss:[...new Set(miss)]}; }
function toClock(s){ const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=Math.floor(s%60); return (h>0?`${String(h).padStart(2,"0")}:`:"")+`${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; }
function toSec(ts){ const p=ts.split(":").map(Number); return p.length===3? p[0]*3600+p[1]*60+p[2] : p[0]*60+p[1]; }
function parseTranscript(raw){ const lines=raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); const re=/^\[?(\d{1,2}:)?\d{1,2}:\d{2}\]?/; let last=0; const items=[]; for(const line of lines){ const m=line.match(re); if(m){ const sec=toSec(m[0].replace(/[\[\]]/g,"")); const text=line.slice(m[0].length).trim(); items.push({t:sec,text}); last=sec; } else { last+=3; items.push({t:last,text:line}); } } return items; }
function pickClip(items){ const min=15,max=30; for(let k=0;k<120;k++){ const i=Math.floor(Math.random()*Math.max(1,items.length-1)); let start=items[i].t, text=items[i].text, j=i+1; while(j<items.length && (items[j].t-start)<max){ text+=" "+items[j].text; if((items[j].t-start)>=min) break; j++; } const end=j<items.length? items[j].t : start+min; if(end-start>=min && end-start<=max) return {start,end,text:text.replace(/\s+/g," ").trim()}; } const all=items.map(it=>it.text).join(" "); const w=all.split(/\s+/).length; return {start:null,end:null,text:all.slice(0, Math.min(w,60))}; }

// ====== Dictation (CEFR + TED) ======
const dcLevel=document.getElementById("dcLevel"), dcVariant=document.getElementById("dcVariant");
function loadVariants(){ const L=dcLevel.value; dcVariant.innerHTML=""; CEFR[L].forEach((t,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=`${L} #${i+1}`; dcVariant.appendChild(o); }); }
loadVariants(); dcLevel.addEventListener("change", loadVariants);
let dcRef = CEFR.A1[0], clip=null;
document.getElementById("dcPlay").addEventListener("click",()=>{ dcRef = CEFR[dcLevel.value][parseInt(dcVariant.value||"0")]; tts(dcRef); });
document.getElementById("dcUse").addEventListener("click",()=>{ dcRef = CEFR[dcLevel.value][parseInt(dcVariant.value||"0")]; alert("Selected text set for checking."); });

const TED_IDS=["Ks-_Mh1QhMc","G4N8bzG5R0I","bTqVqk7FSmY","JxHGwO6Z2fM","Q4KK3ZQO5-w"]; // add more if you like
const ytWrap=document.getElementById("ytWrap"), tedText=document.getElementById("tedText"), tedInfo=document.getElementById("tedInfo");
function loadTED(id,start=0){ const ifr=document.createElement("iframe"); ifr.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"; ifr.src=`https://www.youtube.com/embed/${id}?start=${start}`; ytWrap.innerHTML=""; ytWrap.appendChild(ifr); ytWrap.dataset.videoId=id; }
document.getElementById("tedLoad").addEventListener("click",()=> loadTED(TED_IDS[Math.floor(Math.random()*TED_IDS.length)], Math.floor(Math.random()*180)));
document.getElementById("tedRandomStart").addEventListener("click",()=>{ const id=ytWrap.dataset.videoId || TED_IDS[0]; loadTED(id, Math.floor(Math.random()*240)); });
document.getElementById("tedFetch").addEventListener("click",async ()=>{
  const id=ytWrap.dataset.videoId; if(!id) return alert("Load a TED video first.");
  if(!WORKER_URL.includes("workers.dev")) return alert("Set WORKER_URL at top of app.js after deploying the Worker.");
  try{
    const r=await fetch(`${WORKER_URL}?videoId=${encodeURIComponent(id)}&lang=en`);
    const data=await r.json();
    if(!data.items || data.items.length===0) return alert("No captions found.");
    const lines=data.items.map(it=>`[${toClock(it.t)}] ${it.text}`);
    tedText.value = lines.join("\n");
    alert("Captions fetched. Pick a clip.");
  }catch(e){ alert("Fetch failed."); }
});
document.getElementById("tedPick").addEventListener("click",()=>{
  const raw=(tedText.value||"").trim(); if(!raw) return alert("Transcript empty.");
  const items=parseTranscript(raw); const c=pickClip(items); if(!c) return alert("Could not pick clip.");
  clip=c; dcRef=c.text; tedInfo.textContent=`Clip: ${c.text.slice(0,120)}... ${c.start!=null?`[${c.start}s→${c.end}s]`:"[TTS]"}`;
  const id=ytWrap.dataset.videoId; if(id && c.start!=null){ const ifr=document.createElement("iframe"); ifr.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"; ifr.src=`https://www.youtube.com/embed/${id}?start=${c.start}&end=${c.end}`; ytWrap.innerHTML=""; ytWrap.appendChild(ifr); }
});
document.getElementById("tedClipTTS").addEventListener("click",()=>{ if(!clip) return alert("Pick a clip first."); tts(clip.text); });
document.getElementById("tedUse").addEventListener("click",()=>{ const t=(tedText.value||"").trim(); if(!t) return alert("Transcript empty."); dcRef=t; alert("Transcript set for checking."); });

document.getElementById("dcCheck").addEventListener("click",async ()=>{
  const typed=(document.getElementById("dcInput").value||"").trim();
  const res=diffWords(dcRef, typed);
  await srsIngest(res.miss); // add to SRS
  document.getElementById("dcFeedback").innerHTML = `Accuracy: <b>${res.accuracy}%</b> • Misspelled: ${res.miss.join(", ")||"None"}`;
  await histAdd({ ts:Date.now(), user:currentUser, type:"dictation", words:(typed.match(/\S+/g)||[]).length, accuracy:res.accuracy });
  renderProgress();
});
document.getElementById("dcClear").addEventListener("click",()=>{ document.getElementById("dcInput").value=""; document.getElementById("dcFeedback").textContent=""; });

// ====== Typing ======
const tpLevel=document.getElementById("tpLevel"), tpTopic=document.getElementById("tpTopic"), tpLen=document.getElementById("tpLen"), tpTime=document.getElementById("tpTime");
const tpText=document.getElementById("tpText"), tpInput=document.getElementById("tpInput"), tpLeft=document.getElementById("tpLeft"), tpWpm=document.getElementById("tpWpm"), tpAcc=document.getElementById("tpAcc");
let tpTimer=null, tpSecs=60, tpTarget="";
function pickTyping(level, topic, length){
  const base = CEFR[level][Math.floor(Math.random()*CEFR[level].length)];
  const addon = ` ${TOPICS[topic][Math.floor(Math.random()*TOPICS[topic].length)]}.`;
  const mul = length==="short"?1 : (length==="med"?2:3);
  return (base+addon+" ").repeat(mul).trim();
}
document.getElementById("tpStart").addEventListener("click",()=>{
  tpTarget = pickTyping(tpLevel.value, tpTopic.value, tpLen.value);
  tpText.textContent = tpTarget; tpInput.value=""; tpInput.disabled=false; tpInput.focus();
  tpSecs = parseInt(tpTime.value||"60"); tpLeft.textContent = tpSecs;
  if(tpTimer) clearInterval(tpTimer);
  tpTimer = setInterval(()=>{ tpSecs--; tpLeft.textContent=tpSecs; if(tpSecs<=0){ clearInterval(tpTimer); tpTimer=null; tpInput.disabled=true; const wpm=parseInt(tpWpm.textContent||"0"); const acc=parseInt((tpAcc.textContent||"0").replace("%","")); histAdd({ts:Date.now(), user:currentUser, type:"typing", wpm, accuracy:acc}); renderProgress(); } updateTypingStats(); }, 1000);
  updateTypingStats();
});
tpInput.addEventListener("input", updateTypingStats);
function updateTypingStats(){
  const typed=tpInput.value;
  const total=parseInt(tpTime.value||"60");
  const passed = total - tpSecs; const minutes = Math.max(passed/60, 1/60);
  const wpm = Math.round((typed.length/5)/minutes);
  let ok=0; for(let i=0;i<typed.length && i<tpTarget.length;i++){ if(typed[i]===tpTarget[i]) ok++; }
  const acc = typed.length? Math.round((ok/typed.length)*100) : 100;
  tpWpm.textContent = wpm; tpAcc.textContent = acc+"%";
}

// ====== Writing (evaluation + CEFR/DET) ======
const wrPrompt=document.getElementById("wrPrompt"), wrConn=document.getElementById("wrConn"), wrMin=document.getElementById("wrMin");
const wrStart=document.getElementById("wrStart"), wrReset=document.getElementById("wrReset"), wrClock=document.getElementById("wrClock");
const wrText=document.getElementById("wrText"), wrTarget=document.getElementById("wrTarget"), wrCount=document.getElementById("wrCount"), wrReport=document.getElementById("wrReport");
const CONNECTORS=["First of all","In addition","Moreover","However","On the other hand","Therefore","As a result","For example","For instance","In my opinion","In conclusion","To sum up","Although","Even though","Because","Since","While","Whereas","Consequently","Furthermore","Overall","Besides","Specifically","In contrast","Similarly"];
CONNECTORS.forEach(c=>{ const chip=document.createElement("span"); chip.className="chip"; chip.textContent=c; chip.title="Insert"; chip.addEventListener("click",()=>{ wrText.value+=(wrText.value.endsWith(" ")||!wrText.value?"":" ")+c+" "; wordCount(); }); wrConn.appendChild(chip); });
const PROMPTS=["Describe a challenge you faced and how you overcame it.","Do you prefer studying alone or with others? Explain with examples.","What is a valuable skill you learned recently and why is it useful?","Should schools require uniforms? Give reasons and examples.","Explain a routine you follow every day and why it matters to you.","Describe a place you would like to visit and why."];
if(!wrPrompt.value.trim()){ wrPrompt.value = PROMPTS[Math.floor(Math.random()*PROMPTS.length)]; }
function wordCount(){ wrCount.textContent = (wrText.value.trim().match(/\S+/g)||[]).length; } wordCount(); wrText.addEventListener("input", wordCount);
let wTimer=null, wSecs=5*60;
function renderW(){ const m=String(Math.floor(wSecs/60)).padStart(2,"0"); const s=String(wSecs%60).padStart(2,"0"); wrClock.textContent=`${m}:${s}`; }
function setW(){ wSecs=parseInt(wrMin.value||"5")*60; renderW(); } setW();
wrStart.addEventListener("click",()=>{ if(wTimer) return; wTimer=setInterval(()=>{ wSecs--; renderW(); if(wSecs<=0){ clearInterval(wTimer); wTimer=null; alert("Time's up!"); } },1000); });
wrReset.addEventListener("click",()=>{ if(wTimer){ clearInterval(wTimer); wTimer=null; } setW(); });
document.getElementById("wrAnalyze").addEventListener("click", async ()=>{
  const text = wrText.value.trim(); if(!text) return alert("Write something first.");
  const target = parseInt(wrTarget.value||"180");
  const words = (text.match(/\S+/g)||[]).length;
  const uniq = new Set(text.toLowerCase().match(/[a-z]+/g)||[]);
  const ttr = words? uniq.size/words : 0;
  const connectors = CONNECTORS.filter(c=>text.includes(c)).length;
  const longSentences = (text.match(/[^.!?]{140,}[.!?]/g)||[]).length;
  const miss = extractMisspellings(text);
  const missRate = miss.length / Math.max(1, words);

  const rubric = {
    length: Math.min(words/target, 1),
    cohesion: Math.min(connectors/6, 1),
    variety: Math.max(0, Math.min((ttr-0.28)/0.4, 1)),
    grammar: Math.max(0, 1 - Math.min(missRate/0.18, 1)),
    clarity: Math.max(0, 1 - Math.min(longSentences/3, 1))
  };
  const detRaw = 0.3*rubric.length + 0.2*rubric.cohesion + 0.2*rubric.variety + 0.2*rubric.grammar + 0.1*rubric.clarity;
  const det = Math.max(10, Math.min(160, Math.round(10 + detRaw * 150)));
  const cefr = det<45?"A1": det<70?"A2": det<95?"B1": det<120?"B2": det<140?"C1":"C2";

  await srsIngest(miss); // add misspellings to SRS
  await histAdd({ ts:Date.now(), user:currentUser, type:"writing", words, missRate, ttr, connectors, detScore:det });

  wrReport.innerHTML = `<p><b>DET:</b> <span class="${det>=105?'good':''}">${det}</span> • <b>CEFR:</b> ${cefr}</p>
  <p>Rubric — length ${(rubric.length*100|0)}%, cohesion ${(rubric.cohesion*100|0)}%, variety ${(rubric.variety*100|0)}%, grammar ${(rubric.grammar*100|0)}%, clarity ${(rubric.clarity*100|0)}%</p>
  <p>Potential issues: ${miss.slice(0,15).join(", ")||"None"}${miss.length>15? " …":""}</p>`;
  renderProgress();
});
document.getElementById("wrClear").addEventListener("click",()=>{ wrText.value=""; wordCount(); wrReport.textContent=""; });

function extractMisspellings(text){
  const basic = new Set("the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over".split(" "));
  const words = (text.toLowerCase().match(/[a-z]+/g)||[]);
  const uniq = [...new Set(words)];
  const miss = [];
  uniq.forEach(w=>{
    if(w.length<=2) return;
    if(!basic.has(w) && !/^\d+$/.test(w)){
      if(/(.)\1\1/.test(w) || w==="teh" || w==="becuz") miss.push(w);
      else miss.push(w);
    }
  });
  return miss;
}

// ====== SRS (Today/3d/7d via SM2-lite) ======
async function srsIngest(words){
  const today = new Date(); today.setHours(0,0,0,0); const t0 = today.getTime();
  for(const w of words){ const word=w.toLowerCase(); if(!word) continue;
    const all = await srsAll(); const ex = all.find(x=>x.word===word);
    if(!ex){ await srsPut({ word, due:t0, interval:0, ease:2.3, history:[] }); }
  }
  renderSRS();
}
async function renderSRS(){
  const all = await srsAll(); const now=new Date(); now.setHours(0,0,0,0); const t0=now.getTime();
  const today = all.filter(x=> (x.due||0) <= t0).sort((a,b)=>a.word.localeCompare(b.word));
  const ulT=document.getElementById("srsToday"); ulT.innerHTML = today.length? "" : "<li>Nothing due.</li>";
  today.forEach(x=>{ const li=document.createElement("li"); li.textContent=x.word; ulT.appendChild(li); });
  const ulA=document.getElementById("srsAll"); ulA.innerHTML = "";
  all.sort((a,b)=>a.word.localeCompare(b.word)).forEach(x=>{
    const li=document.createElement("li"); li.textContent=`${x.word} — due ${new Date(x.due||t0).toLocaleDateString()}`;
    const del=document.createElement("button"); del.textContent="Remove"; del.addEventListener("click",async ()=>{ await srsDelete(x.word); renderSRS(); });
    li.appendChild(del); ulA.appendChild(li);
  });
}
document.getElementById("srsStart").addEventListener("click",async ()=>{
  const all = await srsAll(); const now=new Date(); now.setHours(0,0,0,0); const t0=now.getTime();
  const today = all.filter(x=> (x.due||0) <= t0);
  if(today.length===0) return alert("Nothing due today.");
  let i=0;
  async function next(){ if(i>=today.length){ alert("Session done!"); renderSRS(); return; }
    const item=today[i++]; const w=item.word;
    const say=`${w}. Example: I will remember the spelling of ${w}.`; tts(say);
    const ans = prompt(`Type the word you heard: ${w[0]} _ _ ...`,"");
    const ok = (ans||"").trim().toLowerCase()===w.toLowerCase();
    item.history.push({ts:Date.now(),ok});
    if(ok){ item.interval = item.interval===0? 1 : item.interval===1? 3 : Math.round(item.interval*item.ease); item.due = t0 + item.interval*24*3600*1000; item.ease = Math.min(2.6, item.ease+0.05); }
    else { item.interval = 0; item.due = t0; item.ease = Math.max(1.7, item.ease-0.2); }
    await srsPut(item); next();
  } next();
});
document.getElementById("srsExport").addEventListener("click", async ()=>{
  const all=await srsAll(); const text = all.map(x=>x.word).join("\n"); const blob=new Blob([text],{type:"text/plain"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="spelling_words.txt"; a.click(); URL.revokeObjectURL(url);
});
document.getElementById("srsClear").addEventListener("click", async ()=>{
  if(!confirm("Clear all SRS words?")) return;
  const d=await db(); const tx=d.transaction("srs","readwrite").objectStore("srs").clear(); tx.onsuccess=()=>renderSRS();
});

// ====== Images (1:00) ======
let imgTimer=null, imgSecs=60; const imgClock=document.getElementById("imgClock");
function renderImg(){ const m=String(Math.floor(imgSecs/60)).padStart(2,"0"); const s=String(imgSecs%60).padStart(2,"0"); imgClock.textContent=`${m}:${s}`; } renderImg();
document.getElementById("imgStart").addEventListener("click",()=>{ if(imgTimer) return; imgTimer=setInterval(()=>{ imgSecs--; renderImg(); if(imgSecs<=0){ clearInterval(imgTimer); imgTimer=null; alert("Time's up!"); } },1000); });
document.getElementById("imgReset").addEventListener("click",()=>{ if(imgTimer){ clearInterval(imgTimer); imgTimer=null; } imgSecs=60; renderImg(); });
document.getElementById("imgText").addEventListener("input",()=>{ document.getElementById("imgCount").textContent=(document.getElementById("imgText").value.trim().match(/\S+/g)||[]).length; });
document.getElementById("imgRandom").addEventListener("click",()=>{ document.getElementById("imgView").src="https://picsum.photos/seed/"+Math.floor(Math.random()*99999)+"/640/420"; });
document.getElementById("imgUpload").addEventListener("change",e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=> document.getElementById("imgView").src=r.result; r.readAsDataURL(f); });
document.getElementById("imgSave").addEventListener("click", async ()=>{
  const text=document.getElementById("imgText").value; const words=(text.match(/\S+/g)||[]).length; const miss=extractMisspellings(text); await srsIngest(miss); await histAdd({ ts:Date.now(), user:currentUser, type:"image", words, missRate:miss.length/Math.max(1,words) }); document.getElementById("imgReport").textContent=`Saved. ${miss.length} potential mistakes.`; });
document.getElementById("imgClear").addEventListener("click",()=>{ document.getElementById("imgText").value=""; document.getElementById("imgCount").textContent="0"; document.getElementById("imgReport").textContent=""; });

// ====== Progress ======
async function renderProgress(){
  const hist = (await histAll()).sort((a,b)=>a.ts-b.ts);
  const tb=document.querySelector("#pgTable tbody"); tb.innerHTML="";
  let sumWpm=0,wc=0,sumDet=0,dc=0;
  hist.forEach(h=>{
    const tr=document.createElement("tr");
    [new Date(h.ts).toLocaleString(), h.type||"", h.words??"", h.missRate!=null? Math.round(h.missRate*100):"", h.ttr!=null? h.ttr.toFixed(2):"", h.connectors??"", h.wpm??"", h.accuracy??"", h.detScore??""].forEach(v=>{ const td=document.createElement("td"); td.textContent=v; tr.appendChild(td); });
    tb.appendChild(tr);
    if(h.wpm!=null){ sumWpm+=h.wpm; wc++; }
    if(h.detScore!=null){ sumDet+=h.detScore; dc++; }
  });
  document.getElementById("pgSessions").textContent = hist.length;
  document.getElementById("pgWpm").textContent = wc? Math.round(sumWpm/wc) : 0;
  document.getElementById("pgDet").textContent = dc? Math.round(sumDet/dc) : 0;

  const scores = hist.filter(x=>x.detScore!=null).map(x=>x.detScore);
  const box = document.getElementById("pgSpark"); box.innerHTML="";
  if(scores.length===0){ box.textContent="No data yet."; return; }
  const w=600,h=70,p=6; const min=Math.min(...scores), max=Math.max(...scores);
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("width",w); svg.setAttribute("height",h);
  let path=""; scores.forEach((s,i)=>{ const x=p+i*((w-2*p)/Math.max(scores.length-1,1)); const y=h-p-((s-min)/Math.max(max-min,1))*(h-2*p); path+= (i===0?`M${x},${y}`:` L${x},${y}`); });
  const line=document.createElementNS("http://www.w3.org/2000/svg","path"); line.setAttribute("d",path); line.setAttribute("fill","none"); line.setAttribute("stroke","white"); line.setAttribute("stroke-width","2");
  svg.appendChild(line); box.appendChild(svg);
}
renderProgress();
document.getElementById("pgExport").addEventListener("click",async ()=>{
  const hist=(await histAll()).sort((a,b)=>a.ts-b.ts);
  const header=["ts","type","words","missRate","ttr","connectors","wpm","accuracy","detScore"];
  const rows=hist.map(h=>[h.ts,h.type||"",h.words||"",h.missRate||"",h.ttr||"",h.connectors||"",h.wpm||"",h.accuracy||"",h.detScore||""]);
  const csv=[header.join(","), ...rows.map(r=>r.join(","))].join("\n");
  const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="progress.csv"; a.click(); URL.revokeObjectURL(url);
});
document.getElementById("pgImport").addEventListener("click",()=> document.getElementById("pgFile").click());
document.getElementById("pgFile").addEventListener("change",async e=>{
  const f=e.target.files[0]; if(!f) return; const text=await f.text(); const lines=text.trim().split(/\r?\n/); lines.shift();
  for(const line of lines){ const [ts,type,words,missRate,ttr,connectors,wpm,accuracy,detScore]=line.split(","); await histAdd({ ts:Number(ts), type, words:Number(words||0), missRate:Number(missRate||0), ttr:Number(ttr||0), connectors:Number(connectors||0), wpm:Number(wpm||0), accuracy:Number((accuracy||"").replace("%","")), detScore:Number(detScore||0) }); }
  renderProgress();
});

// ====== PWA ======
if("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js"); }
