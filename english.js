'use strict';
// 英文修行（咒文斬）：戰鬥中敵人身上浮現一句英文片語並念出來，三個中文意思選一個。
// 答對：對那個敵人發動言靈斬，之後幾秒攻擊力提升。答錯不扣血，但那一句之後會更常出現。

// 片語題庫，每筆是 [英文, 中文, 相近意思的分組]。同一組的不會同時出現在選項裡，避免兩個答案都算對。
// 第一級：國小高年級。課本程度的問候、教室用語、日常作息、感受、問路
const ELEM = [
  // ── 問候與禮貌 ──
  ['Good morning.', '早安'], ['Good night.', '晚安'], ['How are you?', '你好嗎？'], ["I'm fine, thank you.", '我很好，謝謝'],
  ['Nice to meet you.', '很高興認識你'], ['See you tomorrow.', '明天見'], ['Thank you very much.', '非常謝謝你', 'thx'], ["You're welcome.", '不客氣'],
  ["I'm sorry.", '對不起'], ['Excuse me.', '不好意思'], ['Of course.', '當然', 'yes'], ['No problem.', '沒問題', 'yes'],
  ["I don't know.", '我不知道'], ['I see.', '我懂了'], ['Me too.', '我也是'], ['Good idea.', '好主意'],
  // ── 教室用語 ──
  ['Stand up.', '起立'], ['Sit down.', '坐下'], ['Open your book.', '打開書本'], ['Close the door.', '關門'],
  ['Raise your hand.', '舉手'], ['Be quiet.', '安靜'], ['Listen to me.', '聽我說'], ['Look at the board.', '看黑板'],
  ['Line up.', '排隊'], ['Come here.', '過來這裡'], ['Go back to your seat.', '回座位'], ['Time for lunch.', '午餐時間到了'],
  ["Let's go.", '我們走吧'], ['Wait a minute.', '等一下'], ['Hurry up.', '快一點'], ['Good job.', '做得好'],
  ['Try again.', '再試一次'], ["Don't worry.", '別擔心'], ['May I come in?', '我可以進來嗎？'], ['Can I go to the bathroom?', '我可以去廁所嗎？'],
  // ── 認識彼此 ──
  ["What's your name?", '你叫什麼名字？'], ['How old are you?', '你幾歲？'], ['Where are you from?', '你從哪裡來？'], ['This is my friend.', '這是我的朋友'],
  ['Who is he?', '他是誰？'], ["What's this?", '這是什麼？'], ['What are you doing?', '你在做什麼？'], ['I can swim.', '我會游泳'],
  // ── 時間與天氣 ──
  ['What time is it?', '現在幾點？'], ['What day is today?', '今天星期幾？'], ["How's the weather?", '天氣如何？'], ["It's sunny.", '天氣晴朗'],
  ["It's raining.", '正在下雨'], ["It's hot today.", '今天很熱'], ["It's cold outside.", '外面很冷'], ['every day', '每天'],
  ['last night', '昨天晚上'], ['tomorrow morning', '明天早上'], ['after school', '放學後'], ['on the weekend', '在週末'],
  ['in the morning', '在早上'], ['at night', '在晚上'], ['right now', '現在馬上'],
  // ── 感受與身體 ──
  ["I'm hungry.", '我餓了'], ["I'm thirsty.", '我渴了'], ["I'm tired.", '我累了', 'tired'], ["I'm sleepy.", '我想睡了', 'tired'],
  ["I'm happy.", '我很開心'], ["I'm sad.", '我很難過'], ["I'm angry.", '我很生氣'], ["I'm scared.", '我很害怕'],
  ["I'm sick.", '我生病了', 'sick'], ['I have a cold.', '我感冒了', 'sick'], ['I have a headache.', '我頭痛', 'sick'],
  // ── 每天做的事 ──
  ['Get up.', '起床'], ['Go to bed.', '上床睡覺'], ['Brush your teeth.', '刷牙'], ['Wash your hands.', '洗手'],
  ['Take a shower.', '洗澡'], ['Eat breakfast.', '吃早餐'], ['Go to school.', '去上學'], ['Do homework.', '寫作業'],
  ['Watch TV.', '看電視'], ['Play basketball.', '打籃球'], ['Ride a bike.', '騎腳踏車'], ['Read a book.', '看書'],
  ['Listen to music.', '聽音樂'], ['Play the piano.', '彈鋼琴'], ['Go swimming.', '去游泳'], ['Go shopping.', '去買東西'],
  ['Clean the room.', '打掃房間'], ['Wash the dishes.', '洗碗'], ['Take out the trash.', '倒垃圾'], ['Walk the dog.', '遛狗'],
  ['Turn on the light.', '開燈'], ['Turn off the light.', '關燈'], ['Put on your coat.', '穿上外套'], ['Take off your shoes.', '脫鞋'],
  // ── 吃東西與買東西 ──
  ['How much is it?', '這個多少錢？'], ['I want this one.', '我要這一個'], ['Here you are.', '給你'], ['Can I help you?', '需要幫忙嗎？'],
  ['I like apples.', '我喜歡蘋果'], ["I don't like fish.", '我不喜歡魚'], ["What's for dinner?", '晚餐吃什麼？'], ["It's delicious.", '很好吃'],
  ["I'm full.", '我吃飽了'], ['a glass of water', '一杯水'], ['a lot of', '很多'], ['a little', '一點點'],
  // ── 位置與問路 ──
  ['Where is the bathroom?', '廁所在哪裡？'], ['Turn left.', '左轉'], ['Turn right.', '右轉'], ['Go straight.', '直走'],
  ['next to the park', '在公園旁邊'], ['in front of the school', '在學校前面'], ['behind the door', '在門後面'], ['on the desk', '在書桌上'],
  ['under the chair', '在椅子下面'],
  // ── 遊戲與祝福 ──
  ["Let's play together.", '我們一起玩'], ["It's my turn.", '輪到我了'], ['You win.', '你贏了'], ['Take turns.', '輪流'],
  ["I can't find it.", '我找不到'], ['Help me, please.', '請幫幫我', 'help'], ['Can you help me?', '你可以幫我嗎？', 'help'], ['Thank you for your help.', '謝謝你的幫忙', 'thx'],
  ['Be careful!', '小心', 'care'], ['Watch out!', '注意，小心', 'care'], ['Good luck!', '祝你好運'], ['Have fun!', '玩得開心'],
  ['Happy birthday!', '生日快樂'], ['Merry Christmas!', '聖誕快樂'], ['Happy New Year!', '新年快樂'],
];

