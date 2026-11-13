'use strict';
// 影之居酒屋：共用核心。2.5D 與 3D 兩個版本用同一套引擎，只差鏡頭與場地寬度。
const IS3D = window.MODE === '3d';
// 觸控裝置（手機、平板）：顯示虛擬搖桿與按鈕，並降低畫質負擔
const TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window || /[?&]touch=1/.test(location.search);
if (TOUCH) document.body.classList.add('touch');
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t) => a + (b-a)*t;
const rand = (a,b) => a + Math.random()*(b-a);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const PI = Math.PI;
const adiff = (a,b) => { let d = (a-b) % (2*PI); if (d > PI) d -= 2*PI; if (d < -PI) d += 2*PI; return d; };

// 場地尺寸：3D 是兩側都有牆的大廳；2.5D 只有後牆，前方敞開給鏡頭
const XA = IS3D ? -2 : -6, EDGE = IS3D ? 7 : 3.5, ZMIN = IS3D ? -6.4 : -2.6, ZMAX = IS3D ? 6.4 : 2.4, SIDES = IS3D ? [-1,1] : [-1];

// ───────────────────────── 介面骨架 ─────────────────────────
document.body.insertAdjacentHTML('beforeend', `
<canvas id="c"></canvas>
<div id="hud">
  <div id="grade"></div><div id="vignette"></div><div id="veil"></div><div id="vig"></div><div id="lines"></div>
  <div class="barx" id="barT"></div><div class="barx" id="barB"></div>
  <div id="tl"></div>
  <div id="tr"><div id="stage"></div><div id="time">00:00.0</div><div id="score">000000</div><div id="combo"></div></div>
  <div id="hint"></div>
  <div id="go">${IS3D ? '▲ 前進' : '進 ▶'}</div>
  <div id="boss"><span id="bossName"></span><div class="bar"><i id="bhp"></i></div></div>
  <div id="beat"><span class="m"></span><span class="m"></span><span class="m"></span><span class="m"></span><div id="ring"></div><div id="drum">鼓</div></div>
  <div id="banner"><small id="banS"></small><b id="banB"></b></div>
  <div id="kanji"></div>
  <div id="fx"></div>
</div>
<div id="start" class="overlay">
  <div class="card">
    <h1>影之居酒屋</h1>
    <div class="menu">
      <p class="sub">忍者節拍動作・全十關　${IS3D ? '３Ｄ版' : '２.５Ｄ版'}</p>
      <div class="row"><span class="rl">難度</span><div class="seg" id="segDiff"></div></div>
      <div class="row"><span class="rl">人數</span><div class="seg" id="segNp"></div></div>
      <div id="stages"></div>
      <div class="keys">
        <div><b class="p1">壹</b> WASD 移動　J 刀（連按五連擊）　K 瞬身　L 手裏劍　空白 煙霧　U 分身斬</div>
        <div class="touchOnly">左下角拖曳是搖桿，右下角是出招按鈕。${IS3D ? '在畫面其他地方拖曳可以轉動視角。' : ''}連按「刀」可打出五連擊。</div>
        <div id="keys2"><b class="p2">貳</b> 方向鍵 移動　, 刀　. 瞬身　/ 手裏劍　右Shift 煙霧　Enter 分身斬</div>
        <div>${IS3D ? '滑鼠拖曳或 Q / E 轉動視角。' : ''}光圈收到鼓面的瞬間出刀就是合拍，傷害加倍。也可以接手把。</div>
      </div>
      <p class="foot"><span class="keyOnly">Enter 從第一關開始　</span><span class="touchOnly">點關卡名稱開始　</span><a id="swap" href="${IS3D ? 'index.html' : 'game3d.html'}">改玩 ${IS3D ? '2.5D' : '3D'} 版 →</a></p>
    </div>
  </div>
</div>
<div id="touchUI">
  <div id="padL"><div id="stick"><i></i></div></div>
  <div id="btns"><button data-a="ult" class="b-ult">氣</button><button data-a="smoke" class="b-smoke">煙</button><button data-a="shur" class="b-shur">鏢</button><button data-a="dash" class="b-dash">瞬</button><button data-a="atk" class="b-atk">刀</button></div>
</div>
<div id="rotate"><div>請把手機橫放<small>橫向畫面才看得到完整戰場</small></div></div>
<div id="clear" class="overlay hidden">
  <div>
    <div class="wrap"><div id="rank">S</div><div><h2 id="clearTitle"></h2><div class="stats" id="clearStats"></div></div></div>
    <p class="sub" style="margin:26px 0 0">挑一件忍具帶走</p>
    <div id="ups"></div>
  </div>
</div>
<div id="end" class="overlay hidden">
  <div>
    <h2 id="endTitle"></h2><p class="sub" id="endSub"></p><div class="stats" id="endStats"></div>
    <div style="margin-top:22px;display:flex;gap:12px">
      <button class="btn" id="retryBtn">再試本關　R</button><button class="btn dim" id="titleBtn">回標題　T</button>
    </div>
  </div>
</div>`);

