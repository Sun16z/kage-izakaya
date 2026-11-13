'use strict';
// 玩法：輸入、玩家（單人／雙人）、敵人、關卡流程、介面、主迴圈。

// ───────────────────────── 輸入（鍵盤＋手把）─────────────────────────
const IN = [{ k:{}, p:{}, g:{}, t:{} }, { k:{}, p:{}, g:{}, t:{} }];
const KEY1 = { KeyA:'L',KeyD:'R',KeyW:'U',KeyS:'D',KeyJ:'atk',KeyK:'dash',KeyL:'shur',Space:'smoke',KeyU:'ult' };
const KEY1X = { ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D',KeyZ:'atk',KeyX:'dash',KeyC:'shur',KeyV:'ult' };   // 單人時的備用鍵
const KEY2 = { ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D',Comma:'atk',Period:'dash',Slash:'shur',ShiftRight:'smoke',Enter:'ult' };
const camKeys = {};
function keyOwner(code){
  if (KEY1[code]) return [0, KEY1[code]];
  if (G.np === 2){ if (KEY2[code]) return [1, KEY2[code]]; } else if (KEY1X[code]) return [0, KEY1X[code]];
  return null;
}
addEventListener('keydown', e => {
  if (e.code === 'KeyQ' || e.code === 'KeyE') camKeys[e.code] = true;
  const playing = G.mode === 'play' || G.mode === 'clear' || G.mode === 'over';
  const o = playing ? keyOwner(e.code) : null;
  if (o){ const [i,n] = o; if (!IN[i].k[n]) IN[i].p[n] = true; IN[i].k[n] = true; e.preventDefault(); }
  const d = /^Digit(\d)$/.exec(e.code), n = d ? +d[1] : 0;
  if (G.mode === 'title'){ if (e.code === 'Enter') startRun(0); }
  else if (G.mode === 'pick'){ if (n >= 1 && n <= 3) pickUp(n-1); }
  else if (G.mode === 'overMenu'){ if (e.code === 'KeyR') startStage(G.si); if (e.code === 'KeyT') location.reload(); }
  else if (G.mode === 'ending'){ if (e.code === 'KeyR' || e.code === 'KeyT' || e.code === 'Enter') location.reload(); }
});
addEventListener('keyup', e => { camKeys[e.code] = false; for (const i of [0,1]) for (const m of [KEY1,KEY1X,KEY2]) if (m[e.code]) IN[i].k[m[e.code]] = false; });
addEventListener('blur', () => { for (const i of IN){ i.k = {}; i.g = {}; } });
let dragging = false;
$('c').addEventListener('pointerdown', e => { dragging = true; $('c').setPointerCapture(e.pointerId); });
$('c').addEventListener('pointermove', e => { if (dragging && IS3D) cam.yaw += e.movementX * .006; });
$('c').addEventListener('pointerup', () => { dragging = false; });
const PADBTN = { 0:'atk', 1:'dash', 2:'shur', 3:'smoke', 5:'ult', 4:'ult' };
function pollPads(dt){
  let pads = []; try { pads = [...navigator.getGamepads()].filter(Boolean); } catch(e){}
  IN[0].g = {}; IN[1].g = {};
  // 單人：第一支手把給壹。雙人：一支手把給貳（壹用鍵盤），兩支則各一支
  const map = G.np === 2 ? (pads.length >= 2 ? [[pads[0],0],[pads[1],1]] : pads.length ? [[pads[0],1]] : []) : (pads.length ? [[pads[0],0]] : []);
  for (const [pad,i] of map){
    const g = IN[i].g, ax = pad.axes[0] || 0, ay = pad.axes[1] || 0, b = n => pad.buttons[n] && pad.buttons[n].pressed;
    g.L = ax < -.35 || b(14); g.R = ax > .35 || b(15); g.U = ay < -.35 || b(12); g.D = ay > .35 || b(13);
    const prev = pad._prev || (pad._prev = {});
    for (const n in PADBTN){ const on = b(+n), name = PADBTN[n]; if (on && !prev[n]) IN[i].p[name] = true; prev[n] = on; }
    if (IS3D && Math.abs(pad.axes[2] || 0) > .25) cam.yaw += pad.axes[2] * 2.4 * dt;
  }
}
const held = (i,n) => IN[i].k[n] || IN[i].g[n] || IN[i].t[n];

// 觸控：左下角拖曳當搖桿，右下角按鈕出招
if (TOUCH){
  const pad = $('padL'), stick = $('stick'), knob = stick.firstElementChild, T = IN[0].t;
  let pid = null, ox = 0, oy = 0;
  const move = e => {
    const dx = e.clientX-ox, dy = e.clientY-oy, d = Math.hypot(dx,dy), m = Math.min(d, 46), a = Math.atan2(dy,dx);
    knob.style.transform = `translate(${Math.cos(a)*m}px,${Math.sin(a)*m}px)`;
    const on = d > 12; T.R = on && Math.cos(a) > .38; T.L = on && Math.cos(a) < -.38; T.D = on && Math.sin(a) > .38; T.U = on && Math.sin(a) < -.38;
  };
  const end = e => { if (e.pointerId !== pid) return; pid = null; T.L = T.R = T.U = T.D = false; stick.classList.remove('on'); knob.style.transform = ''; };
  pad.addEventListener('pointerdown', e => { if (pid !== null) return; pid = e.pointerId; pad.setPointerCapture(pid); ox = e.clientX; oy = e.clientY;
    const r = pad.getBoundingClientRect(); stick.style.left = (ox-r.left)+'px'; stick.style.top = (oy-r.top)+'px'; stick.classList.add('on'); e.preventDefault(); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === pid) move(e); });
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  $('btns').querySelectorAll('button').forEach(b => {
    b.addEventListener('pointerdown', e => { IN[0].p[b.dataset.a] = true; b.classList.add('on'); e.preventDefault(); });
    const up = () => b.classList.remove('on'); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });
  addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
}

// ───────────────────────── 兩種視角共用的幾何判定 ─────────────────────────
const faceOf = o => Math.cos(o.a) >= 0 ? 1 : -1;
const aimAt = (o,T) => IS3D ? Math.atan2(T.z-o.z, T.x-o.x) : (T.x >= o.x ? 0 : PI);
// 攻擊打不打得到：3D 用距離加扇形，2.5D 用前方的長方形
function reach(o,T,range,zw,arc){
  const dx = T.x-o.x, dz = T.z-o.z;
  if (IS3D){ const d = Math.hypot(dx,dz); return d < range && (d < .9 || Math.abs(adiff(Math.atan2(dz,dx), o.a)) < arc); }
  const d = dx*faceOf(o); return d > -.5 && d < range && Math.abs(dz) < zw;
}
const isFront = (e,sx,sz) => IS3D ? Math.abs(adiff(Math.atan2(sz-e.z, sx-e.x), e.a)) < 1.4 : Math.sign(sx-e.x) === faceOf(e);
const viewL = () => cam.x-G.halfW+.8, viewR = () => Math.min(cam.x+G.halfW-.8, G.lockRight-.6);
const Z = () => STAGES[G.si].zones;
const zoneLeft = () => G.zi ? Z()[G.zi-1].right : XA;
const inBounds = (x,z) => IS3D ? [clamp(x, zoneLeft()+1, G.lockRight-1), clamp(z, ZMIN+.6, ZMAX-.6)] : [clamp(x, viewL(), viewR()), clamp(z, ZMIN, ZMAX)];

// ───────────────────────── 玩家 ─────────────────────────
const PL = [0,1].map(i => Object.assign(makeFighter(i ? 'p2' : 'p1'), {
  pi:i, on:i === 0, hp:100, ki:0, shur:5, state:'idle', t:0, idx:0, chainT:0, buf:false, bufOn:false, onBeat:false, hitDone:false,
  inv:0, dashCD:0, smokeCD:0, shurCD:0, stealth:0, dead:false, dvx:0, dvz:0, gT:0,
}));
PL[1].root.visible = false;
const active = () => PL.filter(p => p.on), alive = () => PL.filter(p => p.on && !p.dead);
const lead = () => { const a = alive(); return a.length ? pick(a) : PL[0]; };
const targetable = e => !e.dead && e.state !== 'lurk' && e.state !== 'drop' && e.state !== 'vanish';
function inputDir(P){
  const i = P.pi, f = (held(i,'U')?1:0)-(held(i,'D')?1:0), r = (held(i,'R')?1:0)-(held(i,'L')?1:0); if (!f && !r) return null;
  if (!IS3D){ const n = Math.hypot(r,f); return [r/n, -f/n]; }
  const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw), x = c*f - s*r, z = s*f + c*r, n = Math.hypot(x,z);
  return [x/n, z/n];
}
// 3D 的自動瞄準：在 base 方向 cone 弧度內、距離 maxD 以內最近的敵人
function aim(P,maxD,cone,base){
  let best = null, bd = maxD;
  for (const e of enemies){ if (!targetable(e)) continue;
    const d = Math.hypot(e.x-P.x, e.z-P.z); if (d >= bd) continue;
    const a = Math.atan2(e.z-P.z, e.x-P.x); if (Math.abs(adiff(a,base)) > cone) continue;
    bd = d; best = a; }
  return best;
}
function addCombo(n){ G.combo += n; G.comboT = 2.6; G.maxCombo = Math.max(G.maxCombo, G.combo); }
function beginAttack(P,on){
  const d = inputDir(P);
  if (IS3D){ const base = d ? Math.atan2(d[1],d[0]) : P.a, t = aim(P, 4.4, d ? 1.3 : PI, base); P.a = t === null ? base : t; }
  else if (d && d[0]) P.a = d[0] > 0 ? 0 : PI;
  else {   // 2.5D：沒按方向時，背後有敵人而前方沒有，就自動轉身
    let front = false, back = false; const f = faceOf(P);
    for (const e of enemies){ if (!targetable(e) || Math.abs(e.z-P.z) > 1.4) continue; const dx = (e.x-P.x)*f; if (dx > -.3 && dx < 3) front = true; else if (dx <= -.3 && dx > -3) back = true; }
    if (back && !front) P.a = f > 0 ? PI : 0;
  }
  P.idx = (P.chainT > 0 && P.idx < 5) ? P.idx+1 : 1;
  P.state = 'atk'; P.t = 0; P.hitDone = false; P.buf = false; P.onBeat = on;
  if (P.idx === 2) P.armR.rotation.z = 2.9;
  G.swings++;
  if (on){ G.beatSw++; const dr = $('drum'); dr.classList.add('hit'); setTimeout(() => dr.classList.remove('hit'), 160); }
  pop(MOVES[P.idx-1].name + (on ? '・合拍' : ''), P.x, 2.9, P.z, on ? 'gold' : 'move');
  AU.slash(on);   // 出刀只有刀聲，不喊
}
function tryAttack(P){
  if (P.state === 'hurt' || P.state === 'dash') return;
  const on = Math.abs(AU.offset()) < DIFF.beat*UP.beatWin;
  if (P.state === 'atk'){ if (!P.buf){ P.buf = true; P.bufOn = on; } return; }
  beginAttack(P,on);
}
// 五連擊：橫斬 → 正斬 → 跳斬 → 踢擊 → 飛鏢收招。dur 是整招時間，hit 是命中的時間點
const MOVES = [
  { name:'橫斬', dur:.22, hit:.06, dmg:10, range:2.1 },
  { name:'正斬', dur:.22, hit:.06, dmg:10, range:2.1 },
  { name:'跳斬', dur:.42, hit:.27, dmg:16, range:2.7 },
  { name:'踢擊', dur:.26, hit:.10, dmg:8,  range:1.9 },
  { name:'飛鏢', dur:.32, hit:.10, dmg:12, range:0 },
];
function strike(P){
  const idx = P.idx, on = P.onBeat, mv = MOVES[idx-1], range = mv.range + (IS3D ? .2 : 0), stealth = P.stealth > 0, col = on ? 0xffc76b : 0xffffff;
  let base = mv.dmg * UP.dmg; if (on) base *= 2;
  const ca = Math.cos(P.a), sa = Math.sin(P.a);
  if (idx === 5){   // 收招：一次射出三枚手裏劍，不消耗數量
    for (const da of [-.22,0,.22]) shoot(P.x+ca*.6, P.z+sa*.6, P.a+da, 21, P, base);
    P.armL.rotation.z = 2.4; if (stealth) P.stealth = 0;
    P.ki = Math.min(100, P.ki + 10*UP.ki); pop('五連！', P.x, 3.4, P.z, 'gold'); G.score += 150;
    return;
  }
  if (idx === 1) slashFx(P.x, 1.25, P.z, P.a, 0, col, 1.05, 'h');
  else if (idx === 2) slashFx(P.x, 1.4, P.z, P.a, .25, col, 1.05, 'v');
  else if (idx === 3){ slashFx(P.x, 1.3, P.z, P.a, .2, col, 1.4, 'v');
    const r = spawnP(GEO.ring, 0xd8c8a0, P.x+ca*.8, .06, P.z+sa*.8, 0,0,0, .32, .5, { a:.7, grow:5 }); r.m.rotation.x = -PI/2; G.shake = Math.max(G.shake,.3); AU.land(); }
  else spark(P.x+ca*1.1, 1.0, P.z+sa*1.1);
  let hit = 0;
  for (const e of enemies){
    if (e.dead || e.state === 'drop' || e.state === 'vanish') continue;
    if (e.state === 'lurk'){
      if (P.z*e.side > EDGE-2.4 && Math.abs(e.x-P.x) < 2){ breakPanel(e.x, e.side); pop('隔門斬', e.x, 3, e.side*EDGE, 'gold'); ink(e.x,1.4,e.side*(EDGE-.2),-e.side*PI/2,10); killEnemy(e, P.a); G.score += 300; hit++; }
      continue;
    }
    const landed = idx === 3 && Math.hypot(e.x-(P.x+ca*.8), e.z-(P.z+sa*.8)) < 1.7 + (e.scale-1);   // 跳斬落地有一圈衝擊
    if (landed || reach(P, e, range + (e.scale-1)*.8, 1.25, idx === 3 ? 1.5 : 1.05)){ if (damage(e, base, { on, stealth, a:P.a, sx:P.x, sz:P.z, kick: idx === 4 })) hit++; }
  }
  for (const s of shots){
    if (s.owner !== 'e' || s.dead || idx === 4) continue;
    if (reach(P, s, range+.3, 1.2, 1.2)){ s.dead = true; spark(s.x,1.3,s.z); AU.block(); pop('彈開', s.x, 2.1, s.z); hit++; }
  }
  if (stealth) P.stealth = 0;
  if (hit){
    G.freeze = on ? .09 : .05; G.shake = Math.max(G.shake, on ? .35 : .18);
    addCombo(hit); P.ki = Math.min(100, P.ki + (on ? 14 : 4)*UP.ki); AU.hit(on);
  }
}
function ult(P){
  if (P.ki < 100 || P.dead) return;
  P.ki = 0; G.slowT = 1.1; alive().forEach(p => { p.inv = Math.max(p.inv, 1.6); }); AU.ult(); kanji('分身'); cine(1.3); AU.say('分身の術');
  let i = 0;
  for (const e of enemies){
    if (!targetable(e) || (IS3D ? Math.hypot(e.x-P.x, e.z-P.z) > 16 : Math.abs(e.x-cam.x) > G.halfW+1)) continue;
    const k = i++;
    after(.12 + k*.1, () => {
      if (e.dead) return;
      const a = IS3D ? rand(0, 2*PI) : (k % 2 ? PI : 0), gx = e.x - Math.cos(a)*1.2, gz = e.z - Math.sin(a)*1.2;
      ghost(gx, gz, a, P.pi ? 0x2f8be0 : 0xd8281c, .7); slashFx(gx, 1.25, gz, a, rand(-.3,.3), 0xffc76b, 1.4);
      damage(e, 45*UP.dmg, { ult:true, on:true, a, sx:gx, sz:gz }); addCombo(1); AU.hit(true); G.shake = .4;
    });
  }
}
function hurtPlayer(P,d,a){
  if (!P.on || P.inv > 0 || P.dead || G.mode !== 'play') return false;
  d = Math.max(1, Math.round(d*DIFF.dmg));
  P.hp -= d; G.dmgTaken += d; P.inv = .8; P.state = 'hurt'; P.t = .25; P.vx = Math.cos(a)*8; P.vz = Math.sin(a)*8*(IS3D?1:.4); P.stealth = 0; P.buf = false;
  G.combo = 0; G.shake = .45; G.freeze = .06; AU.hurt(); AU.hurtV(); ink(P.x,1.3,P.z,a,6);
  const v = $('vig'); v.style.transition = 'none'; v.style.opacity = 1; requestAnimationFrame(() => { v.style.transition = ''; v.style.opacity = 0; });
  if (P.hp <= 0){
    P.hp = 0; P.dead = true; P.a = a + PI; P.t = 0;
    if (!alive().length){ G.mode = 'over'; G.slowT = 1.2; AU.say('無念', .4, .8); after(1.6, showOver); }
    else { pop('倒下', P.x, 2.8, P.z, 'red'); hint('夥伴倒下了　清完這一區就會復活'); }
  }
  return true;
}
const swingP = (idx,p) => IS3D ? [lerp(1.5,1.2,p), (idx === 2 ? 1 : -1)*lerp(-1.3,1.3,p)] : [idx === 2 ? lerp(.1,2.9,p) : lerp(2.9,-.1,p), 0];
function updPlayer(P,dt){
  P.inv -= dt; P.dashCD -= dt; P.smokeCD -= dt; P.shurCD -= dt; P.chainT -= dt; P.flash -= dt;
  if (P.stealth > 0) P.stealth -= dt;
  P.x += P.vx*dt; P.z += P.vz*dt; const fr = Math.pow(.001,dt); P.vx *= fr; P.vz *= fr;
  if (P.dead){ P.t += dt; P.model.rotation.z = Math.min(1,P.t*4)*PI/2; P.moving = false; setAlpha(P, .55); pose(P,dt,.2,.2,0,0); return; }
  const live = G.mode === 'play', dir = live ? inputDir(P) : null, pr = IN[P.pi].p;
  if (live){
    if (pr.atk) tryAttack(P);
    if (pr.ult) ult(P);
    if (pr.dash && P.dashCD <= 0 && P.state !== 'hurt'){
      const dx = dir ? dir[0] : Math.cos(P.a), dz = dir ? dir[1] : Math.sin(P.a);
      P.state = 'dash'; P.t = .17; P.dvx = dx*23; P.dvz = dz*(IS3D ? 23 : 13); P.inv = Math.max(P.inv,.26); P.dashCD = UP.dashCD; P.buf = false;
      if (IS3D) P.a = Math.atan2(dz,dx); else if (dx) P.a = dx > 0 ? 0 : PI;
      AU.dash(); speedLines();
    }
    if (pr.shur && P.shur > 0 && P.shurCD <= 0 && P.state !== 'hurt' && P.state !== 'dash'){
      if (IS3D){ const t = aim(P, 14, .6, P.a); if (t !== null) P.a = t; }
      P.shur--; P.shurCD = .22; shoot(P.x+Math.cos(P.a)*.6, P.z+Math.sin(P.a)*.6, P.a, 19, P); P.armL.rotation.z = 2.2;
    }
    if (pr.smoke && P.smokeCD <= 0 && P.state !== 'hurt'){
      P.stealth = UP.stealth; P.smokeCD = UP.smokeCD; smokeFx(P.x,P.z); leafFx(P.x,P.z); AU.smoke(); kanji('隱'); AU.say('隠れ身の術');
    }
  }
  let sp = 0, armR = .45, armL = -.25, lean = 0, twist = 0;
  P.moving = false;
  if (P.state !== 'atk'){ P.y = 0; P.kick = 0; }
  switch (P.state){
    case 'idle': sp = 1; if (dir){ if (IS3D) P.a = Math.atan2(dir[1],dir[0]); else if (dir[0]) P.a = dir[0] > 0 ? 0 : PI; } armR = P.chainT > 0 ? .25 : .45; break;
    case 'atk': {
      P.t += dt; sp = .3; lean = .28; P.kick = 0;
      const mv = MOVES[P.idx-1], p = clamp(P.t/mv.dur, 0, 1), q = clamp(P.t/mv.hit, 0, 1), s = clamp(p*1.6, 0, 1), ca = Math.cos(P.a), sa = Math.sin(P.a);
      const step = v => { P.x += ca*v*dt; P.z += sa*v*dt; };
      if (P.idx === 1){ armR = 1.5; twist = lerp(-1.3,1.3,s); if (P.t < .09) step(3.2); }                 // 橫斬：轉腰橫掃
      else if (P.idx === 2){ armR = lerp(2.9,-.1,s); if (P.t < .09) step(3.2); }                          // 正斬：由上劈下
      else if (P.idx === 3){ sp = 0; P.y = q < 1 ? Math.sin(q*PI)*1.5 : 0; armR = q < .8 ? 3.0 : -.2; lean = q < .8 ? -.15 : .65; if (q < 1) step(5.5); }   // 跳斬：躍起落地
      else if (P.idx === 4){ sp = 0; armR = .2; armL = .5; lean = -.35; P.kick = P.t > .04 && P.t < .2 ? 1.5 : .4; if (P.t < .1) step(2.5); }             // 踢擊
      else { sp = 0; armR = .2; armL = lerp(2.8,-.2,q); lean = .05; P.y = Math.sin(p*PI)*.7; if (P.t < .2) step(-2.2); }                              // 飛鏢：後躍投擲
      if (!P.hitDone && P.t >= mv.hit){ P.hitDone = true; strike(P); }
      if (P.t >= mv.dur){ P.state = 'idle'; P.y = 0; P.kick = 0; P.chainT = P.idx >= 5 ? 0 : .62; if (P.buf) beginAttack(P, P.bufOn); }
      break; }
    case 'dash':
      P.t -= dt; P.x += P.dvx*dt; P.z += P.dvz*dt; lean = .6; armR = -.6;
      P.gT -= dt; if (P.gT <= 0){ P.gT = .028; ghost(P.x, P.z, P.a, P.pi ? 0x0a1a2a : 0x2a0d0a, .5); }
      if (P.t <= 0) P.state = 'idle';
      break;
    case 'hurt': P.t -= dt; lean = -.4; armR = 1.4; if (P.t <= 0) P.state = 'idle'; break;
  }
  if (sp && dir){ P.x += dir[0]*6.3*sp*dt; P.z += dir[1]*(IS3D ? 6.3 : 4.1)*sp*dt; P.moving = sp > .5; }
  if (IS3D) P.x = clamp(P.x, XA+.6, G.lockRight-.6); else P.x = clamp(P.x, cam.x-G.halfW+.6, Math.min(cam.x+G.halfW-.6, G.lockRight-.6));
  P.z = clamp(P.z, ZMIN, ZMAX);
  setAlpha(P, P.stealth > 0 ? .3 : (P.inv > 0 && P.state !== 'dash' && Math.floor(G.rt*24)%2 ? .45 : 1));
  pose(P, dt, armR, P.state === 'dash' ? -.8 : armL, lean, twist);
}

