'use strict';
// 十個關卡的場景。場地沿 +x 延伸；sides() 會在有佈景的那幾側各跑一次（3D 兩側，2.5D 只有後方）。
let XB = 60, world = null, panels = {}, gates = {}, followers = [], motes = null, moteCfg = null, gateColors = [0xf0dfba,0x2a1a10];
let swayers = [], flames = [], rays = [], waterTex = null, lampSpots = [], lampPow = 0, baseAmb = .4;
const _d = new THREE.Object3D(), _c = new THREE.Color();

function disposeWorld(){
  if (!world) return;
  world.traverse(o => { if (o.material){ if (o.material.map && o.material.map !== glowTex) o.material.map.dispose(); o.material.dispose(); } if (o.geometry && o.userData.own) o.geometry.dispose(); });
  scene.remove(world); world = null; panels = {}; gates = {}; followers = []; motes = null; swayers = []; flames = []; rays = []; waterTex = null; lampSpots = [];
}
function buildWorld(theme, endX, gateXs){
  disposeWorld(); XB = endX;
  world = new THREE.Group(); scene.add(world);
  const W0 = IS3D ? XA : XA-8, W1 = IS3D ? XB : XB+12, LEN = W1-W0, cx = (W0+W1)/2;
  const FD = IS3D ? EDGE*2 : EDGE+4.3, FZ = IS3D ? 0 : (4.3-EDGE)/2;
  const add = (geo,mat,sx,sy,sz,x,y,z,parent) => { const m = new THREE.Mesh(geo,mat); m.scale.set(sx,sy,sz); m.position.set(x,y,z); (parent||world).add(m); return m; };
  const L = (c,flat) => new THREE.MeshLambertMaterial({ color:c, flatShading:!!flat }), B = (c,o) => new THREE.MeshBasicMaterial(Object.assign({ color:c }, o||{}));
  const sides = fn => SIDES.forEach(s => fn(s, s > 0 ? PI : 0));
  const zs = (s,off) => s*(EDGE+off);
  const wood = L(0x1c110b);
  const floor = (draw,w,h,u,v) => { const tex = canvasTex(w,h,draw); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(LEN/u, FD/v);
    const f = add(GEO.plane, new THREE.MeshLambertMaterial({ map:tex }), LEN, FD, 1, cx, 0, FZ); f.rotation.x = -PI/2; f.receiveShadow = true; return f; };
  const ground = (mat,y) => { const g = add(GEO.plane, mat, LEN+220, 220, 1, cx, y, 0); g.rotation.x = -PI/2; g.receiveShadow = true; return g; };
  const set = o => {
    scene.background.setHex(o.bg); scene.fog.color.setHex(o.bg); scene.fog.near = o.fog[0]; scene.fog.far = o.fog[1];
    ambient.color.setHex(o.amb[0]); ambient.intensity = baseAmb = o.amb[1];
    hemi.color.setHex(o.hemi[0]); hemi.groundColor.setHex(o.hemi[1]); hemi.intensity = o.hemi[2];
    sun.color.setHex(o.sun[0]); sun.intensity = o.sun[1]; rim.color.setHex(o.rim[0]); rim.intensity = o.rim[1];
    $('grade').style.background = o.grade; lampPow = o.lamp ? o.lamp[1] : 0; glowLights.forEach(l => l.color.setHex(o.lamp ? o.lamp[0] : 0xffa860));
    gateColors = o.gate || [0xf0dfba,0x2a1a10];
  };
  // 跟著鏡頭走的遠景：天球、月亮、遠山（3D 放在前方，2.5D 放在畫面深處）
  const far = (m,p3,p25) => { m.rotation.y = IS3D ? -PI/2 : 0; followers.push({ m, p: IS3D ? p3 : p25 }); return m; };
  const dome = (stops, stars) => {
    const tex = canvasTex(512,512,(g,w,h)=>{ const gr = g.createLinearGradient(0,0,0,h); stops.forEach(([p,c]) => gr.addColorStop(p,c)); g.fillStyle = gr; g.fillRect(0,0,w,h);
      if (stars) for (let i=0;i<600;i++){ g.fillStyle = `rgba(255,255,255,${rand(.2,.9)})`; g.fillRect(Math.random()*w, Math.random()*h*.47, rand(1,2), rand(1,2)); } });
    const m = add(GEO.dome, B(0xffffff,{ map:tex, side:THREE.BackSide, fog:false, depthWrite:false }), 1,1,1, 0,0,0); m.renderOrder = -10; followers.push({ m, p:[0,0,0], dome:true });
  };
  const halo = (x,y,z,color,size,parent) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false })); s.scale.setScalar(size); s.position.set(x,y,z); (parent||world).add(s); return s; };
  const lamp = (x,y,z,color,size) => { halo(x,y,z,color,size||2.4); lampSpots.push([x,y,z]); };
  const flame = (x,y,z,sz) => { const f = add(GEO.cone6, B(0xffa23a,{ fog:false }), .22*sz, .6*sz, .22*sz, x, y, z); const f2 = add(GEO.cone6, B(0xffe08a,{ fog:false }), .12*sz, .36*sz, .12*sz, x, y-.06*sz, z); flames.push(f,f2); lamp(x,y,z,0xff9a3a,3*sz); };
  const ray = (x,z,color,h) => { const tex = canvasTex(64,256,(g,w,hh)=>{ const gr = g.createLinearGradient(0,0,0,hh); gr.addColorStop(0,'rgba(255,255,255,.9)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0,0,w,hh); });
    const m = add(GEO.plane, B(color,{ map:tex, transparent:true, opacity:.16, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, fog:false }), rand(1.6,3.2), h||13, 1, x, (h||13)/2-.5, z);
    m.rotation.y = IS3D ? -PI/2 : 0; m.rotation.z = .32; rays.push({ m, ph:rand(0,6) }); };
  const mist = (z,color,op) => { const tex = canvasTex(64,128,(g,w,h)=>{ const gr = g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'rgba(255,255,255,0)'); gr.addColorStop(.7,'rgba(255,255,255,.9)'); gr.addColorStop(1,'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0,0,w,h); });
    const m = add(GEO.plane, B(color,{ map:tex, transparent:true, opacity:op, depthWrite:false, fog:false, side:THREE.DoubleSide }), LEN+80, 5, 1, cx, 2.2, z); return m; };
  // 一整片草與小花（實例化，數量多也不吃效能）
  const grass = (n, cols, zmin, zmax, hmin, hmax, flowerCols) => {
    if (TOUCH) n = Math.floor(n*.5);
    const m = new THREE.InstancedMesh(GEO.blade, new THREE.MeshLambertMaterial({ color:0xffffff }), n*SIDES.length + (IS3D ? 0 : Math.floor(n*.25)));
    let i = 0;
    const put = (x,z,h) => { _d.position.set(x, h/2, z); _d.scale.set(rand(.8,2), h, rand(.8,2)); _d.rotation.set(rand(-.25,.25), rand(0,3), rand(-.25,.25)); _d.updateMatrix(); m.setMatrixAt(i, _d.matrix); m.setColorAt(i, _c.setHex(pick(cols))); i++; };
    sides(s => { for (let k=0;k<n;k++) put(rand(W0,W1), zs(s, rand(zmin,zmax)), rand(hmin,hmax)); });
    if (!IS3D) for (let k=0;k<Math.floor(n*.25);k++) put(rand(W0,W1), rand(4.5,6.2), rand(hmin,hmax)*1.3);   // 前景的草，增加景深
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; world.add(m);
    if (flowerCols){
      const fn = Math.floor(n*.3)*SIDES.length, f = new THREE.InstancedMesh(GEO.ico, new THREE.MeshBasicMaterial({ color:0xffffff }), fn); let j = 0;
      sides(s => { for (let k=0;k<fn/SIDES.length;k++){ _d.position.set(rand(W0,W1), rand(.15,.4), zs(s, rand(zmin,zmax))); _d.scale.setScalar(rand(.05,.1)); _d.rotation.set(0,0,0); _d.updateMatrix(); f.setMatrixAt(j, _d.matrix); f.setColorAt(j, _c.setHex(pick(flowerCols))); j++; } });
      f.instanceMatrix.needsUpdate = true; if (f.instanceColor) f.instanceColor.needsUpdate = true; world.add(f);
    }
  };
  let M = {};
  const tree = (x,z,kind,sc) => {
    const g = new THREE.Group(); g.position.set(x,0,z); world.add(g); sc = sc || 1;
    if (kind === 'pine'){
      const h = rand(5,7.5)*sc; add(GEO.trunk, M.trunk, .24, h*.5, .24, 0, h*.25, 0, g);
      for (let i=0;i<4;i++){ const r = (2-i*.42)*sc, y = h*.32+i*h*.19; add(GEO.cone6, M.leaf[i%2], r, h*.3, r, 0, y, 0, g).rotation.y = i;
        if (M.snow) add(GEO.cone6, M.snow, r*.82, h*.15, r*.82, 0, y+h*.1, 0, g).rotation.y = i; }
    } else {
      const h = rand(3.2,4.6)*sc; add(GEO.trunk, M.trunk, .3*sc, h, .3*sc, 0, h/2, 0, g).rotation.z = rand(-.14,.14);
      for (let b=0;b<3;b++){ const br = add(GEO.trunk, M.trunk, .11*sc, 2.4*sc, .11*sc, rand(-.9,.9), h*.92, rand(-.9,.9), g); br.rotation.z = rand(-1,1); br.rotation.x = rand(-.8,.8); }
      const top = new THREE.Group(); top.position.y = h; g.add(top);
      for (let i=0;i<10;i++){ const r = rand(1,1.9)*sc; add(GEO.ico1, M.leaf[i%3], r, r*.72, r, rand(-2.3,2.3)*sc, rand(-.3,1.9)*sc, rand(-2.3,2.3)*sc, top).rotation.set(rand(0,3),rand(0,3),0); }
      swayers.push({ g:top, ph:rand(0,6), amp:.03 });
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  };
  const stoneLantern = (x,z,mat,cap) => { add(GEO.cyl, mat, .16, 1, .16, x, .5, z).castShadow = true; add(GEO.box, mat, .6, .12, .6, x, 1.05, z);
    add(GEO.box, B(0xffc66a,{ fog:false }), .34, .34, .34, x, 1.3, z); add(GEO.cone, cap||mat, .52, .4, .52, x, 1.68, z).rotation.y = PI/4; lamp(x,1.3,z,0xffb45a,2); };
  const torii = (x,z,spanZ,w,mat) => { const dx = spanZ ? 0 : w, dz = spanZ ? w : 0;
    for (const k of [-1,1]) add(GEO.cyl, mat, .2, 5.4, .2, x+k*dx, 2.7, z+k*dz).castShadow = true;
    add(GEO.box, mat, spanZ ? .34 : w*2+1.6, .34, spanZ ? w*2+1.6 : .34, x, 5.5, z).castShadow = true; add(GEO.box, mat, spanZ ? .24 : w*2+.6, .24, spanZ ? w*2+.6 : .24, x, 4.6, z); };
  const shojiDraw = tint => (g,w,h)=>{
    g.fillStyle = tint; g.fillRect(0,0,w,h);
    for (let i=0;i<500;i++){ g.fillStyle = `rgba(120,90,50,${Math.random()*.05})`; g.fillRect(Math.random()*w, Math.random()*h, rand(4,30), 1); }
    g.fillStyle = '#4a2f1c'; g.fillRect(0,h*.82,w,h*.18);
    g.fillStyle = '#20130b';
    for (let c=0;c<=4;c++) g.fillRect(c*(w/4)-4, 0, 8, h*.82);
    for (let r=0;r<=6;r++) g.fillRect(0, r*(h*.82/6)-3, w, 7);
    g.fillRect(0,0,12,h); g.fillRect(w-12,0,12,h); g.fillRect(0,h-10,w,10);
  };
  // 3D 的關卡門：室內用襖門（單面繪製，鏡頭繞到背後會自動消失），戶外用柵欄
  let fusuma = null;
  const paperWall = (x,key,inward,tint) => {
    if (!IS3D) return;
    fusuma = fusuma || new THREE.MeshLambertMaterial({ map: canvasTex(256,512,shojiDraw(tint||'#b9a57c')) });
    const g = new THREE.Group(); world.add(g);
    for (let z = -EDGE+1; z < EDGE; z += 2) add(GEO.plane, fusuma, 2, 4.4, 1, x, 2.2, z, g).rotation.y = inward ? PI/2 : -PI/2;
    if (!inward){ add(GEO.box, wood, .3, .3, EDGE*2, x, 4.55, 0, g); for (let z = -EDGE; z <= EDGE; z += 4.67) add(GEO.box, wood, .26, 4.7, .24, x, 2.35, z, g); }
    if (key) gates[key] = g;
  };
  const fenceGate = (x,key,mat) => {
    if (!IS3D) return;
    const g = new THREE.Group(); world.add(g);
    for (let z = -EDGE; z <= EDGE; z += .7) add(GEO.cyl, mat, .07, 3, .07, x, 1.5, z, g).castShadow = true;
    add(GEO.box, mat, .1, .1, EDGE*2, x, 2.5, 0, g); add(GEO.box, mat, .1, .1, EDGE*2, x, 1.2, 0, g);
    if (key) gates[key] = g;
  };
  const frontEdge = mat => { if (!IS3D) add(GEO.box, mat, LEN, .5, .3, cx, -.25, 4.45); };
  const noise = (g,w,h,n,a,b,al,len) => { for (let i=0;i<n;i++){ g.fillStyle = `rgba(${Math.random()<.5?a:b},${Math.random()<.5?a:b},${a},${al})`; g.fillRect(Math.random()*w, Math.random()*h, len||20, 1); } };
  const plankDraw = base => (g,w,h)=>{ g.fillStyle = base; g.fillRect(0,0,w,h); noise(g,w,h,700,40,200,.06,60);
    g.fillStyle = 'rgba(30,18,8,.75)'; for (let y=0;y<h;y+=32){ g.fillRect(0,y,w,2); g.fillRect((y*3)%w,y,2,32); g.fillRect((y*3+130)%w,y,2,32); } };

  const T = {
    // ── 一、居酒屋／九、天守（金屏風版）──
    izakaya(gold){
      set({ bg:0x0d0807, fog:[26,70], amb:[0xffe2b8,.4], hemi:[0xffe6c0,0x3a2414,.3], sun:[0xffd9a8,.6], rim:[gold ? 0xffd36a : 0xffb060,.7],
        grade: gold ? 'linear-gradient(#5a3a00,#201000)' : 'linear-gradient(#4a2a10,#1a0c06)', lamp:[gold ? 0xffc04a : 0xff8a4a, 1.1] });
      if (gold) floor(plankDraw('#3a2416'),256,128,6,4);
      else floor((g,w,h)=>{ g.fillStyle = '#9a8c58'; g.fillRect(0,0,w,h); noise(g,w,h,900,40,190,.07,26);
        g.fillStyle = '#232a1f'; g.fillRect(0,0,w,6); g.fillRect(0,h-6,w,6); g.fillRect(0,0,4,h); g.fillRect(w-4,0,4,h); },256,128,4,2);
      const glow = canvasTex(1024,256,(g,w,h)=>{
        const gr = g.createLinearGradient(0,0,0,h); gr.addColorStop(0, gold ? '#ffd27a' : '#ffe2b0'); gr.addColorStop(.5, gold ? '#fff0b8' : '#fff3d8'); gr.addColorStop(1, gold ? '#ffb347' : '#ffcf8c');
        g.fillStyle = gr; g.fillRect(0,0,w,h);
        g.filter = 'blur(6px)'; g.strokeStyle = 'rgba(70,40,30,.4)'; g.fillStyle = 'rgba(90,45,40,.32)';
        for (let b=0;b<5;b++){
          let x = b*210 + 30, y = 20 + Math.random()*40; g.lineWidth = 7; g.beginPath(); g.moveTo(x,0);
          for (let k=0;k<6;k++){ x += 22 + Math.random()*22; y += 8 + Math.random()*20; g.lineTo(x,y);
            for (let p=0;p<4;p++){ g.moveTo(x,y); g.arc(x+rand(-22,22), y+rand(-16,20), rand(3,8), 0, 7); } g.moveTo(x,y); }
          g.stroke(); g.fill();
        }
      });
      glow.wrapS = THREE.RepeatWrapping; glow.repeat.set(4, 1);
      const glowMat = B(0xffffff,{ map:glow, fog:false }), glowFloor = B(gold ? 0xffc870 : 0xffd9a0,{ fog:false });
      // 紙門用相乘混色：門外的東西會變成印在紙上的剪影
      const shojiMat = new THREE.MeshBasicMaterial({ map: canvasTex(256,512,shojiDraw(gold ? '#f3d58c' : '#f0dfba')), transparent:true, blending: THREE.MultiplyBlending, fog:false, depthWrite:false });
      const upper = L(gold ? 0x4a3410 : 0x150d09), lampMat = B(gold ? 0xffd070 : 0xe24a2c,{ fog:false });
      const cush = [L(gold ? 0x4a2a6a : 0x2c3a66), L(0x7a2420)], china = L(0xd8cfb6), lit = L(0x3a2415), beam = L(0x120a06);
      let k = 0;
      sides((s,ry) => {
        add(GEO.plane, glowMat, LEN+60, 16, 1, cx, 6, s*22).rotation.y = ry;
        add(GEO.plane, glowFloor, LEN+60, 16, 1, cx, -.03, zs(s,8)).rotation.x = -PI/2;
        for (let x = XA+1; x < W1; x += 2){ const p = add(GEO.plane, shojiMat, 2, 4.4, 1, x, 2.2, s*EDGE); p.rotation.y = ry; panels[x+','+s] = p; }
        for (let x = XA; x <= W1; x += 4) add(GEO.box, wood, .24, 5.8, .26, x, 2.9, s*EDGE).castShadow = true;
        add(GEO.box, wood, LEN, .3, .3, cx, 4.55, s*EDGE); add(GEO.box, upper, LEN, 1.4, .16, cx, 5.4, s*EDGE); add(GEO.box, wood, LEN, .12, .3, cx, .06, s*EDGE);
        for (let x = XA+4; x < W1; x += 8){
          const lz = zs(s,-.7); add(GEO.sph, lampMat, .34, .46, .34, x, 3.75, lz);
          add(GEO.cyl, wood, .16, .08, .16, x, 4.2, lz); add(GEO.cyl, wood, .16, .08, .16, x, 3.3, lz); lamp(x,3.75,lz, gold ? 0xffc04a : 0xff7a3a, 3);
        }
        for (let x = 6; x < XB-2; x += 9){
          const tx = x + (s > 0 ? 3 : 0), tz = zs(s,-.55); k++;
          add(GEO.box, lit, 1.7, .08, .7, tx, .44, tz).castShadow = true;
          [[-.75,-.28],[.75,-.28],[-.75,.28],[.75,.28]].forEach(([a,b]) => add(GEO.box, wood, .08, .42, .08, tx+a, .21, tz+b));
          add(GEO.cyl, china, .07, .3, .07, tx-.3, .63, tz).castShadow = true; add(GEO.cyl, china, .06, .08, .06, tx+.2, .52, tz-s*.12);
          add(GEO.box, cush[k%2], .7, .08, .6, tx-1.5, .05, tz); add(GEO.box, cush[(k+1)%2], .7, .08, .6, tx+1.5, .05, tz);
        }
      });
      if (IS3D) for (let x = XA+2; x < W1; x += 8) add(GEO.box, beam, .3, .3, EDGE*2, x, 6.1, 0);   // 天花板橫樑
      frontEdge(wood);
      paperWall(XA, 0, true, gold ? '#c9a54a' : 0); paperWall(XB); gateXs.forEach(x => paperWall(x, x));
      moteCfg = { color:0xffe0b0, size:.05, fall:0, drift:.1, n:220 };
    },
    tenshu(){ T.izakaya(true); },
    // ── 二、屋頂月夜／十、天守閣頂（暴風黎明版）──
    roof(storm){
      set(storm ? { bg:0x1a1026, fog:[30,90], amb:[0xc0a0ff,.45], hemi:[0xffb080,0x1a1030,.4], sun:[0xffc090,.7], rim:[0xff8a4a,.9], grade:'linear-gradient(#3a1050,#5a2000)', gate:[0x3a2a1c,0x5a4630] }
                : { bg:0x0b1024, fog:[30,90], amb:[0x9db0ff,.5], hemi:[0xaec4ff,0x10183a,.45], sun:[0xcfe0ff,.8], rim:[0xfff2c0,.9], grade:'linear-gradient(#0a1a5a,#001030)', gate:[0x3a2a1c,0x5a4630] });
      dome(storm ? [[0,'#120a22'],[.3,'#3a1c50'],[.44,'#b0486a'],[.5,'#ffb060'],[.52,'#140c1e'],[1,'#140c1e']]
                 : [[0,'#03051a'],[.34,'#131d4a'],[.47,'#5b74b8'],[.5,'#8fa6dc'],[.52,'#0b1024'],[1,'#0b1024']], !storm);
      const disc = storm ? 0xff6a3a : 0xfff7d6;
      far(add(GEO.circ, B(disc,{ fog:false }), 8, 8, 1, 0,0,0), [88, storm ? 6 : 15, -16], [storm ? -8 : 9, storm ? 4.5 : 7.5, -46]);
      far(halo(0,0,0, disc, 46), [86, storm ? 6 : 15, -16], [storm ? -8 : 9, storm ? 4.5 : 7.5, -45]);
      floor((g,w,h)=>{ g.fillStyle = storm ? '#5a5070' : '#56648a'; g.fillRect(0,0,w,h);
        for (let r=0;r<4;r++) for (let c=-1;c<8;c++){ const x = c*32 + (r%2)*16, y = r*32;
          g.fillStyle = storm ? '#70648a' : '#6a7aa2'; g.beginPath(); g.ellipse(x+16, y+12, 14, 12, 0, 0, 7); g.fill();
          g.fillStyle = storm ? '#8c7ea6' : '#7f90ba'; g.beginPath(); g.ellipse(x+16, y+8, 9, 5, 0, 0, 7); g.fill();
          g.fillStyle = '#28324e'; g.fillRect(x, y+28, 32, 4); } },256,128,4,2);
      const sky = canvasTex(1024,256,(g,w,h)=>{
        g.fillStyle = storm ? '#0c0714' : '#080c1e';
        for (let x = 0; x < w; ){ const bw = rand(70,150), bh = rand(60,130);
          g.fillRect(x, h-bh, bw, bh); g.beginPath(); g.moveTo(x-14, h-bh); g.lineTo(x+bw/2, h-bh-rand(22,40)); g.lineTo(x+bw+14, h-bh); g.fill(); x += bw + rand(6,30); }
        let py = h-70; for (let i=0;i<5;i++){ const pw = 120 - i*18; g.fillRect(512-pw/2+16, py-26, pw-32, 26); g.beginPath(); g.moveTo(512-pw/2-10, py-22); g.lineTo(512, py-40); g.lineTo(512+pw/2+10, py-22); g.fill(); py -= 36; }
        g.fillStyle = 'rgba(255,200,110,.8)'; for (let i=0;i<46;i++) g.fillRect(rand(0,w), rand(h-70,h-8), 5, 7);
      });
      sky.wrapS = THREE.RepeatWrapping; sky.repeat.set(4, 1);
      const skyMat = B(0xffffff,{ map:sky, transparent:true, fog:false, depthWrite:false });
      sides((s,ry) => { add(GEO.plane, skyMat, LEN+140, 14, 1, cx, IS3D ? 2 : -1, s*30).rotation.y = ry; });
      if (IS3D) add(GEO.plane, skyMat, 90, 14, 1, XB+50, 2, 0).rotation.y = -PI/2;
      ground(B(storm ? 0x120a1c : 0x0a0f22,{ fog:false }), -5);
      const tile = L(storm ? 0x2a2038 : 0x232b44), red = B(storm ? 0x6a2a9a : 0x9c1c14,{ side:THREE.DoubleSide }), gold = B(0xe8b04a);
      sides(s => {
        const z = zs(s,.1); add(GEO.box, tile, LEN, .5, .5, cx, .25, z).castShadow = true;
        for (let x = W0; x < W1; x += 1.6) add(GEO.cyl, tile, .2, .54, .2, x, .5, z).rotation.x = PI/2;
        for (let x = XA+7; x < W1; x += 14){ add(GEO.cyl, wood, .07, 5, .07, x, 2.5, z).castShadow = true; const fl = add(GEO.plane, red, .9, 2.6, 1, x+.52, 3.6, z); swayers.push({ g:fl, ph:x, amp:.12, axis:'y' });
          add(GEO.cone, storm ? gold : tile, .5, 1.1, .5, x+7, 1.0, z).castShadow = true; }
        add(GEO.box, tile, LEN+6, .3, 5, cx, -1.3, zs(s,2.4)).rotation.x = s*.5;
      });
      if (IS3D){ add(GEO.box, tile, .5, .5, EDGE*2, XA-.1, .25, 0); add(GEO.box, tile, .5, .5, EDGE*2, XB+.1, .25, 0); }
      frontEdge(tile);
      const bar = L(0x3a2a1c); gateXs.forEach(x => fenceGate(x, x, bar));
      moteCfg = storm ? { color:0xffb070, size:.07, fall:-.9, drift:1.6, n:200 } : { color:0xcfe0ff, size:.045, fall:.15, drift:.6, n:160 };
    },
    castletop(){ T.roof(true); },
    // ── 三、竹林 ──
    bamboo(){
      set({ bg:0x9fb890, fog:[16,60], amb:[0xd8ffd0,.45], hemi:[0xe8ffd8,0x2a3a1a,.5], sun:[0xfff6d0,.8], rim:[0xd8ffb0,.6], grade:'linear-gradient(#2a6a2a,#103010)', gate:[0x55703a,0x8a9a4a] });
      dome([[0,'#5a8a6a'],[.35,'#a8c890'],[.48,'#e6f0c0'],[.5,'#f4f8d8'],[.52,'#4a5a34'],[1,'#4a5a34']], false);
      floor((g,w,h)=>{ g.fillStyle = '#8a7a52'; g.fillRect(0,0,w,h);
        for (let i=0;i<300;i++){ g.fillStyle = `rgba(${Math.random()<.5?60:150},${Math.random()<.5?70:130},50,.14)`; g.beginPath(); g.arc(Math.random()*w, Math.random()*h, rand(3,16), 0, 7); g.fill(); }
        for (let i=0;i<120;i++){ g.fillStyle = pick(['rgba(110,140,60,.8)','rgba(170,160,70,.7)','rgba(80,110,50,.8)']); g.beginPath(); g.ellipse(Math.random()*w, Math.random()*h, 6, 1.6, Math.random()*3, 0, 7); g.fill(); } },256,256,8,7);
      ground(L(0x556a3a), -.04);
      const stalk = new THREE.InstancedMesh(GEO.cyl, new THREE.MeshLambertMaterial({ color:0xffffff }), 170*SIDES.length);
      const leaf = new THREE.InstancedMesh(GEO.ico, new THREE.MeshLambertMaterial({ color:0xffffff, flatShading:true }), 170*3*SIDES.length);
      let i = 0, j = 0;
      sides(s => { for (let k=0;k<170;k++){
        const x = rand(W0-4,W1+4), z = zs(s, .6 + Math.pow(Math.random(),1.6)*13), h = rand(9,14), r = rand(.07,.13), lx = rand(-.05,.05);
        _d.position.set(x, h/2, z); _d.scale.set(r,h,r); _d.rotation.set(rand(-.05,.05),0,lx); _d.updateMatrix(); stalk.setMatrixAt(i, _d.matrix); stalk.setColorAt(i, _c.setHex(pick([0x5f8a3a,0x7aa04a,0x4f7a34,0x8aa85a]))); i++;
        for (let q=0;q<3;q++){ _d.position.set(x+rand(-.8,.8), h*rand(.72,1), z+rand(-.8,.8)); _d.scale.set(rand(.45,.95), rand(.12,.24), rand(.45,.95)); _d.rotation.set(rand(0,3),rand(0,3),0); _d.updateMatrix(); leaf.setMatrixAt(j, _d.matrix); leaf.setColorAt(j, _c.setHex(pick([0x4f8a3a,0x6aa04a,0x86b85a]))); j++; }
      } });
      for (const m of [stalk,leaf]){ m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.castShadow = true; world.add(m); }
      const stone = L(0x8d8a7e,true);
      sides(s => { for (let x = XA+5; x < W1; x += 13){ stoneLantern(x, zs(s,-.5), stone); add(GEO.ico, stone, rand(.5,1), rand(.3,.6), rand(.5,.9), x+6, .2, zs(s,.6)).castShadow = true; }
        for (let x = W0; x < W1; x += 6) ray(x+rand(-2,2), zs(s, rand(1,4)), 0xf4ffd0, 15); mist(zs(s,7), 0xdff0d0, .35); });
      grass(520, [0x5f8a3a,0x7aa04a,0x4f7a34,0x94b060], .1, 8, .3, .9, [0xffffff,0xfff0a0]);
      const bam = L(0x55703a); gateXs.forEach(x => fenceGate(x, x, bam)); fenceGate(XB, 0, bam);
      moteCfg = { color:0xe8ff8a, size:.1, fall:-.12, drift:.25, n:150, add:true };
    },
    // ── 四、櫻花庭院 ──
    garden(){
      set({ bg:0xf3c9b0, fog:[26,90], amb:[0xffd8d0,.5], hemi:[0xffe0e8,0x55603a,.5], sun:[0xfff0e0,.85], rim:[0xff9ac0,.7], grade:'linear-gradient(#ff6a9a,#6a3a10)', gate:[0x55703a,0x8a9a4a] });
      dome([[0,'#6c5490'],[.3,'#e59a98'],[.46,'#ffdcc0'],[.5,'#fff0da'],[.52,'#6f7d52'],[1,'#6f7d52']], false);
      far(add(GEO.circ, B(0xfff4e0,{ fog:false }), 6, 6, 1, 0,0,0), [96,12,18], [-10,7,-60]); far(halo(0,0,0,0xffe0b0,40), [95,12,18], [-10,7,-59]);
      far(add(GEO.plane, B(0xffffff,{ fog:false, transparent:true, depthWrite:false, map: canvasTex(512,256,(g,w,h)=>{
        g.fillStyle = 'rgba(140,112,165,.92)'; g.beginPath(); g.moveTo(0,h); g.lineTo(210,40); g.lineTo(250,52); g.lineTo(290,40); g.lineTo(512,h); g.fill();
        g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(176,84); g.lineTo(210,40); g.lineTo(250,52); g.lineTo(290,40); g.lineTo(330,86); g.lineTo(292,74); g.lineTo(252,92); g.lineTo(214,74); g.fill(); }) }), 70, 30, 1, 0,0,0), [100,11,-10], [8,6,-70]);
      floor((g,w,h)=>{ g.fillStyle = '#7f8c5c'; g.fillRect(0,0,w,h);
        for (let i=0;i<260;i++){ g.fillStyle = `rgba(${Math.random()<.5?50:170},${Math.random()<.5?90:190},70,.12)`; g.beginPath(); g.arc(Math.random()*w, Math.random()*h, rand(3,14), 0, 7); g.fill(); }
        [[60,128,34,22],[150,110,30,20],[220,140,26,18],[110,60,22,14],[190,210,26,16],[30,220,24,16]].forEach(([x,y,a,b]) => {
          g.fillStyle = '#56584e'; g.beginPath(); g.ellipse(x,y+3,a,b,0,0,7); g.fill(); g.fillStyle = '#a4a192'; g.beginPath(); g.ellipse(x,y,a,b,0,0,7); g.fill(); });
        for (let i=0;i<90;i++){ g.fillStyle = 'rgba(248,180,200,.8)'; g.beginPath(); g.ellipse(Math.random()*w, Math.random()*h, 3, 1.6, Math.random()*3, 0, 7); g.fill(); } },256,256,8,7);
      ground(L(0x6f7d52), -.04);
      M = { trunk:L(0x2a1820,true), leaf:[L(0xf7a0be,true), L(0xffc4d6,true), L(0xe880a6,true)] };
      const stone = L(0x8d8a7e,true), bamboo = L(0x55703a), water = B(0x7ab8c8,{ fog:false });
      sides(s => {
        add(GEO.box, bamboo, LEN, .08, .08, cx, .95, s*EDGE); add(GEO.box, bamboo, LEN, .08, .08, cx, .5, s*EDGE);
        for (let x = W0; x <= W1; x += 1.3) add(GEO.cyl, bamboo, .05, 1.15, .05, x, .57, s*EDGE).castShadow = true;
        for (let x = XA+6; x < W1; x += 12) stoneLantern(x + (s > 0 ? 6 : 0), zs(s,-.6), stone);
        for (let x = W0+2; x < W1+6; x += 6.5){ tree(x+rand(-1.5,1.5), zs(s, rand(2.2,5)), 'sakura', rand(.9,1.2)); if (Math.random() < .6) tree(x+3+rand(-1,1), zs(s, rand(8,13)), 'sakura', rand(1.1,1.5)); }
        for (let x = W0+5; x < W1; x += 15){ add(GEO.ico, stone, 1.2, .6, .9, x, .3, zs(s,1.2)).castShadow = true; add(GEO.ico1, L(0x5d7a45,true), .8, .5, .7, x+1.3, .3, zs(s,.9));
          const p = add(GEO.circ, water, 2.2, 1.3, 1, x+7, .01, zs(s,2.6)); p.rotation.x = -PI/2; }   // 小池塘
        for (let x = W0+4; x < W1; x += 9) ray(x, zs(s, rand(.5,3)), 0xffe8d0, 14);
      });
      grass(600, [0x6f8f4a,0x86a85a,0x5d7a45,0xa0b86a], .1, 9, .2, .6, [0xffffff,0xffd0e0,0xfff0a0,0xff9ac0]);
      if (IS3D) for (let x = XB+6; x < XB+30; x += 8) for (const z of [-5,3]) tree(x, z, 'sakura', 1.2);
      fenceGate(XB, 0, bamboo); gateXs.forEach(x => fenceGate(x, x, bamboo));
      moteCfg = { color:0xffb3c8, size:.12, fall:1.1, drift:1.4, n:340 };
    },
    // ── 五、道場 ──
    dojo(){
      set({ bg:0x0d0807, fog:[26,70], amb:[0xffdcae,.42], hemi:[0xffe6c0,0x3a2414,.35], sun:[0xffd9a8,.7], rim:[0xffc070,.6], grade:'linear-gradient(#5a3a10,#1a0c06)', lamp:[0xffb04a,1.2] });
      floor(plankDraw('#8f633a'),256,128,6,4);
      const wall = canvasTex(512,512,(g,w,h)=>{
        g.fillStyle = '#d8c79c'; g.fillRect(0,0,w,h);
        for (let i=0;i<900;i++){ g.fillStyle = `rgba(110,90,50,${Math.random()*.05})`; g.fillRect(Math.random()*w, Math.random()*h, rand(2,14), rand(2,8)); }
        g.fillStyle = '#3b2718'; g.fillRect(0,h*.7,w,h*.3); g.fillStyle = '#24160d'; g.fillRect(0,h*.68,w,14); g.fillRect(0,0,w,18); g.fillRect(0,0,16,h); g.fillRect(w-16,0,16,h);
        g.fillStyle = '#2e1d12'; for (let x=64;x<w;x+=64) g.fillRect(x,h*.7,4,h*.3);
      });
      wall.wrapS = THREE.RepeatWrapping; wall.repeat.set(LEN/6, 1);
      const wallMat = new THREE.MeshLambertMaterial({ map:wall, emissive:0x554433 }), words = ['忍','心','無','影','斬','靜'];
      const wax = L(0xd8cfb6), rack = L(0x2a1a10), steel = B(0xdfe6ee), beam = L(0x120a06);
      let i = 0;
      sides((s,ry) => {
        add(GEO.plane, wallMat, LEN, 5.4, 1, cx, 2.7, s*EDGE).rotation.y = ry;
        add(GEO.box, wood, LEN, .12, .3, cx, .06, s*EDGE); add(GEO.box, L(0x150d09), LEN, 1.6, .16, cx, 6.2, s*EDGE);
        for (let x = XA+4; x < W1; x += 8, i++){
          const a = words[i%6], b = words[(i+3)%6];
          const tex = canvasTex(128,384,(g,w,h)=>{ g.fillStyle = '#efe4c6'; g.fillRect(0,0,w,h); g.fillStyle = '#7a1a12'; g.fillRect(0,0,w,14); g.fillRect(0,h-14,w,14);
            g.fillStyle = '#120c0a'; g.font = '900 96px "Hiragino Mincho ProN","Songti TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(a, w/2, h*.36); g.fillText(b, w/2, h*.68); });
          add(GEO.plane, B(0xffffff,{ map:tex, fog:false }), .95, 2.8, 1, x, 3.3, zs(s,-.05)).rotation.y = ry;
          const cz = zs(s,-.5); add(GEO.cyl, wood, .05, 1.5, .05, x+4, .75, cz).castShadow = true; add(GEO.cyl, wax, .07, .22, .07, x+4, 1.6, cz); flame(x+4, 1.95, cz, .5);
          if (i % 2 === 0){ const rz = zs(s,-.3); add(GEO.box, rack, 1.8, .08, .12, x+1.9, 1.5, rz); add(GEO.box, rack, 1.8, .08, .12, x+1.9, 1.0, rz);   // 刀架
            add(GEO.box, steel, 1.5, .04, .03, x+1.9, 1.56, rz); add(GEO.box, steel, 1.3, .04, .03, x+1.9, 1.06, rz); }
        }
      });
      if (IS3D) for (let x = XA+2; x < W1; x += 8) add(GEO.box, beam, .3, .3, EDGE*2, x, 6.1, 0);
      frontEdge(wood);
      paperWall(XA, 0, true); paperWall(XB); gateXs.forEach(x => paperWall(x, x));
      moteCfg = { color:0xffe0b0, size:.05, fall:0, drift:.1, n:180 };
    },
    // ── 六、雪之寺 ──
    snow(){
      set({ bg:0xc4d0e0, fog:[18,75], amb:[0xdfe8ff,.55], hemi:[0xffffff,0x8a98b0,.55], sun:[0xfff4e8,.75], rim:[0xbcd4ff,.8], grade:'linear-gradient(#3a6aff,#102a5a)', gate:[0x7a1a12,0xf0f0f4] });
      dome([[0,'#7a8cb0'],[.35,'#b8c6dc'],[.48,'#e8eef6'],[.5,'#f6f8fc'],[.52,'#c4d0e0'],[1,'#c4d0e0']], false);
      far(add(GEO.plane, B(0xffffff,{ fog:false, transparent:true, depthWrite:false, map: canvasTex(512,256,(g,w,h)=>{
        g.fillStyle = 'rgba(150,168,200,.95)'; g.beginPath(); g.moveTo(0,h); g.lineTo(90,120); g.lineTo(160,170); g.lineTo(260,60); g.lineTo(340,150); g.lineTo(420,100); g.lineTo(512,h); g.fill();
        g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.moveTo(222,100); g.lineTo(260,60); g.lineTo(296,102); g.lineTo(270,94); g.lineTo(250,110); g.fill(); }) }), 110, 40, 1, 0,0,0), [110,14,0], [0,8,-80]);
      floor((g,w,h)=>{ g.fillStyle = '#e8eef6'; g.fillRect(0,0,w,h);
        for (let i=0;i<240;i++){ g.fillStyle = `rgba(${Math.random()<.5?150:255},${Math.random()<.5?170:255},255,.14)`; g.beginPath(); g.arc(Math.random()*w, Math.random()*h, rand(4,18), 0, 7); g.fill(); }
        g.fillStyle = 'rgba(120,140,180,.35)'; for (let i=0;i<26;i++){ g.beginPath(); g.ellipse(Math.random()*w, Math.random()*h, 5, 2.5, Math.random()*3, 0, 7); g.fill(); } },256,256,8,7);
      ground(L(0xdfe6f2), -.04);
      M = { trunk:L(0x2a2018,true), leaf:[L(0x2f5a44,true), L(0x3a6a50,true)], snow:L(0xf4f8ff,true) };
      const stone = L(0x8a8f9a,true), white = L(0xf4f8ff,true), red = L(0xb0261a);
      sides(s => {
        for (let x = W0+1; x < W1+6; x += 5.5){ tree(x+rand(-1.2,1.2), zs(s, rand(2,4.6)), 'pine', rand(.85,1.1)); if (Math.random() < .7) tree(x+2.6, zs(s, rand(7.5,13)), 'pine', rand(1.1,1.5)); }
        for (let x = XA+6; x < W1; x += 12) stoneLantern(x + (s > 0 ? 6 : 0), zs(s,-.6), stone, white);
        for (let x = W0; x < W1; x += 4) add(GEO.ico1, white, rand(.8,1.8), rand(.3,.6), rand(.7,1.3), x+rand(-1,1), .1, zs(s, rand(.2,1.4))).receiveShadow = true;   // 雪堆
        for (let x = W0+3; x < W1; x += 11) ray(x, zs(s, rand(.5,3)), 0xffffff, 14); mist(zs(s,9), 0xffffff, .4);
        if (!IS3D) for (let x = 10; x < W1; x += 20) torii(x, zs(s,2), false, 2.4, red);
      });
      if (IS3D) for (let x = 10; x < XB; x += 20) torii(x, 0, true, EDGE-.3, red);
      const post = L(0x3a2a1c); gateXs.forEach(x => fenceGate(x, x, post)); fenceGate(XB, 0, post);
      moteCfg = { color:0xffffff, size:.1, fall:1.6, drift:.9, n:420 };
    },
    // ── 七、港町 ──
    harbor(){
      set({ bg:0x0a1a24, fog:[26,90], amb:[0x9fd0e0,.42], hemi:[0xa0d8f0,0x0a1a24,.45], sun:[0xcfeaff,.7], rim:[0xffb060,.8], grade:'linear-gradient(#004a5a,#1a0a00)', lamp:[0xff9a4a,1.3], gate:[0x3a2a1c,0x5a4630] });
      dome([[0,'#020814'],[.34,'#0c2438'],[.47,'#2f6a80'],[.5,'#6aa8b8'],[.52,'#061018'],[1,'#061018']], true);
      far(add(GEO.circ, B(0xfff2d0,{ fog:false }), 6, 6, 1, 0,0,0), [90,16,20], [-12,7.5,-56]); far(halo(0,0,0,0xfff2d0,36), [89,16,20], [-12,7.5,-55]);
      floor(plankDraw('#6a5a48'),256,128,6,3.5);
      waterTex = canvasTex(256,256,(g,w,h)=>{ g.fillStyle = '#0c2a3a'; g.fillRect(0,0,w,h);
        for (let i=0;i<160;i++){ g.strokeStyle = `rgba(${Math.random()<.2?255:120},${Math.random()<.2?210:200},220,${rand(.08,.3)})`; g.lineWidth = rand(1,2.5); const x = Math.random()*w, y = Math.random()*h, l = rand(10,46); g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+l/2,y-3,x+l,y); g.stroke(); } });
      waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(30,30);
      ground(B(0xffffff,{ map:waterTex, fog:false }), -.9).receiveShadow = false;
      const pier = L(0x2e241a), hull = L(0x2a1c14), sail = B(0xe8dcc0,{ side:THREE.DoubleSide }), crate = L(0x6a4a2c), paper = B(0xffb060,{ fog:false });
      sides(s => {
        add(GEO.box, pier, LEN, .9, .3, cx, -.45, zs(s,.15));
        for (let x = W0; x < W1; x += 3){ add(GEO.cyl, pier, .14, 2.6, .14, x, .3, zs(s,.2)).castShadow = true; }
        for (let x = XA+5; x < W1; x += 10){ const lz = zs(s,.2); add(GEO.cyl, pier, .06, 3.4, .06, x, 1.7, lz); add(GEO.sph, paper, .28, .38, .28, x, 3.3, lz); lamp(x,3.3,lz,0xff9a4a,3.2); }
        for (let x = XA+8; x < W1; x += 14){ const bz = zs(s,-.7); add(GEO.box, crate, .9, .9, .9, x, .45, bz).castShadow = true; add(GEO.box, crate, .7, .7, .7, x+.9, .35, bz).castShadow = true; add(GEO.cyl, crate, .38, 1, .38, x-1, .5, bz).castShadow = true; }
        for (let x = W0+6; x < W1+10; x += 19){ const bx = x+rand(-3,3), bz = zs(s, rand(5,11)), g = new THREE.Group(); g.position.set(bx,-.7,bz); world.add(g);   // 帆船
          add(GEO.box, hull, 5, 1, 1.8, 0, .4, 0, g); add(GEO.cone, hull, 1.3, 2, .9, 3.2, .4, 0, g).rotation.z = -PI/2; add(GEO.cyl, pier, .08, 6, .08, 0, 3.6, 0, g);
          add(GEO.plane, sail, 3.2, 3.8, 1, 0, 4.2, 0, g).rotation.y = IS3D ? PI/2 : 0; add(GEO.sph, paper, .2, .26, .2, -2.2, 1.4, 0, g); halo(-2.2,1.4,0,0xff9a4a,2.2,g); swayers.push({ g, ph:bx, amp:.03 }); }
      });
      frontEdge(pier);
      gateXs.forEach(x => fenceGate(x, x, pier)); fenceGate(XB, 0, pier);
      moteCfg = { color:0xcfeaff, size:.05, fall:.1, drift:.8, n:160 };
    },
    // ── 八、城門（火攻）──
    gate(){
      set({ bg:0x1c0a06, fog:[22,75], amb:[0xffb080,.42], hemi:[0xff8a4a,0x1c0a06,.5], sun:[0xffc090,.65], rim:[0xff5a2a,1.1], grade:'linear-gradient(#7a1a00,#200400)', lamp:[0xff6a2a,1.6], gate:[0x3a2a1c,0x5a4630] });
      dome([[0,'#0a0404'],[.3,'#3a0e08'],[.45,'#a8381a'],[.5,'#ff8a3a'],[.52,'#1c0a06'],[1,'#1c0a06']], false);
      far(add(GEO.plane, B(0xffffff,{ fog:false, transparent:true, depthWrite:false, map: canvasTex(512,512,(g,w,h)=>{
        g.fillStyle = '#0a0404'; let y = h, bw = 300; for (let i=0;i<5;i++){ const bh = 60; g.fillRect(256-bw/2, y-bh, bw, bh); g.beginPath(); g.moveTo(256-bw/2-40, y-bh+8); g.lineTo(256, y-bh-34); g.lineTo(256+bw/2+40, y-bh+8); g.fill(); y -= bh+26; bw -= 48; }
        g.fillStyle = 'rgba(255,140,60,.9)'; for (let i=0;i<30;i++) g.fillRect(rand(140,372), rand(120,h-10), 6, 9); }) }), 46, 46, 1, 0,0,0), [100,20,0], [6,12,-70]);
      far(halo(0,0,0,0xff5a1a,90), [98,14,0], [6,8,-68]);
      floor((g,w,h)=>{ g.fillStyle = '#6a625a'; g.fillRect(0,0,w,h);
        for (let r=0;r<4;r++) for (let c=0;c<5;c++){ const x = c*52 + (r%2)*26 - 10, y = r*64; g.fillStyle = pick(['#7a7268','#6e665c','#847a6e']); g.fillRect(x+2,y+2,48,60); }
        noise(g,w,h,400,30,150,.06,10); },256,256,6,7);
      ground(L(0x3a2a22), -.04);
      const stone = canvasTex(256,256,(g,w,h)=>{ g.fillStyle = '#3a3632'; g.fillRect(0,0,w,h);
        for (let r=0;r<6;r++){ let x = -rand(0,30); while (x < w){ const bw = rand(30,70); g.fillStyle = pick(['#6a645c','#5a554e','#746c62','#4e4a44']); g.fillRect(x+2, r*43+2, bw-4, 39); x += bw; } } });
      stone.wrapS = THREE.RepeatWrapping; stone.repeat.set(LEN/8, 1);
      const stoneMat = new THREE.MeshLambertMaterial({ map:stone }), plaster = L(0xe8e2d4), roofT = L(0x2a2a32), iron = L(0x1a1614), ember = B(0xff5a1a,{ fog:false });
      sides(s => {
        const w = add(GEO.box, stoneMat, LEN, 4, 1.4, cx, 1.9, zs(s,1.3)); w.rotation.x = s*.22; w.castShadow = true; w.receiveShadow = true;   // 石垣
        add(GEO.box, plaster, LEN, 2.2, .5, cx, 5, zs(s,1.9)); add(GEO.box, roofT, LEN, .3, 1.5, cx, 6.2, zs(s,1.8)).rotation.x = s*.12;
        for (let x = W0+2; x < W1; x += 2.6) add(GEO.box, iron, .34, .5, .1, x, 5.1, zs(s,1.63));   // 狹間
        for (let x = XA+5; x < W1; x += 10){ const bz = zs(s,-.6); add(GEO.cyl, iron, .05, 1.3, .05, x-.25, .65, bz).rotation.z = .2; add(GEO.cyl, iron, .05, 1.3, .05, x+.25, .65, bz).rotation.z = -.2;
          add(GEO.cyl, iron, .42, .28, .42, x, 1.35, bz).castShadow = true; add(GEO.sph, ember, .34, .12, .34, x, 1.5, bz); flame(x, 1.95, bz, 1.4); }
        for (let x = W0+3; x < W1; x += 12){ const p = add(GEO.cyl, wood, .08, 6, .08, x, 3, zs(s,-.2)); p.castShadow = true; const fl = add(GEO.plane, B(0x7a1a12,{ side:THREE.DoubleSide }), 1.1, 3.2, 1, x+.62, 4.2, zs(s,-.2)); swayers.push({ g:fl, ph:x, amp:.14, axis:'y' }); }
      });
      const bar = L(0x3a2a1c); gateXs.forEach(x => fenceGate(x, x, bar)); fenceGate(XB, 0, bar);
      moteCfg = { color:0xff8a3a, size:.09, fall:-1.4, drift:.8, n:320, add:true };
    },
  };
  T[theme]();
  const n = moteCfg.n, pos = new Float32Array(n*3);
  for (let i=0;i<n;i++){ pos[i*3] = rand(-14,14); pos[i*3+1] = rand(.2,7); pos[i*3+2] = IS3D ? rand(-9,9) : rand(-8,5); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  motes = new THREE.Points(g, new THREE.PointsMaterial({ color:moteCfg.color, size:moteCfg.size, transparent:true, opacity:.8, depthWrite:false, map:glowTex,
    blending: moteCfg.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  motes.userData.own = true; world.add(motes);
}
function updWorld(dt){
  for (const f of followers){ if (f.dome) f.m.position.set(cam.x, 0, cam.z); else f.m.position.set(cam.x + f.p[0], f.p[1], f.p[2]); }
  if (motes){
    motes.position.x = cam.x;
    const a = motes.geometry.attributes.position, c = moteCfg;
    if (c.fall || c.drift > .2){
      for (let i=0;i<a.count;i++){
        let y = a.getY(i) - c.fall*dt, x = a.getX(i) - c.drift*dt*(.6 + (i%5)*.2) + (c.add ? Math.sin(G.rt*1.3+i)*dt*.5 : 0);
        if (y < 0) y += 7; else if (y > 7) y -= 7; if (x < -14) x += 28;
        a.setXYZ(i, x, y, a.getZ(i));
      }
      a.needsUpdate = true;
    }
  }
  const t = G.rt;
  for (let i=0;i<flames.length;i++){ const f = flames[i], b = f.userData.b || (f.userData.b = f.scale.y); f.scale.y = b*(1 + Math.sin(t*17+i*2.3)*.18 + Math.sin(t*31+i)*.08); f.rotation.z = Math.sin(t*9+i)*.08; }
  for (const s of swayers){ const v = Math.sin(t*1.1+s.ph)*s.amp + Math.sin(t*2.7+s.ph*1.7)*s.amp*.4; if (s.axis === 'y') s.g.rotation.y = v*3; else s.g.rotation.z = v; }
  for (const r of rays) r.m.material.opacity = .1 + .07*Math.sin(t*.6+r.ph);
  if (waterTex){ waterTex.offset.x = t*.012; waterTex.offset.y = Math.sin(t*.3)*.01; }
  // 局部燈光：挑離鏡頭最近的三盞燈
  if (lampPow && lampSpots.length){
    const near = lampSpots.map(p => [Math.abs(p[0]-cam.x) + Math.abs(p[2]-cam.z)*.3, p]).sort((a,b) => a[0]-b[0]);
    glowLights.forEach((l,i) => { const p = near[i]; if (!p){ l.intensity = 0; return; } l.position.set(p[1][0], p[1][1], p[1][2]); l.intensity = lampPow*(.85 + .15*Math.sin(t*11+i*4)); });
  } else glowLights.forEach(l => { l.intensity = 0; });
  G.flash = Math.max(0, G.flash - dt*3); ambient.intensity = baseAmb + G.flash*2.2;
}