// 忍具帶來的能力值、難度
const UP0 = { dmg:1, shurMax:5, stealth:3, smokeCD:8, beatWin:1, ki:1, hpMax:100, dashCD:.55, heal:25 };
let UP = Object.assign({}, UP0);
const DIFFS = [
  { id:'e', name:'下忍', note:'輕鬆', hp:.8,  dmg:.6,  wind:1.25, extra:0, rice:.22, beat:.18 },
  { id:'n', name:'中忍', note:'標準', hp:1,   dmg:1,   wind:1,    extra:0, rice:.12, beat:.14 },
  { id:'h', name:'上忍', note:'嚴苛', hp:1.3, dmg:1.4, wind:.85,  extra:1, rice:.08, beat:.10 },
];
let DIFF = DIFFS[1];

// ───────────────────────── 音訊：鼓、旋律、人聲全部即時合成 ─────────────────────────
const AU = (() => {
  let ctx = null, master, rev, nb, t0 = 0, step = 0, lat = 0, beat = 60/112, variant = 0;
  const D4=293.66,Eb4=311.13,G4=392,A4=440,Bb4=466.16,D5=587.33,Eb5=622.25;
  const MEL = [D5,0,Bb4,A4, 0,G4,A4,0,  Eb4,0,D4,0, A4,0,0,0,  D5,0,Eb5,D5, 0,Bb4,A4,0,  G4,A4,Bb4,0, A4,0,0,0];
  const TRANS = [1, 1.1225, .8909, 1.0595, 1.1892, .9439, 1.1225, 1.2599, .8409, 1.3348];
  // 每個聲音都接到主輸出，wet 是送進殘響的比例（讓聲音像在木造房間或山谷裡）
  function bus(wet){ const g = ctx.createGain(); g.connect(master); if (wet){ const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(rev); } return g; }
  function noise(t,dur,type,f,q,vol,f2,wet){
    const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f,t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2,t+dur); fl.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
    s.connect(fl); fl.connect(g); g.connect(bus(wet)); s.start(t, Math.random()); s.stop(t+dur+.02);
  }
  function tone(t,type,f,f2,dur,vol,wet){
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f,t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur*.8);
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+.004);
    g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.connect(g); g.connect(bus(wet)); o.start(t); o.stop(t+dur+.02);
  }
  // 喊聲：以氣聲為主（像壓低聲音的吐氣），加一點帶沙啞的喉音，結尾急收——武術的「喝！」是短促截斷的
  // v1→v2 是嘴型的變化（例如 a→i 就是「嗨」），onset 是開頭的子音
  const FORM = { a:[780,1250,2600], e:[480,1900,2550], i:[310,2250,3000], o:[470,850,2500], u:[340,780,2300] };
  let curve = null;
  function shout(t,o){
    const dur = o.dur, F1 = FORM[o.v1], F2 = FORM[o.v2 || o.v1], out = bus(o.wet === undefined ? .22 : o.wet), g = ctx.createGain();
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(o.vol,t+.012);
    g.gain.setValueAtTime(o.vol*.9, t+dur-.035); g.gain.exponentialRampToValueAtTime(.0001, t+dur);   // 急收
    const mix = ctx.createGain(), shaper = ctx.createWaveShaper(); shaper.curve = curve;   // 輕微失真，喊聲才有力道
    const br = ctx.createBufferSource(); br.buffer = nb; br.loop = true; const bg = ctx.createGain(); bg.gain.value = 1 - o.voiced*.6; br.connect(bg); bg.connect(mix); br.start(t, Math.random()); br.stop(t+dur+.02);
    if (o.voiced){   // 喉音：鋸齒波加一點不穩定的抖動，才不會像機器
      const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(o.f0,t); osc.frequency.exponentialRampToValueAtTime(o.f1 || o.f0, t+dur);
      const jit = ctx.createOscillator(), jg = ctx.createGain(); jit.type = 'triangle'; jit.frequency.value = 27 + Math.random()*14; jg.gain.value = o.f0*.045; jit.connect(jg); jg.connect(osc.frequency);
      const vg = ctx.createGain(); vg.gain.value = o.voiced*1.6; osc.connect(vg); vg.connect(mix); osc.start(t); jit.start(t); osc.stop(t+dur+.02); jit.stop(t+dur+.02);
    }
    for (let i=0;i<3;i++){ const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = 7; b.frequency.setValueAtTime(F1[i],t); b.frequency.linearRampToValueAtTime(F2[i], t+dur*.75);
      const gg = ctx.createGain(); gg.gain.value = [1.4,.9,.45][i]; mix.connect(b); b.connect(gg); gg.connect(shaper); }
    shaper.connect(g); g.connect(out);
    if (o.onset === 'h') noise(t,.05,'bandpass',1700,.8,o.vol*.5);
    else if (o.onset === 's') noise(t,.07,'highpass',5500,.7,o.vol*.35);
    else if (o.onset === 't') { noise(t,.012,'highpass',2500,.7,o.vol*.7); tone(t,'sine',o.f0||160,60,.03,o.vol*.4); }
  }
  // 尺八：帶氣音的笛聲，音頭由下往上滑，尾音加抖音
  function flute(t,f,dur,vol){
    const out = bus(.6), g = ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(vol,t+.07); g.gain.setValueAtTime(vol,t+dur*.7); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f*.9,t); o.frequency.exponentialRampToValueAtTime(f,t+.09);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(f*1.8,t); o2.frequency.exponentialRampToValueAtTime(f*2,t+.09); const g2 = ctx.createGain(); g2.gain.value = .16;
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2; vg.gain.setValueAtTime(0,t); vg.gain.linearRampToValueAtTime(f*.018, t+dur*.6); vib.connect(vg); vg.connect(o.frequency);
    const br = ctx.createBufferSource(); br.buffer = nb; br.loop = true; const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = f*1.5; bf.Q.value = 1.6; const bg = ctx.createGain(); bg.gain.value = .5;
    o.connect(g); o2.connect(g2); g2.connect(g); br.connect(bf); bf.connect(bg); bg.connect(g); g.connect(out);
    for (const n of [o,o2,vib]){ n.start(t); n.stop(t+dur+.05); } br.start(t, Math.random()); br.stop(t+dur+.05);
    noise(t,.05,'highpass',3000,.7,vol*.5,null,.4);
  }
  // 三味線：撥子打弦的「啪」加上帶鼻音的短促弦聲
  function shami(t,f,v){
    const out = bus(.2), o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f*1.012,t); o.frequency.exponentialRampToValueAtTime(f,t+.05);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(4200, f*3.2); bp.Q.value = 1.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(v*2.2,t+.003); g.gain.exponentialRampToValueAtTime(v*.5,t+.06); g.gain.exponentialRampToValueAtTime(.0005,t+.42);
    o.connect(bp); bp.connect(g); g.connect(out); o.start(t); o.stop(t+.45);
    noise(t,.018,'bandpass',2400,1.2,v*1.6);
  }
  const don = (t,v) => { tone(t,'sine',135,46,.36,v,.18); tone(t,'sine',210,70,.09,v*.5); noise(t,.035,'lowpass',520,1,v*.8); };   // 太鼓
  const ka  = (t,v) => { tone(t,'sine',1250,1050,.035,v*.9,.2); noise(t,.03,'bandpass',2600,5,v*.8); };                          // 敲鼓框
  const clack = (t,v) => { tone(t,'sine',1900,1650,.03,v,.5); tone(t,'sine',3300,3000,.022,v*.5,.5); noise(t,.028,'bandpass',2700,6,v*1.1,null,.5); };   // 拍子木
  const bell = (t,f,v,d) => { [1,2.03,3.01].forEach((m,i) => tone(t,'sine',f*m,null,(d||.9)/(1+i*.6),v/(1+i*1.4),.5)); };       // 鈴
  const gong = (t,v) => { [110,163,221,290,415].forEach((f,i) => tone(t,'sine',f,f*.985,2.6/(1+i*.25),v/(1+i*.5),.6)); noise(t,.5,'bandpass',900,.7,v*.25,300,.6); };
  const clang = (t,v) => { [520,1435,2808,4640].forEach((f,i) => tone(t,'triangle',f*(1+Math.random()*.02),null,.38/(1+i*.5),v/(1+i*.6),.35)); noise(t,.02,'highpass',4000,.7,v*.9); };   // 刀刃相擊
  function playStep(i,t){
    const s = i % 8, bar = Math.floor(i/8), v = variant, pat = v % 4, tr = TRANS[v % 10];
    if (s===0 || s===4) don(t,.85);
    if (s===2 || s===6) ka(t,.3);
    if (s===3 && pat !== 2) don(t,.38);
    if (s===7 && bar%2) ka(t,.17);
    if (pat===1 && (s===1 || s===5)) ka(t,.12);
    if (pat===3 || v >= 7){ if (s===6) don(t,.5); if (s===1 || s===5) ka(t,.15); if (s===7) don(t,.33); }
    if (bar >= 1) { const f = MEL[(i + v*8) % 32]; if (f) shami(t,f*tr*.5,.13); }
    if (s===0 && bar%4===2) flute(t, [D4,A4,G4,Bb4][Math.floor(bar/4)%4]*tr, beat*3.4, .07);   // 遠處的尺八長音
    if (s===0 && bar%8===0 && bar) gong(t,.1);
  }
  function sched(){ while (t0 + step*beat/2 < ctx.currentTime + .15) { playStep(step, t0 + step*beat/2); step++; } }
  const now = () => ctx.currentTime;
  const phrase = (notes,len,vol) => { let t = now()+.02; for (const f of notes){ flute(t,f,len,vol); t += len*.82; } };
  return {
    init(){
      const C = window.AudioContext || window.webkitAudioContext; if (!C || ctx) return;
      ctx = new C();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .18; comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = .6; master.connect(comp);
      nb = ctx.createBuffer(1, ctx.sampleRate*2, ctx.sampleRate);
      const d = nb.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
      // 殘響：用衰減的雜訊當脈衝響應
      const len = Math.floor(ctx.sampleRate*1.7), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c=0;c<2;c++){ const ch = ir.getChannelData(c); for (let i=0;i<len;i++) ch[i] = (Math.random()*2-1) * Math.pow(1-i/len, 2.6); }
      rev = ctx.createConvolver(); rev.buffer = ir; const rg = ctx.createGain(); rg.gain.value = .5; rev.connect(rg); rg.connect(master);
      curve = new Float32Array(257); for (let i=0;i<257;i++){ const x = i/128-1; curve[i] = Math.tanh(x*2.4); }
      lat = Math.min(.08, (ctx.outputLatency || ctx.baseLatency || 0));
      ctx.resume(); t0 = ctx.currentTime + .2; setInterval(sched, 25);
    },
    setStage(bpm,v){ beat = 60/bpm; variant = v; if (ctx){ t0 = ctx.currentTime + .3; step = 0; } },
    offset(){ if (!ctx) return 9; const b = (ctx.currentTime - lat - t0)/beat; return (b - Math.round(b))*beat; },
    frac(){ if (!ctx) return 0; const b = (ctx.currentTime - lat - t0)/beat; return b - Math.floor(b); },
    // 揮刀：破風聲加一絲刀鳴
    slash(on){ if(!ctx)return; const t=now(); noise(t,.13,'bandpass',900,1.4,.34,4800); noise(t+.03,.09,'highpass',5200,.7,.1); tone(t+.02,'sine',on?6200:5300,null,.16,on?.05:.03,.3); },
    hit(on){ if(!ctx)return; const t=now(); tone(t,'sine',120,44,.14,.7); noise(t,.06,'lowpass',1500,1,.5); noise(t,.02,'highpass',3500,.7,.3); if(on){ clack(t,.2); bell(t,2100,.07,.5); } },
    block(){ if(!ctx)return; clang(now(),.2); },
    shur(){ if(!ctx)return; const t=now(); for (let i=0;i<4;i++) noise(t+i*.022,.02,'bandpass',3600+i*300,3,.2); noise(t,.11,'highpass',6000,.7,.07); },
    smoke(){ if(!ctx)return; const t=now(); tone(t,'sine',75,34,.32,.8,.3); noise(t,.5,'lowpass',950,1,.55,140,.3); noise(t+.04,.9,'highpass',4200,.7,.07,null,.4); },
    paper(){ if(!ctx)return; const t=now(); noise(t,.22,'bandpass',1500,1,.5,400,.25); tone(t,'sine',110,60,.15,.5); noise(t+.02,.05,'highpass',3000,.7,.3); },
    hurt(){ if(!ctx)return; const t=now(); tone(t,'sine',130,50,.16,.6); noise(t,.09,'lowpass',1100,1,.45); },
    dash(){ if(!ctx)return; const t=now(); noise(t,.14,'bandpass',500,1.2,.3,3200); tone(t,'sine',85,50,.07,.25); },
    land(){ if(!ctx)return; const t=now(); tone(t,'sine',82,46,.12,.5,.15); noise(t,.08,'lowpass',600,1,.3); },
    blink(){ if(!ctx)return; const t=now(); noise(t,.2,'bandpass',350,2,.3,5200,.4); bell(t+.14,2600,.05,.5); },
    chain(){ if(!ctx)return; const t=now(); for (let i=0;i<6;i++){ tone(t+i*.033,'square',2100+Math.random()*900,null,.035,.06,.2); } noise(t,.22,'highpass',3000,1,.13); },
    arrow(){ if(!ctx)return; const t=now(); noise(t,.2,'bandpass',2600,3,.25,900); tone(t+.16,'sine',120,70,.12,.45); noise(t+.16,.03,'bandpass',1800,3,.3); },
    boom(){ if(!ctx)return; const t=now(); tone(t,'sine',120,32,.5,1,.3); noise(t,.45,'lowpass',1200,1,.8,120,.3); },
    thunder(){ if(!ctx)return; const t=now(); noise(t,.08,'highpass',2500,1,.6); noise(t+.03,1.1,'lowpass',500,1,.9,60,.5); tone(t,'sine',80,30,.7,.8,.4); },
    fuse(){ if(!ctx)return; noise(now(),.3,'highpass',5000,1,.1); },
    warn(){ if(!ctx)return; ka(now(),.22); },
    pick(){ if(!ctx)return; const t=now(); shami(t,A4,.16); shami(t+.08,D5,.16); },
    ult(){ if(!ctx)return; const t=now(); for (let i=0;i<7;i++) don(t+.5*(1-Math.pow(.72,i)), .5+i*.06); gong(t+.42,.3); flute(t,D5,.7,.16); },
    chime(){ if(!ctx)return; bell(now(),1760,.1,1.1); },
    clack(){ if(!ctx)return; const t=now(); clack(t,.28); clack(t+.11,.2); },
    // 喝聲。idx 對應五連擊：哈！／誓！／咿呀——！／咚！（踢）／呼（擲鏢時的吐氣）
    kiai(idx,low){ if(!ctx)return; const t=now(), k=(1+rand(-.06,.06))*(low ? .84 : 1);
      if (idx===1) shout(t,{ v1:'a', dur:.13, vol:.5, voiced:.45, f0:185*k, f1:160*k, onset:'h' });
      else if (idx===2) shout(t,{ v1:'e', v2:'i', dur:.15, vol:.5, voiced:.5, f0:200*k, f1:255*k, onset:'s' });
      else if (idx===3){ shout(t,{ v1:'i', v2:'a', dur:.34, vol:.62, voiced:.65, f0:215*k, f1:290*k }); shout(t+.3,{ v1:'a', dur:.1, vol:.5, voiced:.4, f0:250*k, f1:170*k, onset:'h' }); }
      else if (idx===4) shout(t,{ v1:'o', v2:'u', dur:.13, vol:.55, voiced:.55, f0:165*k, f1:140*k, onset:'t' });
      else shout(t,{ v1:'u', dur:.1, vol:.4, voiced:0, onset:'h' }); },
    hurtV(){ if(!ctx)return; shout(now(),{ v1:'u', dur:.17, vol:.55, voiced:.5, f0:150, f1:112, onset:'t' }); },
    dieV(){ if(!ctx)return; const k=rand(.8,1.15); shout(now(),{ v1:'u', v2:'a', dur:.36, vol:.45, voiced:.4, f0:135*k, f1:82*k, wet:.4 }); },
    grunt(){ if(!ctx)return; shout(now(),{ v1:'u', dur:.09, vol:.3, voiced:.2, f0:140, onset:'h' }); },
    growl(){ if(!ctx)return; shout(now(),{ v1:'o', dur:.5, vol:.6, voiced:.9, f0:88, f1:76, wet:.4 }); },
    // 過場的聲音提示：用尺八樂句、拍子木與銅鑼代替語音
    say(text){ if(!ctx)return; const t=now();
      if (text.includes('参る')){ clack(t,.3); clack(t+.14,.3); phrase([A4,D5,Eb5,D5],.42,.2); }
      else if (text.includes('お見事')){ for (let i=0;i<5;i++) don(t+i*.11,.6); gong(t+.6,.35); phrase([G4,A4,D5],.5,.22); }
      else if (text.includes('無念')){ phrase([Eb5,D5,A4],.7,.2); gong(t+.3,.2); }
      else if (text.includes('隠れ身')){ noise(t,.5,'highpass',4500,.7,.12,null,.5); phrase([D5,Eb5],.3,.14); }
      else if (text.includes('曲者') || text.includes('影')){ gong(t,.4); this.growl(); }
      else if (text.includes('分身')){ clack(t,.3); } },
  };
})();

