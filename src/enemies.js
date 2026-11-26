// 普通敌人：定义、AI、受伤与死亡
'use strict';
(function () {
  const G = window.G;
  const TAU = Math.PI * 2;

  // 朝目标移动；撞墙后短暂侧移绕开障碍
  function seek(e, tx, ty, sp, dt) {
    let a = Math.atan2(ty - e.y, tx - e.x);
    e.face = a;
    if (e.side > 0) { e.side -= dt; a += e.sideDir * 1.3; }
    const hit = G.moveEntity(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
    if (hit && e.side <= 0) { e.side = 0.5; e.sideDir = Math.random() < 0.5 ? -1 : 1; }
  }
  G.seek = seek;

  function poly(ctx, n, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + i * TAU / n;
      if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  }
  G.poly = poly;

  G.ENEMIES = {
    // 扑咬兽：靠近后蓄力冲撞
    lunger: {
      name: '扑咬兽', hp: 34, r: 12, cost: 2, touch: 14, color: '#ff6b4a',
      ai(e, dt, g, p, d, ang) {
        if (e.state === 'wind') {
          e.t -= dt;
          if (e.t <= 0) { e.state = 'dash'; e.t = 0.34; }
        } else if (e.state === 'dash') {
          e.t -= dt;
          const hit = G.moveEntity(e, Math.cos(e.face) * 430 * dt, Math.sin(e.face) * 430 * dt);
          if (e.t <= 0 || hit) { e.state = 'rest'; e.t = 0.7; }
        } else if (e.state === 'rest') {
          e.t -= dt;
          if (e.t <= 0) e.state = null;
        } else {
          seek(e, p.x, p.y, 88, dt);
          if (d < 175) { e.state = 'wind'; e.t = 0.45; e.face = ang; }
        }
      }
    },
    // 灯芯射手：保持距离，瞄准点射
    wick: {
      name: '灯芯射手', hp: 26, r: 11, cost: 2, touch: 8, color: '#ffc94a',
      ai(e, dt, g, p, d, ang) {
        if (d > 290) seek(e, p.x, p.y, 75, dt);
        else if (d < 170) seek(e, e.x * 2 - p.x, e.y * 2 - p.y, 80, dt);
        else seek(e, e.x + Math.cos(ang + 1.57 * e.dir) * 50, e.y + Math.sin(ang + 1.57 * e.dir) * 50, 55, dt);
        e.face = ang;
        e.t -= dt;
        if (e.t <= 0) {
          e.t = 1.5 + Math.random() * 0.5;
          if (Math.random() < 0.3) e.dir = -e.dir;
          G.eshoot(e.x, e.y, ang, 235, 10, { color: '#ffb84a' });
          if (g.floor >= 2) G.eshoot(e.x, e.y, ang + G.rand(-0.25, 0.25), 200, 10, { color: '#ffb84a' });
          G.sfx('eshoot');
        }
      }
    },
    // 孢子炮台：缓慢移动，周期性环形散射
    spore: {
      name: '孢子炮台', hp: 60, r: 15, cost: 3, touch: 10, color: '#7bd66a',
      ai(e, dt, g, p, d) {
        seek(e, p.x, p.y, 36, dt);
        e.t -= dt;
        if (e.t <= 0) {
          e.t = 2.5;
          e.n = (e.n || 0) + 1;
          G.ering(e.x, e.y, g.floor >= 2 ? 11 : 8, 150, 9, e.n % 2 ? 0 : 0.35, { color: '#a4ff7a' });
          G.sfx('eshoot');
        }
      }
    },
    // 爆燃虫：高速贴脸后引爆
    fuse: {
      name: '爆燃虫', hp: 20, r: 10, cost: 2, touch: 0, color: '#ff8f2e',
      ai(e, dt, g, p, d) {
        if (e.state === 'fuse') {
          e.t -= dt;
          if (e.t <= 0) { e.hp = 0; e.dead = true; e.selfBoom = true; G.explode(e.x, e.y, 72, 22 * g.dmgMul, false); G.onEnemyDeath(e); }
        } else {
          seek(e, p.x, p.y, 150, dt);
          if (d < 48) { e.state = 'fuse'; e.t = 0.5; }
        }
      }
    },
    // 巢母：远离玩家并不断产出幼体
    brood: {
      name: '巢母', hp: 95, r: 18, cost: 4, touch: 10, color: '#b06bff',
      ai(e, dt, g, p, d) {
        if (d < 230) seek(e, e.x * 2 - p.x, e.y * 2 - p.y, 60, dt);
        else if (d > 380) seek(e, p.x, p.y, 45, dt);
        e.t -= dt;
        if (e.t <= 0) {
          e.t = 3.4;
          let mites = 0;
          for (const o of g.enemies) if (o.type === 'mite') mites++;
          if (mites < 6) {
            for (let i = 0; i < 2; i++) G.spawnEnemy('mite', e.x + G.rand(-20, 20), e.y + G.rand(-20, 20), 0.4);
            G.burst(e.x, e.y, '#d6a8ff', 8, 120, 0.4, 3);
          }
        }
      }
    },
    // 幼体：脆弱但成群
    mite: {
      name: '幼体', hp: 10, r: 7, cost: 1, touch: 8, color: '#d19bff',
      ai(e, dt, g, p) {
        const wob = Math.sin(e.age * 6 + e.id) * 40;
        seek(e, p.x + Math.cos(e.id) * wob, p.y + Math.sin(e.id) * wob, 128, dt);
      }
    },
    // 凝视者：预警瞄准线后射出高速弹
    gazer: {
      name: '凝视者', hp: 40, r: 13, cost: 3, touch: 8, color: '#5ad6e6',
      ai(e, dt, g, p, d, ang) {
        if (e.state === 'aim') {
          e.t -= dt;
          if (e.t > 0.3) e.face = ang;
          if (e.t <= 0) {
            G.eshoot(e.x, e.y, e.face, 620, 18, { color: '#8af4ff', r: 6 });
            G.sfx('eshoot');
            e.state = null; e.t = 1.6 + Math.random();
          }
        } else {
          e.face = ang;
          seek(e, e.x + Math.cos(e.age * 0.7 + e.id) * 60, e.y + Math.sin(e.age * 0.9 + e.id) * 60, 40, dt);
          e.face = ang;
          e.t -= dt;
          if (e.t <= 0) { e.state = 'aim'; e.t = 1.0; }
        }
      }
    }
  };

  let nextId = 1;
  G.spawnEnemy = function (type, x, y, spawnT) {
    const g = G.game, def = G.ENEMIES[type];
    const mul = def.boss ? 1 : 1 + 0.4 * (g.floor - 1);
    const e = {
      id: nextId++, type, def, x, y, r: def.r, hp: def.hp * mul, maxhp: def.hp * mul,
      t: 0.6 + Math.random() * 1.2, state: null, face: 0, age: Math.random() * 10, flash: 0,
      spawnT: spawnT || 0, spawnMax: spawnT || 0, kx: 0, ky: 0, side: 0, sideDir: 1, dir: Math.random() < 0.5 ? -1 : 1, dead: false
    };
    if (G.collides(x, y, e.r)) { const s = G.randomSpot(g.active || g.room, 60); e.x = s.x; e.y = s.y; }
    g.enemies.push(e);
    return e;
  };

  G.hurtEnemy = function (e, dmg, crit, kx, ky) {
    if (e.dead || e.spawnT > 0) return;
    const g = G.game;
    e.hp -= dmg; e.flash = 0.09;
    if (!e.def.boss) { e.kx += kx || 0; e.ky += ky || 0; }
    g.dmgDealt += dmg;
    if (G.settings.dmgNum && (dmg >= 3 || Math.random() < 0.3)) G.floatText(e.x, e.y - e.r - 4, String(Math.max(1, Math.round(dmg))), crit ? '#ffe14a' : '#fff', crit ? 16 : 12);
    G.sfx('hit');
    if (e.hp <= 0) { e.dead = true; G.onEnemyDeath(e); }
  };

  G.onEnemyDeath = function (e) {
    const g = G.game, p = g.player, def = e.def;
    g.kills++;
    G.ach.ev('kill');
    G.sfx('kill');
    G.burst(e.x, e.y, def.color, def.boss ? 60 : 10, def.boss ? 380 : 190, def.boss ? 0.9 : 0.45, def.boss ? 5 : 3);
    G.shards(e.x, e.y, def.color, def.boss ? 26 : e.type === 'mite' ? 3 : 7, def.boss ? 420 : 230);
    g.effects.push({ type: 'ring', x: e.x, y: e.y, rad: e.r * 3, t: 0, dur: 0.3, color: def.color });
    G.stain(e.x, e.y + e.r * 0.5, e.r * (def.boss ? 2.2 : 1.1), G.shade(def.color, -0.72), 0.5);
    if (def.boss) { G.onBossDeath(e); return; }
    const coins = e.type === 'mite' ? (Math.random() < 0.4 ? 1 : 0) : G.randi(1, 3);
    for (let i = 0; i < coins; i++) G.dropPickup('coin', e.x, e.y, 1);
    if (Math.random() < 0.3) G.dropPickup('energy', e.x, e.y, 8);
    if (p.stats.killEnergy) p.energy = Math.min(p.maxEnergy, p.energy + p.stats.killEnergy);
    if (p.stats.killHeal && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.stats.killHeal);
    // 被击杀的爆燃虫会炸伤周围的敌人
    if (e.type === 'fuse' && !e.selfBoom) G.explode(e.x, e.y, 60, 30, true, false);
  };

  G.updateEnemies = function (dt) {
    const g = G.game, p = g.player, list = g.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      e.age += dt; e.flash -= dt;
      if (e.spawnT > 0) { e.spawnT -= dt; continue; }
      if (e.dead) continue;
      if (e.kx || e.ky) {
        G.moveEntity(e, e.kx * dt, e.ky * dt);
        const f = Math.pow(0.002, dt);
        e.kx *= f; e.ky *= f;
        if (Math.abs(e.kx) + Math.abs(e.ky) < 4) e.kx = e.ky = 0;
      }
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
      e.def.ai(e, dt, g, p, d, Math.atan2(dy, dx));
      if (!e.dead && e.def.touch && d < e.r + p.r - 2) G.hurtPlayer(e.def.touch * g.dmgMul);
    }
    // 互相推开，避免重叠成一团
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.spawnT > 0 || a.def.boss) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.spawnT > 0 || b.def.boss) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d < min && d > 0.01) {
          const push = (min - d) * 0.5, ux = dx / d, uy = dy / d;
          G.moveEntity(a, -ux * push, -uy * push);
          G.moveEntity(b, ux * push, uy * push);
        }
      }
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].dead) list.splice(i, 1);
  };
})();