// 第二級：生活進階。日常會話裡常聽到的片語與慣用語
const ADV = [
  // ── 問候寒暄 ──
  ["How's it going?", '最近好嗎？', 'hi'], ['Long time no see.', '好久不見'], ["What's up?", '怎麼了？最近如何？', 'hi'], ['Nice to meet you.', '很高興認識你'],
  ['Take care.', '保重'], ['See you later.', '待會見'], ['Have a good one.', '祝你有美好的一天'], ['How have you been?', '你最近過得如何？', 'hi'],
  ['Not much.', '沒什麼特別的'], ['Same as usual.', '老樣子'],
  // ── 回應 ──
  ['No worries.', '別擔心，沒關係', 'ok'], ['Never mind.', '算了，沒事', 'ok'], ['You bet.', '當然'], ['Fair enough.', '說得也是，可以接受', 'reason'],
  ['My bad.', '我的錯'], ['No way.', '不可能，才不要'], ['It depends.', '看情況'], ['Makes sense.', '有道理', 'reason'],
  ['Got it.', '懂了'], ['Sounds good.', '聽起來不錯'], ['Go ahead.', '請便，你做吧', 'after'], ['Take your time.', '慢慢來'],
  ["It's up to you.", '由你決定'], ["I'm not sure.", '我不確定'], ["That's it.", '就這樣，沒別的了'], ['Exactly.', '完全正確'],
  ['Not really.', '不太算是'], ['I guess so.', '大概是吧'], ['Good for you.', '真替你高興'], ['What a pity.', '真可惜'],
  // ── 請求與幫忙 ──
  ['Give me a hand.', '幫我一下', 'help'], ['Do me a favor.', '幫我個忙', 'help'], ['Hang on.', '等一下', 'wait'], ['Hold on a second.', '稍等一下', 'wait'],
  ['Excuse me.', '不好意思，借過'], ['Could you say that again?', '可以再說一次嗎？'], ['Let me know.', '再跟我說', 'tell'], ['Keep me posted.', '有消息隨時通知我', 'tell'],
  ['After you.', '你先請', 'after'], ['Help yourself.', '請自便，自己來'],
  // ── 餐廳 ──
  ['For here or to go?', '內用還是外帶？'], ['Check, please.', '麻煩結帳'], ["It's on me.", '我請客'], ["Let's split the bill.", '我們各付各的'],
  ["I'm full.", '我吃飽了'], ["I'm starving.", '我餓壞了'], ['Can I get a refill?', '可以續杯嗎？'], ['What do you recommend?', '你推薦什麼？'],
  ['Keep the change.', '不用找了'], ['To go, please.', '外帶，謝謝'],
  // ── 購物 ──
  ['Just looking.', '我只是看看'], ['Can I try it on?', '可以試穿嗎？'], ['How much is it?', '這個多少錢？'], ["It's a bargain.", '很划算'],
  ["It's a rip-off.", '太貴了，根本坑人'], ["It's sold out.", '賣完了', 'stock'], ["I'll take it.", '我要買這個'], ['Do you take credit cards?', '可以刷卡嗎？'],
  ['Can I get a discount?', '可以打折嗎？'], ["It's out of stock.", '沒有庫存了', 'stock'],
  // ── 交通出行 ──
  ["I'm on my way.", '我在路上了'], ["I'm running late.", '我快遲到了'], ['Pick me up.', '來接我'], ['Drop me off here.', '讓我在這裡下車'],
  ['Stuck in traffic.', '塞在車陣中'], ['Hit the road.', '出發上路'], ['Give me a ride.', '載我一程'], ['Get on the bus.', '上公車'],
  ['Get off the train.', '下火車'], ['Miss the flight.', '錯過班機'],
  // ── 日常動作 ──
  ['Wake up.', '醒來', 'rise'], ['Get up.', '起床', 'rise'], ['Hurry up.', '快一點'], ['Slow down.', '慢一點'],
  ['Turn on the light.', '開燈'], ['Turn off the TV.', '關電視'], ['Put on a jacket.', '穿上外套'], ['Take off your shoes.', '脫鞋'],
  ['Clean up.', '打掃乾淨'], ['Throw away.', '丟掉'], ['Look for.', '尋找'], ['Find out.', '查明，得知', 'find'],
  ['Figure out.', '想出辦法，弄清楚', 'find'], ['Give up.', '放棄'], ['Run out of.', '用完了'], ['Look forward to.', '期待'],
  ['Get along with.', '和某人相處融洽'], ['Run into.', '偶然遇到'], ['Show up.', '出現，到場'], ['Hang out.', '一起消磨時間'],
  ['Catch up.', '趕上進度，敘舊'], ['Break down.', '故障'], ['Work out.', '運動健身'], ['Stay up late.', '熬夜'],
  ['Sleep in.', '睡到自然醒'], ['Take a break.', '休息一下', 'rest'], ['Take a nap.', '小睡一下', 'rest'], ['Call back.', '回電'],
  ['Hang up.', '掛電話'], ['Fill out.', '填寫表格'], ['Sign up.', '報名註冊'], ['Log in.', '登入'],
  ['Back up.', '備份'], ['Put off.', '延後', 'cancel'], ['Call off.', '取消', 'cancel'], ['Set up.', '設定，安排'],
  ['Check out.', '結帳退房'], ['Check in.', '報到入住'], ['Eat out.', '外出用餐'], ['Dress up.', '盛裝打扮'],
  // ── 時間與頻率 ──
  ['Right away.', '馬上', 'soon'], ['As soon as possible.', '盡快', 'soon'], ['In a hurry.', '匆匆忙忙'], ['In advance.', '事先'],
  ['On time.', '準時', 'time'], ['In time.', '及時趕上', 'time'], ['From now on.', '從現在起'], ['Once in a while.', '偶爾'],
  ['Sooner or later.', '遲早'], ['All of a sudden.', '突然', 'sudden'], ['So far.', '到目前為止', 'sofar'], ['For good.', '永遠'],
  ['At the moment.', '此刻'], ['Every other day.', '每隔一天'], ['The day after tomorrow.', '後天'],
  // ── 情緒與慣用語 ──
  ['Piece of cake.', '輕而易舉'], ['Under the weather.', '身體不舒服'], ['Call it a day.', '今天到此為止'], ['Sleep on it.', '考慮一晚再決定', 'think'],
  ['Break a leg.', '祝你演出成功'], ['Cheer up.', '打起精神'], ['Calm down.', '冷靜下來'], ["I'm fed up.", '我受夠了', 'fed'],
  ["I'm worn out.", '我累壞了'], ["I can't stand it.", '我無法忍受', 'fed'], ["It's not a big deal.", '沒什麼大不了', 'ok'], ['Better late than never.', '遲到總比不到好'],
  ['So far so good.', '目前為止一切順利', 'sofar'], ['Easy come, easy go.', '來得快去得也快'], ["It's up in the air.", '還沒決定'], ['Out of the blue.', '出乎意料', 'sudden'],
  ['On purpose.', '故意地'], ['By accident.', '不小心地'], ['By the way.', '順帶一提'], ['In other words.', '換句話說'],
  ['As a matter of fact.', '事實上', 'fact'], ['To be honest.', '老實說', 'fact'], ['Just in case.', '以防萬一'], ['No wonder.', '難怪'],
  ['What a coincidence.', '真巧'],
  // ── 工作 ──
  ["I'm swamped.", '我忙翻了'], ['Take a day off.', '請一天假'], ['Hand in.', '繳交'], ['On the same page.', '想法一致'],
  ['Get to the point.', '講重點'], ['Think it over.', '仔細考慮', 'think'], ['Deal with.', '處理'], ['Count on me.', '交給我吧'],
  ['Well done.', '做得好'], ['Keep it up.', '繼續保持'],
];
const PHRASES = ELEM.concat(ADV), LV = PHRASES.map((p,i) => i < ELEM.length ? 1 : 2);   // LV：每一句屬於第幾級
const EN_LEVELS = ['關閉', '國小高年級', '生活進階'];