// ───────────────────────── 繪圖基礎與燈光 ─────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0807);
scene.fog = new THREE.Fog(0x0d0807, 26, 70);
const camera = new THREE.PerspectiveCamera(IS3D ? 50 : 38, 1, 0.1, 280);
const cam = { x:2, z:0, yaw:0, dist:9.5 };
const G = {
  mode:'title', np:1, rt:0, si:0, total:0, totalTime:0, time:0, score:0, kills:0, swings:0, beatSw:0, combo:0, comboT:0, maxCombo:0, dmgTaken:0,
  freeze:0, slowT:0, shake:0, zi:0, wi:0, zoneActive:false, lockRight:20, halfW:8.8, events:[], attackers:0, hazT:6, flash:0,
};
function resize(){
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  G.halfW = Math.min(11, Math.tan(19*PI/180) * 14.36 * camera.aspect);
}
addEventListener('resize', resize); resize();
const ambient = new THREE.AmbientLight(0xffe2b8, .4); scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, .35); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd9a8, .75);                 // 主光，投射陰影
sun.castShadow = true; sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left:-20, right:20, top:20, bottom:-20, near:1, far:60 }); sun.shadow.bias = -.0012; sun.shadow.radius = 3;
scene.add(sun); scene.add(sun.target);
const rim = new THREE.DirectionalLight(0xffffff, .5); scene.add(rim); scene.add(rim.target);   // 輪廓光：從背後勾出角色邊緣
const glowLights = [0,1,2].map(() => { const l = new THREE.PointLight(0xffa860, 0, 16, 2); scene.add(l); return l; }); // 燈籠、火盆的局部光
function canvasTex(w,h,draw){
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}
const GEO = {
  box: new THREE.BoxGeometry(1,1,1), sph: new THREE.SphereGeometry(1,16,12), circ: new THREE.CircleGeometry(1,32),
  plane: new THREE.PlaneGeometry(1,1), cyl: new THREE.CylinderGeometry(1,1,1,10), cone: new THREE.ConeGeometry(1,1,4), cone6: new THREE.ConeGeometry(1,1,7),
  trunk: new THREE.CylinderGeometry(.55,1,1,7), ico: new THREE.IcosahedronGeometry(1,0), ico1: new THREE.IcosahedronGeometry(1,1),
  blade: new THREE.ConeGeometry(.05,1,3), arc: new THREE.RingGeometry(1.0,2.0,24,1,-1.15,2.3), ring: new THREE.RingGeometry(.82,1,32), dome: new THREE.SphereGeometry(130,24,14),
};
// 柔光暈：燈籠、火焰、月亮外圈
const glowTex = canvasTex(128,128,(g,w,h)=>{ const r = g.createRadialGradient(64,64,0,64,64,64); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.25,'rgba(255,255,255,.45)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0,0,w,h); });

// ───────────────────────── 角色模型 ─────────────────────────
function part(parent,geo,mat,sx,sy,sz,x,y,z){ const m = new THREE.Mesh(geo,mat); m.scale.set(sx,sy,sz); m.position.set(x,y,z); m.castShadow = true; parent.add(m); return m; }
function pivot(parent,x,y,z){ const g = new THREE.Group(); g.position.set(x,y,z); parent.add(g); return g; }
const KINDS = {
  p1:{ body:0x1b1822, acc:0xd8281c, eye:0xffffff, s:1, scarf:1 },
  p2:{ body:0x18202c, acc:0x2f8be0, eye:0xffffff, s:1, scarf:1 },
  g:{ body:0x201d27, acc:0x4f6492, eye:0xffb347, s:1 },             // 下忍
  t:{ body:0x241b2c, acc:0x8a48b4, eye:0xdca6ff, s:.95 },           // 手裏劍忍
  k:{ body:0x18221c, acc:0x3f9a62, eye:0x9dffb0, s:1.05 },          // 鎖鎌忍
  b:{ body:0x241820, acc:0xd45a8a, eye:0xffc0dc, s:.95 },           // 霧隱忍
  f:{ body:0x261a12, acc:0xe8742a, eye:0xffd36a, s:1 },             // 爆彈忍
  s:{ body:0x241416, acc:0xa81e15, eye:0xff3b2a, s:1.45 },          // 武士
  j:{ body:0x13131c, acc:0xe8b04a, eye:0xff3b2a, s:1.15, scarf:1 }, // 上忍
  x:{ body:0x170f22, acc:0x8a3fd0, eye:0xff2a6a, s:1.6, scarf:1 },  // 影將軍
};
function makeFighter(kind){
  const c = KINDS[kind];
  const mats = {
    body: new THREE.MeshLambertMaterial({ color: c.body }), acc: new THREE.MeshBasicMaterial({ color: c.acc }),
    eye: new THREE.MeshBasicMaterial({ color: c.eye }), steel: new THREE.MeshBasicMaterial({ color: 0xe9eff6 }),
    dark: new THREE.MeshLambertMaterial({ color: 0x0c0a10 }), gold: new THREE.MeshBasicMaterial({ color: 0xe8b04a }),
  };
  const root = new THREE.Group(), model = new THREE.Group(); root.add(model); model.scale.setScalar(c.s);
  const legL = pivot(model,0,.9,-.13), legR = pivot(model,0,.9,.13);
  for (const l of [legL,legR]){ part(l,GEO.box,mats.body,.2,.9,.2,0,-.45,0); part(l,GEO.box,mats.dark,.3,.1,.2,.05,-.86,0); part(l,GEO.box,mats.acc,.22,.08,.22,0,-.62,0); }
  const torso = pivot(model,0,.9,0);
  part(torso,GEO.box,mats.body,.46,.8,.42,0,.42,0);
  part(torso,GEO.box,mats.body,.36,.26,.6,0,.72,0);                       // 肩
  part(torso,GEO.box,mats.acc,.5,.12,.46,0,.1,0); part(torso,GEO.box,mats.acc,.1,.3,.1,.2,-.06,.14);  // 腰帶與帶結
  part(torso,GEO.sph,mats.body,.25,.25,.25,0,1.06,0);
  part(torso,GEO.box,mats.body,.2,.2,.3,-.16,1.0,0);                      // 頭巾後擺
  part(torso,GEO.box,mats.eye,.1,.05,.34,.21,1.09,0);
  const armL = pivot(torso,0,.74,-.3), armR = pivot(torso,0,.74,.3);
  for (const a of [armL,armR]){ part(a,GEO.box,mats.body,.15,.7,.15,0,-.35,0); part(a,GEO.box,mats.acc,.17,.14,.17,0,-.52,0); }
  if (kind === 'k'){
    part(armR,GEO.box,mats.steel,.55,.05,.04,.28,-.68,0); part(armR,GEO.box,mats.steel,.06,.34,.04,.55,-.52,0); part(armL,GEO.sph,mats.steel,.09,.09,.09,0,-.8,0);
  } else if (kind === 'f'){
    part(armL,GEO.sph,mats.dark,.16,.16,.16,0,-.82,0); part(armL,GEO.sph,mats.acc,.05,.05,.05,0,-.64,0);
  } else if (kind !== 't'){
    const L = kind==='x' ? 1.8 : kind==='s' ? 1.6 : kind==='j' ? 1.35 : 1.2;
    part(armR,GEO.box,mats.steel,L,.05,.04,L/2,-.68,0); part(armR,GEO.box,mats.gold,.05,.16,.16,.04,-.68,0); part(armR,GEO.box,mats.dark,.22,.07,.07,-.1,-.68,0);
    part(torso,GEO.box,mats.dark,.08,1.1,.08,-.26,.5,-.05).rotation.z = .5;   // 背上的刀鞘
  }
  let scarf = null, scarf2 = null;
  if (c.scarf){
    if (kind === 'j') mats.scarf = new THREE.MeshBasicMaterial({ color: 0xf1e3c4 });
    const sm = mats.scarf || mats.acc;
    part(torso,GEO.box,mats.acc,.52,.07,.52,0,1.17,0);
    scarf = pivot(torso,-.24,1.17,0); part(scarf,GEO.box,sm,.5,.07,.1,-.25,0,0);
    scarf2 = pivot(scarf,-.5,0,0); part(scarf2,GEO.box,sm,.45,.06,.08,-.22,0,0);
  }
  if (kind === 's' || kind === 'x'){
    part(torso,GEO.box,mats.acc,.36,.1,.98,0,.84,0);
    part(torso,GEO.sph,mats.body,.31,.2,.31,0,1.2,0);
    part(torso,GEO.box,mats.gold,.05,.34,.06,.14,1.45,.16).rotation.x = .5;
    part(torso,GEO.box,mats.gold,.05,.34,.06,.14,1.45,-.16).rotation.x = -.5;
    if (kind === 'x') part(torso,GEO.box,mats.gold,.06,.5,.1,.16,1.52,0);
  }
  scene.add(root);
  // a = 面向角度，方向向量為 (cos a, sin a)（x, z 平面）
  return { kind, root, model, torso, legL, legR, armL, armR, scarf, scarf2, mats, scale:c.s,
           x:0, y:0, z:0, a:0, va:0, vx:0, vz:0, walk:0, moving:false, flash:0, alpha:1, warn:0 };
}
function setAlpha(f,a){
  if (f.alpha === a) return; f.alpha = a;
  for (const k in f.mats){ const m = f.mats[k]; m.transparent = a < 1; m.opacity = a; }
}
function disposeFighter(f){ scene.remove(f.root); for (const k in f.mats) f.mats[k].dispose(); }
function pose(f,dt,armR,armL,lean,twist){
  f.root.position.set(f.x, f.y, f.z);
  f.va += adiff(f.a, f.va) * Math.min(1, dt*18);
  f.model.rotation.y = -f.va;
  if (f.moving) f.walk += dt*11; else f.walk = lerp(f.walk, Math.round(f.walk/PI)*PI, Math.min(1,dt*12));
  const sw = Math.sin(f.walk)*(f.moving ? .75 : 0);
  f.legL.rotation.z = sw; f.legR.rotation.z = f.kick ? f.kick : -sw;
  f.torso.position.y = .9 + Math.abs(Math.cos(f.walk))*(f.moving ? .05 : 0) + Math.sin(G.rt*2.4+f.x)*.008;
  f.torso.rotation.z = lerp(f.torso.rotation.z, -(lean||0), Math.min(1,dt*18));
  f.torso.rotation.y = lerp(f.torso.rotation.y, twist||0, Math.min(1,dt*26));
  f.armR.rotation.z = lerp(f.armR.rotation.z, armR, Math.min(1,dt*30));
  f.armL.rotation.z = lerp(f.armL.rotation.z, armL, Math.min(1,dt*20));
  if (f.scarf){ f.scarf.rotation.z = Math.sin(G.rt*9+f.x)*.18 + (f.moving ? .1 : -.35); f.scarf2.rotation.z = Math.sin(G.rt*9+1)*.3 - .1; }
  const fl = f.flash > 0 ? 1 : 0;
  f.mats.body.emissive.setRGB(Math.max(fl, f.warn*.8), fl, fl);
}

// ───────────────────────── 特效 ─────────────────────────
const parts = [];
function spawnP(geo,color,x,y,z,vx,vy,vz,life,size,o){
  o = o || {};
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent:true, opacity:o.a||1, depthWrite:false, side:THREE.DoubleSide,
    blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  m.position.set(x,y,z); m.scale.setScalar(size); scene.add(m);
  const p = { m, vx, vy, vz, life, max:life, g:o.g||0, grow:o.grow||0, a:o.a||1, spin:o.spin||0, floor:o.floor };
  parts.push(p); return p;
}
function updParts(dt){
  for (let i = parts.length-1; i >= 0; i--){
    const p = parts[i]; p.life -= dt;
    if (p.life <= 0){ scene.remove(p.m); p.m.material.dispose(); parts.splice(i,1); continue; }
    p.vy -= p.g*dt; p.m.position.x += p.vx*dt; p.m.position.y += p.vy*dt; p.m.position.z += p.vz*dt;
    if (p.floor && p.m.position.y < .03){ p.m.position.y = .03; p.vx = p.vy = p.vz = 0; p.g = 0; p.m.rotation.set(-PI/2,0,0); p.m.scale.multiplyScalar(1.7); p.floor = false; }
    if (p.grow) p.m.scale.multiplyScalar(1 + p.grow*dt);
    if (p.spin){ p.m.rotation.z += p.spin*dt; p.m.rotation.x += p.spin*.6*dt; }
    p.m.material.opacity = p.a * Math.min(1, p.life/p.max*1.6);
  }
}
function clearParts(){ for (const p of parts){ scene.remove(p.m); p.m.material.dispose(); } parts.length = 0; }
function ink(x,y,z,a,n){
  for (let i=0;i<n;i++){ const d = a + rand(-.7,.7), s = rand(1,7);
    spawnP(GEO.circ, Math.random()<.3 ? 0x7a120c : 0x070506, x, y+rand(-.3,.3), z, Math.cos(d)*s, rand(1,5), Math.sin(d)*s*(IS3D?1:.3), rand(1.6,3), rand(.05,.13), { g:16, floor:true }); }
}
function spark(x,y,z){ for (let i=0;i<10;i++) spawnP(GEO.box, 0xffe9b0, x,y,z, rand(-6,6), rand(-1,6), rand(-3,3), rand(.15,.32), rand(.04,.08), { g:12, add:true }); }
function smokeFx(x,z,n,sz){ for (let i=0;i<(n||24);i++) spawnP(GEO.sph, 0x9a9aa6, x+rand(-.5,.5), rand(.3,1.8), z+rand(-.5,.5), rand(-2.4,2.4), rand(.2,1.6), rand(-1.6,1.6), rand(.9,1.8), rand(.25,.5)*(sz||1), { a:.5, grow:1.1 }); }
function leafFx(x,z,n,pink){ for (let i=0;i<(n||16);i++){ const a = rand(0,2*PI), s = rand(1.5,4);
  spawnP(GEO.plane, pink ? [0xffb3c8,0xf58fb0,0xffd9e4][i%3] : [0x3f6b3a,0x6b8a3a,0x8a6a2a][i%3], x, rand(.2,1.6), z, Math.cos(a)*s, rand(2,5.5), Math.sin(a)*s*.6, rand(.8,1.5), rand(.1,.2), { g:6, spin:rand(-12,12) }); } }
function paperFx(x,z,sx,sz,inX,inZ,n,colors){
  const c = colors || [0xf0dfba,0x2a1a10];
  for (let i=0;i<n;i++) spawnP(GEO.plane, Math.random()<.25 ? c[1] : c[0], x+rand(-sx,sx), rand(.4,4), z+rand(-sz,sz),
    inX*rand(1.5,6)+rand(-2,2), rand(0,4), inZ*rand(1.5,6)+rand(-2,2), rand(.8,1.6), rand(.12,.36), { g:9, spin:rand(-9,9) });
}
// 刀光：3D 是平躺的弧形往前掃；2.5D 是面向鏡頭的直立弧形
// kind：'h' 橫斬（水平的弧）、'v' 正斬（直立的弧）。不指定時用該視角最好讀的那一種
function slashFx(x,y,z,a,tilt,color,size,kind){
  if (IS3D){
    const p = spawnP(GEO.arc, color, x+Math.cos(a)*.3, y, z+Math.sin(a)*.3, Math.cos(a)*2.5, 0, Math.sin(a)*2.5, .17, size||1, { add:true, grow:2.2 });
    p.m.rotation.order = 'YXZ'; p.m.rotation.y = -a; p.m.rotation.x = kind === 'v' ? tilt : -PI/2 + tilt;
  } else {
    const f = Math.cos(a) >= 0 ? 1 : -1, p = spawnP(GEO.arc, color, x+f*.4, y+.05, z+.08, f*2.5, 0, 0, .16, size||1, { add:true, grow:2.2 });
    p.m.scale.x *= f; if (kind === 'h') p.m.scale.y *= .3; else p.m.rotation.z = tilt*2.2*f;
  }
}
function ghost(x,z,a,color,alpha){ const p = spawnP(GEO.box, color, x, .95, z, 0,0,0, .26, 1, { a:alpha||.45 }); p.m.scale.set(.5,1.9,.34); p.m.rotation.y = -a; }
function lineFx(x1,z1,x2,z2,y,color,life){ const p = spawnP(GEO.box, color, (x1+x2)/2, y, (z1+z2)/2, 0,0,0, life, 1, {}); p.m.scale.set(Math.hypot(x2-x1,z2-z1), .05, .05); p.m.rotation.y = -Math.atan2(z2-z1, x2-x1); }
function boomFx(x,z,color){
  const r = spawnP(GEO.ring, color, x, .08, z, 0,0,0, .4, .6, { add:true, grow:6 }); r.m.rotation.x = -PI/2;
  spawnP(GEO.sph, 0xfff0c0, x, .8, z, 0,1,0, .22, .7, { add:true, grow:5 });
  for (let i=0;i<16;i++) spawnP(GEO.sph, i%3 ? color : 0x3a2a22, x, .6, z, rand(-5,5), rand(2,7), rand(-4,4), rand(.4,.9), rand(.15,.35), { g:9, a:.8, grow:.8 });
  G.shake = Math.max(G.shake,.5);
}
const _v = new THREE.Vector3();
function pop(text,x,y,z,cls){
  _v.set(x,y,z).project(camera); if (_v.z > 1) return;
  const d = document.createElement('div'); d.className = 'pop ' + (cls||''); d.textContent = text;
  d.style.left = ((_v.x*.5+.5)*innerWidth) + 'px'; d.style.top = ((-_v.y*.5+.5)*innerHeight) + 'px';
  $('fx').appendChild(d); setTimeout(() => d.remove(), 820);
}
const after = (t,fn) => G.events.push({ t: G.rt + t, fn });
function hint(text){ const h = $('hint'); if (!text){ h.classList.remove('on'); return; } h.textContent = text; h.classList.add('on'); }
function kanji(ch){ AU.clack(); const k = $('kanji'); k.textContent = ch; k.classList.remove('go'); void k.offsetWidth; k.classList.add('go'); }
function cine(sec){ document.body.classList.add('cine'); after(sec, () => document.body.classList.remove('cine')); }
function speedLines(){ const l = $('lines'); l.style.transition = 'none'; l.style.opacity = 1; requestAnimationFrame(() => { l.style.transition = ''; l.style.opacity = 0; }); }
