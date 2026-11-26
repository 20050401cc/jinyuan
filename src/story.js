// 剧情：章节文本与过场插画（全部用 Canvas 程序绘制：剪影、光、雪与余烬）
'use strict';
(function () {
  const G = window.G, TAU = Math.PI * 2;

  // ---------- 章节 ----------
  G.STORY = {
    prologue: { title: '序章 · 守灯人', shots: [
      { scene: 'town', text: '很久以前，地底有一团不肯熄灭的火。人们在深渊边上建起小镇，靠它的余温熬过一个又一个长冬。' },
      { scene: 'keeper', text: '看守这团火的人，叫做守灯人。我的母亲是最后一位。' },
      { scene: 'descent', text: '七年前的冬天，渊火忽然暴烈起来。她提着灯走了下去。火平息了，她再也没有回来。' },
      { scene: 'ashsnow', text: '今年，渊火又开始翻涌。雪落下来是灰色的，镇上的灯一盏接一盏地暗了。' },
      { scene: 'resolve', text: '我带上她留下的那盏旧灯。这一次，换我下去。' },
      { scene: 'titlecard', text: '' }
    ] },
    ch1: { title: '第一章 · 铜铃', shots: [
      { scene: 'bell', text: '熔炉守卫倒下时，胸口滚出一枚铜铃。是母亲挂在灯上的那只。' },
      { scene: 'furnaces', text: '原来那些守卫，是她当年亲手点起的炉火——用来拦住往上爬的东西。' },
      { scene: 'lampbell', text: '我把铜铃系回灯上。它响了一声，很轻，像她从前夜里走过门口的脚步。' }
    ] },
    ch2: { title: '第二章 · 丝线', shots: [
      { scene: 'threads', text: '虚空织者散开时，满室的丝线里浮出一些画面。' },
      { scene: 'counting', text: '她独自坐在冰里，一遍一遍地数着头顶小镇的灯火。' },
      { scene: 'counting', text: '「再撑一下，」她对自己说，「等那孩子长大，等他们熬过这个冬天。」' },
      { scene: 'deep', text: '丝线的尽头是渊心。那里很亮，也很烫。' }
    ] },
    ending: { title: '终章 · 灯火', shots: [
      { scene: 'heart', text: '火焰褪去，渊心里坐着一个很瘦的人影。她的灯早就碎了，只剩一双手还拢着那团火。' },
      { scene: 'heart', text: '「我一直在数镇上的灯，」她说，「今年少了好多……我太累了，抓不住它了。」' },
      { scene: 'handover', text: '「把灯给我。」她把最后一捧火放进我的灯里。「轮到你了。别怕，它很暖。」' },
      { scene: 'ascend', text: '她化成了无数余烬，从深渊里升起来，像一场倒着落下的雪。' },
      { scene: 'dawn', text: '我回到地面时，天刚亮。镇上的灯，一盏一盏地亮了。' },
      { scene: 'lamp', text: '从那以后，每个冬夜我都把灯举得高一点。好让她看得见回家的路。' },
      { scene: 'credits', text: '' }
    ] }
  };
  G.STORY_ORDER = ['prologue', 'ch1', 'ch2', 'ending'];
  // 守护者登场台词与阶段台词
  G.BOSS_LINES = {
    boss1: { epi: '第一守护者', line: '……止步。炉火之后，不许有人通过。', phase: ['炉火……不可……熄灭……', '她说过……守住……'] },
    boss2: { epi: '第二守护者', line: '你身上有她的气味。回去吧——她不想让你看见。', phase: ['她每晚都在数你们的灯。', '别逼她看着你倒下。'] },
    boss3: { epi: '渊心', line: '……是你吗？你都长这么高了。', phase: ['别过来……它会烧到你的。', '……你的眼睛，和小时候一模一样。'] }
  };
  G.DEATH_LINES = ['「摔倒了就歇一会儿，灯不会跑的。」', '「天总会亮的。再试一次吧。」', '灯还亮着。', '「慢一点，我在这儿等你。」'];

  // ---------- 绘制工具 ----------
  function seeded(s) { return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function sky(c, W, H, stops) {
    const g = c.createLinearGradient(0, 0, 0, H);
    for (const s of stops) g.addColorStop(s[0], s[1]);
    c.fillStyle = g; c.fillRect(-W * 0.2, -H * 0.2, W * 1.4, H * 1.4);
  }
  function glow(c, col, x, y, r, a) {
    c.globalCompositeOperation = 'lighter'; G.glow(c, col, x, y, r, a);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }
  function stars(c, W, H, t, n, maxY, seed) {
    const r = seeded(seed || 3);
    c.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * maxY, s = r() * 1.4 + 0.4, tw = 0.5 + 0.5 * Math.sin(t * (1 + r() * 2) + i);
      c.globalAlpha = (0.2 + r() * 0.6) * tw; c.fillRect(x, y, s, s);
    }
    c.globalAlpha = 1;
  }
  // 飘落的雪（灰雪 / 白雪）
  // 雪花用预渲染的圆点贴图（比逐个画圆路径快得多）
  const dots = {};
  function dot(col) {
    if (dots[col]) return dots[col];
    const d = G.mkCanvas(16, 16), x = d.getContext('2d');
    x.fillStyle = col; x.beginPath(); x.arc(8, 8, 7, 0, TAU); x.fill();
    return (dots[col] = d);
  }
  function snow(c, W, H, t, n, col, speed, seed) {
    const r = seeded(seed || 11), sp = dot(col);
    for (let i = 0; i < n; i++) {
      const v = speed * (0.5 + r()), sz = 1 + r() * 2.4, ph = r() * 100;
      const y = ((r() * H + t * v) % (H + 20)) - 10, x = ((r() * W + Math.sin(t * 0.8 + ph) * 22 - t * v * 0.25) % W + W) % W;
      c.globalAlpha = 0.35 + r() * 0.5; c.drawImage(sp, x - sz, y - sz, sz * 2, sz * 2);
    }
    c.globalAlpha = 1;
  }
  // 上升的余烬
  function embers(c, W, H, t, n, col, speed, seed, x0, w) {
    const r = seeded(seed || 5), sp = G.glowSprite(col);
    x0 = x0 || 0; w = w || W;
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const v = speed * (0.4 + r()), s = 2 + r() * 4, ph = r() * TAU;
      const y = H + 10 - ((r() * H + t * v) % (H + 30)), x = x0 + ((r() * w + Math.sin(t * 0.9 + ph) * 18) % w + w) % w;
      c.globalAlpha = (0.3 + r() * 0.6) * Math.min(1, (H - y) / 80 + 0.2) * Math.min(1, y / 120);
      c.drawImage(sp, x - s, y - s, s * 2, s * 2);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  // 山脊 / 崖壁剪影
  function ridge(c, W, base, amp, seed, col, top) {
    const r = seeded(seed), k = [r() * 6, r() * 6, r() * 6];
    c.fillStyle = col; c.beginPath(); c.moveTo(-40, top ? -10 : 900);
    for (let x = -40; x <= W + 40; x += 16) c.lineTo(x, base + Math.sin(x * 0.006 + k[0]) * amp + Math.sin(x * 0.017 + k[1]) * amp * 0.4 + Math.sin(x * 0.045 + k[2]) * amp * 0.15);
    c.lineTo(W + 40, top ? -10 : 900); c.closePath(); c.fill();
  }
  // 崖边小镇：房屋剪影 + 窗灯（lit(i) 返回 0~1）
  function town(c, x0, y0, n, s, t, lit, col, seed) {
    const r = seeded(seed || 21), lights = [];
    let x = x0;
    for (let i = 0; i < n; i++) {
      const w = (26 + r() * 30) * s, h = (24 + r() * 34) * s, roof = (12 + r() * 14) * s, y = y0 + r() * 6 * s;
      c.fillStyle = col;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h); c.lineTo(x + w / 2, y - h - roof); c.lineTo(x + w, y - h); c.lineTo(x + w, y); c.closePath(); c.fill();
      if (r() < 0.5) c.fillRect(x + w * 0.7, y - h - roof * 0.9, 5 * s, roof * 0.7);
      const L = lit(i);
      if (L > 0.02) {
        const fl = 0.85 + Math.sin(t * 7 + i * 3) * 0.08 + Math.sin(t * 13 + i) * 0.05;
        c.fillStyle = G.rgba('#ffc46a', L * fl);
        const wx = x + w * 0.3, wy = y - h * 0.55, ww = 7 * s, wh = 9 * s;
        c.fillRect(wx, wy, ww, wh);
        lights.push(wx + ww / 2, wy + wh / 2, 0.35 * L * fl);
      }
      x += w + (4 + r() * 10) * s;
    }
    // 窗灯光晕统一在一次加色混合里画完
    const sp = G.glowSprite('#ffb050'), R = 26 * s;
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < lights.length; i += 3) { c.globalAlpha = lights[i + 2]; c.drawImage(sp, lights[i] - R, lights[i + 1] - R, R * 2, R * 2); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  // 披斗篷的人影（脚底为原点）；o.lamp: 'out' 向前提灯 | 'up' 高举 | 'none'
  function figure(c, x, y, s, t, o) {
    const f = o.face || 1, wind = Math.sin(t * 1.7) * 5 * s + (o.wind || 0) * s;
    c.save(); c.translate(x, y); c.scale(f, 1);
    c.fillStyle = o.col || '#120a0a';
    c.beginPath();
    c.moveTo(-9 * s, -84 * s); c.quadraticCurveTo(-18 * s, -70 * s, -20 * s, -40 * s);
    c.quadraticCurveTo(-24 * s - wind, -14 * s, -30 * s - wind * 1.6, 0);
    c.lineTo(-8 * s - wind * 0.6, -2 * s); c.lineTo(6 * s, 0); c.lineTo(20 * s, -1 * s);
    c.quadraticCurveTo(19 * s, -40 * s, 13 * s, -70 * s); c.quadraticCurveTo(9 * s, -84 * s, 0, -86 * s); c.closePath(); c.fill();
    c.beginPath(); c.arc(1 * s, -94 * s, 12 * s, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-11 * s, -96 * s); c.quadraticCurveTo(-20 * s - wind * 0.4, -92 * s, -16 * s - wind, -78 * s); c.lineTo(-6 * s, -86 * s); c.fill();
    if (o.cape) { c.fillStyle = o.cape; c.beginPath(); c.moveTo(-15 * s, -70 * s); c.quadraticCurveTo(-26 * s - wind, -30 * s, -32 * s - wind * 1.8, -4 * s); c.lineTo(-16 * s - wind, -8 * s); c.quadraticCurveTo(-14 * s, -40 * s, -10 * s, -70 * s); c.fill(); }
    let lx = 0, ly = 0;
    c.strokeStyle = o.col || '#120a0a'; c.lineWidth = 5 * s; c.lineCap = 'round';
    if (o.lamp === 'out') { c.beginPath(); c.moveTo(8 * s, -74 * s); c.quadraticCurveTo(26 * s, -66 * s, 36 * s, -62 * s); c.stroke(); lx = 37 * s; ly = -50 * s; }
    else if (o.lamp === 'up') { c.beginPath(); c.moveTo(8 * s, -76 * s); c.quadraticCurveTo(18 * s, -110 * s, 16 * s, -132 * s); c.stroke(); lx = 16 * s; ly = -120 * s; }
    c.lineCap = 'butt';
    if (o.rim) { c.globalCompositeOperation = 'lighter'; c.strokeStyle = G.rgba(o.rim, 0.35); c.lineWidth = 2 * s; c.beginPath(); c.moveTo(13 * s, -70 * s); c.quadraticCurveTo(19 * s, -40 * s, 20 * s, -1 * s); c.stroke(); c.globalCompositeOperation = 'source-over'; }
    c.restore();
    if (o.lamp && o.lamp !== 'none') lantern(c, x + lx * f, y + ly, s, o.lit == null ? 1 : o.lit, t, o.bell);
  }
  function lantern(c, x, y, s, lit, t, bell) {
    const sw = Math.sin(t * 2.1) * 0.12;
    c.save(); c.translate(x, y - 10 * s); c.rotate(sw);
    c.strokeStyle = '#1a1210'; c.lineWidth = 1.5 * s; c.beginPath(); c.moveTo(0, -4 * s); c.lineTo(0, 0); c.stroke();
    c.fillStyle = '#1a1210'; c.fillRect(-6 * s, 0, 12 * s, 3 * s); c.fillRect(-6 * s, 15 * s, 12 * s, 3 * s);
    const fl = lit * (0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.05);
    c.fillStyle = G.rgba('#ffd27a', 0.25 + 0.75 * fl); c.fillRect(-5 * s, 3 * s, 10 * s, 12 * s);
    c.fillStyle = '#1a1210'; c.fillRect(-0.8 * s, 3 * s, 1.6 * s, 12 * s);
    if (bell) { c.fillStyle = '#c8823a'; c.beginPath(); c.arc(7 * s, 19 * s, 3 * s, Math.PI, 0); c.lineTo(10 * s, 21 * s); c.lineTo(4 * s, 21 * s); c.fill(); }
    c.restore();
    if (fl > 0.01) { glow(c, '#ffb050', x, y, 90 * s * fl, 0.55 * fl); glow(c, '#fff0c0', x, y, 22 * s, 0.7 * fl); }
  }
  // 蹲坐、抱膝的人影（面朝右，戴兜帽）
  function seated(c, x, y, s, col, t, rim) {
    const br = Math.sin(t * 1.2) * 0.8 * s;
    c.save(); c.translate(x, y); c.fillStyle = col;
    c.beginPath();
    c.moveTo(-26 * s, 0);
    c.quadraticCurveTo(-30 * s, -28 * s, -16 * s, -46 * s - br);
    c.quadraticCurveTo(-16 * s, -66 * s - br, -2 * s, -74 * s - br);
    c.quadraticCurveTo(10 * s, -76 * s - br, 14 * s, -62 * s - br);
    c.quadraticCurveTo(15 * s, -54 * s - br, 10 * s, -48 * s - br);
    c.quadraticCurveTo(22 * s, -44 * s, 28 * s, -34 * s);
    c.quadraticCurveTo(36 * s, -24 * s, 31 * s, -12 * s);
    c.lineTo(33 * s, 0); c.closePath(); c.fill();
    if (rim) {
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = G.rgba(rim, 0.4); c.lineWidth = 2 * s;
      c.beginPath(); c.moveTo(-2 * s, -74 * s - br); c.quadraticCurveTo(10 * s, -76 * s - br, 14 * s, -62 * s - br); c.moveTo(28 * s, -34 * s); c.quadraticCurveTo(36 * s, -24 * s, 31 * s, -12 * s); c.stroke();
      c.globalCompositeOperation = 'source-over';
    }
    c.restore();
  }
  let noise = null;
  function grain(c, W, H, t, a) {
    if (!noise) {
      noise = G.mkCanvas(256, 256); const x = noise.getContext('2d'), d = x.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 40; }
      x.putImageData(d, 0, 0);
    }
    c.globalAlpha = a; c.globalCompositeOperation = 'overlay';
    const ox = Math.floor((t * 60) % 7) * 37, oy = Math.floor((t * 60) % 5) * 53;
    for (let x = -ox; x < W; x += 256) for (let y = -oy; y < H; y += 256) c.drawImage(noise, x, y);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  function vignette(c, W, H, a, col) {
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(' + (col || '0,0,0') + ',0)'); g.addColorStop(1, 'rgba(' + (col || '0,0,0') + ',' + a + ')');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  // 回忆色调：暖褐 + 颗粒
  function memory(c, W, H, t) {
    c.globalCompositeOperation = 'color'; c.fillStyle = 'rgba(150,100,55,0.75)'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    grain(c, W, H, t, 0.5); vignette(c, W, H, 0.8, '30,16,6');
  }
  // 缓慢推镜（Ken Burns）
  function push(c, W, H, t, z, fx, fy) {
    const k = 1 + Math.min(t, 12) * z;
    c.translate(W * fx, H * fy); c.scale(k, k); c.translate(-W * fx, -H * fy);
  }
  const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

  // ---------- 场景 ----------
  const S = G.SCENES = {};
  S.town = function (c, t, W, H) {
    c.save(); push(c, W, H, t, 0.012, 0.5, 0.7);
    sky(c, W, H, [[0, '#05060e'], [0.55, '#140c16'], [1, '#3a160a']]);
    stars(c, W, H, t, 120, H * 0.5, 4);
    ridge(c, W, H * 0.56, 26, 7, '#0e0a10');
    glow(c, '#ff7a2a', W / 2, H + 40, 420 + Math.sin(t * 1.3) * 16, 0.7);
    c.fillStyle = '#07050a';
    c.beginPath(); c.moveTo(-20, H); c.lineTo(-20, H * 0.66); c.lineTo(W * 0.38, H * 0.7); c.lineTo(W * 0.43, H); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(W + 20, H); c.lineTo(W + 20, H * 0.64); c.lineTo(W * 0.6, H * 0.69); c.lineTo(W * 0.56, H); c.closePath(); c.fill();
    town(c, 10, H * 0.665, 8, 1, t, () => 1, '#07050a', 31);
    town(c, W * 0.61, H * 0.655, 8, 1, t, () => 1, '#07050a', 32);
    embers(c, W, H, t, 40, '#ffb066', 30, 9, W * 0.38, W * 0.24);
    c.restore();
    snow(c, W, H, t, 90, '#e8e4f0', 26, 2);
  };
  S.keeper = function (c, t, W, H) {
    c.save(); push(c, W, H, t, 0.01, 0.62, 0.6);
    sky(c, W, H, [[0, '#07060c'], [0.6, '#1c0d0c'], [1, '#5a200a']]);
    stars(c, W, H, t, 70, H * 0.4, 8);
    glow(c, '#ff6a1a', W * 0.3, H + 80, 520, 0.75);
    c.fillStyle = '#060406';
    c.beginPath(); c.moveTo(W * 0.5, H); c.lineTo(W * 0.54, H * 0.74); c.lineTo(W * 0.66, H * 0.72); c.lineTo(W + 20, H * 0.7); c.lineTo(W + 20, H); c.closePath(); c.fill();
    figure(c, W * 0.62, H * 0.725, 1.6, t, { face: -1, lamp: 'out', col: '#0c0608', cape: '#2e0e0a', rim: '#ff8a3a' });
    embers(c, W, H, t, 60, '#ffa04a', 34, 3, 0, W * 0.6);
    c.restore();
    vignette(c, W, H, 0.6);
  };
  S.descent = function (c, t, W, H) {
    sky(c, W, H, [[0, '#040305'], [0.7, '#1a0806'], [1, '#6a2008']]);
    const calm = 1 - ease((t - 4) / 3);
    glow(c, '#ff5a1a', W / 2, H + 60, 360 + calm * 160 + Math.sin(t * 9) * 20 * calm, 0.55 + calm * 0.4);
    for (let side = 0; side < 2; side++) for (let layer = 0; layer < 3; layer++) {
      const r = seeded(40 + side * 7 + layer), sp = 40 + layer * 50, col = ['#1a0e0c', '#100808', '#070405'][layer];
      c.fillStyle = col; c.beginPath();
      const ex = side ? W : 0, dir = side ? -1 : 1;
      c.moveTo(ex, -20);
      for (let y = -20; y <= H + 40; y += 30) {
        const yy = y, off = ((yy + t * sp) % 60);
        c.lineTo(ex + dir * (W * (0.16 + layer * 0.07) + Math.sin((yy + t * sp) * 0.02 + layer) * 30 + r() * 4 + off * 0.1), yy);
      }
      c.lineTo(ex, H + 40); c.closePath(); c.fill();
    }
    const k = ease(t / 6), lx = W / 2 + Math.sin(t * 0.7) * 20, ly = H * (0.15 + k * 0.62);
    lantern(c, lx, ly, 0.9 - k * 0.5, 1 - ease((t - 5) / 1.5), t);
    embers(c, W, H, t, 50, '#ffb066', 60, 13);
  };
  S.ashsnow = function (c, t, W, H) {
    c.save(); push(c, W, H, t, 0.008, 0.5, 0.65);
    sky(c, W, H, [[0, '#0a0a0e'], [0.55, '#1c1416'], [1, '#4a1408']]);
    ridge(c, W, H * 0.56, 22, 9, '#110d10');
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.3);
    glow(c, '#ff3a1a', W / 2, H + 40, 380 + pulse * 70, 0.55 + pulse * 0.3);
    c.fillStyle = '#08060a';
    c.beginPath(); c.moveTo(-20, H); c.lineTo(-20, H * 0.66); c.lineTo(W * 0.38, H * 0.7); c.lineTo(W * 0.43, H); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(W + 20, H); c.lineTo(W + 20, H * 0.64); c.lineTo(W * 0.6, H * 0.69); c.lineTo(W * 0.56, H); c.closePath(); c.fill();
    const off = i => G.clamp(1 - (t - 0.8 - ((i * 7) % 16) * 0.42) / 0.5, 0, 1);
    town(c, 10, H * 0.665, 8, 1, t, i => off(i), '#08060a', 31);
    town(c, W * 0.61, H * 0.655, 8, 1, t, i => off(i + 8), '#08060a', 32);
    c.restore();
    snow(c, W, H, t, 220, '#8a8488', 40, 6);
    vignette(c, W, H, 0.55);
  };
  S.resolve = function (c, t, W, H) {
    c.save(); push(c, W, H, t, 0.02, 0.4, 0.62);
    sky(c, W, H, [[0, '#060509'], [0.6, '#1a0c0a'], [1, '#62220a']]);
    stars(c, W, H, t, 60, H * 0.4, 12);
    glow(c, '#ff6a1a', W * 0.62, H + 60, 480, 0.7);
    c.fillStyle = '#060406';
    c.beginPath(); c.moveTo(-20, H); c.lineTo(-20, H * 0.73); c.lineTo(W * 0.42, H * 0.75); c.lineTo(W * 0.46, H * 0.8); c.lineTo(W * 0.4, H); c.closePath(); c.fill();
    figure(c, W * 0.38, H * 0.75, 1.35, t, { face: 1, lamp: 'out', col: '#081614', cape: '#4a140e', rim: '#ff8a3a', lit: ease(t / 1.5) });
    embers(c, W, H, t, 70, '#ffa04a', 50, 17, W * 0.4, W * 0.6);
    c.restore();
    snow(c, W, H, t, 70, '#9a9298', 34, 19);
    vignette(c, W, H, 0.6);
  };
  S.titlecard = function (c, t, W, H) {
    c.fillStyle = '#050304'; c.fillRect(0, 0, W, H);
    glow(c, '#ff7a2a', W / 2, H / 2 + 20, 260 + Math.sin(t * 2) * 12, 0.35 * ease(t / 1.5));
    const k = ease((t - 0.3) / 1.4), title = G.tr('烬渊');
    c.save();
    G.setFont(c, title, G.lang === 'en' ? 88 : 132, true, true, W - 120);
    const tw = c.measureText(title).width;
    c.beginPath(); c.rect(W / 2 - tw / 2 - 30, 0, (tw + 60) * k, H); c.clip();
    c.shadowColor = '#ff7a2a'; c.shadowBlur = 40;
    const g = c.createLinearGradient(0, H / 2 - 70, 0, H / 2 + 50);
    g.addColorStop(0, '#fff6e4'); g.addColorStop(0.55, '#ffc98a'); g.addColorStop(1, '#f07a2a');
    c.fillStyle = g; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(title, W / 2, H / 2 - 20);
    c.restore();
    if (k < 1) glow(c, '#ffd090', W / 2 - tw / 2 - 30 + (tw + 60) * k, H / 2 - 20, 80, 0.9 * (1 - k));
    c.globalAlpha = ease((t - 1.6) / 1);
    G.text(c, '向 下 三 层 · 直 抵 渊 心', W / 2, H / 2 + 70, 17, '#d8b494', 'center');
    c.globalAlpha = 1;
    embers(c, W, H, t, 50, '#ffb066', 40, 23);
  };
  S.bell = function (c, t, W, H) {
    c.save(); push(c, W, H, t, 0.02, 0.5, 0.62);
    sky(c, W, H, [[0, '#0a0605'], [1, '#2a1208']]);
    glow(c, '#ff7a2a', W / 2, H * 0.62, 300, 0.3);
    ridge(c, W, H * 0.66, 10, 51, '#1a100c');
    ridge(c, W, H * 0.74, 6, 52, '#120a08');
    const sw = Math.sin(t * 3) * 0.5 * Math.exp(-t * 0.5), bx = W / 2, by = H * 0.7;
    c.save(); c.translate(bx, by); c.rotate(sw - 0.4);
    const bg = c.createLinearGradient(-30, -40, 30, 10); bg.addColorStop(0, '#f0b060'); bg.addColorStop(1, '#7a4418');
    c.fillStyle = bg; c.beginPath(); c.moveTo(-28, 10); c.quadraticCurveTo(-26, -34, 0, -38); c.quadraticCurveTo(26, -34, 28, 10); c.closePath(); c.fill();
    c.fillStyle = '#5a3010'; c.fillRect(-31, 8, 62, 6); c.beginPath(); c.arc(0, -42, 7, 0, TAU); c.lineWidth = 4; c.strokeStyle = '#8a5420'; c.stroke();
    c.fillStyle = '#3a1e08'; c.beginPath(); c.arc(0, 18, 6, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,240,200,0.5)'; c.beginPath(); c.ellipse(-12, -18, 4, 12, 0.3, 0, TAU); c.fill();
    c.restore();
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.5 + i / 3) % 1);
      c.strokeStyle = G.rgba('#ffd090', (1 - k) * 0.35); c.lineWidth = 2;
      c.beginPath(); c.ellipse(bx, by - 10, 40 + k * 160, (40 + k * 160) * 0.4, 0, 0, TAU); c.stroke();
    }
    glow(c, '#ffc070', bx, by - 14, 90, 0.4);
    c.restore();
    snow(c, W, H, t, 60, '#6a625e', 18, 29);
    vignette(c, W, H, 0.7);
  };
  S.furnaces = function (c, t, W, H) {
    sky(c, W, H, [[0, '#0e0806'], [1, '#2a160c']]);
    c.fillStyle = '#140c08'; c.fillRect(0, H * 0.72, W, H);
    const n = 5, walk = t * 70 + 60;
    for (let i = 0; i < n; i++) {
      const x = W * (0.14 + i * 0.18), y = H * 0.72, on = ease((walk - x + 40) / 60);
      c.fillStyle = '#20140e';
      c.beginPath(); c.moveTo(x - 46, y); c.lineTo(x - 46, y - 90); c.quadraticCurveTo(x, y - 150, x + 46, y - 90); c.lineTo(x + 46, y); c.closePath(); c.fill();
      c.fillStyle = G.rgba('#ff9a3a', 0.15 + on * 0.85);
      c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x - 22, y - 50); c.quadraticCurveTo(x, y - 80, x + 22, y - 50); c.lineTo(x + 22, y); c.closePath(); c.fill();
      if (on > 0.01) { glow(c, '#ff8a2a', x, y - 40, 120 * on, 0.6 * on); embers(c, W, H, t + i, 6, '#ffb066', 40, 60 + i, x - 20, 40); }
    }
    figure(c, Math.min(W * 0.95, walk), H * 0.72, 1.05, t, { face: 1, lamp: 'out', col: '#0c0606', cape: '#2e0e0a' });
    memory(c, W, H, t);
  };
  S.lampbell = function (c, t, W, H) {
    sky(c, W, H, [[0, '#080506'], [1, '#1e0c08']]);
    const sw = Math.sin(t * 1.6) * 0.18, x = W / 2, y = H * 0.32;
    c.strokeStyle = '#2a1a14'; c.lineWidth = 6; c.beginPath(); c.moveTo(x - 220, y - 70); c.quadraticCurveTo(x - 80, y - 40, x, y - 60); c.stroke();
    c.save(); c.translate(x, y - 60); c.rotate(sw); c.translate(-x, -(y - 60));
    c.strokeStyle = '#1a1210'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y - 60); c.lineTo(x, y - 20); c.stroke();
    c.fillStyle = '#1a1210'; c.fillRect(x - 40, y - 22, 80, 14); c.fillRect(x - 44, y + 110, 88, 16);
    const fl = 0.85 + Math.sin(t * 8) * 0.08;
    const lg = c.createLinearGradient(0, y - 8, 0, y + 110); lg.addColorStop(0, G.rgba('#fff0c0', fl)); lg.addColorStop(1, G.rgba('#ff9a3a', fl));
    c.fillStyle = lg; c.fillRect(x - 34, y - 8, 68, 118);
    c.fillStyle = '#1a1210'; c.fillRect(x - 3, y - 8, 6, 118); c.fillRect(x - 34, y + 48, 68, 4);
    c.save(); c.translate(x + 50, y + 126); c.rotate(Math.sin(t * 3.2) * 0.35);
    c.fillStyle = '#c8823a'; c.beginPath(); c.moveTo(-12, 22); c.quadraticCurveTo(-11, 2, 0, 0); c.quadraticCurveTo(11, 2, 12, 22); c.closePath(); c.fill();
    c.strokeStyle = '#8a5420'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(-10, -18); c.stroke();
    c.restore(); c.restore();
    glow(c, '#ffb050', x, y + 50, 300 * fl, 0.55); glow(c, '#fff0c0', x, y + 50, 80, 0.5);
    for (let i = 0; i < 2; i++) {
      const k = ((t * 0.6 + i / 2) % 1);
      c.strokeStyle = G.rgba('#ffd090', (1 - k) * 0.3); c.lineWidth = 2;
      c.beginPath(); c.arc(x + 50, y + 140, 20 + k * 120, -0.6, 0.6); c.stroke();
      c.beginPath(); c.arc(x + 50, y + 140, 20 + k * 120, Math.PI - 0.6, Math.PI + 0.6); c.stroke();
    }
    embers(c, W, H, t, 30, '#ffb066', 24, 37);
    vignette(c, W, H, 0.75);
  };
  function threadField(c, W, H, t, n, col, seed, cx, cy) {
    const r = seeded(seed);
    c.globalCompositeOperation = 'lighter'; c.lineWidth = 1.2;
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, ph = r() * TAU, len = 300 + r() * 500;
      const x1 = cx + Math.cos(a) * len, y1 = cy + Math.sin(a) * len * 0.7;
      const mx = (cx + x1) / 2 + Math.sin(t * 0.6 + ph) * 60, my = (cy + y1) / 2 + Math.cos(t * 0.5 + ph) * 50;
      c.strokeStyle = G.rgba(col, 0.08 + r() * 0.2);
      c.beginPath(); c.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 20); c.quadraticCurveTo(mx, my, x1, y1); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  }
  S.threads = function (c, t, W, H) {
    c.save(); push(c, W, H, t, 0.015, 0.5, 0.5);
    sky(c, W, H, [[0, '#03060c'], [1, '#0a1424']]);
    threadField(c, W, H, t, 70, '#6ad0ff', 71, W / 2, H / 2);
    threadField(c, W, H, t * 0.7, 40, '#b49bff', 72, W / 2, H / 2);
    const r = seeded(73);
    for (let i = 0; i < 5; i++) {
      const a = r() * TAU, d = 140 + r() * 120, x = W / 2 + Math.cos(a + t * 0.05) * d * 1.3, y = H / 2 + Math.sin(a + t * 0.05) * d * 0.7, rr = 34 + r() * 16;
      const ap = ease((t - 0.5 - i * 0.5) / 1);
      c.globalAlpha = ap;
      const gg = c.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, 'rgba(160,220,255,0.35)'); gg.addColorStop(1, 'rgba(160,220,255,0)');
      c.fillStyle = gg; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
      c.globalAlpha = ap * 0.8;
      if (i % 2) seated(c, x, y + 14, 0.4, '#0a1a2a', t); else figure(c, x, y + 20, 0.36, t, { face: 1, lamp: 'out', col: '#0a1a2a', lit: 0.6 });
      c.globalAlpha = 1;
    }
    c.restore();
    vignette(c, W, H, 0.7, '0,4,10');
  };
  S.counting = function (c, t, W, H) {
    c.save(); push(c, W, H, t, 0.012, 0.5, 0.62);
    sky(c, W, H, [[0, '#0c1830'], [0.5, '#081022'], [1, '#03060e']]);
    // 冰层上方透下来的小镇灯火
    c.save(); c.globalAlpha = 0.5; c.translate(0, -H * 0.02);
    town(c, 40, H * 0.2, 16, 0.6, t, i => (i % 5 === 3 ? G.clamp(1 - (t - 3 - i * 0.1) / 0.6, 0.15, 1) : 1), '#0e1a30', 81);
    c.restore();
    const r = seeded(83);
    c.fillStyle = 'rgba(180,230,255,0.10)';
    for (let i = 0; i < 18; i++) {
      const x = r() * W, y = H * 0.35 + r() * H * 0.6, h = 60 + r() * 180, w = 20 + r() * 40;
      c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x, y - h); c.lineTo(x + w / 2, y); c.closePath(); c.fill();
    }
    glow(c, '#8ad6ff', W / 2, H * 0.72, 200, 0.35);
    seated(c, W / 2, H * 0.8, 1.6, '#060c16', t, '#8ad6ff');
    glow(c, '#ffb050', W / 2 + 46, H * 0.8 - 44, 30 + Math.sin(t * 4) * 3, 0.5);
    c.restore();
    snow(c, W, H, t, 60, '#cfe8ff', 10, 85);
    vignette(c, W, H, 0.7, '0,4,12');
  };
  S.deep = function (c, t, W, H) {
    sky(c, W, H, [[0, '#04030a'], [1, '#120818']]);
    const k = ease(t / 6);
    for (let i = 0; i < 14; i++) {
      const z = ((i / 14 + t * 0.08) % 1), r = 40 + z * z * 900;
      c.strokeStyle = G.rgba(i % 2 ? '#b49bff' : '#6ad0ff', (1 - z) * 0.35 * (0.5 + z));
      c.lineWidth = 1 + z * 3; c.beginPath(); c.ellipse(W / 2, H / 2, r, r * 0.6, 0, 0, TAU); c.stroke();
    }
    glow(c, '#d05bff', W / 2, H / 2, 120 + k * 260, 0.6 + k * 0.3);
    glow(c, '#fff0f8', W / 2, H / 2, 40 + k * 90, 0.8);
    embers(c, W, H, t, 40, '#e6b0ff', 50, 91);
  };
  S.heart = function (c, t, W, H) {
    c.save(); push(c, W, H, t, 0.01, 0.5, 0.6);
    sky(c, W, H, [[0, '#08040c'], [1, '#22081a']]);
    const fade = 1 - ease(t / 5) * 0.7;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.28, h = (180 + Math.sin(t * 3 + i) * 30) * fade, x = W / 2 + (i - 4) * 26;
      const fg = c.createLinearGradient(0, H * 0.78, 0, H * 0.78 - h);
      fg.addColorStop(0, G.rgba('#ff6a2a', 0.5 * fade)); fg.addColorStop(1, 'rgba(208,91,255,0)');
      c.fillStyle = fg; c.globalCompositeOperation = 'lighter';
      c.beginPath(); c.moveTo(x - 30, H * 0.78); c.quadraticCurveTo(x + Math.cos(a) * 40 + Math.sin(t * 4 + i) * 12, H * 0.78 - h * 0.6, x + Math.sin(t * 2 + i) * 16, H * 0.78 - h); c.quadraticCurveTo(x + 20, H * 0.78 - h * 0.4, x + 30, H * 0.78); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    glow(c, '#d05bff', W / 2, H * 0.7, 300 * fade + 80, 0.5);
    seated(c, W / 2, H * 0.8, 1.4, '#0a0408', t, '#ff9ad8');
    const hx = W / 2 + 40, hy = H * 0.8 - 40;
    glow(c, '#ffb050', hx, hy, 50 + Math.sin(t * 5) * 4, 0.9); glow(c, '#fff0c0', hx, hy, 14, 0.9);
    c.restore();
    embers(c, W, H, t, 50, '#ffb0e0', 30, 97);
    vignette(c, W, H, 0.65, '8,0,8');
  };
  S.handover = function (c, t, W, H) {
    sky(c, W, H, [[0, '#0a050a'], [1, '#1e0a10']]);
    const k = ease((t - 1) / 3.5), ax = W * 0.34, ay = H * 0.76 - 50, bx = W * 0.64, by = H * 0.42;
    seated(c, ax - 40, H * 0.76, 1.2, '#0a0408', t, '#ffb050');
    glow(c, '#ffb050', ax, ay, 60 * (1 - k * 0.8) + 10, 0.8 * (1 - k * 0.6));
    figure(c, bx + 60, H * 0.76, 1.25, t, { face: -1, lamp: 'none', col: '#081614', cape: '#4a140e', rim: '#ffb050' });
    c.fillStyle = '#0a0606'; c.fillRect(0, H * 0.76, W, H);
    lantern(c, bx, by + 18, 1.6, 0.2 + k * 0.8, t, true);
    const sp = G.glowSprite('#ffc070');
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const u = ((t * 0.35 + i / 40) % 1);
      if (t < 1 + u * 2) continue;
      const x = G.lerp(ax, bx, u), y = G.lerp(ay, by, u) - Math.sin(u * Math.PI) * 90 + Math.sin(i * 7 + t * 3) * 6, s = 3 + (i % 3) * 2;
      c.globalAlpha = Math.sin(u * Math.PI) * 0.9; c.drawImage(sp, x - s, y - s, s * 2, s * 2);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    vignette(c, W, H, 0.7);
  };
  S.ascend = function (c, t, W, H) {
    sky(c, W, H, [[0, '#0a0610'], [1, '#2a0e14']]);
    const k = ease(t / 5);
    c.globalAlpha = 1 - k; seated(c, W / 2, H * 0.76, 1.3, '#0a0408', t, '#ffb0a0'); c.globalAlpha = 1;
    const sp = G.glowSprite('#ffc8a0'), r = seeded(101);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 160; i++) {
      const sx = W / 2 + (r() - 0.5) * 70, sy = H * 0.76 - r() * 80, v = 30 + r() * 60, d = Math.max(0, t * v - r() * 120);
      const x = sx + Math.sin(t + i) * d * 0.15 + (r() - 0.5) * d * 0.8, y = sy - d * 2.2, s = 2 + r() * 3.5;
      if (d <= 0 || y < -10) continue;
      c.globalAlpha = Math.min(1, d / 30) * 0.8; c.drawImage(sp, x - s, y - s, s * 2, s * 2);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    embers(c, W, H, t, 80, '#ffb066', 40, 103);
    vignette(c, W, H, 0.6);
  };
  S.dawn = function (c, t, W, H) {
    const k = ease(t / 6);
    sky(c, W, H, [[0, '#2a3a5a'], [0.6, '#5a4060'], [1, '#ffb080']]);
    c.globalAlpha = 1 - k; sky(c, W, H, [[0, '#05060e'], [1, '#1a1018']]); c.globalAlpha = 1;
    glow(c, '#ffd0a0', W * 0.72, H * 0.62 - k * 40, 260 + k * 200, 0.3 + k * 0.5);
    ridge(c, W, H * 0.6, 24, 7, '#1a1420');
    c.fillStyle = '#0c0a10';
    c.beginPath(); c.moveTo(-20, H); c.lineTo(-20, H * 0.7); c.lineTo(W + 20, H * 0.72); c.lineTo(W + 20, H); c.closePath(); c.fill();
    town(c, 20, H * 0.71, 16, 1, t, i => ease((t - 0.8 - ((i * 5) % 16) * 0.25) / 0.4), '#0c0a10', 111);
    figure(c, W * 0.86, H * 0.715, 0.8, t, { face: -1, lamp: 'out', col: '#0c0a10', lit: 1 });
    snow(c, W, H, t, 40, '#f4eef0', 14, 113);
  };
  S.lamp = function (c, t, W, H) {
    c.save(); push(c, W, H, t, 0.012, 0.45, 0.6);
    sky(c, W, H, [[0, '#04050c'], [0.6, '#0e0a14'], [1, '#2a1410']]);
    stars(c, W, H, t, 160, H * 0.6, 121);
    glow(c, '#ff8a3a', W * 0.6, H + 80, 300, 0.35);
    c.fillStyle = '#05040a';
    c.beginPath(); c.moveTo(-20, H); c.lineTo(-20, H * 0.74); c.lineTo(W * 0.48, H * 0.76); c.lineTo(W * 0.52, H * 0.82); c.lineTo(W * 0.46, H); c.closePath(); c.fill();
    figure(c, W * 0.42, H * 0.76, 1.4, t, { face: 1, lamp: 'up', col: '#081614', cape: '#4a140e', bell: true });
    // 从深渊升起、在灯旁停留的一点余烬
    const u = ease((t - 1.5) / 3), ex = G.lerp(W * 0.66, W * 0.42 + 40, u) + Math.sin(t * 2) * 6 * u, ey = G.lerp(H + 10, H * 0.76 - 200, u) + Math.sin(t * 1.5) * 5;
    glow(c, '#ffc070', ex, ey, 22, 0.9 * Math.min(1, t / 1.5)); glow(c, '#fff4d8', ex, ey, 6, 1);
    c.restore();
    snow(c, W, H, t, 80, '#e8e4f0', 18, 123);
    vignette(c, W, H, 0.6);
  };
  const CREDITS = [['烬渊', 1], ['', 0], ['一个关于守灯人的故事', 0], ['', 0], ['设计 · 程序 · 美术 · 音乐', 2], ['烬渊制作组', 0], ['', 0], ['字体', 2], ['思源黑体 · 马善政楷书 · 霞鹜文楷（SIL OFL 1.1）', 0], ['', 0], ['感谢游玩', 1], ['愿你的灯一直亮着。', 0]];
  S.credits = function (c, t, W, H) {
    c.fillStyle = '#050304'; c.fillRect(0, 0, W, H);
    embers(c, W, H, t, 60, '#ffb066', 30, 131);
    let y = H + 40 - t * 42;
    for (const [s, kind] of CREDITS) {
      if (y > -40 && y < H + 40) {
        c.globalAlpha = G.clamp(Math.min((H - y) / 120, y / 120), 0, 1);
        if (kind === 1) G.text(c, s, W / 2, y, 40, '#ffd9a8', 'center', true, true);
        else G.text(c, s, W / 2, y, kind === 2 ? 13 : 17, kind === 2 ? '#a88870' : '#e8dcd0', 'center', kind !== 2);
      }
      y += kind === 1 ? 64 : 34;
    }
    c.globalAlpha = 1;
  };
  S.credits.dur = 14;
  S.titlecard.dur = 4.2;
})();