// ── 發音：用裝置內建的英語語音（美式），念的時候把配樂壓小聲 ──
let enVoice = null;
function findEnVoice(){
  try { const vs = speechSynthesis.getVoices(), us = v => /^en[-_]US/i.test(v.lang);
    const pref = ['Samantha','Google US English','Ava','Allison','Microsoft Aria','Microsoft Jenny','Alex'];
    enVoice = pref.map(n => vs.find(v => v.name.includes(n) && us(v))).find(Boolean) || vs.find(us) || vs.find(v => /^en/i.test(v.lang)) || null; } catch(e){}
}
if ('speechSynthesis' in window){ findEnVoice(); try { speechSynthesis.addEventListener('voiceschanged', findEnVoice); } catch(e){} }
function speakEn(text,rate){
  try { if (!('speechSynthesis' in window)) return; if (!enVoice) findEnVoice();
    const u = new SpeechSynthesisUtterance(text); if (enVoice) u.voice = enVoice; u.lang = 'en-US'; u.rate = rate || .9; u.volume = 1;
    speechSynthesis.cancel(); speechSynthesis.speak(u); AU.duck(1.1 + text.length*.06); } catch(e){}
}

// ── 作答介面（房主與連線的夥伴都會執行這兩個函式）──
let quizTok = 0, quizCur = -1;
function quizOpen(i,opts,listen){
  const q = $('quiz'); quizTok++; quizCur = i;
  q.className = 'on' + (listen ? ' listen' : '');
  $('qText').textContent = listen ? '仔細聽…' : PHRASES[i][0]; $('qRes').textContent = '';
  q.querySelectorAll('#qOpts button').forEach((b,k) => { b.className = ''; b.lastElementChild.textContent = PHRASES[opts[k]][1]; });
  const bar = $('qBar').firstElementChild; bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; bar.style.animationDuration = (LV[i] === 1 ? 10 : 8) + 's';
  $('hint').style.visibility = 'hidden';
  speakEn(PHRASES[i][0], LV[i] === 1 ? .82 : .9);   // 國小級念慢一點
}
// pick：選了第幾個（0~2）；-1 是時間到；-2 是直接收起來（換關、陣亡）
function quizClose(i,ans,pick){
  const q = $('quiz'), tok = ++quizTok; quizCur = -1;
  const hide = () => { if (tok === quizTok){ q.className = ''; $('hint').style.visibility = ''; } };
  if (pick === -2) return hide();
  const ok = pick === ans, st = SAVE.enStat || (SAVE.enStat = {}), s = st[i] || (st[i] = { c:0, w:0 });
  if (ok) s.c++; else { s.c = 0; s.w++; }
  saveNow();
  q.classList.add(ok ? 'ok' : 'bad'); q.classList.remove('listen');
  $('qText').textContent = PHRASES[i][0];
  $('qRes').textContent = ok ? '答對了' : (pick === -1 ? '時間到　' : '') + '意思是：' + PHRASES[i][1];
  q.querySelectorAll('#qOpts button').forEach((b,k) => { if (k === ans) b.className = 'right'; else if (k === pick) b.className = 'wrong'; });
  if (!ok) speakEn(PHRASES[i][0], .8);   // 答錯再慢慢念一次
  setTimeout(hide, ok ? 1300 : 2400);
}

