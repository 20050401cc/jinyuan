// 手柄（标准布局：Xbox / PlayStation / Steam Deck）与菜单焦点导航（手柄、方向键都能操作所有界面）
'use strict';
(function () {
  const G = window.G;

  // ---------- 菜单焦点导航 ----------
  const N = G.nav = { active: false, focus: -1, items: [], activate: false, lr: 0, back: false, screen: '', rep: 0, held: '' };

  // 注册一个可交互区域，返回 { hover, click, lr }；鼠标和焦点导航共用
  G.uiItem = function (x, y, w, h, opt) {
    opt = opt || {};
    const I = G.input, i = N.items.length;
    N.items.push({ x, y, w, h, primary: !!opt.primary, lr: !!opt.lr });
    let hover, click = false, lr = 0;
    if (N.active) {
      hover = i === N.focus;
      if (hover && N.activate) { click = true; N.activate = false; }
      if (hover && opt.lr && N.lr) { lr = N.lr; N.lr = 0; }
    } else {
      hover = I.mx >= x && I.mx <= x + w && I.my >= y && I.my <= y + h;
      if (hover && I.clicked) { click = true; I.clicked = false; }
    }
    return { hover, click, lr };
  };
  G.navBeginFrame = function () { N.items = []; };
  G.navEndFrame = function () { N.activate = false; N.lr = 0; N.back = false; };

  function primary() {
    const it = N.items;
    for (let i = 0; i < it.length; i++) if (it[i].primary) return i;
    return it.length ? 0 : -1;
  }
  function move(dx, dy) {
    const it = N.items;
    if (!it.length) return;
    if (N.focus < 0 || N.focus >= it.length) { N.focus = primary(); return; }
    const c = it[N.focus];
    if (dx && c.lr) { N.lr = dx; return; }
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    let best = -1, bs = 1e9;
    it.forEach((o, i) => {
      if (i === N.focus) return;
      const ox = o.x + o.w / 2 - cx, oy = o.y + o.h / 2 - cy, along = ox * dx + oy * dy;
      if (along <= 4) return;
      const s = along + Math.abs(ox * dy - oy * dx) * 2.5;
      if (s < bs) { bs = s; best = i; }
    });
    if (best >= 0) { N.focus = best; G.sfx('ui'); }
  }

  // 每帧在游戏逻辑之前调用：把方向键 / 手柄转换成焦点移动与确认
  G.navUpdate = function (dt, dir, ok, back) {
    const g = G.game, screen = g.state;
    if (screen !== N.screen) { N.screen = screen; N.focus = -1; N.items = []; }
    if (screen === 'play') return;
    const I = G.input, P = I.pressed;
    let d = dir;
    if (!d) {
      if (P.ArrowUp || P.KeyW) d = 'u'; else if (P.ArrowDown || P.KeyS) d = 'd';
      else if (P.ArrowLeft || P.KeyA) d = 'l'; else if (P.ArrowRight || P.KeyD) d = 'r';
      if (d) N.active = true;
    }
    if (P.Enter || P.Space) { N.active = true; ok = true; }
    if (N.active && N.focus < 0) N.focus = primary();
    if (d) move(d === 'l' ? -1 : d === 'r' ? 1 : 0, d === 'u' ? -1 : d === 'd' ? 1 : 0);
    if (ok && N.focus >= 0) N.activate = true;
    if (back) N.back = true;
  };

  // ---------- 手柄 ----------
  const PAD = G.pad = { active: false, connected: false, name: '', mvx: 0, mvy: 0, aimAng: 0, prev: [], gp: null, repT: 0, repDir: '' };
  const dz = (x, y, d) => {
    const m = Math.hypot(x, y);
    if (m < d) return [0, 0];
    const k = Math.min(1, (m - d) / (1 - d)) / m;
    return [x * k, y * k];
  };

  G.rumble = function (strong, weak, ms) {
    const gp = PAD.gp;
    if (!gp || !G.settings.rumble || !PAD.active) return;
    try {
      const va = gp.vibrationActuator;
      if (va && va.playEffect) va.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
    } catch (e) { /* 不支持震动 */ }
  };

  G.updatePad = function (dt) {
    const g = G.game, I = G.input;
    PAD.mvx = PAD.mvy = 0;
    let gp = null;
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of list) if (p && p.connected) { gp = p; break; }
    const was = PAD.connected;
    PAD.connected = !!gp; PAD.gp = gp;
    if (!gp) {
      if (was && g.state === 'play') { g.state = 'pause'; g.stateT = 0; }
      PAD.prev = [];
      G.navUpdate(dt, null, false, false);
      return;
    }
    PAD.name = gp.id;
    const now = gp.buttons.map(b => !!(b && (b.pressed || b.value > 0.5)));
    const last = PAD.prev, edge = i => now[i] && !last[i];
    PAD.prev = now;
    const ax = i => gp.axes[i] || 0;
    const [lx, ly] = dz(ax(0), ax(1), 0.2), [rx, ry] = dz(ax(2), ax(3), 0.25);
    const any = now.some(Boolean) || lx || ly || rx || ry;
    if (any) {
      PAD.active = true;
      if (g.state !== 'play') N.active = true;
      if (G.settings.inputMode === 'pc') G.setInputMode('pad');
    }

    if (g.state === 'play') {
      if (edge(9)) I.pressed.Escape = true;
      if (!PAD.active) return;
      PAD.mvx = lx; PAD.mvy = ly;
      const p = g.player, fire = now[7] || now[5] || Math.hypot(rx, ry) > 0.6;
      if (rx || ry) PAD.aimAng = Math.atan2(ry, rx);
      else if (fire) {
        // 只按扳机不推右摇杆：自动瞄准最近的敌人
        let best = null, bd = 520;
        for (const e of g.enemies) { if (e.spawnT > 0) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
        if (best) PAD.aimAng = Math.atan2(best.y - p.y, best.x - p.x);
        else if (lx || ly) PAD.aimAng = Math.atan2(ly, lx);
      } else if (lx || ly) PAD.aimAng = Math.atan2(ly, lx);
      I.mx = p.x - g.cam.x + Math.cos(PAD.aimAng) * 110;
      I.my = p.y - g.cam.y + Math.sin(PAD.aimAng) * 110;
      I.down = fire;
      if (edge(0) || edge(6)) I.pressed.Space = true;
      if (edge(2) || edge(1)) I.pressed.KeyE = true;
      if (edge(3) || edge(4)) I.pressed.KeyQ = true;
      if (edge(14)) I.pressed.Digit1 = true;
      if (edge(15)) I.pressed.Digit2 = true;
      return;
    }

    // 菜单：十字键 / 左摇杆（带连发）移动焦点，A 确认，B 返回，Start 继续
    let dir = '';
    if (now[12] || ly < -0.6) dir = 'u'; else if (now[13] || ly > 0.6) dir = 'd';
    else if (now[14] || lx < -0.6) dir = 'l'; else if (now[15] || lx > 0.6) dir = 'r';
    let fireDir = null;
    if (dir) {
      if (dir !== PAD.repDir) { fireDir = dir; PAD.repT = 0.38; }
      else { PAD.repT -= dt; if (PAD.repT <= 0) { fireDir = dir; PAD.repT = 0.12; } }
    }
    PAD.repDir = dir;
    if (edge(9) && g.state === 'pause') I.pressed.Escape = true;
    if (g.state === 'perk') for (let i = 0; i < 3; i++) if (edge([2, 0, 1][i]) && !N.active) I.pressed['Digit' + (i + 1)] = true;
    G.navUpdate(dt, fireDir, edge(0), edge(1));
  };

  // 当前操作方式下的按键名称
  G.keyName = function (act) {
    const pad = G.pad.active || G.settings.inputMode === 'pad';
    const T = { use: ['E', 'X'], dash: ['空格', 'A'], swap: ['Q', 'Y'], pause: ['Esc', 'Start'], ok: ['回车', 'A'] };
    return T[act][pad ? 1 : 0];
  };
})();
