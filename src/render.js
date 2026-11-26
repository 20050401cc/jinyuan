// 世界渲染：地图 → 物体 → 光照暗幕 → 发光层（子弹/火焰/特效）→ 氛围
'use strict';
(function () {
  const G = window.G;
  const TAU = Math.PI * 2, OUT = '#140e14';

  // 字体见 i18n.js；maxW 给定时超宽的文字会自动缩小字号
  G.setFont = function (ctx, str, size, bold, title, maxW) {
    const wt = title && G.lang !== 'zh' ? '900 ' : bold ? 'bold ' : '', fam = title ? G.FONT_T : G.FONT;
    ctx.font = wt + size + 'px ' + fam;
    if (maxW) {
      const w = ctx.measureText(str).width;
      if (w > maxW) ctx.font = wt + Math.max(7, size * maxW / w).toFixed(1) + 'px ' + fam;
    }
  };
  G.text = function (ctx, str, x, y, size, color, align, bold, title, maxW) {
    str = G.tr(str);
    G.setFont(ctx, str, size, bold, title, maxW);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  };
  // 带深色描边的文字（世界内飘字、提示）
  G.textO = function (ctx, str, x, y, size, color, align) {
    str = G.tr(str);
    ctx.font = 'bold ' + size + 'px ' + G.FONT;
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,6,10,0.85)'; ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  };

  let vignette = null, redVig = null;
  G.resetHooks.push(() => { vignette = redVig = null; });
  function vig(inner, outer, color) {
    const c = G.mkCanvas(G.W, G.H), x = c.getContext('2d');
    const gr = x.createRadialGradient(G.W / 2, G.H / 2, inner, G.W / 2, G.H / 2, outer);
    gr.addColorStop(0, 'rgba(' + color + ',0)'); gr.addColorStop(1, 'rgba(' + color + ',0.75)');
    x.fillStyle = gr; x.fillRect(0, 0, G.W, G.H);
    return c;
  }

  function shadow(ctx, x, y, rx) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.38, 0, 0, TAU); ctx.fill();
  }

  function drawStains(ctx, g) {
    for (const s of g.stains) {
      ctx.globalAlpha = s.a; ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.62, s.rot, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s.x + s.r * 0.8, s.y + s.r * 0.2, s.r * 0.35, s.r * 0.25, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawItems(ctx, g, th) {
    for (const it of g.items) {
      const bob = Math.sin(g.time * 3 + it.x) * 3;
      ctx.save();
      ctx.translate(it.x, it.y);
      if (it.kind === 'portal') {
        ctx.fillStyle = '#07050a'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 22, 0, 0, TAU); ctx.fill();
        for (let i = 0; i < 4; i++) {
          const r = 30 - i * 6, a = g.time * (1.6 + i * 0.7) * (i % 2 ? -1 : 1) + i;
          ctx.strokeStyle = i % 2 ? '#ffffff' : th.accent; ctx.lineWidth = 3.5 - i * 0.5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(0, 0, r, a, a + 2.2); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, r, a + Math.PI, a + Math.PI + 2.2); ctx.stroke();
        }
        ctx.lineCap = 'butt';
        ctx.restore();
        continue;
      }
      if (it.price) {
        // 商店货架底座
        shadow(ctx, 0, 20, 18);
        ctx.beginPath(); ctx.moveTo(-13, 10); ctx.lineTo(13, 10); ctx.lineTo(16, 20); ctx.lineTo(-16, 20); ctx.closePath(); G.ink(ctx, '#4a4450', 2);
        ctx.fillStyle = '#6a6472'; ctx.fillRect(-13, 9, 26, 3);
      } else shadow(ctx, 0, 15, 14);
      if (it.kind === 'weapon') {
        ctx.translate(-13, bob - 2); ctx.rotate(-0.4);
        G.drawWeapon(ctx, it.wid, 1.5);
      } else if (it.kind === 'chest') {
        ctx.beginPath(); ctx.rect(-15, -3, 30, 17); G.ink(ctx, it.opened ? '#5a3c1c' : '#8a5a26', 2.2);
        ctx.fillStyle = it.opened ? '#8a6a30' : '#f0bb4e'; ctx.fillRect(-15, 4, 30, 3);
        ctx.fillRect(-10, -3, 3, 17); ctx.fillRect(7, -3, 3, 17);
        if (it.opened) {
          ctx.beginPath(); ctx.rect(-13, -7, 26, 6); G.ink(ctx, '#140c06', 2);
          ctx.beginPath(); ctx.moveTo(-15, -7); ctx.lineTo(-13, -17); ctx.lineTo(13, -17); ctx.lineTo(15, -7); ctx.closePath(); G.ink(ctx, '#6e4520', 2.2);
        } else {
          ctx.beginPath(); ctx.moveTo(-15, -3); ctx.quadraticCurveTo(-15, -16, 0, -16); ctx.quadraticCurveTo(15, -16, 15, -3); ctx.closePath(); G.ink(ctx, '#b47a2c', 2.2);
          ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-5, -11, 6, 2, -0.2, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.rect(-3.5, -6, 7, 8); G.ink(ctx, '#fff3c4', 1.6);
          ctx.fillStyle = OUT; ctx.fillRect(-1, -3, 2, 3);
        }
      } else {
        ctx.translate(0, bob - 4);
        if (it.item === 'heal') {
          ctx.beginPath(); ctx.rect(-3.5, -14, 7, 7); G.ink(ctx, '#e8e8f0', 1.8);
          ctx.beginPath(); ctx.arc(0, 2, 10, 0, TAU); G.ink(ctx, '#ff5d6c', 2);
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-4, -2, 3, 5, 0.5, 0, TAU); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.fillRect(-1.5, -2.5, 3, 10); ctx.fillRect(-5, 1, 10, 3);
        } else if (it.item === 'energy') {
          ctx.beginPath(); ctx.rect(-3, -15, 6, 4); G.ink(ctx, '#8a909c', 1.6);
          ctx.beginPath(); ctx.rect(-8, -11, 16, 23); G.ink(ctx, '#27313c', 2);
          ctx.fillStyle = '#6fe0ff'; ctx.fillRect(-5, -8, 10, 17);
          ctx.fillStyle = '#eafcff'; ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(-3, 1); ctx.lineTo(0, 1); ctx.lineTo(-1, 7); ctx.lineTo(3, -1); ctx.lineTo(0, -1); ctx.closePath(); ctx.fill();
        } else {
          G.poly(ctx, 6, 15, Math.PI / 6); G.ink(ctx, '#17131c', 2);
          ctx.strokeStyle = it.perk.color; ctx.lineWidth = 2; G.poly(ctx, 6, 11.5, Math.PI / 6); ctx.stroke();
          G.text(ctx, it.perk.glyph, 0, 1, 14, it.perk.color, 'center', true);
        }
      }
      ctx.restore();
    }
  }

  function drawPickups(ctx, g) {
    for (const k of g.pickups) {
      if (k.kind === 'coin') {
        const w = Math.abs(Math.cos(g.time * 6 + k.x)) * 4 + 1;
        ctx.beginPath(); ctx.ellipse(k.x, k.y, w, 5, 0, 0, TAU); G.ink(ctx, '#ffcf3e', 1.5);
        ctx.fillStyle = '#fff6c8'; ctx.fillRect(k.x - w * 0.35, k.y - 3, Math.max(1, w * 0.3), 4);
      } else if (k.kind === 'energy') {
        ctx.beginPath(); ctx.moveTo(k.x, k.y - 6); ctx.lineTo(k.x + 4.5, k.y); ctx.lineTo(k.x, k.y + 6); ctx.lineTo(k.x - 4.5, k.y); ctx.closePath(); G.ink(ctx, '#6fe0ff', 1.5);
        ctx.fillStyle = '#eafcff'; ctx.fillRect(k.x - 1, k.y - 3, 2, 3);
      } else {
        const s = 1 + Math.sin(g.time * 6 + k.y) * 0.1;
        ctx.save(); ctx.translate(k.x, k.y); ctx.scale(s, s);
        ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-9, -1, -5, -8, 0, -3); ctx.bezierCurveTo(5, -8, 9, -1, 0, 6); ctx.closePath(); G.ink(ctx, '#5dff8a', 1.5);
        ctx.restore();
      }
    }
  }

  function drawEnemies(ctx, g) {
    for (const e of g.enemies) {
      if (e.spawnT > 0) continue;
      const def = e.def;
      shadow(ctx, e.x, e.y + e.r * 0.85, e.r);
      ctx.save();
      ctx.translate(e.x, e.y);
      if (def.boss && e.alpha < 1) ctx.globalAlpha = Math.max(0.08, e.alpha);
      def.draw(ctx, e);
      ctx.restore();
    }
  }

  // 光照之后绘制：出生法阵、预警线、血条
  function drawEnemyOverlays(ctx, g) {
    for (const e of g.enemies) {
      const def = e.def;
      if (e.spawnT > 0) {
        const k = 1 - e.spawnT / (e.spawnMax || 1), R = e.r + 10;
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 0.55);
        ctx.strokeStyle = def.color; ctx.globalAlpha = 0.35 + k * 0.6; ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(0, 0, R, g.time * 4, g.time * 4 + TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(0, 0, R * k, 0, TAU); ctx.stroke();
        G.poly(ctx, 3, R * 0.8, -g.time * 3); ctx.stroke();
        ctx.restore();
        const gr = ctx.createLinearGradient(0, e.y - 46, 0, e.y);
        gr.addColorStop(0, G.rgba(def.color, 0)); gr.addColorStop(1, G.rgba(def.color, 0.5 * k));
        ctx.fillStyle = gr; ctx.fillRect(e.x - e.r * k, e.y - 46, e.r * 2 * k, 46);
        ctx.globalAlpha = 1;
        continue;
      }
      if ((e.type === 'gazer' && e.state === 'aim') || e.tele === 2) {
        const a = e.type === 'gazer' ? e.face : e.aimA, hit = G.raycast(e.x, e.y, a, 900), boss = def.boss;
        ctx.strokeStyle = boss ? 'rgba(255,80,50,0.3)' : 'rgba(255,90,110,0.28)'; ctx.lineWidth = boss ? 22 : 6;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(hit.x, hit.y); ctx.stroke();
        ctx.strokeStyle = boss ? 'rgba(255,220,180,0.8)' : 'rgba(255,200,210,0.85)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([10, 7]); ctx.lineDashOffset = -g.time * 90;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(hit.x, hit.y); ctx.stroke(); ctx.setLineDash([]);
      }
      if (e.tele === 1) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.5 + Math.sin(g.time * 30) * 0.3;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 12 + (g.time * 60) % 14, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (!def.boss && e.hp < e.maxhp) {
        const w = Math.max(22, e.r * 2), x = e.x - w / 2, y = e.y - e.r - 12;
        ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, w + 2, 5);
        ctx.fillStyle = '#ff5d6c'; ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxhp), 3);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxhp), 1);
      }
    }
  }

  // 发光层：火焰、子弹光晕、光束（加色混合）
  function drawGlowLayer(ctx, g, th) {
    const cam = g.cam, p = g.player;
    ctx.globalCompositeOperation = 'lighter';
    G.drawTorches(ctx, g, true);
    for (const it of g.items) {
      if (it.kind === 'chest' && it.opened) continue;
      const col = it.kind === 'portal' ? th.accent : it.kind === 'weapon' ? G.WEAPONS[it.wid].color : it.kind === 'chest' ? '#ffd86b' : it.item === 'heal' ? '#ff5d6c' : it.item === 'energy' ? '#6fe0ff' : it.perk.color;
      G.glow(ctx, col, it.x, it.y, it.kind === 'portal' ? 70 + Math.sin(g.time * 4) * 8 : 30, it.kind === 'portal' ? 0.6 : 0.3);
    }
    for (const k of g.pickups) G.glow(ctx, k.kind === 'coin' ? '#ffcf3e' : k.kind === 'energy' ? '#6fe0ff' : '#5dff8a', k.x, k.y, 12, 0.35);
    for (const b of g.bullets) G.glow(ctx, b.color, b.x, b.y, b.r * 4.2, 0.6);
    for (const e of g.enemies) {
      if (e.def.boss && e.spawnT <= 0) G.glow(ctx, e.def.color, e.x, e.y, e.r * 3 + Math.sin(g.time * 5) * 6, 0.28);
      if (e.burnT > 0) G.glow(ctx, '#ff7a2a', e.x, e.y, e.r * 2.4 + Math.sin(g.time * 18 + e.id) * 3, 0.7);
      if (e.slowT > 0) G.glow(ctx, '#9ad8ff', e.x, e.y, e.r * 2.2, 0.55);
    }
    if (p.beam) {
      const b = p.beam;
      ctx.globalAlpha = 0.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#3fd8ff'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      G.glow(ctx, '#7af0ff', b.x2, b.y2, 26 + Math.random() * 8, 0.9);
      G.glow(ctx, '#7af0ff', b.x1, b.y1, 16, 0.8);
      ctx.lineCap = 'butt';
    }
    if (p.muzzle > 0) G.glow(ctx, G.WEAPONS[p.weapons[p.cur]].color, p.x + Math.cos(p.aim) * 26, p.y + Math.sin(p.aim) * 26, 30 * p.muzzle + 8, 0.85);
    for (const q of g.particles) {
      if (q.tri) continue;
      ctx.globalAlpha = q.life / q.max; ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function drawBullets(ctx, g) {
    ctx.lineCap = 'round';
    for (const b of g.bullets) {
      const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp, L = Math.min(18, sp * 0.028);
      ctx.strokeStyle = b.color; ctx.lineWidth = b.r * 2;
      ctx.beginPath(); ctx.moveTo(b.x - ux * L, b.y - uy * L); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = b.r;
      ctx.beginPath(); ctx.moveTo(b.x - ux * L * 0.4, b.y - uy * L * 0.4); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    const cam = g.cam;
    for (const b of g.ebullets) {
      if (b.x < cam.x - 20 || b.x > cam.x + G.W + 20 || b.y < cam.y - 20 || b.y > cam.y + G.H + 20) continue;
      const sp = G.bulletSprite(b.color, b.r);
      ctx.drawImage(sp, Math.round(b.x - sp.R), Math.round(b.y - sp.R));
    }
    const p = g.player;
    if (p.beam) {
      const b = p.beam;
      ctx.lineCap = 'round'; ctx.strokeStyle = '#f2ffff'; ctx.lineWidth = 3 + Math.random() * 1.5;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); ctx.lineCap = 'butt';
    }
  }

  function drawFx(ctx, g) {
    for (const q of g.particles) {
      if (!q.tri) continue;
      ctx.globalAlpha = Math.min(1, q.life / q.max * 1.6);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.beginPath(); ctx.moveTo(-q.size, q.size * 0.7); ctx.lineTo(q.size, q.size * 0.4); ctx.lineTo(0, -q.size); ctx.closePath();
      ctx.fillStyle = q.color; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const e of g.effects) {
      const k = e.t / e.dur;
      if (k < 0) continue;
      if (e.type === 'boom') {
        ctx.globalCompositeOperation = 'lighter';
        G.glow(ctx, e.color, e.x, e.y, e.rad * (0.7 + k * 0.9), (1 - k) * 0.9);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.rad * (0.3 + k * 0.7), 0, TAU); ctx.stroke();
      } else if (e.type === 'ring') {
        ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = e.color; ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.rad * (0.2 + k * 0.8), 0, TAU); ctx.stroke();
      } else if (e.type === 'slash') {
        const p = g.player, a0 = e.ang - e.arc / 2, a1 = a0 + e.arc * Math.min(1, k * 2.2 + 0.25);
        ctx.globalAlpha = 1 - k; ctx.lineCap = 'round';
        ctx.strokeStyle = e.color; ctx.lineWidth = 18 * (1 - k) + 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, e.range - 14, a0, a1); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, e.range - 6, a0, a1); ctx.stroke(); ctx.lineCap = 'butt';
      } else if (e.type === 'ghost') {
        ctx.globalAlpha = (1 - k) * 0.45; ctx.fillStyle = '#35d0bd';
        ctx.beginPath(); ctx.arc(e.x, e.y, 11 * (1 - k * 0.3), 0, TAU); ctx.fill();
      } else if (e.type === 'bolt') {
        // 连锁电弧：每段折成锯齿
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(e.pts[0], e.pts[1]);
        for (let i = 2; i < e.pts.length; i += 2) {
          const x0 = e.pts[0], y0 = e.pts[1], x1 = e.pts[i], y1 = e.pts[i + 1];
          ctx.moveTo(x0, y0);
          for (let j = 1; j < 5; j++) ctx.lineTo(G.lerp(x0, x1, j / 5) + G.rand(-7, 7), G.lerp(y0, y1, j / 5) + G.rand(-7, 7));
          ctx.lineTo(x1, y1);
        }
        ctx.stroke();
      } else if (e.type === 'dust') {
        ctx.globalAlpha = (1 - k) * 0.35; ctx.fillStyle = '#d8cfc4';
        ctx.beginPath(); ctx.arc(e.x, e.y - k * 6, 3 + k * 6, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const t of g.texts) {
      const k = t.t / t.dur, s = t.size * (k < 0.15 ? 1 + (0.15 - k) * 4 : 1);
      ctx.globalAlpha = 1 - Math.pow(k, 3);
      G.textO(ctx, t.str, t.x, t.y, s, t.color, 'center');
    }
    ctx.globalAlpha = 1;
  }

  G.drawWorld = function (ctx) {
    const g = G.game, th = G.theme(), p = g.player;
    ctx.fillStyle = th.void; ctx.fillRect(0, 0, G.W, G.H);
    const sh = g.shake * G.settings.shake, sx = sh > 0.3 ? G.rand(-sh, sh) : 0, sy = sh > 0.3 ? G.rand(-sh, sh) : 0;
    const ox = Math.round(-g.cam.x + sx), oy = Math.round(-g.cam.y + sy);
    ctx.save();
    ctx.translate(ox, oy);
    G.drawMap(ctx, g);
    drawStains(ctx, g);
    G.drawDoors(ctx, g, th);
    G.drawTorches(ctx, g, false);
    drawItems(ctx, g, th);
    drawPickups(ctx, g);
    drawEnemies(ctx, g);
    // 新楼层：旅人从光柱中落下
    const drop = p.dropT > 0 ? Math.pow(p.dropT / 0.85, 2) * 320 : 0;
    shadow(ctx, p.x, p.y + 11, 11 * (1 - drop / 640));
    const blink = g.state === 'play' && p.invuln > 0 && p.invuln < 50 && p.dashT <= 0 && Math.sin(g.time * 40) > 0;
    if (g.state !== 'dead' && !drop) {
      ctx.globalAlpha = g.dying > 0 ? 0.4 + 0.6 * (g.dying / 1.3) : blink ? 0.42 : 1;
      G.drawPlayerSprite(ctx, p, g);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    G.drawLighting(ctx, g, th);

    ctx.save();
    ctx.translate(ox, oy);
    if (g.floor === 1 && !g.floorCard) {
      const r = g.dungeon.start;
      ctx.globalAlpha = G.clamp((g.time - (g.hintT0 || 0)) / 0.8, 0, 1);
      G.text(ctx, G.controlHints()[0], r.cx, r.cy - 96, 14, 'rgba(255,236,210,0.5)', 'center');
      G.text(ctx, G.controlHints()[1], r.cx, r.cy + 100, 14, 'rgba(255,236,210,0.5)', 'center');
      ctx.globalAlpha = 1;
    }
    drawGlowLayer(ctx, g, th);
    if (p.dropT > 0) {
      const k = p.dropT / 0.85, lg = ctx.createLinearGradient(0, p.y - 600, 0, p.y + 20);
      lg.addColorStop(0, 'rgba(255,226,184,0)'); lg.addColorStop(1, 'rgba(255,226,184,' + (0.45 * k).toFixed(3) + ')');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = lg; ctx.fillRect(p.x - 22 * k - 6, p.y - 600, 44 * k + 12, 620);
      G.glow(ctx, '#ffe2b8', p.x, p.y, 60, 0.5 * k); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(0, -Math.pow(k, 2) * 320); G.drawPlayerSprite(ctx, p, g); ctx.restore();
    }
    drawEnemyOverlays(ctx, g);
    drawBullets(ctx, g);
    drawFx(ctx, g);
    for (const it of g.items) if (it.price) G.textO(ctx, String(it.price), it.x + 5, it.y + 33, 12, p.gold >= it.price ? '#ffd86b' : '#b07a66', 'center');
    ctx.restore();

    G.drawMotes(ctx, g, th);
    ctx.drawImage(vignette || (vignette = vig(240, 640, '0,0,0')), 0, 0);
    const low = p.hp / p.maxHp;
    if (low < 0.3 && g.state === 'play') {
      ctx.globalAlpha = (0.3 - low) / 0.3 * (0.55 + Math.sin(g.time * 6) * 0.25);
      ctx.drawImage(redVig || (redVig = vig(200, 560, '200,20,40')), 0, 0);
      ctx.globalAlpha = 1;
    }
    // 倒下时画面逐渐褪色
    const ds = g.dying > 0 ? 1 - g.dying / 1.3 : g.state === 'dead' ? 1 : 0;
    if (ds > 0) {
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,' + (ds * 0.9).toFixed(3) + ')'; ctx.fillRect(0, 0, G.W, G.H);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (p.hurtFlash > 0) {
      ctx.fillStyle = 'rgba(255,40,60,' + (p.hurtFlash * 0.8).toFixed(3) + ')';
      ctx.fillRect(0, 0, G.W, G.H);
    }
  };
})();