const EN = (() => {
  const limit = () => SAVE.en === 1 ? 10 : 8;   // 作答時間（秒，現實時間）。國小級多給一點
  let q = null, nextAt = 0, recent = [], seen = [], told = false, mark = null;
  const stat = i => (SAVE.enStat && SAVE.enStat[i]) || { c:0, w:0 };
  // 挑題：沒看過的優先，答錯過的更優先，連續答對三次以上的少出
  function pickPhrase(){
    let total = 0; const w = PHRASES.map((p,i) => { if (LV[i] !== SAVE.en || recent.includes(i)) return 0; const s = stat(i);
      const v = s.w && s.c < 2 ? 6 + s.w*2 : s.c >= 3 ? .4 : s.c > 0 ? 1.2 : 3; total += v; return v; });
    let r = Math.random()*total; for (let i=0;i<w.length;i++){ r -= w[i]; if (r <= 0) return i; }
    return SAVE.en === 2 ? ELEM.length + Math.floor(Math.random()*ADV.length) : Math.floor(Math.random()*ELEM.length);
  }
  function start(){
    const i = pickPhrase(), tag = PHRASES[i][2], pool = [];
    for (let k=0;k<PHRASES.length;k++) if (k !== i && LV[k] === LV[i] && PHRASES[k][1] !== PHRASES[i][1] && !(tag && PHRASES[k][2] === tag)) pool.push(k);   // 干擾選項取自同一級
    const opts = [i];
    while (opts.length < 3){ const k = pool.splice(Math.floor(Math.random()*pool.length), 1)[0]; const t = PHRASES[k][2]; if (!t || !opts.some(o => PHRASES[o][2] === t)) opts.push(k); }
    opts.sort(() => Math.random()-.5);
    recent.push(i); if (recent.length > 8) recent.shift();
    const cand = enemies.filter(targetable);
    q = { i, opts, ans:opts.indexOf(i), t0:G.rt, e:cand.length ? pick(cand) : null };
    if (!mark){ mark = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xffd36a, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false })); mark.scale.setScalar(1.6); scene.add(mark); }
    quizOpen(i, opts, !!SAVE.enListen);
    if (!told){ told = true; hint(TOUCH ? '點選片語的意思　答對就發動言靈斬' : '按 1 2 3 選出片語的意思　答對就發動言靈斬'); }
  }
  function resolve(k){
    const ok = k === q.ans; seen.push({ i:q.i, ok });
    quizClose(q.i, q.ans, k);
    if (ok){
      G.enBuffUntil = G.rt + 8; G.score += 200;
      for (const P of alive()) P.ki = Math.min(100, P.ki + 15);
      const L = lead(), live = enemies.filter(targetable);
      const tg = q.e && targetable(q.e) ? q.e : live.sort((a,b) => Math.hypot(a.x-L.x,a.z-L.z) - Math.hypot(b.x-L.x,b.z-L.z))[0];
      if (tg){   // 言靈斬：一道金色的光劈在出題的敵人身上
        const b = spawnP(GEO.box, 0xffe9a8, tg.x, 7, tg.z, 0,0,0, .22, 1, { add:true }); b.m.scale.set(.2,14,.2);
        boomFx(tg.x, tg.z, 0xffd36a); pop('言靈斬', tg.x, 3.2*tg.scale, tg.z, 'gold'); AU.hit(true); AU.chime();
        damage(tg, 45*UP.dmg, { ult:true, on:true, a:Math.atan2(tg.z-L.z, tg.x-L.x), sx:L.x, sz:L.z });
        if (!tg.dead && NAMES[tg.ai] && tg.state !== 'lunge'){ tg.state = 'stagger'; tg.t = 1.2; tg.warn = 0; }
      }
    }
    nextAt = G.rt + (ok ? rand(9,13) : rand(7,10)); q = null; if (mark) mark.visible = false;
  }
  return {
    reset(){ if (q) quizClose(q.i, q.ans, -2); q = null; seen = []; nextAt = G.rt + 5; G.enBuffUntil = 0; if (mark) mark.visible = false; },
    update(){
      if (!SAVE.en) return;
      if (G.mode !== 'play'){ if (q){ quizClose(q.i, q.ans, -2); q = null; if (mark) mark.visible = false; } return; }
      if (!q){ if (G.zoneActive && G.rt >= nextAt && enemies.some(targetable)) start(); return; }
      G.slowT = Math.max(G.slowT, .08);   // 作答時戰鬥放慢，有時間看題
      const e = q.e; if (mark){ mark.visible = !!(e && targetable(e)); if (mark.visible){ mark.position.set(e.x, 2.55*e.scale, e.z); mark.scale.setScalar(1.3 + Math.sin(G.rt*8)*.25); } }
      let k = -1; for (const P of active()) for (const n of [1,2,3]) if (IN[P.pi].p['q'+n]) k = n-1;
      if (k >= 0) resolve(k); else if (G.rt - q.t0 > limit()) resolve(-1);
    },
    // 過關畫面的片語回顧：點一下可以再聽一次
    review(){
      if (!seen.length) return '';
      const uniq = []; for (const s of seen){ const u = uniq.find(x => x.i === s.i); if (u) u.ok = u.ok && s.ok; else uniq.push({ i:s.i, ok:s.ok }); }
      return `<div class="enrev"><div class="enhead">片語　答對<b>${seen.filter(s => s.ok).length} / ${seen.length}</b><small>點一下可以再聽一次</small></div>` +
        uniq.map(u => `<button class="ph ${u.ok ? '' : 'miss'}" data-i="${u.i}"><em>${u.ok ? '✓' : '✗'}</em>${PHRASES[u.i][0]}<span>${PHRASES[u.i][1]}</span></button>`).join('') + '</div>';
    },
    // 暫停結束後，把作答時間與加成的期限往後延同樣的長度
    delay(d){ if (q) q.t0 += d; nextAt += d; if (G.enBuffUntil) G.enBuffUntil += d; },
    get q(){ return q; }, get seen(){ return seen; },
  };
})();

// 作答按鈕、再聽一次、回顧清單的點擊
$('qOpts').querySelectorAll('button').forEach(b => b.addEventListener('pointerdown', e => { IN[0].p['q' + b.dataset.k] = true; e.preventDefault(); }));
$('qSay').addEventListener('pointerdown', e => { if (quizCur >= 0) speakEn(PHRASES[quizCur][0], .8); e.preventDefault(); });
addEventListener('keydown', e => { if (e.code === 'KeyR' && quizCur >= 0 && G.mode === 'play') speakEn(PHRASES[quizCur][0], .8); });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.ph'); if (b) speakEn(PHRASES[+b.dataset.i][0], .85); });

drawTitle();   // 題庫載入後重畫標題，英文選項才會出現
