// --- Simple local storage helpers
const STORE_KEYS = {
  history: 'wb_history',
  writingText: 'wb_writing_text',
  promptText: 'wb_prompt',
  misspelled: 'wb_misspelled_words',
  imageDescs: 'wb_image_descs'
};

function saveLS(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function loadLS(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch{ return fallback; }}

// --- Tabs
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelector('#tab-'+btn.dataset.tab).classList.add('active');
    if(btn.dataset.tab==='progress'){ renderHistory(); }
  })
})

// --- Connectors
const connectors = [
  "First of all","In addition","Moreover","However","On the other hand","Therefore","As a result","For example",
  "For instance","In my opinion","In conclusion","To sum up","Although","Even though","Because","Since",
  "While","Whereas","Consequently","Furthermore","Overall","Besides","Specifically","In contrast","Similarly"
];
const connectorsBox = document.getElementById('connectors');
connectors.forEach(c=>{
  const chip = document.createElement('span');
  chip.className='badge'; chip.textContent = c;
  chip.title = "Click to insert";
  chip.addEventListener('click', ()=>{
    const ta = document.getElementById('writingArea');
    ta.value += (ta.value.endsWith(' ') || ta.value.length===0 ? '' : ' ') + c + ' ';
    updateWordCount();
    autoSave();
  });
  connectorsBox.appendChild(chip);
});

// --- Prompts
const samplePrompts = [
  "Describe a challenge you faced and how you overcame it.",
  "Do you prefer studying alone or with others? Explain with examples.",
  "What is a valuable skill you learned recently and why is it useful?",
  "Should schools require uniforms? Give reasons and examples.",
  "Explain a routine you follow every day and why it matters to you."
];
document.getElementById('loadSamplePrompt').addEventListener('click', ()=>{
  const p = samplePrompts[Math.floor(Math.random()*samplePrompts.length)];
  document.getElementById('promptInput').value = p;
  saveLS(STORE_KEYS.promptText, p);
});

// --- Writing area
const writingArea = document.getElementById('writingArea');
const promptInput = document.getElementById('promptInput');
writingArea.value = loadLS(STORE_KEYS.writingText, "");
promptInput.value = loadLS(STORE_KEYS.promptText, "");

function updateWordCount(){
  const words = writingArea.value.trim().split(/\s+/).filter(w=>w.length>0);
  document.getElementById('wordCount').textContent = "Words: " + (words.length || 0);
}
updateWordCount();

writingArea.addEventListener('input', ()=>{ updateWordCount(); autoSave(); });
promptInput.addEventListener('input', ()=> saveLS(STORE_KEYS.promptText, promptInput.value));
function autoSave(){ saveLS(STORE_KEYS.writingText, writingArea.value); }

// --- 30-min Timer
let timer=null, secs=1800;
const timerDisplay = document.getElementById('timerDisplay');
document.getElementById('startTimer').addEventListener('click', ()=>{
  if(timer) return;
  timer = setInterval(()=>{
    secs--; renderTimer();
    if(secs<=0){ clearInterval(timer); timer=null; alert("Time's up!"); }
  },1000);
});
document.getElementById('resetTimer').addEventListener('click', ()=>{
  if(timer){ clearInterval(timer); timer=null; }
  secs = 1800; renderTimer();
});
function renderTimer(){
  const m = Math.floor(secs/60).toString().padStart(2,'0');
  const s = (secs%60).toString().padStart(2,'0');
  timerDisplay.textContent = `${m}:${s}`;
}
renderTimer();

// --- Tiny dictionary (hint-only)
const tinyDict = new Set([
"the","be","to","of","and","a","in","that","have","I","it","for","not","on","with","he","as","you","do","at","this","but","his","by","from",
"they","we","say","her","she","or","an","will","my","one","all","would","there","their","what","so","up","out","if","about","who","get","which",
"go","me","when","make","can","like","time","no","just","him","know","take","people","into","year","your","good","some","could","them","see",
"other","than","then","now","look","only","come","its","over","think","also","back","after","use","two","how","our","work","first","well",
"way","even","new","want","because","any","these","give","day","most","us","important","example","result","however","although","since","while",
"conclusion","opinion","reason","support","learn","study","practice","english","writing","reading","listening","speaking","describe","routine",
"prefer","alone","together","skill","useful","explain","school","uniform","require","experience","challenge","overcome","improve","vocabulary",
"grammar","spelling","mistake","error","correct","connectors","therefore","moreover","furthermore","finally","overall","consequently","similar",
"different","contrast","compare","because","before","after","during","later","earlier","today","yesterday","tomorrow","always","usually","often",
"sometimes","rarely","never","positive","negative","advantage","disadvantage","benefit","problem","solution","cause","effect","reason","example"
]);