// ───────────────────────── 飛行道具、補給、落點攻擊 ─────────────────────────
const shots = [], pickups = [], hazards = [];
const starMat = new THREE.MeshBasicMaterial({ color: 0xe9eff6 }), starMatE = new THREE.MeshBasicMaterial({ color: 0xdca6ff });
function shoot(x,z,a,speed,owner,dmg){
  const g = new THREE.Group(), m = owner === 'e' ? starMatE : starMat;
  if (IS3D){ part(g,GEO.box,m,.46,.03,.1,0,0,0); part(g,GEO.box,m,.1,.03,.46,0,0,0); } else { part(g,GEO.box,m,.42,.1,.03,0,0,0); part(g,GEO.box,m,.1,.42,.03,0,0,0); }
  g.position.set(x,1.3,z); scene.add(g);
  shots.push({ g, x, z, x0:x, z0:z, a, vx:Math.cos(a)*speed, vz:Math.sin(a)*speed, owner, dmg, life:2.4, dead:false }); AU.shur();
}
function updShots(dt){
  for (let i = shots.length-1; i >= 0; i--){
    const s = shots[i]; s.life -= dt; s.x += s.vx*dt; s.z += s.vz*dt; s.g.position.set(s.x,1.3,s.z);
    if (IS3D) s.g.rotation.y += dt*26; else s.g.rotation.z -= dt*26*Math.sign(s.vx || 1);
    if (!s.dead){
      if (s.owner !== 'e'){
        for (const e of enemies){ if (!targetable(e)) continue;
          if (Math.hypot(e.x-s.x, e.z-s.z) < .8*e.scale){ damage(e, s.dmg || 8*UP.dmg, { a:s.a, sx:s.x0, sz:s.z0 }); AU.hit(false); s.dead = true; break; } }
      } else for (const P of alive()){ if (Math.hypot(P.x-s.x, P.z-s.z) < .6 && P.state !== 'dash' && hurtPlayer(P, 8, s.a)){ s.dead = true; break; } }
      if (Math.abs(s.z) > EDGE-.1 || (IS3D && (s.x < XA+.2 || s.x > G.lockRight-.2))){ if (IS3D) spark(s.x,1.3,s.z); s.dead = true; }
    }
    if (s.dead || s.life <= 0){ scene.remove(s.g); shots.splice(i,1); }
  }
}
const riceMat = new THREE.MeshBasicMaterial({ color: 0xf6f1e4 }), noriMat = new THREE.MeshBasicMaterial({ color: 0x15201a });
function dropRice(x,z){
  const g = new THREE.Group(); part(g,GEO.cone,riceMat,.3,.42,.3,0,0,0).rotation.y = PI/4; part(g,GEO.box,noriMat,.32,.16,.32,0,-.1,0);
  g.position.set(x,.5,z); scene.add(g); pickups.push({ g, x, z, life:14 });
}
function updPickups(dt){
  for (let i = pickups.length-1; i >= 0; i--){
    const p = pickups[i]; p.life -= dt; p.g.position.y = .5 + Math.sin(G.rt*4+p.x)*.1; p.g.rotation.y += dt*2; p.g.visible = p.life > 3 || Math.floor(G.rt*8)%2 === 0;
    const P = alive().find(q => Math.hypot(q.x-p.x, q.z-p.z) < 1);
    if (P){ P.hp = Math.min(UP.hpMax, P.hp+15); pop('飯糰 +15', p.x, 2.2, p.z, 'gold'); AU.pick(); }
    if (P || p.life <= 0){ scene.remove(p.g); pickups.splice(i,1); }
  }
}
// 落點攻擊：地上先出現圈，時間到才命中。火矢、落雷、炸彈共用
const HAZ = { arrow:{ color:0xff3b2a, r:1.2, dmg:12 }, thunder:{ color:0x9fd0ff, r:1.5, dmg:14 }, bomb:{ color:0xff8a2a, r:1.6, dmg:14 } };
function addHazard(x,z,kind,t,owner){
  const c = HAZ[kind], m = new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({ color:c.color, transparent:true, opacity:.9, depthWrite:false, side:THREE.DoubleSide }));
  m.rotation.x = -PI/2; m.position.set(x,.05,z); m.scale.setScalar(c.r); scene.add(m);
  hazards.push({ m, x, z, t, kind, owner, fired:false });
}
function volley(kind){
  const pts = alive().map(p => [p.x, p.z]), L = lead();
  for (let i=0;i<3;i++){ const a = rand(0,2*PI), d = rand(2.5,7); pts.push(inBounds(L.x+Math.cos(a)*d, L.z+Math.sin(a)*d*(IS3D?1:.4))); }
  for (const [x,z] of pts) addHazard(x, z, kind, 1.05);
  AU.warn();
}
function updHazards(dt){
  for (let i = hazards.length-1; i >= 0; i--){
    const h = hazards[i], c = HAZ[h.kind]; h.t -= dt; h.m.material.opacity = .5 + .4*Math.sin(G.rt*30);
    if (h.kind === 'arrow' && !h.fired && h.t <= .2){ h.fired = true;
      for (let k=0;k<5;k++){ const p = spawnP(GEO.box, k%2 ? 0xffb347 : 0x2a1a10, h.x+rand(-.7,.7)+2.2, 9+k*.6, h.z+rand(-.7,.7), -11, -45, 0, .26, 1, {}); p.m.scale.set(.05,1.3,.05); p.m.rotation.z = -.24; } }
    if (h.t > 0) continue;
    if (h.kind === 'arrow'){ AU.arrow(); G.shake = Math.max(G.shake,.2); spark(h.x,.3,h.z);
      for (let k=0;k<4;k++){ const p = spawnP(GEO.box, 0x2a1a10, h.x+rand(-.7,.7), .55, h.z+rand(-.7,.7), 0,0,0, 2.2, 1, {}); p.m.scale.set(.05,1.2,.05); p.m.rotation.z = -.24+rand(-.1,.1); } }
    else if (h.kind === 'thunder'){ AU.thunder(); G.flash = 1; boomFx(h.x,h.z,0x9fd0ff);
      for (let k=0;k<3;k++){ const p = spawnP(GEO.box, 0xeaf6ff, h.x+rand(-.3,.3), 8, h.z+rand(-.3,.3), 0,0,0, .2, 1, { add:true }); p.m.scale.set(.16,16,.16); p.m.rotation.z = rand(-.08,.08); } }
    else { AU.boom(); boomFx(h.x,h.z,0xff8a2a); }
    for (const P of alive()) if (Math.hypot(P.x-h.x, P.z-h.z) < c.r && P.state !== 'dash') hurtPlayer(P, c.dmg, Math.atan2(P.z-h.z, P.x-h.x));
    for (const e of enemies) if (e !== h.owner && targetable(e) && Math.hypot(e.x-h.x, e.z-h.z) < c.r) damage(e, 15, { a:Math.atan2(e.z-h.z, e.x-h.x), sx:h.x, sz:h.z, ult:true });
    scene.remove(h.m); h.m.material.dispose(); hazards.splice(i,1);
  }
}

