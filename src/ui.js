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
  // 带渐变、内高光和角标的面板
  function panel(ctx, x, y, w, h, accent, alpha) {
    const a = alpha == null ? 0.82 : alpha;
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(34,27,36,' + a + ')'); gr.addColorStop(1, 'rgba(12,9,14,' + a + ')');
    ctx.fillStyle = gr; rr(ctx, x, y, w, h, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 7, y + 1, w - 14, 1);
    if (accent) {
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 1, y + 13); ctx.lineTo(x + 1, y + 5); ctx.quadraticCurveTo(x + 1, y + 1, x + 5, y + 1); ctx.lineTo(x + 13, y + 1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w - 1, y + h - 13); ctx.lineTo(x + w - 1, y + h - 5); ctx.quadraticCurveTo(x + w - 1, y + h - 1, x + w - 5, y + h - 1); ctx.lineTo(x + w - 13, y + h - 1); ctx.stroke();
    }
  }
  // 即时模式按钮：绘制并返回本帧是否被点击
  G.button = function (ctx, x, y, w, h, label, primary) {
    const I = G.input, hover = I.mx >= x && I.mx <= x + w && I.my >= y && I.my <= y + h;
    if (hover) { ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, primary ? '#ff8a3c' : '#8a7aa0', x + w / 2, y + h / 2, w * 0.62, 0.35); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    if (primary) { gr.addColorStop(0, hover ? '#ffc477' : '#f7a653'); gr.addColorStop(1, hover ? '#f08a36' : '#d86f24'); }
    else { gr.addColorStop(0, hover ? '#4a4252' : '#332d3a'); gr.addColorStop(1, hover ? '#322c38' : '#201c26'); }
    ctx.fillStyle = gr; rr(ctx, x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = hover ? '#fff' : (primary ? '#ffd9a8' : 'rgba(255,255,255,0.2)'); ctx.lineWidth = hover ? 2 : 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 6, y + 2, w - 12, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 4, y + h - 4, w - 8, 2);
    text(ctx, label, x + w / 2, y + h / 2, 17, primary ? '#2a1204' : '#f0eaf2', 'center', true);
    if (hover && I.clicked) { I.clicked = false; G.sfx('ui'); return true; }
    return false;
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
    const d = g.dungeon, N = G.GRID_N, cw = 27, ch = 19, ox = G.W - 18 - N * cw, oy = 18;
    panel(ctx, ox - 9, oy - 9, N * cw + 18, N * ch + 18, th.accent, 0.72);
    const cx = r => ox + r.gx * cw + cw / 2, cy = r => oy + r.gy * ch + ch / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 3;
    for (const a of d.rooms) for (const j of a.links) {
      const b = d.rooms[j];
      if (b.id < a.id || !(a.visited || b.visited)) continue;
      ctx.beginPath(); ctx.moveTo(cx(a), cy(a)); ctx.lineTo(cx(b), cy(b)); ctx.stroke();
    }
    for (const r of d.rooms) {
      if (!r.seen) continue;
      const w = 9 + r.w * 0.55, h = 7 + r.h * 0.5, x = cx(r) - w / 2, y = cy(r) - h / 2, col = ROOM_COLOR[r.type];
      if (r.visited) {
        ctx.fillStyle = '#140e14'; rr(ctx, x - 1, y - 1, w + 2, h + 2, 2); ctx.fill();
        ctx.globalAlpha = r.cleared || r.type !== 'combat' ? 0.95 : 0.55;
        ctx.fillStyle = col; rr(ctx, x, y, w, h, 2); ctx.fill(); ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(ctx, x, y, w, h, 2); ctx.fill();
        ctx.strokeStyle = r.type === 'boss' ? col : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
        if (r.type === 'boss') { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx(r), cy(r) - 3.5); ctx.lineTo(cx(r) + 3.5, cy(r)); ctx.lineTo(cx(r), cy(r) + 3.5); ctx.lineTo(cx(r) - 3.5, cy(r)); ctx.fill(); }
      }
      if (r === g.room) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6 + Math.sin(g.time * 5) * 0.4;
        rr(ctx, x - 3, y - 3, w + 6, h + 6, 3); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    const S = G.TILE, p = g.player;
    ctx.fillStyle = '#140e14'; ctx.beginPath(); ctx.arc(ox + p.x / S / 28 * cw, oy + p.y / S / 22 * ch, 3.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3ff0da'; ctx.beginPath(); ctx.arc(ox + p.x / S / 28 * cw, oy + p.y / S / 22 * ch, 2.4, 0, TAU); ctx.fill();
  }

  function divider(ctx, x, y, w, color) {
    const gr = ctx.createLinearGradient(x - w, 0, x + w, 0);
    gr.addColorStop(0, G.rgba(color, 0)); gr.addColorStop(0.5, G.rgba(color, 0.9)); gr.addColorStop(1, G.rgba(color, 0));
    ctx.fillStyle = gr; ctx.fillRect(x - w, y, w * 2, 1.5);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y + 0.7); ctx.lineTo(x, y + 5.5); ctx.lineTo(x - 4, y + 0.7); ctx.fill();
  }
  function glowText(ctx, str, x, y, size, color, glow, title) {
    ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 22;
    G.text(ctx, str, x, y, size, color, 'center', true, title);
    ctx.restore();
  }

  G.drawHUD = function (ctx) {
    const g = G.game, p = g.player, th = G.theme();

    // 左上：层数徽章、金币、击杀
    panel(ctx, 14, 12, 206, 58, th.accent, 0.72);
    ctx.save(); ctx.translate(42, 41); G.poly(ctx, 6, 19, Math.PI / 6); ctx.fillStyle = '#140e14'; ctx.fill(); ctx.strokeStyle = th.accent; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    text(ctx, String(g.floor), 42, 42, 20, th.accent, 'center', true);
    text(ctx, th.name, 70, 31, 16, '#f4ece4', 'left', true);
    ctx.beginPath(); ctx.ellipse(77, 53, 5, 6, 0, 0, TAU); ctx.fillStyle = '#ffcf3e'; ctx.fill(); ctx.strokeStyle = '#140e14'; ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, String(p.gold), 88, 54, 14, '#ffe9a8', 'left', true);
    text(ctx, '击杀 ' + g.kills, 138, 54, 12, '#a89ea8', 'left');

    minimap(ctx, g, th);

    // 左下：生命 / 护盾 / 能量
    const bx = 48, by = G.H - 86;
    panel(ctx, 12, by - 13, 262, 88, null, 0.7);
    const hf = p.hp / p.maxHp;
    lag.hp = hf > lag.hp ? hf : Math.max(hf, lag.hp - 0.006);
    bar(ctx, bx, by, 190, 17, hf, lag.hp, hf < 0.3 && Math.sin(g.time * 10) > 0 ? '#ff9aa4' : '#ff5d6c', 'heart', Math.ceil(p.hp) + ' / ' + p.maxHp, Math.round(p.maxHp / 25));
    bar(ctx, bx, by + 24, 190, 15, p.shield / p.maxShield, 0, '#8fb7ff', 'shield', Math.floor(p.shield) + ' / ' + p.maxShield, Math.round(p.maxShield / 10));
    bar(ctx, bx, by + 46, 190, 15, p.energy / p.maxEnergy, 0, '#5fd8f5', 'bolt', Math.floor(p.energy) + ' / ' + p.maxEnergy, Math.round(p.maxEnergy / 20));
    // 闪避冷却
    const dk = G.clamp(1 - p.dashCd / p.stats.dashCd, 0, 1), dx = 306, dy = G.H - 46;
    ctx.fillStyle = 'rgba(12,9,14,0.75)'; ctx.beginPath(); ctx.arc(dx, dy, 21, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(dx, dy, 17, 0, TAU); ctx.stroke();
    ctx.strokeStyle = dk >= 1 ? '#3ff0da' : '#8a8490'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(dx, dy, 17, -Math.PI / 2, -Math.PI / 2 + TAU * dk); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = dk >= 1 ? '#3ff0da' : '#8a8490';
    for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.4 + i * 0.3; ctx.beginPath(); ctx.moveTo(dx - 9 + i * 6, dy - 5); ctx.lineTo(dx - 3 + i * 6, dy); ctx.lineTo(dx - 9 + i * 6, dy + 5); ctx.lineTo(dx - 7 + i * 6, dy); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (!G.touch.on) text(ctx, '空格', dx, dy + 31, 10, '#8a8490', 'center');

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
      text(ctx, wd.name, x + 84, y + h / 2 - (cur ? 8 : 0), cur ? 15 : 13, cur ? '#fff' : '#9a94a0', 'left', true);
      if (cur) {
        const c = wd.cost * p.stats.costMul;
        text(ctx, c ? '耗能 ' + (Math.round(c * 10) / 10) : '不耗能量', x + 84, y + h / 2 + 11, 11, c ? '#6fe0ff' : '#9dff8a', 'left');
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
      const label = G.itemLabel(p.near);
      ctx.font = 'bold 14px ' + G.FONT;
      const w = ctx.measureText(label).width + 62, x = (G.W - w) / 2, y = G.H - 158;
      panel(ctx, x, y, w, 34, '#ffb05a', 0.88);
      ctx.fillStyle = '#f7a653'; rr(ctx, x + 9, y + 7, 22, 20, 4); ctx.fill();
      text(ctx, 'E', x + 20, y + 17.5, 13, '#2a1204', 'center', true);
      text(ctx, label, x + 40, y + 17.5, 14, '#ffeccc', 'left', true);
      const sub = p.near.kind === 'weapon' ? G.WEAPONS[p.near.wid].desc : p.near.item === 'perk' ? p.near.perk.desc : '';
      if (sub) G.textO(ctx, sub, G.W / 2, y + 48, 12, '#d8d0d8', 'center');
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

    if (G.debug.fps) text(ctx, 'FPS ' + Math.round(G.fps || 0) + '  敌 ' + g.enemies.length + '  弹 ' + (g.bullets.length + g.ebullets.length) + '  粒 ' + g.particles.length, 14, 84, 12, '#9f9', 'left');
  };

  // ---------- 各种覆盖界面 ----------
  function dim(ctx, a) { ctx.fillStyle = 'rgba(7,4,9,' + a + ')'; ctx.fillRect(0, 0, G.W, G.H); }
  const hero = { x: 0, y: 0, aim: -0.25, walk: 0, moving: false, capeX: 3, capeY: 0, weapons: ['pistol'], cur: 0, recoil: 0, dashT: 0, hurtFlash: 0 };

  G.drawMenu = function (ctx) {
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

    // 标题
    ctx.save();
    ctx.shadowColor = '#ff7a2a'; ctx.shadowBlur = 36 + Math.sin(t * 2) * 8;
    const tg = ctx.createLinearGradient(0, 60, 0, 170);
    tg.addColorStop(0, '#fff6e4'); tg.addColorStop(0.55, '#ffc98a'); tg.addColorStop(1, '#f07a2a');
    ctx.font = 'bold 118px ' + G.FONT_T; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = tg; ctx.fillText('烬渊', G.W / 2, 116);
    ctx.restore();
    divider(ctx, G.W / 2, 188, 170, '#ff9d4a');
    text(ctx, '向 下 三 层 · 直 抵 渊 心', G.W / 2, 210, 15, '#d8b494', 'center');

    // 第一步：选择设备
    text(ctx, '选择你的设备', G.W / 2, 244, 13, '#a89080', 'center');
    if (modeCard(ctx, G.W / 2 - 214, 258, 204, 66, '电脑端', '键盘 + 鼠标', 'pc', !G.touch.on)) G.touch.on = false;
    if (modeCard(ctx, G.W / 2 + 10, 258, 204, 66, '手机端', '触屏 · 请横屏', 'phone', G.touch.on)) G.touch.on = true;

    // 第二步：对应的操作方式
    panel(ctx, G.W / 2 - 270, 338, 540, 136, '#ff9d4a', 0.62);
    const rows = G.touch.on
      ? [G.motion.status === 'ok' ? ['倾斜设备', '移动（甩动可闪避）'] : ['左半屏拖动', '移动'], ['右半屏拖动', '瞄准并射击'], ['右半屏按住', '自动瞄准最近敌人'], ['「闪」按钮', '闪避（冲刺时无敌）'], ['点武器栏', '切换武器'], ['「E」按钮', '拾取 · 开箱 · 购买']]
      : [['W A S D', '移动'], ['鼠标 / 左键', '瞄准 · 射击'], ['空格', '闪避（冲刺时无敌）'], ['Q / 滚轮', '切换武器'], ['E', '拾取 · 开箱 · 购买'], ['Esc / M', '暂停 · 静音']];
    rows.forEach((r, i) => {
      const x = G.W / 2 - 250 + (i % 2) * 262, y = 362 + Math.floor(i / 2) * 40;
      ctx.font = 'bold 12px ' + G.FONT;
      const kw = ctx.measureText(r[0]).width + 16;
      ctx.fillStyle = '#3a2e30'; rr(ctx, x, y - 12, kw, 24, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(255,176,90,0.6)'; ctx.lineWidth = 1; ctx.stroke();
      text(ctx, r[0], x + kw / 2, y + 0.5, 12, '#ffcf9a', 'center', true);
      text(ctx, r[1], x + kw + 10, y + 0.5, 13, '#e0d6d0', 'left');
    });

    // 第三步：开始
    if (G.touch.on) {
      G.motionToggle(ctx, G.W / 2 - 170, 482, 340, 34);
      if (G.button(ctx, G.W / 2 - 120, 526, 240, 50, '开 始 远 征', true)) G.newRun();
      if (G.motion.status === 'ok') text(ctx, '以开始时的握持姿势为中立位，暂停再继续可重新校准', G.W / 2, 588, 11, '#9a8478', 'center');
    } else {
      if (G.button(ctx, G.W / 2 - 120, 490, 240, 54, '开 始 远 征', true)) G.newRun();
      text(ctx, '清空房间 · 收集武器 · 每层选择一项增益 · 击败三位守护者', G.W / 2, 570, 12, '#9a8478', 'center');
    }
  };

  // 设备选择卡片：返回本帧是否被点击
  function modeCard(ctx, x, y, w, h, title, sub, icon, sel) {
    const I = G.input, hover = I.mx >= x && I.mx <= x + w && I.my >= y && I.my <= y + h, col = sel ? '#ffb05a' : '#8a7e86';
    if (sel) { ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, '#ff8a3c', x + w / 2, y + h / 2, w * 0.6, 0.3); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, sel ? '#4a3426' : hover ? '#3a323c' : '#2a242e'); gr.addColorStop(1, sel ? '#2a1a12' : '#16121a');
    ctx.fillStyle = gr; rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = sel ? '#ffb05a' : hover ? '#fff' : 'rgba(255,255,255,0.16)'; ctx.lineWidth = sel ? 2.5 : 1; ctx.stroke();
    const ix = x + 40, iy = y + h / 2;
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    if (icon === 'pc') {
      rr(ctx, ix - 17, iy - 14, 34, 22, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ix, iy + 8); ctx.lineTo(ix, iy + 14); ctx.moveTo(ix - 10, iy + 15); ctx.lineTo(ix + 10, iy + 15); ctx.stroke();
      ctx.fillStyle = G.rgba(col, 0.25); ctx.fillRect(ix - 13, iy - 10, 26, 14);
    } else {
      rr(ctx, ix - 19, iy - 11, 38, 22, 5); ctx.stroke();
      ctx.fillStyle = G.rgba(col, 0.25); ctx.fillRect(ix - 13, iy - 7, 26, 14);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ix + 15.5, iy, 1.6, 0, TAU); ctx.fill();
    }
    text(ctx, title, x + 76, y + h / 2 - 10, 19, sel ? '#fff3e0' : '#c8bec4', 'left', true);
    text(ctx, sub, x + 76, y + h / 2 + 13, 12, sel ? '#ffcf9a' : '#8a8088', 'left');
    // 选中标记
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + w - 22, iy, 8, 0, TAU); ctx.stroke();
    if (sel) { ctx.fillStyle = '#ffb05a'; ctx.beginPath(); ctx.arc(x + w - 22, iy, 4.5, 0, TAU); ctx.fill(); }
    if (hover && I.clicked) { I.clicked = false; G.sfx('ui'); return true; }
    return false;
  }

  G.drawPause = function (ctx) {
    const g = G.game, T = G.touch.on, x = G.W / 2 - 110, h = 42;
    dim(ctx, 0.72);
    panel(ctx, G.W / 2 - 190, 50, 380, T ? 468 : 418, '#ff9d4a', 0.9);
    glowText(ctx, '暂 停', G.W / 2, 94, 42, '#ffe9c8', '#ff9d4a', true);
    divider(ctx, G.W / 2, 126, 110, '#ff9d4a');
    let y = 146;
    if (G.button(ctx, x, y, 220, h, '继续', true)) g.state = 'play';
    y += 50;
    if (G.button(ctx, x, y, 220, h, '重新开始')) G.newRun();
    y += 50;
    if (G.button(ctx, x, y, 106, h, G.audio.muted ? '声音 关' : '声音 开')) G.audio.muted = !G.audio.muted;
    if (G.button(ctx, x + 114, y, 106, h, G.audio.musicOn ? '音乐 开' : '音乐 关')) G.audio.musicOn = !G.audio.musicOn;
    y += 50;
    if (G.button(ctx, x, y, 220, h, T ? '操作：手机端' : '操作：电脑端')) G.touch.on = !G.touch.on;
    y += 50;
    if (T) { G.motionToggle(ctx, G.W / 2 - 170, y, 340, h); y += 50; }
    if (G.button(ctx, x, y, 220, h, '返回主菜单')) g.state = 'menu';
    y += 62;
    text(ctx, !T ? 'WASD 移动 · 鼠标瞄准射击 · 空格闪避 · Q 换枪 · E 互动' : G.motion.status === 'ok' ? '倾斜移动 · 甩动闪避 · 右半屏瞄准射击 · 继续后重新校准' : '左半屏移动 · 右半屏瞄准射击 · 「闪」闪避 · 点武器栏换枪', G.W / 2, y, 12, '#a89ea8', 'center');
    if (g.perksTaken.length) perkRow(ctx, g, T ? 552 : 510);
  };
  function perkRow(ctx, g, y) {
    const list = g.perksTaken, n = Math.min(list.length, 14), x0 = G.W / 2 - (n - 1) * 21;
    for (let i = 0; i < n; i++) {
      const k = list[i];
      ctx.save(); ctx.translate(x0 + i * 42, y);
      G.poly(ctx, 6, 18, Math.PI / 6); ctx.fillStyle = '#17131c'; ctx.fill(); ctx.strokeStyle = k.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      text(ctx, k.glyph, x0 + i * 42, y + 1, 16, k.color, 'center', true);
    }
  }

  G.drawPerk = function (ctx) {
    const g = G.game, I = G.input;
    dim(ctx, 0.8);
    glowText(ctx, '第 ' + g.floor + ' 层 · 肃清', G.W / 2, 78, 44, '#ffe9c8', '#ff9d4a', true);
    divider(ctx, G.W / 2, 112, 170, '#ff9d4a');
    text(ctx, '选择一项增益，然后前往下一层', G.W / 2, 136, 14, '#c8bcc0', 'center');
    const cw = 236, chh = 300, gap = 28, x0 = (G.W - cw * 3 - gap * 2) / 2, y = 172;
    g.perkChoices.forEach((k, i) => {
      const x = x0 + i * (cw + gap);
      const enter = G.clamp((g.stateT - i * 0.09) / 0.3, 0, 1), ease = 1 - Math.pow(1 - enter, 3);
      const hover = enter >= 1 && I.mx >= x && I.mx <= x + cw && I.my >= y && I.my <= y + chh;
      const yy = y + (1 - ease) * 60 - (hover ? 10 : 0);
      ctx.globalAlpha = ease;
      if (hover) { ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, k.color, x + cw / 2, yy + chh / 2, 230, 0.3); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      const bg = ctx.createLinearGradient(0, yy, 0, yy + chh);
      bg.addColorStop(0, hover ? '#3a3040' : '#2a232e'); bg.addColorStop(1, '#141018');
      ctx.fillStyle = bg; rr(ctx, x, yy, cw, chh, 12); ctx.fill();
      ctx.strokeStyle = hover ? k.color : 'rgba(255,255,255,0.14)'; ctx.lineWidth = hover ? 3 : 1; ctx.stroke();
      ctx.save(); rr(ctx, x, yy, cw, chh, 12); ctx.clip();
      const top = ctx.createLinearGradient(0, yy, 0, yy + 150);
      top.addColorStop(0, G.rgba(k.color, 0.3)); top.addColorStop(1, G.rgba(k.color, 0));
      ctx.fillStyle = top; ctx.fillRect(x, yy, cw, 150);
      if (hover) { const sx = x - 80 + ((g.time * 260) % (cw + 160)); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.moveTo(sx, yy); ctx.lineTo(sx + 40, yy); ctx.lineTo(sx - 20, yy + chh); ctx.lineTo(sx - 60, yy + chh); ctx.fill(); }
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, k.color, x + cw / 2, yy + 92, 70, 0.35 * ease); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = ease;
      ctx.save(); ctx.translate(x + cw / 2, yy + 92);
      G.poly(ctx, 6, 48, Math.PI / 6 + (hover ? Math.sin(g.time * 3) * 0.08 : 0)); ctx.fillStyle = '#0e0b12'; ctx.fill(); ctx.strokeStyle = k.color; ctx.lineWidth = 3; ctx.stroke();
      G.poly(ctx, 6, 40, Math.PI / 6); ctx.strokeStyle = G.rgba(k.color, 0.35); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      text(ctx, k.glyph, x + cw / 2, yy + 94, 44, k.color, 'center', true, true);
      text(ctx, k.name, x + cw / 2, yy + 176, 23, '#fff', 'center', true);
      divider(ctx, x + cw / 2, yy + 198, 56, k.color);
      wrap(ctx, k.desc, x + cw / 2, yy + 224, cw - 44, 21, 14, '#d0c8d0');
      ctx.fillStyle = hover ? '#f7a653' : '#3a343e'; rr(ctx, x + cw / 2 - 12, yy + chh - 34, 24, 22, 5); ctx.fill();
      text(ctx, String(i + 1), x + cw / 2, yy + chh - 22.5, 13, hover ? '#2a1204' : '#aaa', 'center', true);
      ctx.globalAlpha = 1;
      if (g.stateT > 0.5 && ((hover && I.clicked) || I.pressed['Digit' + (i + 1)])) { I.clicked = false; G.choosePerk(i); }
    });
  };

  function wrap(ctx, str, x, y, maxW, lh, size, color) {
    ctx.font = size + 'px ' + G.FONT;
    let line = '', row = 0;
    for (const chr of str) {
      if (ctx.measureText(line + chr).width > maxW) { text(ctx, line, x, y + row * lh, size, color, 'center'); line = ''; row++; }
      line += chr;
    }
    if (line) text(ctx, line, x, y + row * lh, size, color, 'center');
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
    text(ctx, win ? '烬渊之心已熄灭，你带着余温回到地面。' : '你倒在了第 ' + g.floor + ' 层 · ' + G.theme().name, G.W / 2, 178, 15, '#c8bcc0', 'center');
    panel(ctx, G.W / 2 - 230, 204, 460, 176, col, 0.8);
    const m = Math.floor(g.runTime / 60), s = Math.floor(g.runTime % 60);
    const rows = [['抵达层数', g.floor + ' / ' + G.MAX_FLOOR], ['击杀敌人', g.kills], ['获得金币', g.goldTotal], ['用时', m + ' 分 ' + (s < 10 ? '0' : '') + s + ' 秒'], ['承受伤害', g.dmgTaken]];
    rows.forEach((r, i) => {
      const ra = G.clamp((g.stateT - 0.6 - i * 0.08) / 0.25, 0, 1), y = 230 + i * 31;
      ctx.globalAlpha = ra * a;
      text(ctx, r[0], G.W / 2 - 200, y, 15, '#a89ea8', 'left');
      text(ctx, String(r[1]), G.W / 2 + 200, y, 16, '#fff', 'right', true);
      if (i < 4) { ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(G.W / 2 - 200, y + 15, 400, 1); }
    });
    ctx.globalAlpha = a;
    if (g.perksTaken.length) perkRow(ctx, g, 414);
    ctx.globalAlpha = 1;
    if (g.stateT > 0.8) {
      if (G.button(ctx, G.W / 2 - 215, 460, 205, 52, '再来一次', true)) G.newRun();
      if (G.button(ctx, G.W / 2 + 10, 460, 205, 52, '返回主菜单')) g.state = 'menu';
      if (!G.touch.on) text(ctx, '按 R 或回车立即重开', G.W / 2, 540, 12, '#8a8088', 'center');
    }
  };

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