function analyzeWriting(){
  const text = writingArea.value;
  const words = text.split(/[\s,.;:!?()"']/).filter(w=>w.length>0);
  const unique = Array.from(new Set(words));
  const analysisBox = document.getElementById('analysis');
  analysisBox.innerHTML = "";

  const miss = [];
  const frag = document.createElement('div');
  unique.forEach(w=>{
    const base = w.toLowerCase();
    const clean = base.replace(/[^a-z]/g,'');
    if(!clean) return;
    const bad = !tinyDict.has(clean) && !/^\d+$/.test(clean) && clean.length>2;
    const span = document.createElement('span');
    span.className = 'word ' + (bad ? 'bad':'good');
    span.textContent = w;
    span.title = bad ? "Click to add to Spelling list" : "Click to remove from Spelling list";
    span.style.margin = "0 4px";
    span.addEventListener('click', ()=>toggleMisspelled(clean));
    frag.appendChild(span);
    if(bad) miss.push(clean);
  });

  const stats = document.createElement('div');
  stats.innerHTML = `<span class="badge">Unique words: ${unique.length}</span>
                     <span class="badge">Potential mistakes: ${miss.length}</span>`;

  analysisBox.appendChild(stats);
  analysisBox.appendChild(frag);

  const saved = new Set(loadLS(STORE_KEYS.misspelled, []));
  miss.forEach(m=> saved.add(m));
  saveLS(STORE_KEYS.misspelled, Array.from(saved));
  renderMisspelledList();
}

document.getElementById('finishAnalyze').addEventListener('click', analyzeWriting);
document.getElementById('clearWriting').addEventListener('click', ()=>{
  writingArea.value = ""; autoSave(); updateWordCount(); document.getElementById('analysis').innerHTML="";
});

function toggleMisspelled(word){
  const cur = new Set(loadLS(STORE_KEYS.misspelled, []));
  if(cur.has(word)) cur.delete(word); else cur.add(word);
  saveLS(STORE_KEYS.misspelled, Array.from(cur));
  renderMisspelledList();
}

// --- Spelling Trainer
function renderMisspelledList(){
  const list = document.getElementById('misspelledList');
  list.innerHTML = "";
  const arr = loadLS(STORE_KEYS.misspelled, []);
  if(arr.length===0){
    list.innerHTML = "<li>No words yet. Finish & Analyze your writing to collect mistakes.</li>";
    return;
  }
  arr.forEach(w=>{
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = w;
    const del = document.createElement('button');
    del.textContent = "Remove";
    del.addEventListener('click', ()=>{
      const set = new Set(loadLS(STORE_KEYS.misspelled, []));
      set.delete(w); saveLS(STORE_KEYS.misspelled, Array.from(set));
      renderMisspelledList();
    });
    li.appendChild(span); li.appendChild(del);
    list.appendChild(li);
  });
}
renderMisspelledList();

document.getElementById('clearMisspelled').addEventListener('click', ()=>{
  if(confirm("Clear your misspelled words list?")){ saveLS(STORE_KEYS.misspelled, []); renderMisspelledList(); }
});

let spIndex=-1, spPool=[];
document.getElementById('startSpelling').addEventListener('click', ()=>{
  spPool = loadLS(STORE_KEYS.misspelled, []);
  if(spPool.length===0){ alert("No words in your list."); return; }
  spIndex = -1;
  nextSpelling();
  document.getElementById('spellingFeedback').textContent="";
});
function nextSpelling(){
  if(spPool.length===0){ document.getElementById('spellingTarget').textContent="Add words first."; return; }
  spIndex = (spIndex+1)%spPool.length;
  document.getElementById('spellingTarget').textContent = "Type this word: " + spPool[spIndex];
  document.getElementById('spellingInput').value="";
  document.getElementById('spellingInput').focus();
}
document.getElementById('nextSpelling').addEventListener('click', nextSpelling);
document.getElementById('checkSpelling').addEventListener('click', ()=>{
  const target = spPool[spIndex] || "";
  const val = document.getElementById('spellingInput').value.trim();
  const fb = document.getElementById('spellingFeedback');
  if(val.toLowerCase() === target.toLowerCase()){
    fb.textContent = "✅ Correct!";
  }else{
    fb.textContent = "❌ Not yet. Try again.";
  }
});

// --- Typing Speed
const passages = [
  "Reading every day can transform your vocabulary and your ideas. Choose a topic you enjoy and read for ten minutes without stopping. Do not worry about unknown words. Try to guess their meaning from context and move on. Later, write a short summary to check your understanding.",
  "Many students think writing is only about grammar, but organization is equally important. Use clear paragraphs, linking words, and examples. When you finish your first draft, take a break. Then read again and edit for clarity and flow.",
  "Speaking with confidence is a skill that grows with practice. Record yourself answering a simple question for one minute. Listen carefully and note pronunciation problems. Repeat the exercise and try to reduce hesitation and filler words."
];
const passageSelect = document.getElementById('passageSelect');
passages.forEach((p,idx)=>{
  const opt = document.createElement('option');
  opt.value = idx; opt.textContent = "Passage " + (idx+1);
  passageSelect.appendChild(opt);
});

let typingTimer=null, typingLeft=60, targetText="";
document.getElementById('startTypingTest').addEventListener('click', ()=>{
  const idx = parseInt(passageSelect.value||"0");
  targetText = passages[idx];
  document.getElementById('typingText').textContent = targetText;
  const input = document.getElementById('typingInput');
  input.disabled = false; input.value="";
  typingLeft = 60; renderTypingTime();
  if(typingTimer) clearInterval(typingTimer);
  typingTimer = setInterval(()=>{
    typingLeft--; renderTypingTime();
    if(typingLeft<=0){ clearInterval(typingTimer); typingTimer=null; input.disabled=true; }
    updateTypingStats();
  },1000);
  updateTypingStats();
  input.focus();
});
document.getElementById('typingInput').addEventListener('input', updateTypingStats);
function renderTypingTime(){ document.getElementById('typingTime').textContent = typingLeft; }

function updateTypingStats(){
  const typed = document.getElementById('typingInput').value;
  const elapsed = 60-typingLeft; const minutes = Math.max(elapsed/60, 1/60);
  const wpm = Math.round((typed.length/5)/minutes);
  let correct=0;
  for(let i=0;i<typed.length && i<targetText.length;i++){
    if(typed[i]===targetText[i]) correct++;
  }
  const acc = typed.length>0 ? Math.round((correct/typed.length)*100) : 100;
  document.getElementById('wpm').textContent = wpm;
  document.getElementById('accuracy').textContent = acc+"%";
}

// --- Image description
let imgTimer=null, imgSecs=120;
const imgTimerDisplay = document.getElementById('imgTimerDisplay');
function renderImgTimer(){
  const m = Math.floor(imgSecs/60).toString().padStart(2,'0');
  const s = (imgSecs%60).toString().padStart(2,'0');
  imgTimerDisplay.textContent = `${m}:${s}`;
}
renderImgTimer();
document.getElementById('startImgTimer').addEventListener('click', ()=>{
  if(imgTimer) return;
  imgTimer = setInterval(()=>{
    imgSecs--; renderImgTimer();
    if(imgSecs<=0){ clearInterval(imgTimer); imgTimer=null; alert("Time's up!"); }
  },1000);
});
document.getElementById('resetImgTimer').addEventListener('click', ()=>{
  if(imgTimer){ clearInterval(imgTimer); imgTimer=null; }
  imgSecs = 120; renderImgTimer();
});
document.getElementById('imageDescription').addEventListener('input', ()=>{
  const words = document.getElementById('imageDescription').value.trim().split(/\s+/).filter(w=>w.length>0);
  document.getElementById('imgWordCount').textContent = "Words: " + (words.length || 0);
});

const imgEl = document.getElementById('practiceImage');
document.getElementById('randomImage').addEventListener('click', ()=>{
  const url = "https://picsum.photos/seed/"+Math.floor(Math.random()*99999)+"/600/400";
  imgEl.src = url;
});
document.getElementById('uploadImage').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = ()=>{ imgEl.src = reader.result; };
    reader.readAsDataURL(file);
  }
});