// ───────────────────────── 敵人 ─────────────────────────
const enemies = [];
let boss = null;
const HP = { g:30, t:20, k:40, b:26, f:28, s:240, j:340, x:620, c:1 };
const NAMES = { s:'武士', j:'上忍', x:'影將軍' };
function spawn(kind,where,i,at){
  const ai = kind === 'd' ? 'g' : kind, L = lead();
  const hp = ai === 'c' ? 1 : Math.round(HP[ai] * DIFF.hp * (1 + .05*G.si) * (G.np === 2 ? 1.5 : 1));
  const e = Object.assign(makeFighter(ai === 'c' ? 'j' : ai), {
    ai, brain: ai === 'x' ? 'j' : ai, big: ai === 'x', hp, maxHp:hp, state:'chase', t:0, cd:rand(.5,1.4), cd2:rand(2,4), tp:rand(3,5), dead:false,
    slotA:rand(0,2*PI), slot:rand(0,1.6), zoff:rand(-1.6,1.6), lost:0, guard:3, guardT:0, called:false, hitP:false, side:0, phase:0, hits:0, n:0, tg:L,
  });
  e.th = e.big ? [.75,.5,.25] : [.66,.33];
  if (kind === 'd'){ e.x = where; e.side = IS3D ? (Math.floor(where/2)%2 ? 1 : -1) : -1; e.z = e.side*(EDGE+.9); e.state = 'lurk'; e.lurkT = 8; e.a = e.va = -e.side*PI/2; }
  else if (at){ e.x = at[0]; e.z = at[1]; e.a = e.va = aimAt(e,L); }
  else if (IS3D || where === 'A'){   // 忍者從上方落下
    const a = rand(0,2*PI), d = NAMES[ai] ? 7 : rand(5,8.5);
    [e.x, e.z] = inBounds(L.x + Math.cos(a)*d, L.z + Math.sin(a)*d*(IS3D?1:.35));
    if (Math.hypot(e.x-L.x, e.z-L.z) < 3.5) e.x = inBounds(L.x + (L.x < (zoneLeft()+G.lockRight)/2 ? 6 : -6), 0)[0];
    e.state = 'drop'; e.t = -(i||0)*.22; e.y = 9; e.root.visible = false; e.a = e.va = aimAt(e,L);
  } else { const side = where === 'L' ? -1 : 1; e.x = cam.x + side*(G.halfW + 1.6 + (i||0)*1.3); e.z = rand(ZMIN+.4, ZMAX-.2); e.a = e.va = side > 0 ? PI : 0; }
  if (ai === 'c') e.root.traverse(o => { o.castShadow = false; });
  if (NAMES[ai]){ boss = e; $('bossName').textContent = NAMES[ai]; $('boss').style.display = 'block'; e.cd = 1.5; AU.say(ai === 'x' ? '我が影に沈め' : '曲者め', .1, .8); }
  e.root.position.set(e.x,e.y,e.z);
  enemies.push(e); return e;
}
function damage(e,d,o){
  if (e.state === 'vanish' || e.dead) return false;
  if (e.ai === 'c'){ smokeFx(e.x,e.z,10,.8); pop('幻影', e.x, 2.9, e.z); e.dead = true; e.state = 'dead'; e.t = 1.4; e.warn = 0; setAlpha(e,.12); return true; }
  const front = isFront(e, o.sx, o.sz);
  if (e.ai === 's' && !o.ult && !o.stealth && front && e.state === 'chase'){
    spark(e.x+Math.cos(e.a)*.7, 1.9, e.z+Math.sin(e.a)*.7); AU.block();
    if (o.on){
      e.guard--; e.guardT = 3.5;
      if (e.guard <= 0){ e.guard = 3; e.state = 'stagger'; e.t = 2.6; e.warn = 0; kanji('破'); G.slowT = .35; }
      else pop('合拍 ' + (3-e.guard) + '/3', e.x, 3.5, e.z, 'gold');
    } else pop('格擋', e.x, 3.5, e.z);
    return !!o.on;
  }
  const big = !!NAMES[e.ai];
  if (o.stealth){ pop('暗殺', e.x, 2.9*e.scale, e.z, 'red'); d = big ? 70*UP.dmg : 9999; if (big && e.state !== 'lunge'){ e.state = 'stagger'; e.t = 1.5; e.warn = 0; } }
  else if (e.ai === 's' && !front && !o.ult) pop('背刺', e.x, 3.5, e.z);
  e.hp -= d; e.flash = .1; e.hits++; ink(e.x, 1.3*e.scale, e.z, o.a, d > 15 ? 10 : 6);
  const kb = big ? (o.kick ? 3 : 1.2) : (o.kick ? 11 : e.hp <= 0 ? 9 : 5);
  e.vx += Math.cos(o.a)*kb; e.vz += Math.sin(o.a)*kb*(IS3D?1:.3);
  if (!big){ e.warn = 0; e.state = 'stun'; e.t = o.kick ? 1.1 : .34; e.down = o.kick ? 1 : 0; if (o.kick) pop('踢倒', e.x, 2.6, e.z); }   // 踢擊會把小兵踢倒在地
  if (e.hp <= 0) killEnemy(e, o.a);
  else if (e.brain === 'j' && e.hits % 5 === 0 && e.state !== 'stagger'){ e.state = 'vanish'; e.t = .25; e.warn = 0; e.away = true; smokeFx(e.x,e.z,10,.7); AU.blink(); }
  return true;
}
function killEnemy(e,a){
  e.dead = true; e.state = 'dead'; e.t = 0; e.warn = 0; e.hp = 0; if (!e.side) e.a = a + PI;
  G.kills++; G.score += 100*(1 + Math.floor(G.combo/5)); alive().forEach(p => { p.shur = Math.min(UP.shurMax, p.shur+1); }); AU.dieV();
  const low = alive().some(p => p.hp < UP.hpMax*.4);
  if (!e.side && Math.random() < (low ? DIFF.rice*2.4 : DIFF.rice)) dropRice(e.x, e.z);
  if (NAMES[e.ai]){
    G.score += 2000; G.shake = .7; G.slowT = 1.2;
    const other = enemies.find(o => !o.dead && NAMES[o.ai]);
    if (other){ boss = other; $('bossName').textContent = NAMES[other.ai]; return; }   // 雙魔王：還有一隻就繼續
    $('boss').style.display = 'none'; boss = null;
    for (const o of enemies) if (!o.dead){ o.dead = true; o.state = 'dead'; o.t = o.ai === 'c' ? 1.4 : 0; o.warn = 0; o.root.visible = true; o.y = 0; if (o.ai === 'c') smokeFx(o.x,o.z,8,.7); }
  }
}
function moveTo(e,tx,tz,sp,dt){
  const dx = tx-e.x, dz = tz-e.z, d = Math.hypot(dx,dz);
  if (d > .15){ const s = Math.min(sp*dt, d); e.x += dx/d*s; e.z += dz/d*s*(IS3D?1:.8); e.moving = true; } else e.moving = false;
}
function startWindup(e,t,atk){
  e.state = 'windup'; e.t = e.t0 = t*DIFF.wind; e.atk = atk; G.attackers++; AU.warn();
  if (e.ai === 's' || e.big) AU.growl(); else if (atk === 'chain') AU.chain(); else if (atk === 'bomb') AU.fuse();
}
function blinkTo(e,x,z,P){
  const pink = STAGES[G.si].theme === 'garden';
  smokeFx(e.x,e.z,8,.7); leafFx(e.x,e.z,10,pink);
  [e.x, e.z] = inBounds(x, z); e.a = e.va = aimAt(e,P);
  smokeFx(e.x,e.z,8,.7); leafFx(e.x,e.z,10,pink); AU.blink();
}
// 站位：靠近玩家到 dist 的距離。2.5D 會順便對齊前後位置，才打得到
function near(e,P,dist){
  if (IS3D){ const dx = e.x-P.x, dz = e.z-P.z, d = Math.hypot(dx,dz) || .01; return [P.x+dx/d*dist, P.z+dz/d*dist]; }
  return [P.x + (e.x < P.x ? -1 : 1)*dist, P.z];
}
const lined = (e,P,w) => IS3D || Math.abs(P.z-e.z) < w;
function meleeMove(e,dt,P,d,speed,wind){
  const free = G.attackers < 2 && e.cd <= .6;
  if (free){ const [tx,tz] = near(e,P,1.5); moveTo(e,tx,tz,speed,dt); }
  else if (IS3D){ e.slotA += dt*.25; moveTo(e, P.x+Math.cos(e.slotA)*(3.4+e.slot), P.z+Math.sin(e.slotA)*(3.4+e.slot), speed*.85, dt); }
  else { const [tx] = near(e,P,3.2+e.slot); moveTo(e, tx, clamp(P.z+e.zoff, ZMIN, ZMAX), speed*.85, dt); }
  if (G.attackers < 2 && e.cd <= 0 && d < 2.05 && lined(e,P,.6)) startWindup(e, wind, 'slash');
}
function rangedMove(e,dt,P,d,minD,maxD,keep){
  if (d < minD){ const [tx,tz] = near(e,P,d+2.5); moveTo(e, inBounds(tx,tz)[0], tz, 3.2, dt); }
  else if (d > maxD){ const [tx,tz] = near(e,P,keep); moveTo(e,tx,tz,2.6,dt); }
  else if (IS3D){ e.slotA += dt*.3; const ux = (P.x-e.x)/d, uz = (P.z-e.z)/d; moveTo(e, e.x-uz*Math.sin(e.slotA), e.z+ux*Math.sin(e.slotA), 1.3, dt); }
  else moveTo(e, e.x, P.z, 2.2, dt);
}
function cloneJutsu(e,P){
  kanji('分身'); AU.say('分身の術', .1, .8); AU.ult(); G.slowT = .5;
  for (const o of enemies) if (o.ai === 'c' && !o.dead){ o.dead = true; o.state = 'dead'; o.t = 1.4; o.warn = 0; smokeFx(o.x,o.z,8,.7); }
  const n = Math.min(3, e.phase + 1), a0 = rand(0,2*PI), spots = [];
  for (let i = 0; i <= n; i++) spots.push(IS3D ? inBounds(P.x + Math.cos(a0 + i*2*PI/(n+1))*5.5, P.z + Math.sin(a0 + i*2*PI/(n+1))*5.5) : [lerp(viewL()+.5, viewR()-.5, (i+.5)/(n+1)), rand(ZMIN+.4, ZMAX-.4)]);
  spots.sort(() => Math.random()-.5);
  smokeFx(e.x,e.z,14); [e.x, e.z] = spots[0]; smokeFx(e.x,e.z,10,.8);
  for (let i = 1; i <= n; i++){ const c = spawn('c', null, 0, spots[i]); c.cd = rand(.6,1.4); smokeFx(c.x,c.z,10,.8); }
  e.state = 'recover'; e.t = .7; e.atk = ''; e.cd = .8;
}
function chase(e,dt,P,lost){
  if (lost){ e.lost += dt; if (e.lost > .6){ e.lost = 0; e.a += IS3D ? rand(1.5,3.5) : PI; } e.moving = false; return; }
  const d = Math.hypot(P.x-e.x, P.z-e.z) || .01;
  e.a = aimAt(e,P);
  switch (e.brain){
    case 'g': meleeMove(e,dt,P,d,3.0,.46); break;
    case 'c': meleeMove(e,dt,P,d,3.6,.4); break;
    case 'b':
      e.cd2 -= dt;
      if (e.cd2 <= 0 && G.attackers < 2 && d < 14){ e.cd2 = rand(4,6.5); blinkTo(e, P.x - Math.cos(P.a)*1.7, P.z - Math.sin(P.a)*1.7, P); startWindup(e, .55, 'slash'); }
      else meleeMove(e,dt,P,d,3.2,.46);
      break;
    case 't': rangedMove(e,dt,P,d,4.2,8.5,7); if (e.cd <= 0 && d < 13 && lined(e,P,.5)) startWindup(e, .55, 'throw'); break;
    case 'k': rangedMove(e,dt,P,d,3.5,6.5,5.5); if (e.cd <= 0 && d < 7.4 && lined(e,P,.6)) startWindup(e, .75, 'chain'); break;
    case 'f': rangedMove(e,dt,P,d,4.5,9,7); if (e.cd <= 0 && d < 11) startWindup(e, .6, 'bomb'); break;
    case 's': {
      e.guardT -= dt; if (e.guardT <= 0) e.guard = 3;
      const [tx,tz] = near(e,P,2.3); moveTo(e,tx,tz,2.2,dt);
      if (e.cd <= 0){ if (d > 5 && lined(e,P,1)) startWindup(e, .62, 'lunge'); else if (d < 3.1 && lined(e,P,.8)) startWindup(e, .68, 'heavy'); }
      if (!e.called && e.hp <= e.maxHp*.5){ e.called = true; pop('增援', e.x, 3.8, e.z, 'red'); spawn('g','L',0); spawn('g','R',0); }
      break; }
    case 'j': {
      e.tp -= dt;
      if (e.phase < e.th.length && e.hp <= e.maxHp*e.th[e.phase]){ e.phase++; cloneJutsu(e,P); break; }
      if (e.cd <= 0){
        if (e.tp <= 0){ e.tp = rand(5,7); e.state = 'vanish'; e.t = .28; e.away = false; smokeFx(e.x,e.z,10,.7); AU.blink(); break; }
        if (d > 5 && lined(e,P,1.8)){ startWindup(e, .5, e.big && Math.random() < .5 ? 'lunge' : 'fan'); break; }
        if (d < (e.big ? 3.2 : 2.4) && lined(e,P,.7)){ startWindup(e, e.big ? .5 : .34, e.big && Math.random() < .5 ? 'heavy' : 'combo'); break; }
      }
      const [tx,tz] = near(e,P,e.big ? 2.4 : 1.9); moveTo(e,tx,tz,e.big ? 3.1 : 3.7,dt);
      break; }
  }
}
function hitPlayers(e,range,zw,arc,dmg){ let any = false; for (const P of alive()) if (reach(e,P,range,zw,arc) && hurtPlayer(P,dmg,e.a)) any = true; return any; }
function doAttack(e,P){
  const dx = P.x-e.x, dz = P.z-e.z, d = Math.hypot(dx,dz) || .01;
  e.warn = 0;
  switch (e.atk){
    case 'slash': slashFx(e.x,1.25,e.z,e.a,.2,0xff8a70,1); hitPlayers(e, 2.3, 1, 1.0, e.ai === 'c' ? 8 : 10); e.state = 'recover'; e.t = .5; e.cd = rand(1.3,2.3); break;
    case 'slash2': slashFx(e.x,1.3,e.z,e.a,.1,0xffc76b,1.3); hitPlayers(e, 2.8, 1.1, 1.2, 14); e.state = 'recover'; e.t = .6; e.cd = .8; break;
    case 'throw': shoot(e.x+Math.cos(e.a)*.6, e.z+Math.sin(e.a)*.6, e.a, 10.5, 'e'); e.state = 'recover'; e.t = .4; e.cd = rand(2,3); break;
    case 'fan': for (const da of [-.3,0,.3]) shoot(e.x+Math.cos(e.a)*.6, e.z+Math.sin(e.a)*.6, e.a+da, 11, 'e'); e.state = 'recover'; e.t = .5; e.cd = 1.1; break;
    case 'bomb': {
      const T = .95, g = 14; addHazard(P.x, P.z, 'bomb', T, e);
      spawnP(GEO.sph, 0x1a1410, e.x, 1.6, e.z, dx/T, -1.6/T + .5*g*T, dz/T, T, .17, { g });
      e.state = 'recover'; e.t = .5; e.cd = rand(2.8,4); break; }
    case 'chain': {
      const reachD = 7.6, off = Math.abs(adiff(Math.atan2(dz,dx), e.a));
      const hitP = d > .5 && d < reachD && off < 1.2 && d*Math.sin(off) < .95 && P.inv <= 0 && P.state !== 'dash' && P.stealth <= 0 && !P.dead;
      lineFx(e.x+Math.cos(e.a)*.4, e.z+Math.sin(e.a)*.4, hitP ? P.x : e.x+Math.cos(e.a)*reachD, hitP ? P.z : e.z+Math.sin(e.a)*reachD, 1.25, 0xcfd6dc, .22);
      if (hitP && hurtPlayer(P, 6, e.a+PI)){
        pop('鎖！', P.x, 2.8, P.z, 'red'); const pull = (d-1.6)*6.9; P.vx = -dx/d*pull; P.vz = -dz/d*pull; P.inv = .2; P.t = .2;
        e.state = 'windup'; e.t = e.t0 = .42*DIFF.wind; e.atk = 'slash'; G.attackers++;
      } else { e.state = 'recover'; e.t = .7; }
      e.cd = rand(2.6,3.8); break; }
    case 'heavy': slashFx(e.x,1.7,e.z,e.a,.15,0xff5a48,1.8*(e.big ? 1.2 : 1)); G.shake = Math.max(G.shake,.25); hitPlayers(e, e.big ? 4 : 3.6, 1.3, 1.2, 22); e.state = 'recover'; e.t = 1.0; e.cd = 1.3; break;
    case 'combo': e.state = 'combo'; e.n = 3; e.t = 0; break;
    default: e.state = 'lunge'; e.t = .38; e.hitP = false; AU.dash();
  }
}
function updEnemy(e,dt){
  e.flash -= dt; e.cd -= dt; e.moving = false;
  let armR = .45, armL = -.2, lean = 0, twist = 0;
  e.x += e.vx*dt; e.z += e.vz*dt; const fr = Math.pow(.002,dt); e.vx *= fr; e.vz *= fr;
  // 目標：最近、沒有隱身的玩家。都隱身或都倒下時，敵人會失去目標
  let P = null, bd = 1e9;
  for (const p of PL) if (p.on && !p.dead && p.stealth <= 0){ const d = Math.hypot(p.x-e.x, p.z-e.z); if (d < bd){ bd = d; P = p; } }
  const lost = !P; P = P || e.tg || PL[0]; e.tg = P;
  switch (e.state){
    case 'dead':
      e.t += dt; e.model.rotation.z = Math.min(1,e.t*4)*PI/2; armR = 1.2;
      if (e.t > .9 && e.ai !== 'c') setAlpha(e, clamp(1-(e.t-.9)/.6, 0, 1));
      if (e.t > 1.5){ disposeFighter(e); return false; }
      break;
    case 'drop':
      e.t += dt; if (e.t < 0) break;
      e.root.visible = true; e.y = Math.max(0, 9*(1 - (e.t/.42)*(e.t/.42))); armR = 2.6; armL = 2.2;
      if (e.t >= .42){ e.y = 0; e.state = 'chase'; e.cd = Math.max(e.cd,.5); smokeFx(e.x,e.z, NAMES[e.ai] ? 20 : 8, NAMES[e.ai] ? 1.3 : .7); AU.land(); if (NAMES[e.ai]) G.shake = .6; else leafFx(e.x,e.z,6); }
      break;
    case 'lurk':
      e.lurkT -= dt; armR = 1.6; e.a = e.va = -e.side*PI/2 + Math.sin(G.rt*1.5+e.x)*.5;
      if (e.lurkT <= 0){ breakPanel(e.x, e.side); e.state = 'burst'; e.t = 0; }
      break;
    case 'burst': {
      e.t += dt; const p = Math.min(1, e.t/.3); e.z = e.side*lerp(EDGE+.9, EDGE-1.3, p); e.y = Math.sin(p*PI)*.6; armR = 2.6;
      if (p >= 1){ e.y = 0; e.side = 0; e.state = 'chase'; e.cd = .6; } break; }
    case 'stun': e.t -= dt;
      if (e.down){ e.model.rotation.z = lerp(e.model.rotation.z, e.t > .3 ? 1.4 : 0, Math.min(1,dt*12)); armR = 1.2; armL = 1; } else { lean = -.5; armR = 1.5; }
      if (e.t <= 0){ e.state = 'chase'; if (e.down){ e.down = 0; e.model.rotation.z = 0; } }
      break;
    case 'stagger': e.t -= dt; lean = .7; armR = -.3; armL = .3; if (e.t <= 0){ e.state = 'chase'; e.cd = .6; } break;
    case 'chase': chase(e,dt,P,lost); if (e.ai === 's' || e.big) armR = 1.1; break;
    case 'vanish':
      e.t -= dt; setAlpha(e, clamp(e.t/.28, 0, 1));
      if (e.t <= 0){
        setAlpha(e,1);
        if (e.away){ const a = rand(0,2*PI); blinkTo(e, P.x+Math.cos(a)*6.5, P.z+Math.sin(a)*6.5*(IS3D?1:.3), P); e.state = 'chase'; e.cd = .7; }
        else { blinkTo(e, P.x - Math.cos(P.a)*1.8, P.z - Math.sin(P.a)*1.8, P); startWindup(e, .38, 'slash2'); }
      }
      break;
    case 'windup': {
      e.t -= dt; const p = 1 - e.t/e.t0; e.warn = .5 + .5*Math.sin(p*22);
      if (e.atk === 'throw' || e.atk === 'fan' || e.atk === 'bomb'){ armL = lerp(-.2,2.8,p); e.a = aimAt(e,P); }
      else if (e.atk === 'chain'){ armL = G.rt*26 % (2*PI); armR = 1.2; if (p < .75) e.a = aimAt(e,P); }
      else if (e.atk === 'lunge'){ armR = lerp(.45,-.5,p); lean = -.3; if (p < .7) e.a = aimAt(e,P); }
      else if (IS3D){ armR = 1.5; twist = lerp(0,1.3,p); lean = -.2; }
      else { armR = lerp(.45,3.0,p); lean = -.2; }
      if (e.t <= 0) doAttack(e,P);
      break; }
    case 'combo':
      e.t -= dt; lean = .35; if (IS3D){ armR = 1.5; twist = e.n % 2 ? 1.1 : -1.1; } else armR = e.n % 2 ? 2.6 : 0;
      if (e.t <= 0){
        if (e.n > 0){
          e.n--; e.t = .2; e.a = aimAt(e,P); e.x += Math.cos(e.a)*.7; e.z += Math.sin(e.a)*.7;
          slashFx(e.x,1.25,e.z,e.a,[.25,-.25,0][e.n],0xffc76b,1.1); AU.slash(false); hitPlayers(e, 2.4, 1, 1.1, 9);
        } else { e.state = 'recover'; e.t = .8; e.cd = 1.0; e.atk = ''; }
      }
      break;
    case 'lunge':
      e.t -= dt; e.x += Math.cos(e.a)*19*dt; e.z += Math.sin(e.a)*19*dt; armR = 1.57; lean = .55; e.gT = (e.gT||0) - dt;
      if (e.gT <= 0){ e.gT = .03; ghost(e.x, e.z, e.a, 0x5a0f0a, .4); }
      if (!e.hitP) for (const q of alive()) if (Math.hypot(q.x-e.x, q.z-e.z) < 1.4 && hurtPlayer(q, 18, e.a)) e.hitP = true;
      if (e.t <= 0){ e.state = 'recover'; e.t = 1.1; e.cd = 1.2; }
      break;
    case 'recover': e.t -= dt; lean = .3;
      if (e.atk === 'lunge') armR = 1.2; else if (IS3D){ armR = 1.5; twist = -1.2; } else armR = -.1;
      if (e.t <= 0) e.state = 'chase'; break;
  }
  if (e.state !== 'lurk' && e.state !== 'burst' && e.state !== 'dead'){
    e.z = clamp(e.z, ZMIN, ZMAX);
    if (IS3D) e.x = clamp(e.x, XA+.5, G.lockRight-.5);
    else { if (Math.abs(e.x-cam.x) < G.halfW) e.seen = true; if (e.seen) e.x = clamp(e.x, cam.x-G.halfW+.4, cam.x+G.halfW-.4); }
  }
  pose(e, dt, armR, armL, lean, twist);
  return true;
}
function updEnemies(dt){
  G.attackers = 0;
  for (const e of enemies) if (e.state === 'windup' || e.state === 'lunge' || e.state === 'combo') G.attackers++;
  for (let i = enemies.length-1; i >= 0; i--) if (!updEnemy(enemies[i], dt)) enemies.splice(i,1);
  const solid = e => targetable(e) && e.state !== 'burst';
  for (let i = 0; i < enemies.length; i++){ const a = enemies[i]; if (!solid(a)) continue;
    for (let j = i+1; j < enemies.length; j++){ const b = enemies[j]; if (!solid(b)) continue;
      const dx = b.x-a.x, dz = b.z-a.z, d = Math.hypot(dx,dz) || .01;
      if (d < 1){ const p = (1-d)*3*dt; a.x -= dx/d*p; a.z -= dz/d*p; b.x += dx/d*p; b.z += dz/d*p; } } }
}

