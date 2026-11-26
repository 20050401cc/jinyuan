// 触屏操作：左侧虚拟摇杆移动，右侧摇杆瞄准并射击，按钮负责闪避 / 互动 / 换枪 / 暂停
'use strict';
(function () {
  const G = window.G, TAU = Math.PI * 2;
  const T = G.touch = {
    on: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches),
    move: null, aim: null, aimAng: 0, mvx: 0, mvy: 0
  };
  const BTN = {
    dash: { get x() { return G.W - 270; }, y: 540, r: 36 },
    use: { get x() { return G.W - 270; }, y: 450, r: 30 },
    pause: { get x() { return G.W - 196; }, y: 34, r: 19 }
  };
  const inBtn = (b, x, y) => Math.hypot(x - b.x, y - b.y) <= b.r + 8;
  const inWeapons = (x, y) => x > G.W - 210 && y > 478;

  G.initTouch = function (canvas) {
    const I = G.input;
    const pos = t => {
      const r = canvas.getBoundingClientRect();
      return { x: (t.clientX - r.left) / r.width * G.W, y: (t.clientY - r.top) / r.height * G.H };
    };
    const start = e => {
      e.preventDefault();
      G.audio.unlock();
      for (const t of e.changedTouches) {
        const p = pos(t), g = G.game;
        if (g.state !== 'play') { I.mx = p.x; I.my = p.y; I.clicked = true; continue; }
        // 选了电脑端却在触屏上玩：把触摸当作鼠标
        if (!T.on) { I.mx = p.x; I.my = p.y; I.down = true; continue; }
        if (inBtn(BTN.pause, p.x, p.y)) I.pressed.Escape = true;
        else if (inBtn(BTN.dash, p.x, p.y)) I.pressed.Space = true;
        else if (g.player.near && inBtn(BTN.use, p.x, p.y)) I.pressed.KeyE = true;
        else if (inWeapons(p.x, p.y)) I.pressed.KeyQ = true;
        else if (p.x < G.W * 0.45 && !T.move) T.move = { id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y };
        else if (p.x >= G.W * 0.45 && !T.aim) T.aim = { id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y };
      }
    };
    const move = e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const p = pos(t);
        if (T.move && t.identifier === T.move.id) { T.move.x = p.x; T.move.y = p.y; }
        else if (T.aim && t.identifier === T.aim.id) { T.aim.x = p.x; T.aim.y = p.y; }
        else if (G.game.state !== 'play' || !T.on) { I.mx = p.x; I.my = p.y; }
      }
    };
    const end = e => {
      e.preventDefault();
      if (!T.on) I.down = false;
      for (const t of e.changedTouches) {
        if (T.move && t.identifier === T.move.id) T.move = null;
        if (T.aim && t.identifier === T.aim.id) { T.aim = null; I.down = false; }
      }
    };
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
  };

  // 每帧把摇杆状态换算成移动向量和准星位置
  G.updateTouch = function () {
    const g = G.game, I = G.input;
    T.mvx = T.mvy = 0;
    if (!T.on) return;
    if (g.state !== 'play') { T.move = T.aim = null; return; }
    const p = g.player;
    if (T.move) {
      const dx = T.move.x - T.move.ox, dy = T.move.y - T.move.oy, d = Math.hypot(dx, dy);
      if (d > 8) { const k = Math.min(1, d / 46); T.mvx = dx / d * k; T.mvy = dy / d * k; }
    }
    if (!T.mvx && !T.mvy && (G.motion.mvx || G.motion.mvy)) { T.mvx = G.motion.mvx; T.mvy = G.motion.mvy; }
    if (T.aim) {
      const dx = T.aim.x - T.aim.ox, dy = T.aim.y - T.aim.oy, d = Math.hypot(dx, dy);
      if (d > 12) T.aimAng = Math.atan2(dy, dx);
      else {
        // 只按住不拖动：自动瞄准最近的敌人
        let best = null, bd = 460;
        for (const e of g.enemies) { if (e.spawnT > 0) continue; const ed = Math.hypot(e.x - p.x, e.y - p.y); if (ed < bd) { bd = ed; best = e; } }
        if (best) T.aimAng = Math.atan2(best.y - p.y, best.x - p.x);
      }
      I.down = true;
    } else if (T.mvx || T.mvy) T.aimAng = Math.atan2(T.mvy, T.mvx);
    I.mx = p.x - g.cam.x + Math.cos(T.aimAng) * 130;
    I.my = p.y - g.cam.y + Math.sin(T.aimAng) * 130;
  };

  function stick(ctx, s, color) {
    const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy) || 1, k = Math.min(46, d);
    ctx.fillStyle = 'rgba(12,9,14,0.35)'; ctx.beginPath(); ctx.arc(s.ox, s.oy, 58, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = color; ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.arc(s.ox + dx / d * k, s.oy + dy / d * k, 24, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function button(ctx, b, label, color, frac) {
    ctx.fillStyle = 'rgba(12,9,14,0.6)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
    G.text(ctx, label, b.x, b.y + 1, b.r * 0.62, frac >= 1 ? color : '#8a8490', 'center', true, false, b.r * 1.6);
  }

  G.drawTouch = function (ctx) {
    const g = G.game, p = g.player;
    if (!T.on || g.state !== 'play') return;
    if (T.move) stick(ctx, T.move, '#3ff0da');
    else { ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(150, 400, 54, 0, TAU); ctx.stroke(); ctx.setLineDash([]); G.text(ctx, G.motion.status === 'ok' ? '倾斜移动' : '移动', 150, 400, 13, 'rgba(255,255,255,0.3)', 'center'); }
    if (T.aim) stick(ctx, T.aim, '#ffb05a');
    else { ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(G.W - 110, 400, 54, 0, TAU); ctx.stroke(); ctx.setLineDash([]); G.text(ctx, '射击', G.W - 110, 400, 13, 'rgba(255,255,255,0.3)', 'center'); }
    button(ctx, BTN.dash, '#闪', '#3ff0da', G.clamp(1 - p.dashCd / p.stats.dashCd, 0, 1));
    if (p.near) button(ctx, BTN.use, 'E', '#ffb05a', 1);
    const b = BTN.pause;
    ctx.fillStyle = 'rgba(12,9,14,0.6)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e0d6d0'; ctx.fillRect(b.x - 6, b.y - 7, 4, 14); ctx.fillRect(b.x + 2, b.y - 7, 4, 14);
  };

  // 竖屏提示
  G.drawRotateHint = function (ctx) {
    if (!T.on || window.innerHeight <= window.innerWidth) return;
    ctx.fillStyle = 'rgba(7,4,9,0.86)'; ctx.fillRect(0, 0, G.W, G.H);
    G.text(ctx, '请将设备横过来游玩', G.W / 2, G.H / 2, 40, '#ffe9c8', 'center', true, false, G.W - 60);
  };
})();