document.getElementById('saveImageDesc').addEventListener('click', ()=>{
  const entries = loadLS(STORE_KEYS.imageDescs, []);
  entries.push({ ts: Date.now(), desc: document.getElementById('imageDescription').value });
  saveLS(STORE_KEYS.imageDescs, entries);
  alert("Saved!");
});
document.getElementById('clearImageDesc').addEventListener('click', ()=>{
  document.getElementById('imageDescription').value = "";
  document.getElementById('imgWordCount').textContent = "Words: 0";
});

// --- Export / Import data
document.getElementById('exportData').addEventListener('click', ()=>{
  const data = {
    writingText: loadLS(STORE_KEYS.writingText, ""),
    promptText: loadLS(STORE_KEYS.promptText, ""),
    misspelled: loadLS(STORE_KEYS.misspelled, []),
    imageDescs: loadLS(STORE_KEYS.imageDescs, []),
    history: loadHistory()
  };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'writing_booster_data.json'; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importDataBtn').addEventListener('click', ()=>{
  document.getElementById('importDataFile').click();
});
document.getElementById('importDataFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const obj = JSON.parse(reader.result);
      if('writingText' in obj) saveLS(STORE_KEYS.writingText, obj.writingText);
      if('promptText' in obj) saveLS(STORE_KEYS.promptText, obj.promptText);
      if('misspelled' in obj) saveLS(STORE_KEYS.misspelled, obj.misspelled);
      if('imageDescs' in obj) saveLS(STORE_KEYS.imageDescs, obj.imageDescs);
      if('history' in obj) saveHistory(obj.history);
      writingArea.value = loadLS(STORE_KEYS.writingText, "");
      promptInput.value = loadLS(STORE_KEYS.promptText, "");
      updateWordCount();
      renderMisspelledList();
      renderHistory();
      alert("Imported!");
    }catch(err){
      alert("Invalid file.");
    }
  };
  reader.readAsText(file);
});