// ───────────────────────── 關卡資料 ─────────────────────────
// 每一波用字串描述：第一個字母是敵人（g 下忍、t 手裏劍忍、k 鎖鎌忍、b 霧隱忍、f 爆彈忍、s 武士、j 上忍、x 影將軍、d 躲在紙門後），
// 後面是出場位置（L／R 從左右進場、A 從天而降、數字是紙門的位置）。3D 版一律從天而降。
const STAGES = [
  { name:'居酒屋', no:'第一關', theme:'izakaya', bpm:112, par:150, zones:[
    { right:20, hints:['連按 J 打出五連擊　橫斬、正斬、跳斬、踢擊、飛鏢', '光圈收到鼓面的瞬間出刀就是合拍　傷害加倍'], waves:['gR gR','gR gL gR'] },
    { right:40, hints:['紙門上有人影　貼近門邊出刀，隔門斬殺','K 瞬身穿過暗器　L 手裏劍'], waves:['d27 d33 gR','tR tR gL gL'] },
    { right:60, hints:['空白鍵 煙霧彈　隱身時出刀即為暗殺','武士會格擋正面　繞背、煙霧，或連續三次合拍破防'], waves:['gR gL tR d49 d53','sR'] } ]},
  { name:'屋頂月夜', no:'第二關', theme:'roof', bpm:118, par:170, hazard:'arrow', zones:[
    { right:20, hints:['地上出現紅圈時快離開，火矢將至','火矢也會射中敵人，把他們引進紅圈'], waves:['gA gA gA','kR gA gL'] },
    { right:40, hints:['鎖鎌忍會把你拉過去　看到他甩鎖鏈就瞬身閃開'], waves:['kL kR tR','gA gA tL tR kR'] },
    { right:60, hints:['氣滿時發動分身斬，一次清場'], waves:['gA gA gA kR tL','sR kL tA'] } ]},
  { name:'竹林', no:'第三關', theme:'bamboo', bpm:110, par:170, zones:[
    { right:20, hints:['霧隱忍會瞬移到你背後　看到煙霧炸開就轉身出刀'], waves:['bR bL','bR gL gR tR'] },
    { right:40, hints:['撿起飯糰可以回復體力'], waves:['bL bR kR','tL tR bR gA gA'] },
    { right:60, hints:['竹林深處埋伏重重'], waves:['bR bL bA kL','bA bA bA tL tR gA gA'] } ]},
  { name:'櫻花庭院', no:'第四關', theme:'garden', bpm:106, par:180, zones:[
    { right:20, hints:['各路忍者聯手了　先解決遠處丟暗器的'], waves:['gR gL kR bL','tL tR bA bA'] },
    { right:40, hints:['落花之中，留意背後'], waves:['kL kR bR gA','gA gA gA tL tR bR'] },
    { right:60, hints:['武士與霧隱忍聯手　先清掉小兵再對付武士'], waves:['bR bL kL tR','sR bL bR'] } ]},
  { name:'道場', no:'第五關', theme:'dojo', bpm:126, par:150, zones:[
    { right:20, hints:['鼓點加快了　穩住節奏'], waves:['gR gL bR kL','tR tL bL gA gA'] },
    { right:44, hints:['上忍會使分身術　真身腳下才有影子'], waves:['jR'] } ]},
  { name:'雪之寺', no:'第六關', theme:'snow', bpm:114, par:190, zones:[
    { right:20, hints:['爆彈忍會丟炸彈　橘色圈出現就離開，也能引敵人去炸'], waves:['fR gL gR','fL fR gA gA'] },
    { right:40, hints:['先收拾爆彈忍，場面會輕鬆很多'], waves:['fR tL kR gA','bL bR fR tR gA'] },
    { right:60, hints:['雪地決鬥'], waves:['fL fR kL kR','sR fL fR'] } ]},
  { name:'港町', no:'第七關', theme:'harbor', bpm:120, par:200, hazard:'arrow', zones:[
    { right:20, hints:['船上有弓兵　留意紅圈'], waves:['kR kL gA gA','fR tL bA gA gA'] },
    { right:40, hints:['棧橋狹路相逢'], waves:['tL tR fL fR','bA bA kR kL gA'] },
    { right:60, hints:['港口的守將現身'], waves:['gA gA gA gA fR tL','sR kL kR tA'] } ]},
  { name:'城門', no:'第八關', theme:'gate', bpm:124, par:210, hazard:'arrow', zones:[
    { right:20, hints:['城門起火　火矢如雨'], waves:['gR gL gA gA tR fL','kR kL bA bA'] },
    { right:40, hints:['石垣之下，寸步不讓'], waves:['fL fR tL tR gA gA','bA bA bA kR fL'] },
    { right:60, hints:['雙武士把守城門　用煙霧各個擊破'], waves:['gA gA kL kR tR fL','sR sL'] } ]},
  { name:'天守', no:'第九關', theme:'tenshu', bpm:128, par:220, zones:[
    { right:20, hints:['金屏風後也藏著人'], waves:['d7 d13 gR gL bR','tR tL fR kL d9'] },
    { right:40, hints:['步步驚心'], waves:['d27 d31 d35 bA bA','kR kL fL fR gA gA'] },
    { right:62, hints:['上忍再臨，這次帶著幫手'], waves:['jR bL bR'] } ]},
  { name:'天守閣頂', no:'最終關', theme:'castletop', bpm:132, par:240, hazard:'thunder', zones:[
    { right:20, hints:['暴風將至　藍圈出現時落雷就要劈下'], waves:['gA gA bA kR fL tR','sR bA bA fL'] },
    { right:46, hints:['影將軍　兼具武士的剛猛與上忍的詭譎'], waves:['xR'] } ]},
];
const UPGRADES = [
  { name:'利刃', text:'斬擊與手裏劍傷害 +25%', ap(){ UP.dmg *= 1.25; } },
  { name:'鏢囊', text:'手裏劍上限 +3', ap(){ UP.shurMax += 3; } },
  { name:'霧隱', text:'隱身延長 1.5 秒，冷卻縮短 2 秒', ap(){ UP.stealth += 1.5; UP.smokeCD = Math.max(3, UP.smokeCD-2); } },
  { name:'鼓心', text:'合拍的判定放寬 30%', ap(){ UP.beatWin *= 1.3; } },
  { name:'氣海', text:'氣的累積速度 +50%', ap(){ UP.ki *= 1.5; } },
  { name:'鐵身', text:'體力上限 +30', ap(){ UP.hpMax += 30; } },
  { name:'疾風', text:'瞬身冷卻縮短 40%', ap(){ UP.dashCD *= .6; } },
  { name:'活泉', text:'每清完一區多回復 15 體力', ap(){ UP.heal += 15; } },
];
const SAVE_KEY = 'kage_v3_' + (IS3D ? '3d' : '25');
let SAVE = { unlocked:0, diff:1, np:1, best:{} };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s.unlocked === 'number') SAVE = Object.assign(SAVE, s); } catch(e){}
function saveNow(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch(e){} }
const bestKey = i => DIFF.id + G.np + ':' + i;
const fmtTime = t => { const m = Math.floor(t/60), s = t - m*60; return String(m).padStart(2,'0') + ':' + s.toFixed(1).padStart(4,'0'); };
function drawTitle(){
  DIFF = DIFFS[SAVE.diff] || DIFFS[1]; G.np = SAVE.np === 2 ? 2 : 1;
  $('segDiff').innerHTML = DIFFS.map((d,i) => `<button class="${i === SAVE.diff ? 'on' : ''}" data-i="${i}">${d.name}<small>${d.note}</small></button>`).join('');
  $('segNp').innerHTML = [1,2].map(n => `<button class="${n === G.np ? 'on' : ''}" data-n="${n}">${n === 1 ? '單人' : '雙人合作'}<small>${n === 1 ? '一人潛入' : TOUCH ? '需要鍵盤或手把' : '同一畫面並肩作戰'}</small></button>`).join('');
  $('segDiff').querySelectorAll('button').forEach(b => b.onclick = () => { SAVE.diff = +b.dataset.i; saveNow(); drawTitle(); });
  $('segNp').querySelectorAll('button').forEach(b => b.onclick = () => { SAVE.np = +b.dataset.n; saveNow(); drawTitle(); });
  $('keys2').style.opacity = G.np === 2 ? 1 : .35;
  $('stages').innerHTML = STAGES.map((s,i) => { const b = SAVE.best[bestKey(i)], lock = i > SAVE.unlocked;
    return `<button class="btn" data-i="${i}" ${lock ? 'disabled' : ''}><span>${i+1}　${s.name}</span><em>${lock ? '未解鎖' : b ? b.r + '　' + fmtTime(b.t) : '—'}</em></button>`; }).join('');
  $('stages').querySelectorAll('button').forEach(b => b.onclick = () => startRun(+b.dataset.i));
}
drawTitle();

