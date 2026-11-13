'use strict';
// 連線合作：兩台裝置直接互連（WebRTC，透過 PeerJS 牽線），不需要自己的伺服器。
// 開房間的一方是「房主」，負責跑整場遊戲；加入的一方只送出操作，並照房主每秒 20 次傳來的戰場狀態把畫面擺出來。
(() => {
  const PEERJS = 'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js';
  const PREFIX = 'kage-izakaya-v1-';
  const r = v => Math.round(v*100)/100;
  const msg = html => { const m = $('netMsg'); if (m) m.innerHTML = html; };

  NET = { on:false, host:false, guest:false, conn:null, peer:null, code:'', ev:[], acc:0, last:null, cx:0, lastKey:'',
          ents:new Map(), shots:new Map(), picks:new Map(), hazs:new Map() };

  // ── 特效與音效的轉播 ──
  // 房主呼叫這些函式時順便記下來，隨下一次狀態一起送出，另一台照樣呼叫一次，兩邊就會看到、聽到同樣的東西。
  // depth 用來只記最外層的呼叫（例如 kanji 裡面會敲拍子木，那一聲不用重複記）。
  const FX = ['slashFx','ink','spark','smokeFx','leafFx','paperFx','ghost','lineFx','boomFx','pop','kanji','cine','hint','breakPanel','breakGate','startStage'];
  const SKIP = { init:1, setStage:1, offset:1, frac:1 };
  let depth = 0;
  const wrap = (obj,name,tag) => {
    const orig = obj[name]; if (typeof orig !== 'function') return;
    obj[name] = function(...a){
      if (NET.host && NET.conn && depth === 0) NET.ev.push([tag, a]);
      depth++; try { return orig.apply(this, a); } finally { depth--; }
    };
  };
  FX.forEach(n => wrap(window, n, n));
  Object.keys(AU).forEach(n => { if (!SKIP[n]) wrap(AU, n, 'AU.' + n); });
  function replay(list){
    for (const [tag,a] of list){
      try {
        if (tag === 'startStage') guestStage(a[0]);
        else if (tag.startsWith('AU.')) AU[tag.slice(3)](...a);
        else window[tag](...a);
      } catch(e){}
    }
  }

  // ── 房主：把戰場打包 ──
  const fpack = f => [r(f.x), r(f.y), r(f.z), r(f.a), (f.pp || [.45,-.2,0,0]).map(r), f.moving ? 1 : 0, r(f.warn || 0), f.flash > 0 ? 1 : 0, f.alpha, r(f.model.rotation.z), f.root.visible ? 1 : 0, r(f.kick || 0)];
  function snapshot(){
    return { t:'s',
      g:[G.si, G.mode, G.zi, G.lockRight, G.zoneActive ? 1 : 0, r(G.time), G.score, G.combo, r(cam.x), $('go').classList.contains('on') ? 1 : 0,
         boss ? [NAMES[boss.ai], r(Math.max(0, boss.hp/boss.maxHp))] : 0, UP.hpMax, UP.shurMax, DIFFS.indexOf(DIFF), UP.beatWin],
      p: PL.map(P => [...fpack(P), r(P.hp), r(P.ki), P.shur, r(P.smokeCD), P.stealth > 0 ? 1 : 0, P.dead ? 1 : 0]),
      e: enemies.map(e => [e.id, e.ai, ...fpack(e)]),
      s: shots.map(s => [s.id, r(s.x), r(s.z), s.owner === 'e' ? 1 : 0]),
      k: pickups.map(p => [p.id, r(p.x), r(p.z), p.g.visible ? 1 : 0]),
      h: hazards.map(h => [h.id, r(h.x), r(h.z), h.kind]),
      ev: NET.ev.splice(0) };
  }
  // 過關、陣亡、全破的畫面：把房主畫面上的文字傳過去
  NET.ui = which => { if (!NET.conn) return; NET.conn.send({ t:'ui', which, rank:$('rank').textContent, title:$(which === 'clear' ? 'clearTitle' : 'endTitle').textContent,
    stats:$(which === 'clear' ? 'clearStats' : 'endStats').innerHTML, sub:$('endSub').textContent, mode:G.mode }); };

  // ── 加入的一方：照狀態擺畫面 ──
  function unpack(f,d,dt,fresh){
    const far = Math.hypot(d[0]-f.x, d[2]-f.z) > 4, k = fresh || far ? 1 : Math.min(1, dt*16);   // 平滑追上；差太遠（瞬移）就直接跳過去
    f.x = lerp(f.x, d[0], k); f.z = lerp(f.z, d[2], k); f.y = d[1]; f.a = d[3]; if (fresh) f.va = d[3];
    f.moving = !!d[5]; f.warn = d[6]; f.flash = d[7] ? .05 : 0; setAlpha(f, d[8]); f.model.rotation.z = d[9]; f.root.visible = !!d[10]; f.kick = d[11];
    pose(f, dt, d[4][0], d[4][1], d[4][2], d[4][3]);
  }
  function sync(map, rows, make, place, kill){
    const seen = new Set();
    for (const row of rows){ seen.add(row[0]); let o = map.get(row[0]), fresh = false; if (!o){ o = make(row); map.set(row[0], o); fresh = true; } place(o, row, fresh); }
    for (const [id,o] of map) if (!seen.has(id)){ kill(o); map.delete(id); }
  }
  function clearGuest(){
    for (const f of NET.ents.values()) disposeFighter(f); NET.ents.clear();
    for (const g of NET.shots.values()) scene.remove(g); NET.shots.clear();
    for (const g of NET.picks.values()) scene.remove(g); NET.picks.clear();
    for (const m of NET.hazs.values()){ scene.remove(m); m.material.dispose(); } NET.hazs.clear();
  }
  function guestStage(i){
    const st = STAGES[i], zs = st.zones;
    clearGuest(); clearParts(); $('fx').innerHTML = ''; document.body.classList.remove('cine');
    $('boss').style.display = 'none'; boss = null; $('go').classList.remove('on');
    ['start','clear','end'].forEach(id => $(id).classList.add('hidden'));
    buildWorld(st.theme, zs[zs.length-1].right, zs.slice(0,-1).map(z => z.right));
    PL.forEach(P => { P.on = true; P.dead = false; P.root.visible = true; P.model.rotation.z = 0; setAlpha(P,1); });
    Object.assign(G, { si:i, np:2, mode:'play', zi:0, zoneActive:false, lockRight:zs[0].right, combo:0, shake:0, slowT:0, freeze:0 });
    cam.yaw = 0; cam.x = IS3D ? PL[1].x : XA + .2 + G.halfW;
    AU.setStage(st.bpm, i); stageChrome(i);
    NET.fresh = true;
  }
  function apply(s){
    const g = s.g;
    if (DIFFS[g[13]]) DIFF = DIFFS[g[13]];
    UP.hpMax = g[11]; UP.shurMax = g[12]; UP.beatWin = g[14];
    replay(s.ev);
    NET.last = s; NET.cx = g[8];
    if (G.si !== g[0] && g[1] === 'play') guestStage(g[0]);   // 保險：萬一漏了開場事件
    G.mode = g[1]; G.zi = g[2]; G.lockRight = g[3]; G.zoneActive = !!g[4]; G.time = g[5]; G.score = g[6]; G.combo = g[7];
    $('go').classList.toggle('on', !!g[9]);
    if (g[10]){ boss = { hp:g[10][1], maxHp:1 }; $('bossName').textContent = g[10][0]; $('boss').style.display = 'block'; } else { boss = null; $('boss').style.display = 'none'; }
  }
  NET.guestFrame = dt => {
    const s = NET.last; if (!s || G.mode === 'title') return;
    const fresh = NET.fresh; NET.fresh = false;
    PL.forEach((P,i) => { const d = s.p[i]; unpack(P, d, dt, fresh); P.hp = d[12]; P.ki = d[13]; P.shur = d[14]; P.smokeCD = d[15]; P.stealth = d[16] ? 1 : 0; P.dead = !!d[17]; });
    sync(NET.ents, s.e,
      row => { const f = makeFighter(row[1] === 'c' ? 'j' : row[1]); if (row[1] === 'c') f.root.traverse(o => { o.castShadow = false; }); f.x = row[2]; f.z = row[4]; return f; },
      (f,row,isNew) => unpack(f, row.slice(2), dt, isNew), disposeFighter);
    sync(NET.shots, s.s, row => starMesh(!!row[3]),
      (m,row,isNew) => { const k = isNew ? 1 : Math.min(1, dt*22); m.position.set(lerp(m.position.x,row[1],k), 1.3, lerp(m.position.z,row[2],k)); if (IS3D) m.rotation.y += dt*26; else m.rotation.z -= dt*26; }, m => scene.remove(m));
    sync(NET.picks, s.k, () => riceMesh(),
      (m,row) => { m.position.set(row[1], .5 + Math.sin(G.rt*4+row[1])*.1, row[2]); m.rotation.y += dt*2; m.visible = !!row[3]; }, m => scene.remove(m));
    sync(NET.hazs, s.h, row => hazMesh(row[3]),
      (m,row) => { m.position.set(row[1], .05, row[2]); m.material.opacity = .5 + .4*Math.sin(G.rt*30); }, m => { scene.remove(m); m.material.dispose(); });
  };
  function guestUi(d){
    G.mode = d.mode;
    if (d.which === 'clear'){
      $('rank').textContent = d.rank; $('clearTitle').textContent = d.title; $('clearStats').innerHTML = d.stats;
      $('ups').innerHTML = '<span class="sub" style="grid-column:1/-1">等待房主挑選忍具…</span>'; $('clear').classList.remove('hidden');
    } else {
      $('endTitle').textContent = d.title; $('endSub').textContent = d.sub + (d.mode === 'overMenu' ? '　等待房主決定是否重試' : ''); $('endStats').innerHTML = d.stats;
      $('retryBtn').style.display = 'none'; $('titleBtn').textContent = '離開房間'; $('end').classList.remove('hidden');
    }
  }

  // ── 每一格：房主送狀態，加入的一方送操作 ──
  NET.tick = dt => {
    const c = NET.conn; if (!c || !c.open) return;
    if (NET.host){
      if (G.mode === 'title') return;
      NET.acc += dt; if (NET.acc >= .05 || NET.ev.length > 12){ NET.acc = 0; c.send(snapshot()); }
    } else {
      const h = ['L','R','U','D'].map(n => held(0,n) ? 1 : 0), p = Object.keys(IN[0].p).filter(k => IN[0].p[k]);
      const key = h.join('') + (IS3D ? Math.round(cam.yaw*30) : '');
      if (!p.length && key === NET.lastKey) return;
      NET.lastKey = key;
      const m = { t:'i', h, p, y:r(cam.yaw) };
      if (p.includes('atk')) m.b = Math.abs(AU.offset()) < DIFF.beat*UP.beatWin ? 1 : 0;   // 合拍在自己這台判定
      if (p.includes('dash')) speedLines();
      c.send(m);
    }
  };
  function onData(d){
    if (!d || !d.t) return;
    if (NET.host){
      if (d.t !== 'i') return;
      const n = IN[1].n; n.L = !!d.h[0]; n.R = !!d.h[1]; n.U = !!d.h[2]; n.D = !!d.h[3];
      for (const k of d.p) if (k === 'atk' || k === 'dash' || k === 'shur' || k === 'smoke' || k === 'ult') IN[1].p[k] = true;
      IN[1].yaw = +d.y || 0; if (d.b !== undefined) PL[1].netBeat = !!d.b;
    } else if (d.t === 'hello'){
      if (!!d.m !== IS3D){ location.href = (d.m ? 'game3d.html' : 'index.html') + '?room=' + NET.code; return; }   // 房主玩的是另一個視角：自動跳過去
      msg('已連線。等房主選關卡開始');
    } else if (d.t === 's') apply(d);
    else if (d.t === 'ui') guestUi(d);
  }
  function lost(){
    const was = NET.on; NET.on = false; NET.conn = null;
    if (!was) return;
    if (NET.host){
      NET.host = false; IN[1].n = {}; msg('夥伴離線了');
      if (G.mode !== 'title'){ PL[1].on = false; PL[1].root.visible = false; G.np = 1; hint('夥伴離線了　繼續單人作戰'); } else drawTitle();
    } else {
      $('endTitle').textContent = '連線中斷'; $('endSub').textContent = '與房主的連線斷了'; $('endStats').innerHTML = '';
      $('retryBtn').style.display = 'none'; $('titleBtn').textContent = '回標題'; G.mode = 'ending';
      ['start','clear'].forEach(id => $(id).classList.add('hidden')); $('end').classList.remove('hidden');
    }
  }
  function bind(c){
    NET.conn = c;
    c.on('data', onData); c.on('close', lost); c.on('error', lost);
  }
  const loadLib = () => new Promise((ok,bad) => {
    if (window.Peer) return ok();
    const s = document.createElement('script'); s.src = PEERJS; s.onload = ok; s.onerror = () => bad(new Error('lib')); document.head.appendChild(s);
  });
  const fail = e => { const t = e && e.type;
    msg(t === 'peer-unavailable' ? '找不到這個房間，請確認房號' : t === 'unavailable-id' ? '房號撞號了，請再按一次開房間' : t === 'network' || t === 'server-error' || t === 'socket-error' ? '連不上配對服務，請檢查網路後再試' : '連線失敗，請再試一次');
    $('netHost').disabled = $('netJoin').disabled = false; };

  NET.open = async () => {
    if (NET.peer) return;
    AU.init(); $('netHost').disabled = $('netJoin').disabled = true; msg('正在開房間…');
    try { await loadLib(); } catch(e){ return fail({ type:'network' }); }
    NET.code = String(Math.floor(1000 + Math.random()*9000));
    const peer = NET.peer = new Peer(PREFIX + NET.code);
    peer.on('open', () => { const link = location.origin + location.pathname + '?room=' + NET.code;
      msg(`房號<b>${NET.code}</b>等待夥伴加入…<br>或把這個連結傳給朋友：${link}`); });
    peer.on('connection', c => {
      if (NET.conn){ c.close(); return; }   // 一間房只收一位夥伴
      bind(c);
      c.on('open', () => { NET.on = NET.host = true; c.send({ t:'hello', m:IS3D ? 1 : 0 }); msg(`房號<b>${NET.code}</b>夥伴已加入。選一個關卡開始`); drawTitle(); });
    });
    peer.on('error', e => { NET.peer = null; fail(e); });
  };
  NET.join = async code => {
    code = String(code || '').replace(/\D/g,''); if (code.length !== 4) return msg('請輸入四位數房號');
    if (NET.peer) return;
    AU.init(); NET.code = code; $('netHost').disabled = $('netJoin').disabled = true; msg('連線中…');
    try { await loadLib(); } catch(e){ return fail({ type:'network' }); }
    const peer = NET.peer = new Peer();
    peer.on('open', () => { const c = peer.connect(PREFIX + code, { reliable:true }); bind(c);
      c.on('open', () => { NET.on = NET.guest = true; G.np = 2; $('stages').querySelectorAll('button').forEach(b => { b.disabled = true; }); }); });
    peer.on('error', e => { NET.peer = null; fail(e); });
  };

  if ($('netHost')){
    $('netHost').onclick = NET.open;
    $('netJoin').onclick = () => NET.join($('netCode').value);
    $('netCode').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') NET.join($('netCode').value); });
    const m = /[?&]room=(\d{4})/.exec(location.search);
    if (m){ $('netCode').value = m[1]; msg('朋友邀你進房間 <b>' + m[1] + '</b> 按「加入」開始連線'); }
  }
})();