// --- History & Progress
function loadHistory(){ return loadLS(STORE_KEYS.history, []); }
function saveHistory(arr){ saveLS(STORE_KEYS.history, arr); }

function pushHistory(entry){
  const arr = loadHistory();
  arr.push(entry);
  saveHistory(arr);
}

function estimateDETWriting(metrics){
  const lengthScore = Math.min(metrics.words/80, 1);
  const ttrClamped = Math.max(0, Math.min(metrics.ttr, 1));
  const ttrScore = Math.max(0, (ttrClamped-0.25)/0.45);
  const conScore = Math.min(metrics.connectors/6, 1);
  const missScore = Math.max(0, 1 - (metrics.missRate/0.2));
  const composite = 0.3*lengthScore + 0.3*ttrScore + 0.2*conScore + 0.2*missScore;
  const det = Math.round(10 + composite * 150);
  return Math.max(10, Math.min(det, 160));
}

function renderSparkline(scores){
  const box = document.getElementById('sparkline');
  box.innerHTML = "";
  if(scores.length===0){ box.textContent = "No data yet."; return; }
  const w = 600, h = 70, pad=6;
  const min = Math.min(...scores), max = Math.max(...scores);
  const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("width", w); svg.setAttribute("height", h);
  const pathPts = scores.map((s,i)=>{
    const x = pad + i*( (w-2*pad) / Math.max(scores.length-1,1) );
    const y = h - pad - ( (s-min) / Math.max(max-min,1) ) * (h-2*pad);
    return [x,y];
  });
  const d = pathPts.map((p,i)=> (i===0?`M ${p[0]} ${p[1]}`:`L ${p[0]} ${p[1]}`)).join(" ");
  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", d);
  path.setAttribute("fill","none");
  path.setAttribute("stroke","currentColor");
  path.setAttribute("stroke-width","2");
  svg.appendChild(path);
  box.appendChild(svg);
}