// ───────────────────────── 關卡流程 ─────────────────────────
function spawnWave(){
  const z = Z()[G.zi], toks = z.waves[G.wi].split(' '); let l = 0, r = 0, a = 0, hasBoss = false;
  for (const tk of toks){ const k = tk[0], w = tk.slice(1); if (NAMES[k]) hasBoss = true;
    if (k === 'd') spawn('d', +w, 0); else spawn(k, w, w === 'L' ? l++ : w === 'R' ? r++ : a++); }
  if (!hasBoss) for (let i=0;i<DIFF.extra;i++) spawn('g', 'A', a++);
  hint(z.hints[Math.min(G.wi, z.hints.length-1)]);
}
function updZones(dt){
  if (G.mode !== 'play') return;
  const zs = Z(), z = zs[G.zi], st = STAGES[G.si];
  if (!G.zoneActive){
    if (alive().some(p => p.x > zoneLeft() + (IS3D ? 3 : (G.zi ? 3 : -99)))){ G.zoneActive = true; G.wi = 0; $('go').classList.remove('on'); spawnWave(); G.hazT = 5; }
    return;
  }
  if (st.hazard){ G.hazT -= dt; if (G.hazT <= 0){ G.hazT = rand(5,7.5); volley(st.hazard); } }
  let live = 0, lurk = 0;
  for (const e of enemies) if (!e.dead){ live++; if (e.state === 'lurk') lurk++; }
  if (live && live === lurk) for (const e of enemies) if (e.state === 'lurk') e.lurkT = Math.min(e.lurkT, 2.5);
  if (live) return;
  G.wi++;
  if (G.wi < z.waves.length){ spawnWave(); return; }
  G.zoneActive = false; hint('');
  if (G.zi < zs.length-1){
    breakGate(z.right); G.zi++; G.lockRight = zs[G.zi].right; $('go').classList.add('on'); G.slowT = .45; kanji('斬');
    const L = lead();
    for (const p of active()){
      if (p.dead){ p.dead = false; p.hp = Math.round(UP.hpMax*.5); p.x = L.x; p.z = clamp(L.z + (p.pi ? .8 : -.8), ZMIN, ZMAX); p.state = 'idle'; p.inv = 1.5; p.model.rotation.z = 0; setAlpha(p,1); smokeFx(p.x,p.z,12,.8); pop('復活', p.x, 2.8, p.z, 'gold'); }
      else if (p.hp < UP.hpMax){ p.hp = Math.min(UP.hpMax, p.hp+UP.heal); pop('回復', p.x, 2.8, p.z); }
    }
    AU.chime();
  } else {
    G.mode = 'clear'; G.slowT = 1.6; kanji('斬'); cine(2.2); AU.say('お見事', .5, .85); after(2.4, showClear);
  }
}
function breakPanel(x,s){ const p = panels[x+','+s]; if (p && p.visible){ p.visible = false; paperFx(x, s*EDGE, .9, 0, 0, -s, 26); AU.paper(); G.shake = Math.max(G.shake,.25); } }
function breakGate(x){ const g = gates[x]; if (g && g.visible){ g.visible = false; paperFx(x, 0, .2, EDGE, 1, 0, 90, gateColors); AU.paper(); G.shake = Math.max(G.shake,.4); } }
function startRun(i){
  if (G.mode !== 'title' || i > SAVE.unlocked) return;
  UP = Object.assign({}, UP0); G.total = 0; G.totalTime = 0; AU.init(); startStage(i); AU.say('いざ、参る', .5);
}
function startStage(i){
  const st = STAGES[i], zs = st.zones;
  for (const e of enemies) disposeFighter(e); enemies.length = 0;
  for (const s of shots) scene.remove(s.g); shots.length = 0;
  for (const p of pickups) scene.remove(p.g); pickups.length = 0;
  for (const h of hazards){ scene.remove(h.m); h.m.material.dispose(); } hazards.length = 0;
  clearParts(); G.events.length = 0; $('fx').innerHTML = ''; document.body.classList.remove('cine');
  boss = null; $('boss').style.display = 'none'; $('go').classList.remove('on'); hint('');
  ['start','clear','end'].forEach(id => $(id).classList.add('hidden'));
  buildWorld(st.theme, zs[zs.length-1].right, zs.slice(0,-1).map(z => z.right));
  PL.forEach((P,k) => {
    P.on = k < G.np; P.root.visible = P.on;
    Object.assign(P, { x:IS3D ? 1.5 : 1, z:G.np === 2 ? (k ? .9 : -.9) : 0, y:0, vx:0, vz:0, a:0, va:0, hp:UP.hpMax, ki:0, shur:UP.shurMax, state:'idle', t:0, idx:0, chainT:0, buf:false,
      inv:0, dashCD:0, smokeCD:0, shurCD:0, stealth:0, dead:false, flash:0 });
    P.model.rotation.z = 0; setAlpha(P,1); P.root.position.set(P.x,0,P.z);
  });
  IN.forEach(n => { n.k = {}; n.p = {}; });
  Object.assign(G, { si:i, mode:'play', time:0, score:0, kills:0, swings:0, beatSw:0, combo:0, comboT:0, maxCombo:0, dmgTaken:0,
    freeze:0, slowT:0, shake:0, zi:0, wi:0, zoneActive:false, lockRight:zs[0].right, hazT:6, flash:0 });
  cam.x = IS3D ? PL[0].x : XA + .2 + G.halfW; cam.z = 0; cam.yaw = 0;
  AU.setStage(st.bpm, i);
  $('stage').textContent = st.no + '　' + st.name + '　' + DIFF.name;
  $('banS').textContent = st.no; $('banB').textContent = st.name;
  const b = $('banner'); b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
  $('tl').innerHTML = active().map(P => `<div class="pp p${P.pi+1}"><b>${P.pi ? '貳' : '壹'}</b><div class="bars"><div class="bar"><i id="hp${P.pi}"></i></div><div class="bar ki" id="kib${P.pi}"><i id="ki${P.pi}"></i></div>
    <div class="shur" id="sh${P.pi}"></div></div><span class="smk" id="sm${P.pi}"></span></div>`).join('');
  lastHud = '';
}
function rankOf(){
  const rate = G.swings ? G.beatSw/G.swings : 0, par = STAGES[G.si].par;
  const pts = rate*35 + Math.max(0, 1 - G.dmgTaken/(120*G.np))*40 + Math.min(G.maxCombo,25)*.6 + clamp((par-G.time)/par*2, 0, 1)*10;
  return { rate, r: pts >= 75 ? 'S' : pts >= 55 ? 'A' : pts >= 38 ? 'B' : 'C' };
}
let choices = [];
function showClear(){
  const { rate, r } = rankOf(), i = G.si, last = i === STAGES.length-1, key = bestKey(i), old = SAVE.best[key];
  G.total += G.score; G.totalTime += G.time;
  const newBest = !old || G.time < old.t;
  SAVE.best[key] = { r: old && 'SABC'.indexOf(old.r) < 'SABC'.indexOf(r) ? old.r : r, t: old ? Math.min(old.t, G.time) : G.time };
  SAVE.unlocked = Math.max(SAVE.unlocked, Math.min(STAGES.length-1, i+1)); saveNow();
  const stats = `時間<b>${fmtTime(G.time)}</b>${newBest ? '<b class="new">最佳紀錄</b>' : '　最佳<b>' + fmtTime(old.t) + '</b>'}<br>得分<b>${G.score}</b>　擊倒<b>${G.kills}</b>　最高連段<b>${G.maxCombo}</b><br>合拍率<b>${Math.round(rate*100)}%</b>　受傷<b>${G.dmgTaken}</b>`;
  if (last){
    G.mode = 'ending';
    $('endTitle').textContent = '忍務達成'; $('endSub').textContent = `十關全破　${DIFF.name}　評價 ${r}　總分 ${G.total}　總時間 ${fmtTime(G.totalTime)}`;
    $('endStats').innerHTML = stats; $('retryBtn').style.display = 'none'; $('titleBtn').textContent = '回標題　Enter';
    $('end').classList.remove('hidden'); return;
  }
  G.mode = 'pick';
  $('rank').textContent = r; $('clearTitle').textContent = STAGES[i].name + '　完'; $('clearStats').innerHTML = stats;
  choices = UPGRADES.slice().sort(() => Math.random()-.5).slice(0,3);
  $('ups').innerHTML = choices.map((u,k) => `<button data-k="${k}"><i>${k+1}</i><b>${u.name}</b><span>${u.text}</span></button>`).join('');
  $('ups').querySelectorAll('button').forEach(b => b.onclick = () => pickUp(+b.dataset.k));
  $('clear').classList.remove('hidden');
}
function pickUp(k){ if (G.mode !== 'pick') return; choices[k].ap(); AU.pick(); startStage(G.si+1); }
function showOver(){
  G.mode = 'overMenu';
  const { rate } = rankOf();
  $('endTitle').textContent = '忍道未竟'; $('endSub').textContent = STAGES[G.si].no + '　' + STAGES[G.si].name + '　' + DIFF.name;
  $('endStats').innerHTML = `時間<b>${fmtTime(G.time)}</b><br>得分<b>${G.score}</b>　擊倒<b>${G.kills}</b>　最高連段<b>${G.maxCombo}</b><br>合拍率<b>${Math.round(rate*100)}%</b>`;
  $('retryBtn').style.display = ''; $('titleBtn').textContent = '回標題　T';
  $('end').classList.remove('hidden');
}
$('retryBtn').onclick = () => { if (G.mode === 'overMenu') startStage(G.si); };
$('titleBtn').onclick = () => location.reload();

