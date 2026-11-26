// 子弹、爆炸、粒子、飘字、掉落物
'use strict';
(function () {
  const G = window.G;
  const MAX_EB = 900, MAX_PART = 420, MAX_TEXT = 40;

  G.spawnBullet = function (o) {
    const g = G.game;
    const b = {
      x: o.x, y: o.y, vx: o.vx, vy: o.vy, r: o.r || 4, dmg: o.dmg || 1, crit: !!o.crit,
      life: o.life || 1.5, color: o.color || '#fff', bounce: o.bounce || 0, pierce: o.pierce || 0,
      homing: o.homing || 0, explode: o.explode || 0, lastHit: null, fx: o.fx || null
    };
    if (o.friendly) g.bullets.push(b);
    else if (g.ebullets.length < MAX_EB) g.ebullets.push(b);
    return b;
  };

  // 敌方射击的简写
  G.eshoot = function (x, y, ang, speed, dmg, o) {
    o = o || {};
    speed *= G.diff().bspd;
    return G.spawnBullet({
      x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg: dmg * G.game.dmgMul,
      r: o.r || 5, color: o.color || '#ff5d5d', life: o.life || 6, homing: o.homing || 0, friendly: false
    });
  };
  G.ering = function (x, y, n, speed, dmg, offset, o) {
    for (let i = 0; i < n; i++) G.eshoot(x, y, offset + i * Math.PI * 2 / n, speed, dmg, o);
  };

  function steer(b, tx, ty, rate, dt) {
    const sp = Math.hypot(b.vx, b.vy), cur = Math.atan2(b.vy, b.vx);
    const d = G.angDiff(Math.atan2(ty - b.y, tx - b.x), cur);
    const a = cur + G.clamp(d, -rate * dt, rate * dt);
    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
  }

  function stepList(list, dt, friendly) {
    const g = G.game, p = g.player, en = g.enemies;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      b.life -= dt;
      let dead = b.life <= 0;
      if (!dead) {
        if (b.homing) {
          if (friendly) {
            let best = null, bd = 320 * 320;
            for (const e of en) {
              if (e.spawnT > 0) continue;
              const d2 = (e.x - b.x) * (e.x - b.x) + (e.y - b.y) * (e.y - b.y);
              if (d2 < bd) { bd = d2; best = e; }
            }
            if (best) steer(b, best.x, best.y, b.homing, dt);
          } else steer(b, p.x, p.y, b.homing, dt);
        }
        const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
        if (G.pointSolid(nx, ny)) {
          if (b.bounce > 0) {
            b.bounce--; b.lastHit = null;
            const sx = G.pointSolid(nx, b.y), sy = G.pointSolid(b.x, ny);
            if (sx) b.vx = -b.vx;
            if (sy) b.vy = -b.vy;
            if (!sx && !sy) { b.vx = -b.vx; b.vy = -b.vy; }
            G.burst(b.x, b.y, b.color, 3, 80, 0.25, 2);
            if (friendly) G.sfx('bounce');
          } else dead = true;
        } else { b.x = nx; b.y = ny; }
      }
      if (!dead) {
        if (friendly) {
          for (let k = 0; k < en.length; k++) {
            const e = en[k];
            if (e.spawnT > 0 || e.dead || b.lastHit === e) continue;
            const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + b.r;
            if (dx * dx + dy * dy < rr * rr) {
              if (b.explode) { dead = true; break; }
              G.hurtEnemy(e, b.dmg, b.crit, b.vx * 0.25, b.vy * 0.25, b.fx);
              b.lastHit = e;
              if (b.pierce > 0) b.pierce--; else { dead = true; break; }
            }
          }
        } else if (p.dashT <= 0) {
          const dx = p.x - b.x, dy = p.y - b.y, rr = p.r + b.r - 3;
          if (dx * dx + dy * dy < rr * rr) {
            if (p.invuln <= 0) G.hurtPlayer(b.dmg);
            dead = true;
          }
        }
      }
      if (dead) {
        if (b.explode) G.explode(b.x, b.y, b.explode, b.dmg, friendly, b.crit, b.fx);
        else G.burst(b.x, b.y, b.color, 3, 70, 0.2, 2);
        list[i] = list[list.length - 1];
        list.pop();
      }
    }
  }
  G.updateBullets = function (dt) {
    stepList(G.game.bullets, dt, true);
    stepList(G.game.ebullets, dt, false);
  };

  G.explode = function (x, y, rad, dmg, friendly, crit, fx) {
    const g = G.game, p = g.player;
    g.effects.push({ type: 'boom', x, y, rad, t: 0, dur: 0.32, color: friendly ? '#ffc56b' : '#ff6a4a' });
    G.burst(x, y, friendly ? '#ffd58a' : '#ff8a5a', 14, 220, 0.45, 3);
    g.effects.push({ type: 'ring', x, y, rad: rad * 1.5, t: 0, dur: 0.4, color: '#ffffff' });
    G.stain(x, y, rad * 0.5, '#050304', 0.4);
    g.shake = Math.max(g.shake, 7);
    G.sfx('boom');
    G.rumble(0.45, 0.3, 140);
    if (friendly) {
      for (const e of g.enemies.slice()) {
        if (e.spawnT > 0 || e.dead) continue;
        const d = Math.hypot(e.x - x, e.y - y);
        if (d < rad + e.r) G.hurtEnemy(e, dmg, crit, (e.x - x) / (d || 1) * 160, (e.y - y) / (d || 1) * 160, fx);
      }
    } else if (Math.hypot(p.x - x, p.y - y) < rad + p.r) G.hurtPlayer(dmg);
  };

  // ---------- 粒子与飘字 ----------
  G.burst = function (x, y, color, n, speed, life, size) {
    const ps = G.game.particles;
    for (let i = 0; i < n && ps.length < MAX_PART; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: size * (0.6 + Math.random() * 0.8) });
    }
  };
  // 带描边的三角碎片（敌人死亡时飞散）
  G.shards = function (x, y, color, n, speed) {
    const ps = G.game.particles;
    for (let i = 0; i < n && ps.length < MAX_PART; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.65), life = 0.45 + Math.random() * 0.35;
      ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: 2.5 + Math.random() * 3.5, tri: true, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 18 });
    }
  };
  // 留在地面上的污渍 / 焦痕
  G.stain = function (x, y, r, color, a) {
    const st = G.game.stains;
    if (st.length >= 70) st.shift();
    st.push({ x, y, r, color, a, rot: Math.random() * 3.14 });
  };
  G.floatText = function (x, y, str, color, size) {
    const ts = G.game.texts;
    if (ts.length >= MAX_TEXT) ts.shift();
    ts.push({ x: x + G.rand(-6, 6), y, str, color: color || '#fff', size: size || 13, t: 0, dur: 0.7 });
  };
  G.updateFx = function (dt) {
    const g = G.game, ps = g.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i];
      q.life -= dt;
      if (q.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92;
      if (q.tri) q.rot += q.vr * dt;
    }
    for (let i = g.texts.length - 1; i >= 0; i--) {
      const t = g.texts[i];
      t.t += dt; t.y -= 34 * dt;
      if (t.t >= t.dur) g.texts.splice(i, 1);
    }
    for (let i = g.effects.length - 1; i >= 0; i--) {
      const e = g.effects[i];
      e.t += dt;
      if (e.t >= e.dur) g.effects.splice(i, 1);
    }
  };

  // ---------- 自动拾取的掉落物 ----------
  G.dropPickup = function (kind, x, y, val) {
    const a = Math.random() * Math.PI * 2, s = G.rand(60, 160);
    G.game.pickups.push({ kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, val, t: 0, r: 5 });
  };
  G.updatePickups = function (dt) {
    const g = G.game, p = g.player, list = g.pickups;
    const range = g.active ? 80 : 420;
    for (let i = list.length - 1; i >= 0; i--) {
      const k = list[i];
      k.t += dt;
      const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1;
      if (k.kind === 'health' && p.hp >= p.maxHp) { /* 满血时不吸附 */ }
      else if (k.t > 0.35 && d < range) {
        const pull = 900 * dt;
        k.vx += dx / d * pull; k.vy += dy / d * pull;
      }
      k.vx *= 0.9; k.vy *= 0.9;
      G.moveEntity(k, k.vx * dt, k.vy * dt);
      if (d < 18 && k.t > 0.2) {
        if (k.kind === 'coin') {
          const v = Math.max(1, Math.round(k.val * p.stats.goldMul));
          p.gold += v; g.goldTotal += v; G.sfx('coin');
        } else if (k.kind === 'energy') {
          p.energy = Math.min(p.maxEnergy, p.energy + k.val); G.sfx('orb');
        } else if (k.kind === 'health') {
          if (p.hp >= p.maxHp) continue;
          p.hp = Math.min(p.maxHp, p.hp + k.val); G.sfx('orb');
          G.floatText(p.x, p.y - 20, '+' + k.val, '#7dff9a');
        }
        list[i] = list[list.length - 1];
        list.pop();
      }
    }
  };
})();