function renderHistory(){
  const tbody = document.querySelector('#historyTable tbody');
  const hist = loadHistory();
  tbody.innerHTML = "";
  let sumWPM=0, sumScore=0, count=0, wpmCount=0, scoreCount=0;
  hist.forEach(h=>{
    const tr = document.createElement('tr');
    const cells = [
      new Date(h.ts).toLocaleString(),
      h.words ?? "",
      (h.missRate!=null ? Math.round(h.missRate*100) : "") ,
      (h.ttr!=null ? h.ttr.toFixed(2) : ""),
      h.connectors ?? "",
      h.wpm ?? "",
      h.accuracy ?? "",
      h.detScore ?? ""
    ];
    cells.forEach(c=>{ const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); });
    tbody.appendChild(tr);
    if(h.wpm!=null){ sumWPM += h.wpm; wpmCount++; }
    if(h.detScore!=null){ sumScore += h.detScore; scoreCount++; }
    count++;
  });
  document.getElementById('sumSessions').textContent = count;
  document.getElementById('sumWPM').textContent = (wpmCount? Math.round(sumWPM/wpmCount) : 0);
  document.getElementById('sumScore').textContent = (scoreCount? Math.round(sumScore/scoreCount) : 0);
  const scores = hist.filter(h=>h.detScore!=null).map(h=>h.detScore);
  renderSparkline(scores);
}

document.addEventListener('click', (e)=>{
  if(e.target && e.target.id==='exportHistory'){
    const hist = loadHistory();
    if(hist.length===0){ alert("No history."); return; }
    const header = ["ts","words","missRate","ttr","connectors","wpm","accuracy","detScore"];
    const rows = hist.map(h=>[h.ts,h.words,h.missRate,h.ttr,h.connectors,h.wpm,h.accuracy,h.detScore]);
    const csv = [header.join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='history.csv'; a.click();
    URL.revokeObjectURL(url);
  }
});

// Hook analyze: compute metrics + save
const oldAnalyze = analyzeWriting;
analyzeWriting = function(){
  oldAnalyze();
  const text = document.getElementById('writingArea').value;
  const wordsArr = text.trim().split(/\s+/).filter(w=>w.length>0);
  const words = wordsArr.length;
  const analysis = document.getElementById('analysis');
  const bads = analysis.querySelectorAll('.word.bad');
  const missRate = (bads.length>0 && words>0)? Math.min(1, bads.length / words) : 0;
  const uniq = new Set(wordsArr.map(w=>w.toLowerCase()));
  const ttr = words>0 ? uniq.size/words : 0;
  const usedConnectors = connectors.filter(c => text.includes(c)).length;
  const detScore = estimateDETWriting({words, missRate, ttr, connectors: usedConnectors});
  const box = document.getElementById('analysis');
  const sum = document.createElement('div');
  sum.innerHTML = `<div class="badge">DET Writing (est.): ${detScore}</div>
                   <div class="badge">Length: ${words}</div>
                   <div class="badge">Miss%: ${Math.round(missRate*100)}%</div>
                   <div class="badge">TTR: ${ttr.toFixed(2)}</div>
                   <div class="badge">Connectors: ${usedConnectors}</div>`;
  box.prepend(sum);
  pushHistory({ ts: Date.now(), words, missRate, ttr, connectors: usedConnectors, detScore });
  renderHistory();
};

// Hook typing end
const oldTypingUpdate = updateTypingStats;
updateTypingStats = function(){
  oldTypingUpdate();
  const left = parseInt(document.getElementById('typingTime').textContent || "0");
  if(left===0 && !updateTypingStats._logged){
    updateTypingStats._logged = true;
    const wpm = parseInt(document.getElementById('wpm').textContent || "0");
    const accuracy = parseInt((document.getElementById('accuracy').textContent || "0").replace('%',''));
    pushHistory({ ts: Date.now(), wpm, accuracy });
    renderHistory();
    setTimeout(()=>{ updateTypingStats._logged=false; }, 1500);
  }
};

document.addEventListener('DOMContentLoaded', renderHistory);