// ───────────────────────── 介面 ─────────────────────────
const marks = [...document.querySelectorAll('#beat .m')];
let lastHud = '';
function updHud(){
  const f = AU.frac();
  marks[0].style.transform = `translateX(${-(1-f)*120}px)`; marks[1].style.transform = `translateX(${(1-f)*120}px)`;
  marks[2].style.transform = `translateX(${-(2-f)*120}px)`; marks[3].style.transform = `translateX(${(2-f)*120}px)`;
  marks[0].style.opacity = marks[1].style.opacity = .35 + f*.6; marks[2].style.opacity = marks[3].style.opacity = f*.35;
  $('drum').style.transform = `scale(${1 + .22*Math.exp(-f*9)})`;
  const rg = $('ring').style; rg.transform = `scale(${1 + (1-f)*1.5})`; rg.opacity = .15 + f*.8;
  $('time').textContent = fmtTime(G.time);
  const ps = active();
  const key = ps.map(P => [P.hp|0, P.ki|0, P.shur, Math.ceil(Math.max(0,P.smokeCD)), P.dead]).join() + [UP.shurMax, UP.hpMax, G.score, G.combo, boss ? boss.hp|0 : 0].join();
  if (key === lastHud) return; lastHud = key;
  for (const P of ps){ const i = P.pi; if (!$('hp'+i)) continue;
    $('hp'+i).style.width = (P.hp/UP.hpMax*100) + '%'; $('ki'+i).style.width = P.ki + '%'; $('kib'+i).classList.toggle('full', P.ki >= 100);
    let s = ''; for (let k=0;k<UP.shurMax;k++) s += `<b class="${k < P.shur ? '' : 'off'}"></b>`; $('sh'+i).innerHTML = s;
    const sm = $('sm'+i); sm.textContent = P.dead ? '倒下' : P.smokeCD > 0 ? '煙 ' + Math.ceil(P.smokeCD) : '煙 ●'; sm.classList.toggle('ready', !P.dead && P.smokeCD <= 0); }
  if (TOUCH) $('btns').querySelector('.b-ult').classList.toggle('ready', PL[0].ki >= 100);
  $('score').textContent = String(G.score).padStart(6,'0');
  $('combo').textContent = G.combo > 1 ? G.combo + ' 連' : '';
  if (boss) $('bhp').style.width = Math.max(0, boss.hp/boss.maxHp*100) + '%';
}

