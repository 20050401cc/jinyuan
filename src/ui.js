// 界面：HUD、小地图、主菜单、暂停、增益选择、结算、准星
'use strict';
(function () {
  const G = window.G;
  const TAU = Math.PI * 2;
  const text = (...a) => G.text(...a);

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }
  // 界面风格「锻铁与余烬」：黑铁底板、切角、暖金属细线，余烬橙是唯一的强调色
  const UI = G.UIC = { ink: '#0f0b0c', iron: '#171112', ironHi: '#231a18', line: 'rgba(232,190,150,0.17)', lineHi: 'rgba(255,184,120,0.62)', ember: '#e2732b', emberHi: '#f58a3d', text: '#efe4da', muted: '#9c8c84' };
  function chamfer(ctx, x, y, w, h, c) {
    ctx.beginPath();
    ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c); ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h); ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c); ctx.closePath();
  }
  G.chamfer = chamfer;
  function panel(ctx, x, y, w, h, accent, alpha) {
    const a = alpha == null ? 0.88 : alpha, c = Math.min(10, h / 4);
    chamfer(ctx, x, y, w, h, c);
    ctx.fillStyle = 'rgba(15,11,12,' + a + ')'; ctx.fill();
    ctx.save(); ctx.clip();
    const gr = ctx.createLinearGradient(0, y, 0, y + Math.min(h, 60));
    gr.addColorStop(0, 'rgba(255,214,170,' + (0.05 * a).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,214,170,0)');
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, Math.min(h, 60));
    ctx.restore();
    chamfer(ctx, x + 0.5, y + 0.5, w - 1, h - 1, c); ctx.strokeStyle = UI.line; ctx.lineWidth = 1; ctx.stroke();
    if (accent) { ctx.fillStyle = accent; ctx.fillRect(x + c + 2, y, Math.min(42, w * 0.3), 2); ctx.fillRect(x + w - c - 2 - 10, y + h - 2, 10, 2); }
  }
  // 即时模式按钮：绘制并返回本帧是否被点击
  G.button = function (ctx, x, y, w, h, label, primary) {
    const it = G.uiItem(x, y, w, h, { primary }), hover = it.hover, c = Math.min(8, h / 4);
    chamfer(ctx, x, y, w, h, c);
    if (primary) {
      ctx.fillStyle = hover ? UI.emberHi : UI.ember; ctx.fill();
      ctx.fillStyle = 'rgba(255,226,190,0.55)'; ctx.fillRect(x + c, y + 1, w - c * 2, 1);
      ctx.fillStyle = 'rgba(70,22,4,0.45)'; ctx.fillRect(x + c, y + h - 2, w - c * 2, 2);
    } else {
      ctx.fillStyle = hover ? UI.ironHi : UI.iron; ctx.fill();
      chamfer(ctx, x + 0.5, y + 0.5, w - 1, h - 1, c); ctx.strokeStyle = hover ? UI.lineHi : UI.line; ctx.lineWidth = 1; ctx.stroke();
      if (hover) { ctx.fillStyle = UI.ember; ctx.fillRect(x + 1, y + c, 2, h - c * 2); }
    }
    text(ctx, label, x + w / 2, y + h / 2 + 0.5, h < 36 ? 13 : 16, primary ? '#1c0c04' : hover ? '#fff' : '#e6dcd4', 'center', true, false, w - 16);
    if (it.click) { G.sfx('ui'); return true; }
    return false;
  };

  // 当前操作方式对应的两行操作提示
  G.controlHints = function () {
    if (G.touch.on) return G.motion.status === 'ok'
      ? ['倾斜设备移动 · 右半屏拖动瞄准射击', '甩动或「闪」闪避 · 点武器栏换枪 · 「E」互动']
      : ['左半屏拖动移动 · 右半屏拖动瞄准射击', '「闪」闪避 · 点武器栏换枪 · 「E」互动'];
    if (G.settings.inputMode === 'pad' || G.pad.active) return ['左摇杆移动 · 右摇杆瞄准 · RT 射击', 'A 闪避 · Y 切换武器 · X 互动 · Start 暂停'];
    return ['WASD 移动 · 鼠标瞄准 · 左键射击', '空格 闪避 · Q 切换武器 · E 互动'];
  };

  const ICON = {
    heart(ctx, x, y) { ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.bezierCurveTo(x - 10, y - 1, x - 5, y - 9, x, y - 3); ctx.bezierCurveTo(x + 5, y - 9, x + 10, y - 1, x, y + 6); ctx.closePath(); },
    shield(ctx, x, y) { ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 6.5, y - 4); ctx.lineTo(x + 6, y + 2); ctx.quadraticCurveTo(x + 4, y + 6, x, y + 8); ctx.quadraticCurveTo(x - 4, y + 6, x - 6, y + 2); ctx.lineTo(x - 6.5, y - 4); ctx.closePath(); },
    bolt(ctx, x, y) { ctx.beginPath(); ctx.moveTo(x + 2, y - 8); ctx.lineTo(x - 5, y + 1); ctx.lineTo(x - 0.5, y + 1); ctx.lineTo(x - 2, y + 8); ctx.lineTo(x + 5, y - 1.5); ctx.lineTo(x + 0.5, y - 1.5); ctx.closePath(); }
  };
  const lag = { hp: 1, boss: 1 };
  // 斜切资源条：底槽 → 掉血残影 → 渐变填充 → 刻度 → 数值
  function bar(ctx, x, y, w, h, frac, lagFrac, color, icon, val, seg) {
    const sk = 8;
    const shape = ww => { ctx.beginPath(); ctx.moveTo(x + sk, y); ctx.lineTo(x + sk + ww, y); ctx.lineTo(x + ww, y + h); ctx.lineTo(x, y + h); ctx.closePath(); };
    shape(w); ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fill();
    if (lagFrac > frac + 0.005) { shape(w * G.clamp(lagFrac, 0, 1)); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill(); }
    if (frac > 0.005) {
      const gr = ctx.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, G.shade(color, 0.35)); gr.addColorStop(0.5, color); gr.addColorStop(1, G.shade(color, -0.35));
      shape(w * G.clamp(frac, 0, 1)); ctx.fillStyle = gr; ctx.fill();
    }
    ctx.save(); shape(w); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 1; i < seg; i++) ctx.fillRect(x + sk / 2 + w * i / seg, y, 1, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y + 1, w + sk, 2);
    ctx.restore();
    shape(w); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    ICON[icon](ctx, x - 13, y + h / 2); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#140e14'; ctx.lineWidth = 1.5; ctx.stroke();
    G.textO(ctx, val, x + w / 2 + 4, y + h / 2 + 0.5, 11, '#fff', 'center');
  }

  const ROOM_COLOR = { start: '#cfd6e0', combat: '#9a9fae', chest: '#ffd24a', shop: '#5dff8a', boss: '#ff5d6c' };
  function minimap(ctx, g, th) {
    const N = G.GRID_N, cw = 27, ch = 19, ox = G.W - 18 - N * cw, oy = 18;
    panel(ctx, ox - 9, oy - 9, N * cw + 18, N * ch + 18, th.accent, 0.72);
    mapDraw(ctx, g, ox, oy, cw, ch, 1);
  }
  // 按格子尺寸画出地牢房间图（小地图和展开地图共用）
  function mapDraw(ctx, g, ox, oy, cw, ch, k) {
    const d = g.dungeon, N = G.GRID_N;
    const cx = r => ox + r.gx * cw + cw / 2, cy = r => oy + r.gy * ch + ch / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 3 * k;
    for (const a of d.rooms) for (const j of a.links) {
      const b = d.rooms[j];
      if (b.id < a.id || !(a.visited || b.visited)) continue;
      ctx.beginPath(); ctx.moveTo(cx(a), cy(a)); ctx.lineTo(cx(b), cy(b)); ctx.stroke();
    }
    for (const r of d.rooms) {
      if (!r.seen) continue;
      const w = (9 + r.w * 0.55) * k, h = (7 + r.h * 0.5) * k, x = cx(r) - w / 2, y = cy(r) - h / 2, col = ROOM_COLOR[r.type];
      if (r.visited) {
        ctx.fillStyle = '#140e14'; rr(ctx, x - 1, y - 1, w + 2, h + 2, 2); ctx.fill();
        ctx.globalAlpha = r.cleared || r.type !== 'combat' ? 0.95 : 0.55;
        ctx.fillStyle = col; rr(ctx, x, y, w, h, 2); ctx.fill(); ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(ctx, x, y, w, h, 2); ctx.fill();
        ctx.strokeStyle = r.type === 'boss' ? col : r.elite ? '#ffd24a' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = r.elite ? 1.6 : 1; ctx.stroke();
        if (r.type === 'boss') { const q = 3.5 * k; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx(r), cy(r) - q); ctx.lineTo(cx(r) + q, cy(r)); ctx.lineTo(cx(r), cy(r) + q); ctx.lineTo(cx(r) - q, cy(r)); ctx.fill(); }
      }
      if (r === g.room) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6 + Math.sin(g.time * 5) * 0.4;
        rr(ctx, x - 3, y - 3, w + 6, h + 6, 3); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    const S = G.TILE, p = g.player;
    ctx.fillStyle = '#140e14'; ctx.beginPath(); ctx.arc(ox + p.x / S / 28 * cw, oy + p.y / S / 22 * ch, 3.6 * Math.sqrt(k), 0, TAU); ctx.fill();
    ctx.fillStyle = '#3ff0da'; ctx.beginPath(); ctx.arc(ox + p.x / S / 28 * cw, oy + p.y / S / 22 * ch, 2.4 * Math.sqrt(k), 0, TAU); ctx.fill();
  }

  // 展开地图（Tab 或点击小地图）
  const LEGEND = [['start', '起点'], ['combat', '战斗'], ['chest', '宝箱'], ['shop', '商店'], ['boss', '守护者']];
  function bigMap(ctx, g, th) {
    const N = G.GRID_N, k = 3.2, cw = 27 * k, ch = 19 * k, w = N * cw + 60, h = N * ch + 120, x = (G.W - w) / 2, y = (G.H - h) / 2;
    ctx.fillStyle = 'rgba(7,4,9,0.55)'; ctx.fillRect(0, 0, G.W, G.H);
    panel(ctx, x, y, w, h, th.accent, 0.92);
    G.text(ctx, G.tf('第 {0} 层', g.floor) + ' · ' + G.tr(th.name), G.W / 2, y + 26, 16, '#ffe9c8', 'center', true);
    mapDraw(ctx, g, x + 30, y + 48, cw, ch, k * 0.75);
    let lx = G.W / 2 - LEGEND.length * 46;
    for (const [t, s] of LEGEND) {
      ctx.fillStyle = ROOM_COLOR[t]; rr(ctx, lx, y + h - 40, 12, 12, 2); ctx.fill();
      text(ctx, s, lx + 18, y + h - 33.5, 12, '#c8bcc0', 'left', false, false, 62); lx += 92;
    }
    text(ctx, (G.touch.on ? G.tr('轻触关闭') : G.tr('Tab / 点击关闭')) + ' · ' + G.tr('点击已探索的房间可传送'), G.W / 2, y + h - 12, 11, '#8a8088', 'center', false, false, w - 30);
  }

  // 桌面端右上角小按钮：展开地图、静音、暂停
  function hudBtns() {
    const N = G.GRID_N, y = 18 + N * 19 + 18, s = 30, r = G.W - 18;
    return [{ id: 'pause', x: r - s, y, s }, { id: 'mute', x: r - s * 2 - 8, y, s }, { id: 'map', x: r - s * 3 - 16, y, s }];
  }
  function drawHudButtons(ctx, g) {
    const I = G.input;
    for (const b of hudBtns()) {
      const hov = I.mx >= b.x && I.mx <= b.x + b.s && I.my >= b.y && I.my <= b.y + b.s;
      ctx.fillStyle = hov ? 'rgba(60,48,64,0.9)' : 'rgba(12,9,14,0.62)'; rr(ctx, b.x, b.y, b.s, b.s, 6); ctx.fill();
      ctx.strokeStyle = hov ? '#ffb05a' : 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke();
      const cx = b.x + b.s / 2, cy = b.y + b.s / 2, col = hov ? '#fff' : '#bdb2bc';
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1.6;
      if (b.id === 'pause') { ctx.fillRect(cx - 5, cy - 6, 3.5, 12); ctx.fillRect(cx + 1.5, cy - 6, 3.5, 12); }
      else if (b.id === 'mute') {
        ctx.beginPath(); ctx.moveTo(cx - 8, cy - 3); ctx.lineTo(cx - 4, cy - 3); ctx.lineTo(cx + 1, cy - 7); ctx.lineTo(cx + 1, cy + 7); ctx.lineTo(cx - 4, cy + 3); ctx.lineTo(cx - 8, cy + 3); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        if (G.audio.muted) { ctx.strokeStyle = '#ff6b7a'; ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx + 9, cy + 4); ctx.moveTo(cx + 9, cy - 4); ctx.lineTo(cx + 4, cy + 4); }
        else { ctx.arc(cx + 2, cy, 5, -0.8, 0.8); ctx.moveTo(cx + 5.5, cy - 7); ctx.arc(cx + 2, cy, 8.5, -0.8, 0.8); }
        ctx.stroke();
      } else {
        ctx.strokeRect(cx - 7, cy - 6, 14, 12); ctx.beginPath(); ctx.moveTo(cx - 2.3, cy - 6); ctx.lineTo(cx - 2.3, cy + 6); ctx.moveTo(cx + 2.3, cy - 6); ctx.lineTo(cx + 2.3, cy + 6); ctx.stroke();
      }
    }
  }
  // 桌面端鼠标点在 HUD 按钮或小地图上时执行对应操作，并且不触发射击
  G.hudClick = function (x, y) {
    const g = G.game;
    if (g.state !== 'play' || G.touch.on || g.cine || g.dying) return false;
    if (g.bigMap) { if (!G.mapTeleport(x, y)) g.bigMap = false; return true; }
    for (const b of hudBtns()) {
      if (x < b.x || x > b.x + b.s || y < b.y || y > b.y + b.s) continue;
      if (b.id === 'pause') G.input.pressed.Escape = true;
      else if (b.id === 'mute') G.toggleMute();
      else g.bigMap = true;
      G.sfx('ui');
      return true;
    }
    const N = G.GRID_N, ox = G.W - 18 - N * 27 - 9;
    if (x >= ox && y <= 18 + N * 19 + 9) { g.bigMap = true; G.sfx('ui'); return true; }
    const p = g.player;
    if (x > G.W - 214 && y > G.H - 124) { if (p.weapons[1]) { p.cur = y > G.H - 66 ? 1 : 0; G.sfx('ui'); } return true; }
    if ((x < 278 && y > G.H - 102) || (x < 330 && x > 282 && y > G.H - 70) || (x < 222 && y < 72)) return true;
    return false;
  };
  // 展开地图中点击房间：脱战时传送到已探索且安全的房间
  G.mapTeleport = function (x, y) {
    const g = G.game, N = G.GRID_N, k = 3.2, cw = 27 * k, ch = 19 * k, w = N * cw + 60, h = N * ch + 120;
    const ox = (G.W - w) / 2 + 30, oy = (G.H - h) / 2 + 48;
    const r = g.dungeon.rooms.find(o => x >= ox + o.gx * cw && x < ox + (o.gx + 1) * cw && y >= oy + o.gy * ch && y < oy + (o.gy + 1) * ch);
    if (!r) return false;
    if (g.active || g.boss) { g.toast = { text: '战斗中无法传送', t: 1.4 }; return true; }
    if (!r.visited || (r.type !== 'start' && r.type !== 'chest' && r.type !== 'shop' && !r.cleared)) { g.toast = { text: '只能传送到已探索的安全房间', t: 1.4 }; return true; }
    const p = g.player;
    G.burst(p.x, p.y, '#3ff0da', 16, 200, 0.4, 3);
    p.x = r.cx; p.y = r.cy + 30; g.room = r; g.bigMap = false;
    g.cam.x = p.x - G.W / 2; g.cam.y = p.y - G.H / 2; G.prebakeNear(g.dungeon, p.x, p.y);
    G.burst(p.x, p.y, '#3ff0da', 22, 220, 0.5, 3); g.effects.push({ type: 'ring', x: p.x, y: p.y, rad: 70, t: 0, dur: 0.45, color: '#3ff0da' });
    G.sfx('portal');
    return true;
  };
  G.toggleMute = function () {
    G.audio.muted = !G.audio.muted;
    if (G.game.state === 'play') G.game.toast = { text: G.audio.muted ? '已静音（M 恢复）' : '声音已开启', t: 1.6 };
  };
  // 武器对比：拾取或购买前显示和将被替换的武器的差别
  function weaponCompare(p, id) {
    const now = p.weapons[1] ? p.weapons[p.cur] : null, a = G.weaponStats(p, id);
    if (!now) return { text: G.tf('DPS {0} · 每秒耗能 {1} · 放入空槽', a.dps, a.eps), color: '#9dff8a' };
    const b = G.weaponStats(p, now);
    const up = a.dps >= b.dps, cheap = a.eps <= b.eps;
    return { text: G.tf('替换 {0}：DPS {1} → {2} · 每秒耗能 {3} → {4}', G.tr(G.WEAPONS[now].name), b.dps, a.dps, b.eps, a.eps), color: up && cheap ? '#9dff8a' : !up && !cheap ? '#ffb0a0' : '#ffe27a', swap: true };
  }

  // 细分隔线：两段渐隐的金属线，中间一枚小菱形
  function divider(ctx, x, y, w, color) {
    if (w < 1) return;
    const gr = ctx.createLinearGradient(x - w, 0, x + w, 0);
    gr.addColorStop(0, G.rgba(color, 0)); gr.addColorStop(0.42, G.rgba(color, 0.6)); gr.addColorStop(0.58, G.rgba(color, 0.6)); gr.addColorStop(1, G.rgba(color, 0));
    ctx.fillStyle = gr; ctx.fillRect(x - w, y, w - 9, 1); ctx.fillRect(x + 9, y, w - 9, 1);
    ctx.save(); ctx.translate(x, y + 0.5); ctx.rotate(Math.PI / 4); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(-2.5, -2.5, 5, 5); ctx.restore();
  }
  // 标题：只留一层很淡的光，英文标题用大写，字距略微放开
  function glowText(ctx, str, x, y, size, color, glow, title) {
    ctx.save();
    ctx.shadowColor = G.rgba(glow, 0.55); ctx.shadowBlur = size > 40 ? 16 : 8;
    let s = G.tr(str);
    if (G.lang === 'en' && size >= 28) s = String(s).toUpperCase();
    if ('letterSpacing' in ctx) ctx.letterSpacing = size >= 28 ? (G.cjk() ? '0.12em' : '0.06em') : '0px';
    G.text(ctx, s, x, y, size, color, 'center', true, title);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  G.drawHUD = function (ctx) {
    const g = G.game, p = g.player, th = G.theme();

    // 左上：层数徽章、金币、击杀
    panel(ctx, 14, 12, 206, 58, th.accent, 0.72);
    ctx.save(); ctx.translate(42, 41); G.poly(ctx, 6, 19, Math.PI / 6); ctx.fillStyle = '#140e14'; ctx.fill(); ctx.strokeStyle = th.accent; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    text(ctx, String(g.floor), 42, 42, 20, th.accent, 'center', true);
    text(ctx, th.name, 70, 31, 16, '#f4ece4', 'left', true, false, 140);
    ctx.beginPath(); ctx.ellipse(77, 53, 5, 6, 0, 0, TAU); ctx.fillStyle = '#ffcf3e'; ctx.fill(); ctx.strokeStyle = '#140e14'; ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, String(p.gold), 88, 54, 14, '#ffe9a8', 'left', true);
    text(ctx, G.tf('击杀 {0}', g.kills), 138, 54, 12, '#a89ea8', 'left', false, false, 78);
    const D = G.diff(); ctx.fillStyle = D.color; ctx.fillRect(16, 76, 3, 12); text(ctx, D.name, 24, 82.5, 11, D.color, 'left', true);

    minimap(ctx, g, th);

    // 左下：生命 / 护盾 / 能量
    const bx = 48, by = G.H - 86;
    panel(ctx, 12, by - 13, 262, 88, null, 0.7);
    const hf = p.hp / p.maxHp;
    lag.hp = hf > lag.hp ? hf : Math.max(hf, lag.hp - 0.006);
    bar(ctx, bx, by, 190, 17, hf, lag.hp, hf < 0.3 && Math.sin(g.time * 10) > 0 ? '#ff9aa4' : '#ff5d6c', 'heart', Math.ceil(p.hp) + ' / ' + p.maxHp, Math.round(p.maxHp / 25));
    bar(ctx, bx, by + 24, 190, 15, p.shield / p.maxShield, 0, '#8fb7ff', 'shield', Math.floor(p.shield) + ' / ' + p.maxShield, Math.round(p.maxShield / 10));
    bar(ctx, bx, by + 46, 190, 15, p.energy / p.maxEnergy, 0, '#5fd8f5', 'bolt', Math.floor(p.energy) + ' / ' + p.maxEnergy, Math.round(p.maxEnergy / 20));
    // 闪避冷却（触屏版的冷却环画在「闪」按钮上）
    if (!G.touch.on) drawDashIcon(ctx, p);
    drawHudRest(ctx, g, p, th);
    if (!G.touch.on) drawHudButtons(ctx, g);
    if (g.bigMap) bigMap(ctx, g, th);
    if (g.toast && g.toast.t > 0) { ctx.globalAlpha = Math.min(1, g.toast.t * 3); G.textO(ctx, g.toast.text, G.W / 2, 92, 16, '#ffe9c8', 'center'); ctx.globalAlpha = 1; }
  };
  function drawDashIcon(ctx, p) {
    const dk = G.clamp(1 - p.dashCd / p.stats.dashCd, 0, 1), dx = 306, dy = G.H - 46;
    ctx.fillStyle = 'rgba(12,9,14,0.75)'; ctx.beginPath(); ctx.arc(dx, dy, 21, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(dx, dy, 17, 0, TAU); ctx.stroke();
    ctx.strokeStyle = dk >= 1 ? '#3ff0da' : '#8a8490'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(dx, dy, 17, -Math.PI / 2, -Math.PI / 2 + TAU * dk); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = dk >= 1 ? '#3ff0da' : '#8a8490';
    for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.4 + i * 0.3; ctx.beginPath(); ctx.moveTo(dx - 9 + i * 6, dy - 5); ctx.lineTo(dx - 3 + i * 6, dy); ctx.lineTo(dx - 9 + i * 6, dy + 5); ctx.lineTo(dx - 7 + i * 6, dy); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1;
    text(ctx, G.keyName('dash'), dx, dy + 31, 10, '#8a8490', 'center');
  }
  function drawHudRest(ctx, g, p, th) {
    // 右下：两把武器
    for (let i = 0; i < 2; i++) {
      const id = p.weapons[i], cur = i === p.cur, w = cur ? 196 : 176, h = cur ? 50 : 40;
      const h1 = p.cur === 1 ? 50 : 40, x = G.W - 14 - w, y = i === 1 ? G.H - 14 - h1 : G.H - 14 - h1 - 8 - h;
      const wd = id && G.WEAPONS[id];
      panel(ctx, x, y, w, h, cur && wd ? wd.color : null, cur ? 0.86 : 0.5);
      ctx.fillStyle = cur ? '#f7a653' : '#4a4450'; rr(ctx, x + 7, y + h / 2 - 9, 17, 18, 4); ctx.fill();
      text(ctx, String(i + 1), x + 15.5, y + h / 2 + 0.5, 12, cur ? '#2a1204' : '#aaa', 'center', true);
      if (!wd) { text(ctx, '空 槽', x + w / 2 + 10, y + h / 2, 13, '#6a6470', 'center'); continue; }
      ctx.save(); ctx.translate(x + 36, y + h / 2); ctx.globalAlpha = cur ? 1 : 0.55;
      if (cur) { ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, wd.color, 16, 0, 26, 0.35); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      G.drawWeapon(ctx, id, cur ? 1.5 : 1.2); ctx.restore();
      text(ctx, wd.name, x + 84, y + h / 2 - (cur ? 8 : 0), cur ? 15 : 13, cur ? '#fff' : '#9a94a0', 'left', true, false, w - 92);
      if (cur) {
        const c = wd.cost * p.stats.costMul;
        text(ctx, c ? G.tf('耗能 {0}', Math.round(c * 10) / 10) : '不耗能量', x + 84, y + h / 2 + 11, 11, c ? '#6fe0ff' : '#9dff8a', 'left', false, false, w - 92);
      }
    }

    // Boss 血条
    if (g.boss && g.boss.spawnT <= 0) {
      const b = g.boss, w = 440, x = (G.W - w) / 2, y = 34, f = Math.max(0, b.hp / b.maxhp);
      lag.boss = f > lag.boss ? f : Math.max(f, lag.boss - 0.004);
      glowText(ctx, b.def.name, G.W / 2, y - 14, 22, '#fff', b.def.color, true);
      ctx.fillStyle = 'rgba(8,6,10,0.8)'; rr(ctx, x - 3, y, w + 6, 16, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x, y + 3, w * lag.boss, 10);
      const gr = ctx.createLinearGradient(0, y + 3, 0, y + 13);
      gr.addColorStop(0, G.shade(b.def.color, 0.4)); gr.addColorStop(1, G.shade(b.def.color, -0.3));
      ctx.fillStyle = gr; ctx.fillRect(x, y + 3, w * f, 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; rr(ctx, x - 3, y, w + 6, 16, 4); ctx.stroke();
      for (const k of [0.33, 0.66]) { ctx.fillStyle = f > k ? '#fff' : '#6a6470'; const px = x + w * k; ctx.beginPath(); ctx.moveTo(px, y - 2); ctx.lineTo(px + 5, y + 8); ctx.lineTo(px, y + 18); ctx.lineTo(px - 5, y + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#140e14'; ctx.stroke(); }
      for (const s of [-1, 1]) { ctx.fillStyle = b.def.color; ctx.beginPath(); ctx.moveTo(G.W / 2 + s * (w / 2 + 5), y + 8); ctx.lineTo(G.W / 2 + s * (w / 2 + 17), y); ctx.lineTo(G.W / 2 + s * (w / 2 + 17), y + 16); ctx.closePath(); ctx.fill(); }
    } else lag.boss = 1;

    // 互动提示
    if (p.near && g.state === 'play') {
      const label = G.tr(G.itemLabel(p.near));
      ctx.font = 'bold 14px ' + G.FONT;
      const w = ctx.measureText(label).width + 62, x = (G.W - w) / 2, y = G.H - 158;
      panel(ctx, x, y, w, 34, '#ffb05a', 0.88);
      ctx.fillStyle = '#f7a653'; rr(ctx, x + 9, y + 7, 22, 20, 4); ctx.fill();
      text(ctx, G.keyName('use'), x + 20, y + 17.5, 13, '#2a1204', 'center', true);
      text(ctx, label, x + 40, y + 17.5, 14, '#ffeccc', 'left', true);
      const sub = p.near.kind === 'weapon' ? G.WEAPONS[p.near.wid].desc : p.near.item === 'perk' ? p.near.perk.desc : p.near.item === 'heal' ? '回复 40 点生命' : p.near.item === 'energy' ? '能量回满' : '';
      if (sub) G.textO(ctx, sub, G.W / 2, y + 48, 12, '#d8d0d8', 'center');
      if (p.near.kind === 'weapon') {
        const c = weaponCompare(p, p.near.wid);
        G.textO(ctx, c.text, G.W / 2, y + 66, 12, c.color, 'center');
        if (c.swap) G.textO(ctx, G.tf('先按 {0} 切换要替换的武器', G.keyName('swap')), G.W / 2, y + 84, 11, '#bdb2bc', 'center');
      }
    }

    // 横幅
    if (g.banner && g.banner.t > 0) {
      const b = g.banner, a = Math.min(1, b.t * 2.5);
      ctx.globalAlpha = a;
      if (b.small) { glowText(ctx, b.text, G.W / 2, 100, 24, '#ffe9c8', th.accent, true); divider(ctx, G.W / 2, 120, 90, th.accent); }
      else {
        const gr = ctx.createLinearGradient(0, 0, G.W, 0);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.72)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 122, G.W, 78);
        glowText(ctx, b.text, G.W / 2, 158, 46, '#fff3e0', th.accent, true);
        divider(ctx, G.W / 2, 192, 190, th.accent);
      }
      ctx.globalAlpha = 1;
    }

    if (G.debug.fps) text(ctx, 'FPS ' + Math.round(G.fps || 0) + '  E ' + g.enemies.length + '  B ' + (g.bullets.length + g.ebullets.length) + '  P ' + g.particles.length, 14, 102, 12, '#9f9', 'left');
  };

  // ---------- 各种覆盖界面 ----------
  function dim(ctx, a) { ctx.fillStyle = 'rgba(7,4,9,' + a + ')'; ctx.fillRect(0, 0, G.W, G.H); }
  const hero = { x: 0, y: 0, aim: -0.25, walk: 0, moving: false, capeX: 3, capeY: 0, weapons: ['pistol'], cur: 0, recoil: 0, dashT: 0, hurtFlash: 0 };

  G.drawMenuBackdrop = function (ctx) {
    const g = G.game, t = g.time, mxo = (G.input.mx - G.W / 2) / G.W;
    const gr = ctx.createLinearGradient(0, 0, 0, G.H);
    gr.addColorStop(0, '#060405'); gr.addColorStop(0.55, '#160a08'); gr.addColorStop(1, '#4a1c08');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, G.W, G.H);
    // 深渊的光
    ctx.globalCompositeOperation = 'lighter';
    G.glow(ctx, '#ff7a2a', G.W / 2, G.H + 90, 560 + Math.sin(t * 1.3) * 20, 0.55);
    for (let i = 0; i < 6; i++) {
      const x = 180 + i * 120 + Math.sin(t * 0.3 + i * 2) * 40, w = 30 + (i % 3) * 22;
      const lg = ctx.createLinearGradient(0, G.H, 0, 120);
      lg.addColorStop(0, 'rgba(255,150,70,0.16)'); lg.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.globalAlpha = 0.6 + Math.sin(t + i) * 0.4; ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(x - w, G.H); ctx.lineTo(x + w, G.H); ctx.lineTo(x + w * 0.3 + 30, 120); ctx.lineTo(x - w * 0.3 + 30, 120); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // 远近两层岩柱与钟乳石
    for (let layer = 0; layer < 2; layer++) {
      const par = (layer ? -34 : -14) * mxo;
      ctx.fillStyle = layer ? '#0b0607' : '#1a0d0a';
      for (let i = 0; i < 9; i++) {
        const x = i * 130 - 60 + (layer ? 55 : 0) + par, h = 60 + ((i * 53 + layer * 31) % 110), w = 34 + ((i * 29) % 30);
        ctx.beginPath(); ctx.moveTo(x - w, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + 4, h + (layer ? 40 : 0)); ctx.closePath(); ctx.fill();
        const bh = 70 + ((i * 71 + layer * 17) % 120);
        ctx.beginPath(); ctx.moveTo(x + 50 - w * 0.8, G.H); ctx.lineTo(x + 50 + w * 0.8, G.H); ctx.lineTo(x + 56, G.H - bh - (layer ? 60 : 0)); ctx.lineTo(x + 44, G.H - bh - (layer ? 50 : 0)); ctx.closePath(); ctx.fill();
      }
    }
    // 左侧崖台上的旅人
    const lx = 60 - 40 * mxo;
    ctx.fillStyle = '#070405';
    ctx.beginPath(); ctx.moveTo(-20, G.H); ctx.lineTo(-20, 470); ctx.lineTo(lx + 120, 462); ctx.lineTo(lx + 176, 478); ctx.lineTo(lx + 150, 520); ctx.lineTo(lx + 60, G.H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,150,70,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx + 120, 462); ctx.lineTo(lx + 176, 478); ctx.lineTo(lx + 150, 520); ctx.stroke();
    ctx.save(); ctx.translate(lx + 84, 432); ctx.scale(2.6, 2.6); G.drawPlayerSprite(ctx, hero, g); ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, '#ffd27a', lx + 122, 440, 50 + Math.sin(t * 7) * 3, 0.5);
    // 上升的余烬
    const sp = G.glowSprite('#ffb066');
    for (let i = 0; i < 80; i++) {
      const v = 16 + (i * 37 % 46), x = ((i * 137.5 + Math.sin(t * 0.7 + i) * 26 - mxo * (20 + i % 30)) % G.W + G.W) % G.W;
      const y = G.H - ((t * v + i * 91) % (G.H + 40)), s = 2.5 + (i % 4) * 1.6;
      ctx.globalAlpha = (0.25 + (i % 5) * 0.14) * Math.min(1, y / 200);
      ctx.drawImage(sp, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    // 标题：开场时像墨迹一样从左到右显现，前沿带一道火光
    const it = G.clamp(G.introT / 1.2, 0, 1), ie = 1 - Math.pow(1 - it, 3);
    const title = G.tr('烬渊'), tsz = G.lang === 'en' ? 92 : 118;
    ctx.save();
    G.setFont(ctx, title, tsz, true, true, G.W - 160);
    const tw = ctx.measureText(title).width, tx0 = G.W / 2 - tw / 2 - 30;
    ctx.beginPath(); ctx.rect(0, 0, tx0 + (tw + 60) * ie, G.H); ctx.clip();
    ctx.shadowColor = '#ff7a2a'; ctx.shadowBlur = 36 + Math.sin(t * 2) * 8;
    const tg = ctx.createLinearGradient(0, 60, 0, 170);
    tg.addColorStop(0, '#fff6e4'); tg.addColorStop(0.55, '#ffc98a'); tg.addColorStop(1, '#f07a2a');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = tg; ctx.fillText(title, G.W / 2, 116);
    ctx.restore();
    if (it < 1) { ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, '#ffb066', tx0 + (tw + 60) * ie, 116, 90, 0.8 * (1 - it)); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = G.clamp((G.introT - 0.7) / 0.6, 0, 1);
    divider(ctx, G.W / 2, 188, 170 * ctx.globalAlpha, '#ff9d4a');
    if ('letterSpacing' in ctx) ctx.letterSpacing = G.cjk() ? '0.3em' : '0.12em';
    text(ctx, '向下三层，直抵渊心', G.W / 2, 211, 14, '#c9a888', 'center');
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.globalAlpha = 1;

  };

  G.drawMenu = function (ctx) {
    G.drawMenuBackdrop(ctx);
    ctx.globalAlpha = G.clamp((G.introT - 0.9) / 0.6, 0, 1);
    const rec = G.save.rec;
    if (rec.runs) text(ctx, G.tf('远征 {0} 次 · 通关 {1} 次 · 最深第 {2} 层', rec.runs, rec.wins, rec.best), 16, 18, 12, '#a89080', 'left');

    // 第一步：选择设备
    text(ctx, '选择操作方式', G.W / 2, 244, 13, '#a89080', 'center');
    const mode = G.settings.inputMode, cx0 = G.W / 2 - 291;
    if (modeCard(ctx, cx0, 258, 186, 66, '电脑端', '键盘 + 鼠标', 'pc', mode === 'pc')) G.setInputMode('pc');
    if (modeCard(ctx, cx0 + 198, 258, 186, 66, '手机端', '触屏 · 横屏', 'phone', mode === 'touch')) G.setInputMode('touch');
    if (modeCard(ctx, cx0 + 396, 258, 186, 66, '手柄', G.pad.connected ? '已连接' : 'Xbox / PS / Deck', 'pad', mode === 'pad')) G.setInputMode('pad');

    // 右上角：语言 / 剧情 / 成就 / 设置 / 退出
    const tops = [['◎ ' + G.langName(), () => G.cycleLang(1)], ['剧情', () => G.openSub('gallery')], ['成就', () => G.openSub('ach')], ['设置', () => G.openSub('settings')]];
    if (G.desktop) tops.push(['退出游戏', () => G.desktop.quit()]);
    let tx = G.W - 14;
    ctx.font = 'bold 13px ' + G.FONT;
    for (let i = tops.length - 1; i >= 0; i--) {
      const w = Math.max(64, Math.ceil(ctx.measureText(G.tr(tops[i][0])).width) + 30); tx -= w;
      if (G.button(ctx, tx, 14, w, 32, tops[i][0])) tops[i][1]();
      ctx.font = 'bold 13px ' + G.FONT; tx -= 8;
    }
    text(ctx, 'v' + G.VERSION, G.W - 14, G.H - 14, 11, '#6a5a52', 'right');
    if (G.ach.count()) text(ctx, G.tf('成就 {0} / {1}', G.ach.count(), G.ach.list.length), 16, 36, 12, '#a89080', 'left');

    // 第二步：对应的操作方式
    // 手机端多一个体感开关，说明框收紧一些，给开始按钮留出空间
    const T = G.touch.on, rowH = 34;
    panel(ctx, G.W / 2 - 270, 336, 540, 116, null, 0.7);
    const rows = mode === 'pad' ? [['左摇杆', '移动'], ['右摇杆 / RT', '瞄准 · 射击'], ['A / LT', '闪避（冲刺时无敌）'], ['Y / LB', '切换武器'], ['X', '拾取 · 开箱 · 购买'], ['Start', '暂停']]
      : G.touch.on
      ? [G.motion.status === 'ok' ? ['倾斜设备', '移动（甩动可闪避）'] : ['左半屏拖动', '移动'], ['右半屏拖动', '瞄准并射击'], ['右半屏按住', '自动瞄准最近敌人'], ['「闪」按钮', '闪避（冲刺时无敌）'], ['点武器栏', '切换武器'], ['「E」按钮', '拾取 · 开箱 · 购买']]
      : [['W A S D', '移动'], ['鼠标 / 左键', '瞄准 · 射击'], ['空格', '闪避（冲刺时无敌）'], ['Q / 滚轮', '切换武器'], ['E', '拾取 · 开箱 · 购买'], ['Esc / M', '暂停 · 静音']];
    rows.forEach((r, i) => {
      const x = G.W / 2 - 250 + (i % 2) * 262, y = 360 + Math.floor(i / 2) * rowH;
      ctx.font = 'bold 12px ' + G.FONT;
      const kw = ctx.measureText(G.tr(r[0])).width + 16;
      ctx.fillStyle = '#21181a'; ctx.fillRect(x, y - 11, kw, 22);
      ctx.fillStyle = UI.ember; ctx.fillRect(x, y + 10, kw, 1);
      text(ctx, r[0], x + kw / 2, y + 0.5, 12, '#ffcf9a', 'center', true);
      text(ctx, r[1], x + kw + 10, y + 0.5, 13, '#e0d6d0', 'left', false, false, 250 - kw);
    });

    // 第三步：开始
    diffRow(ctx, 462);
    if (G.touch.on) {
      G.motionToggle(ctx, G.W / 2 - 170, 500, 340, 26);
      startButtons(ctx, 534, 44);
    } else {
      startButtons(ctx, 506, 50);
      text(ctx, G.DIFFS[G.settings.difficulty || 'easy'].desc, G.W / 2, 576, 12, '#9a8478', 'center', false, false, G.W - 80);
    }
    ctx.globalAlpha = 1;
  };

  // 难度选择：四段式开关，选中段填充该难度的颜色
  function diffRow(ctx, y) {
    const ids = G.DIFF_IDS, w = 92, h = 28, gap = 6, x0 = G.W / 2 - (ids.length * w + (ids.length - 1) * gap) / 2 + 30;
    text(ctx, '难度', x0 - 16, y + h / 2, 12, UI.muted, 'right', true);
    ids.forEach((id, i) => {
      const D = G.DIFFS[id], x = x0 + i * (w + gap), sel = (G.settings.difficulty || 'easy') === id;
      const it = G.uiItem(x, y, w, h), hov = it.hover;
      chamfer(ctx, x, y, w, h, 6);
      ctx.fillStyle = sel ? G.rgba(D.color, 0.22) : hov ? UI.ironHi : 'rgba(18,13,13,0.9)'; ctx.fill();
      chamfer(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.strokeStyle = sel ? D.color : hov ? UI.lineHi : UI.line; ctx.lineWidth = 1; ctx.stroke();
      if (sel) { ctx.fillStyle = D.color; ctx.fillRect(x + 6, y + h - 2, w - 12, 2); }
      text(ctx, D.name, x + w / 2, y + h / 2 + 0.5, 13, sel ? '#fff' : hov ? '#e6dcd4' : '#a89a92', 'center', true, false, w - 10);
      if (it.click) { G.settings.difficulty = id; G.saveSettings(); G.sfx('ui'); }
    });
  }

  // 有存档时显示「继续远征」和「新的远征」，否则只有「开始远征」
  function startButtons(ctx, y, h) {
    const m = G.save.meta;
    if (m) {
      if (G.button(ctx, G.W / 2 - 250, y, 260, h, G.tf('继续远征 · 第 {0} 层', m.floor) + (m.diff && G.DIFFS[m.diff] ? ' · ' + G.tr(G.DIFFS[m.diff].name) : ''), true)) { if (!G.save.resume()) G.newRun(); }
      else if (G.button(ctx, G.W / 2 + 20, y, 230, h, '新的远征')) G.newRun();
    } else if (G.button(ctx, G.W / 2 - 120, y, 240, h, '开始远征', true)) G.newRun();
  }

  // 设备选择卡片：返回本帧是否被点击
  function modeCard(ctx, x, y, w, h, title, sub, icon, sel) {
    const it = G.uiItem(x, y, w, h), hover = it.hover, col = sel ? UI.emberHi : '#8a7c76';
    chamfer(ctx, x, y, w, h, 9);
    ctx.fillStyle = sel ? '#22150f' : hover ? UI.ironHi : 'rgba(18,13,13,0.9)'; ctx.fill();
    chamfer(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 9); ctx.strokeStyle = sel ? 'rgba(245,138,61,0.75)' : hover ? UI.lineHi : UI.line; ctx.lineWidth = 1; ctx.stroke();
    if (sel) { ctx.fillStyle = UI.ember; ctx.fillRect(x + 9, y, w - 18, 2); }
    const ix = x + 34, iy = y + h / 2;
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    if (icon === 'pc') {
      rr(ctx, ix - 16, iy - 14, 32, 21, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ix, iy + 7); ctx.lineTo(ix, iy + 13); ctx.moveTo(ix - 9, iy + 14); ctx.lineTo(ix + 9, iy + 14); ctx.stroke();
      ctx.fillStyle = G.rgba(col, 0.25); ctx.fillRect(ix - 12, iy - 10, 24, 13);
    } else if (icon === 'phone') {
      rr(ctx, ix - 18, iy - 11, 36, 22, 5); ctx.stroke();
      ctx.fillStyle = G.rgba(col, 0.25); ctx.fillRect(ix - 12, iy - 7, 24, 14);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ix + 14.5, iy, 1.6, 0, TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(ix - 10, iy - 8); ctx.lineTo(ix + 10, iy - 8); ctx.quadraticCurveTo(ix + 19, iy - 8, ix + 19, iy + 3); ctx.quadraticCurveTo(ix + 19, iy + 11, ix + 12, iy + 9); ctx.lineTo(ix + 7, iy + 4); ctx.lineTo(ix - 7, iy + 4); ctx.lineTo(ix - 12, iy + 9); ctx.quadraticCurveTo(ix - 19, iy + 11, ix - 19, iy + 3); ctx.quadraticCurveTo(ix - 19, iy - 8, ix - 10, iy - 8); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = col; ctx.fillRect(ix - 11, iy - 3, 7, 2); ctx.fillRect(ix - 8.5, iy - 5.5, 2, 7);
      ctx.beginPath(); ctx.arc(ix + 8, iy - 3, 1.7, 0, TAU); ctx.arc(ix + 12, iy, 1.7, 0, TAU); ctx.fill();
    }
    text(ctx, title, x + 64, y + h / 2 - 10, 17, sel ? '#fff3e0' : '#c8bec4', 'left', true, false, w - 104);
    text(ctx, sub, x + 64, y + h / 2 + 13, 11, sel ? '#ffcf9a' : '#8a8088', 'left', false, false, w - 84);
    ctx.strokeStyle = sel ? UI.emberHi : 'rgba(232,190,150,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(x + w - 23.5, y + 9.5, 11, 11);
    if (sel) { ctx.fillStyle = UI.emberHi; ctx.fillRect(x + w - 21, y + 12, 6, 6); }
    if (it.click) { G.sfx('ui'); return true; }
    return false;
  }

  G.drawPause = function (ctx) {
    const g = G.game, T = G.touch.on, x = G.W / 2 - 110, h = 44;
    dim(ctx, 0.72);
    panel(ctx, G.W / 2 - 190, 60, 380, T ? 420 : 370, '#ff9d4a', 0.9);
    glowText(ctx, '暂停', G.W / 2, 104, 38, '#ffe9c8', '#ff9d4a', true);
    divider(ctx, G.W / 2, 136, 110, '#ff9d4a');
    let y = 158;
    if (G.button(ctx, x, y, 220, h, '继续', true)) g.state = 'play';
    y += 54;
    if (G.button(ctx, x, y, 220, h, '设置')) G.openSub('settings');
    y += 54;
    if (T) { G.motionToggle(ctx, G.W / 2 - 170, y, 340, h); y += 54; }
    if (G.button(ctx, x, y, 220, h, '重新开始')) G.newRun();
    y += 54;
    if (G.button(ctx, x, y, 220, h, '返回主菜单')) { G.save.write(); g.state = 'menu'; }
    y += 70;
    G.controlHints().forEach((h, i) => text(ctx, h, G.W / 2, y - 8 + i * 18, 12, '#a89ea8', 'center', false, false, 350));
    buildPanels(ctx, g);
  };
  function buildPanels(ctx, g) {
    const w = G.W / 2 - 214, p = g.player;
    if (w < 200) { if (g.perksTaken.length) perkRow(ctx, g, 520); return; }
    const has = id => g.perksTaken.some(k => k.id === id);
    // 左：进化配方
    panel(ctx, 14, 60, w, 300, '#ffb05a', 0.86);
    text(ctx, '武器进化', 30, 84, 15, '#ffe9c8', 'left', true);
    G.EVOLUTIONS.forEach((e, i) => {
      const y = 118 + i * 60, to = G.WEAPONS[e.to], own = p.weapons.indexOf(e.from) >= 0 || p.weapons.indexOf(e.to) >= 0, done = p.weapons.indexOf(e.to) >= 0;
      text(ctx, to.name, 30, y, 13, done ? to.color : '#e8dcd0', 'left', true, false, w - 40);
      const parts = [[G.WEAPONS[e.from].name, own]].concat(e.perks.map(id => [G.PERKS.find(k => k.id === id).name, has(id)]));
      let x = 30;
      ctx.font = '11px ' + G.FONT;
      for (const [nm, ok] of parts) {
        const s = (ok ? '✓ ' : '· ') + G.tr(nm);
        text(ctx, s, x, y + 20, 11, ok ? '#9dff8a' : '#8a8088', 'left');
        x += ctx.measureText(s).width + 12;
      }
    });
    text(ctx, '集齐后会在增益选择中出现', 30, 344, 11, '#8a8088', 'left', false, false, w - 40);
    // 右：已获得的增益
    const x0 = G.W / 2 + 200;
    panel(ctx, x0, 60, w, 300, '#ff9d4a', 0.86);
    text(ctx, G.tf('构筑 · {0} 项增益', g.perksTaken.length), x0 + 16, 84, 15, '#ffe9c8', 'left', true);
    const counts = {};
    for (const k of g.perksTaken) counts[k.id] = (counts[k.id] || 0) + 1;
    Object.keys(counts).slice(0, 12).forEach((id, i) => {
      const k = G.PERKS.find(o => o.id === id), y = 112 + i * 20;
      text(ctx, k.glyph, x0 + 26, y, 13, k.color, 'center', true);
      text(ctx, G.tr(k.name) + (counts[id] > 1 ? ' ×' + counts[id] : ''), x0 + 42, y, 12, '#e0d6d0', 'left', false, false, w - 56);
    });
    if (!g.perksTaken.length) text(ctx, '还没有获得增益', x0 + 16, 116, 12, '#8a8088', 'left');
  }
  function perkRow(ctx, g, y) {
    const list = g.perksTaken, n = Math.min(list.length, 14), x0 = G.W / 2 - (n - 1) * 21;
    for (let i = 0; i < n; i++) {
      const k = list[i];
      ctx.save(); ctx.translate(x0 + i * 42, y);
      ctx.rotate(Math.PI / 4); ctx.fillStyle = '#0d0909'; ctx.fillRect(-13, -13, 26, 26); ctx.strokeStyle = k.color; ctx.lineWidth = 1.5; ctx.strokeRect(-13, -13, 26, 26);
      ctx.restore();
      text(ctx, k.glyph, x0 + i * 42, y + 1, 16, k.color, 'center', true);
    }
  }

  G.drawPerk = function (ctx) {
    const g = G.game, I = G.input;
    dim(ctx, 0.8);
    const md = g.perkMode || 'floor';
    glowText(ctx, md === 'start' ? '启程之礼' : md === 'elite' ? '精英战利品' : G.tf('第 {0} 层 · 肃清', g.floor), G.W / 2, 78, 44, '#ffe9c8', '#ff9d4a', true);
    divider(ctx, G.W / 2, 112, 170, '#ff9d4a');
    text(ctx, md === 'start' ? '选择一项增益，作为这次远征的起点' : md === 'elite' ? '击败了精英，选择一项增益' : '选择一项增益，然后前往下一层', G.W / 2, 136, 14, '#c8bcc0', 'center');
    const cw = 236, chh = 300, gap = 28, x0 = (G.W - cw * 3 - gap * 2) / 2, y = 172;
    g.perkChoices.forEach((k, i) => {
      const x = x0 + i * (cw + gap);
      const enter = G.clamp((g.stateT - i * 0.09) / 0.3, 0, 1), ease = 1 - Math.pow(1 - enter, 3);
      const it = G.uiItem(x, y, cw, chh, { primary: i === 1 }), hover = enter >= 1 && it.hover;
      const yy = y + (1 - ease) * 60 - (hover ? 10 : 0);
      ctx.globalAlpha = ease;
      chamfer(ctx, x, yy, cw, chh, 12);
      ctx.fillStyle = hover ? '#1f1715' : 'rgba(18,13,13,0.96)'; ctx.fill();
      ctx.save(); ctx.clip();
      const top = ctx.createLinearGradient(0, yy, 0, yy + 170);
      top.addColorStop(0, G.rgba(k.color, hover ? 0.14 : 0.08)); top.addColorStop(1, G.rgba(k.color, 0));
      ctx.fillStyle = top; ctx.fillRect(x, yy, cw, 170);
      ctx.fillStyle = k.color; ctx.fillRect(x, yy, cw, 3);
      ctx.restore();
      chamfer(ctx, x + 0.5, yy + 0.5, cw - 1, chh - 1, 12); ctx.strokeStyle = hover ? G.rgba(k.color, 0.9) : UI.line; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); ctx.translate(x + cw / 2, yy + 92); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#0d0909'; ctx.fillRect(-32, -32, 64, 64);
      ctx.strokeStyle = k.color; ctx.lineWidth = 1.5; ctx.strokeRect(-32, -32, 64, 64);
      ctx.strokeStyle = G.rgba(k.color, 0.3); ctx.lineWidth = 1; ctx.strokeRect(-26, -26, 52, 52);
      ctx.restore();
      text(ctx, k.glyph, x + cw / 2, yy + 94, 38, k.color, 'center', true, true);
      text(ctx, k.name, x + cw / 2, yy + 178, 21, '#fff', 'center', true, false, cw - 24);
      if (k.tag) { const tg = k.tag === 2 ? '进化' : '机制'; ctx.font = 'bold 11px ' + G.FONT; const tw = ctx.measureText(G.tr(tg)).width + 14; ctx.fillStyle = G.rgba(k.color, 0.16); ctx.fillRect(x + cw - tw - 12, yy + 14, tw, 19); text(ctx, tg, x + cw - 12 - tw / 2, yy + 24, 11, k.color, 'center', true); }
      if (k.evo) text(ctx, G.tf('{0} → {1}', G.tr(G.WEAPONS[k.evo.from].name), G.tr(k.name)), x + cw / 2, yy + 150, 11, '#ffe9c8', 'center', false, false, cw - 30);
      divider(ctx, x + cw / 2, yy + 198, 56, k.color);
      ctx.font = '14px ' + G.FONT;
      const many = G.wrapLines(ctx, k.desc, cw - 44).length > 2;
      wrap(ctx, k.desc, x + cw / 2, yy + (many ? 218 : 224), cw - 44, many ? 18 : 21, many ? 12.5 : 14, '#d0c8d0');
      ctx.strokeStyle = hover ? UI.emberHi : UI.line; ctx.lineWidth = 1; ctx.strokeRect(x + cw / 2 - 11.5, yy + chh - 33.5, 23, 21);
      text(ctx, String(i + 1), x + cw / 2, yy + chh - 22.5, 12, hover ? UI.emberHi : UI.muted, 'center', true);
      ctx.globalAlpha = 1;
      if (g.stateT > 0.5 && ((hover && it.click) || I.pressed['Digit' + (i + 1)])) { G.choosePerk(i); }
    });
  };

  function wrap(ctx, str, x, y, maxW, lh, size, color, align) {
    ctx.font = size + 'px ' + G.FONT;
    G.wrapLines(ctx, str, maxW).forEach((l, i) => text(ctx, l, x, y + i * lh, size, color, align || 'center'));
  }

  G.drawEnd = function (ctx, win) {
    const g = G.game, col = win ? '#ffb05a' : '#ff5d6c';
    dim(ctx, Math.min(0.84, g.stateT * 1.6));
    if (g.stateT < 0.4) return;
    const a = G.clamp((g.stateT - 0.4) / 0.4, 0, 1);
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, col, G.W / 2, 110, 300, 0.25 * a); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
    glowText(ctx, win ? '远征完成' : '远征失败', G.W / 2, 104 - (1 - a) * 20, 76, win ? '#fff0d8' : '#ffd0d4', col, true);
    divider(ctx, G.W / 2, 152, 200, col);
    text(ctx, win ? '烬渊之心已熄灭，你带着余温回到地面。' : G.tf('你倒在了第 {0} 层 · {1}', g.floor, G.tr(G.theme().name)), G.W / 2, 178, 15, '#c8bcc0', 'center', false, false, 640);
    panel(ctx, G.W / 2 - 230, 204, 460, 176, col, 0.8);
    const m = Math.floor(g.runTime / 60), s = Math.floor(g.runTime % 60);
    const rows = [['难度', G.tr(G.diff().name)], ['抵达层数', g.floor + ' / ' + G.MAX_FLOOR], ['击杀敌人', g.kills], ['获得金币', g.goldTotal], ['用时', G.tf('{0} 分 {1} 秒', m, (s < 10 ? '0' : '') + s)], ['承受伤害', g.dmgTaken]];
    rows.forEach((r, i) => {
      const ra = G.clamp((g.stateT - 0.6 - i * 0.08) / 0.25, 0, 1), y = 226 + i * 27;
      ctx.globalAlpha = ra * a;
      text(ctx, r[0], G.W / 2 - 200, y, 15, '#a89ea8', 'left', false, false, 260);
      text(ctx, String(r[1]), G.W / 2 + 200, y, 16, i === 0 ? G.diff().color : '#fff', 'right', true);
      if (i < rows.length - 1) { ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(G.W / 2 - 200, y + 13, 400, 1); }
    });
    ctx.globalAlpha = a;
    if (g.perksTaken.length) perkRow(ctx, g, 414);
    ctx.globalAlpha = 1;
    if (g.stateT > 0.8) {
      if (G.button(ctx, G.W / 2 - 215, 460, 205, 52, '再来一次', true)) G.newRun();
      if (G.button(ctx, G.W / 2 + 10, 460, 205, 52, '返回主菜单')) g.state = 'menu';
      if (!G.touch.on) text(ctx, G.pad.active ? '按 A 确认' : '按 R 立即重开', G.W / 2, 540, 12, '#8a8088', 'center');
    }
    if (!win && g.deathLine) { ctx.globalAlpha = G.clamp((g.stateT - 1.2) / 1, 0, 1); text(ctx, g.deathLine, G.W / 2, 574, 14, '#e8c8a0', 'center', false, false, G.W - 80); ctx.globalAlpha = 1; }
  };

  G.ui = { rr, panel, divider, glowText, wrap };

  // 准星（战斗中）与箭头光标（界面中）
  G.drawCursor = function (ctx) {
    const g = G.game, I = G.input, x = I.mx, y = I.my;
    if (g.state === 'play') {
      const p = g.player, k = 6 + (p ? p.recoil * 5 : 0);
      ctx.lineCap = 'round';
      for (const [col, lw] of [['rgba(10,6,10,0.8)', 4.5], ['#fff', 2]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw;
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k); ctx.lineTo(x + Math.cos(a) * (k + 6), y + Math.sin(a) * (k + 6)); ctx.stroke(); }
      }
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#ff9d4a'; ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 13, y + 13); ctx.lineTo(x + 6, y + 13); ctx.lineTo(x + 3, y + 19); ctx.lineTo(x, y + 18); ctx.closePath();
      ctx.fillStyle = '#fff3e0'; ctx.fill(); ctx.strokeStyle = '#140e14'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke();
    }
  };
})();