// ───────────────────────── 主迴圈 ─────────────────────────
let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const raw = Math.min(.05, (now-last)/1000); last = now; G.rt += raw;
  for (let i = G.events.length-1; i >= 0; i--) if (G.events[i] && G.events[i].t <= G.rt){ const ev = G.events.splice(i,1)[0]; ev.fn(); }
  pollPads(raw);
  let dt = raw;
  if (G.freeze > 0){ G.freeze -= raw; dt = 0; }
  if (G.slowT > 0){ G.slowT -= raw; dt *= .3; }
  if (IS3D) cam.yaw += ((camKeys.KeyE?1:0)-(camKeys.KeyQ?1:0)) * 2.2 * raw;
  if (G.mode === 'play') G.time += raw;
  const running = G.mode === 'play' || G.mode === 'clear' || G.mode === 'over';
  if (running && dt > 0){
    for (const P of active()) updPlayer(P,dt);
    updEnemies(dt); updShots(dt); updPickups(dt); updHazards(dt); updZones(dt);
    if (G.comboT > 0){ G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  }
  for (const n of IN) n.p = {};
  updParts(dt || raw*.2);
  $('veil').style.opacity = alive().some(p => p.stealth > 0) ? 1 : 0;

  // 鏡頭：對準還站著的玩家們的中心
  const ps = alive().length ? alive() : active();
  let mx = 0, mz = 0; for (const p of ps){ mx += p.x; mz += p.z; } mx /= ps.length; mz /= ps.length;
  G.shake = Math.max(0, G.shake - raw*1.6);
  const sx = (Math.random()-.5)*G.shake*.6, sy = (Math.random()-.5)*G.shake*.6;
  if (IS3D){
    const k = Math.min(1, raw*7); cam.x = lerp(cam.x, mx, k); cam.z = lerp(cam.z, mz, k);
    const spread = ps.length > 1 ? Math.hypot(ps[0].x-ps[1].x, ps[0].z-ps[1].z) : 0; cam.dist = lerp(cam.dist, 9.5 + spread*.55, Math.min(1, raw*3));
    const fx = Math.cos(cam.yaw), fz = Math.sin(cam.yaw), h = 5 + (cam.dist-9.5)*.45;
    camera.position.set(cam.x - fx*cam.dist + sx, h + sy, cam.z - fz*cam.dist);
    camera.lookAt(cam.x + fx*3 + sx, 1.4 + sy, cam.z + fz*3);
    rim.position.set(cam.x + fx*10, 9, cam.z + fz*10); rim.target.position.set(cam.x, 1, cam.z);
  } else {
    const zs = Z(), left = G.zi ? zs[G.zi-1].right : XA + .2;
    let minC = (G.zoneActive ? left : XA + .2) + G.halfW, maxC = G.lockRight - G.halfW;
    if (minC > maxC) minC = maxC = (minC+maxC)/2;
    cam.x = lerp(cam.x, clamp(mx + (ps.length === 1 ? faceOf(ps[0])*1.2 : 0), minC, maxC), Math.min(1, raw*4));
    camera.position.set(cam.x+sx, 5+sy, 14); camera.lookAt(cam.x+sx, 1.8+sy, 0);
    rim.position.set(cam.x - 3, 8, -12); rim.target.position.set(cam.x, 1, 0);
  }
  sun.position.set(cam.x - 7, 16, cam.z + (IS3D ? 6 : 9)); sun.target.position.set(cam.x, 0, cam.z);
  updWorld(raw);
  updHud();
  renderer.render(scene, camera);
}
// 發布成單一網頁時，兩個版本用網址後面的 #3d 切換
if (window.HASHMODE) $('swap').onclick = e => { e.preventDefault(); location.hash = IS3D ? '2d' : '3d'; location.reload(); };
buildWorld('izakaya', 60, [20,40]);
PL[0].root.position.set(IS3D ? 1.5 : 1, 0, 0);
requestAnimationFrame(frame);
// 測試用：直接清掉場上敵人、跳關
window.__game = { G, PL, enemies, shots, hazards, AU, STAGES, cam, get UP(){ return UP; }, get SAVE(){ return SAVE; },
  skip(){ for (const e of enemies) if (!e.dead){ if (e.state === 'lurk') breakPanel(e.x, e.side); killEnemy(e,0); e.root.visible = true; e.y = 0; } },
  goto(i,np,diff){ G.mode = 'title'; if (np) G.np = np; if (diff !== undefined) DIFF = DIFFS[diff]; SAVE.unlocked = Math.max(SAVE.unlocked, i); startRun(i); } };
