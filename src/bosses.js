// 三个 Boss：按血量分三阶段，每阶段从招式表里轮换弹幕
'use strict';
(function () {
  const G = window.G;
  const TAU = Math.PI * 2;

  function ev(e, key, iv, dt) {
    e[key] += dt;
    if (e[key] >= iv) { e[key] -= iv; return true; }
    return false;
  }

  function bossAI(e, dt, g, p, d, ang) {
    const def = e.def, frac = e.hp / e.maxhp;
    if (e.tele !== 2) e.face = ang;
    const ph = frac > 0.66 ? 0 : frac > 0.33 ? 1 : 2;
    if (ph !== e.phase) {
      e.phase = ph; e.atk = null; e.rest = 1.0; e.tele = 0; e.alpha = 1;
      g.banner = { text: ph === 1 ? '第二阶段' : '最终阶段', t: 1.4, small: true };
      const L = G.BOSS_LINES[e.type];
      if (L) G.say(L.phase[ph - 1]);
      g.shake = 12;
      G.sfx('phase');
      G.burst(e.x, e.y, def.color, 30, 300, 0.6, 4);
      g.ebullets.length = 0;
    }
    if (e.rest > 0) {
      e.rest -= dt;
      if (def.drift) G.seek(e, p.x, p.y, def.drift, dt);
      return;
    }
    if (!e.atk) {
      const list = def.phases[ph];
      let nm = G.pick(list), guard = 0;
      while (nm === e.lastAtk && guard++ < 8) nm = G.pick(list);
      e.atk = e.lastAtk = nm;
      e.at = 0; e.acc = 0; e.acc2 = 0; e.n = 0; e.aimA = ang; e.tele = 0;
      e.spinDir = Math.random() < 0.5 ? -1 : 1;
    }
    e.at += dt;
    if (def.atks[e.atk](e, dt, g, p, d, ang)) { e.atk = null; e.rest = def.rest[ph]; e.tele = 0; }
  }

  // ---------- 第一层：熔炉守卫 ----------
  const warden = {
    name: '熔炉守卫', boss: true, hp: 1300, r: 30, touch: 18, color: '#ff7a3a', drift: 45,
    rest: [0.9, 0.7, 0.45],
    phases: [['fan', 'ring'], ['fan', 'spiral', 'charge', 'ring'], ['spiral', 'charge', 'ring', 'summon', 'fan']],
    atks: {
      fan(e, dt, g, p, d, ang) {
        G.seek(e, p.x, p.y, 55, dt);
        if (ev(e, 'acc', 0.55, dt)) {
          const n = e.phase ? 7 : 5;
          for (let i = 0; i < n; i++) G.eshoot(e.x, e.y, ang + (i - (n - 1) / 2) * 0.2, 225, 12, { color: '#ff9a4a' });
          G.sfx('eshoot');
        }
        return e.at > 2.4;
      },
      ring(e, dt) {
        e.tele = e.at < 0.5 ? 1 : 0;
        if (e.at > 0.5 && ev(e, 'acc', 0.45, dt)) {
          G.ering(e.x, e.y, 18, 170, 12, e.n * 0.17, { color: '#ffb36a' });
          e.n++; G.sfx('eshoot');
        }
        return e.n >= 2 + e.phase;
      },
      spiral(e, dt) {
        if (ev(e, 'acc', 0.075, dt)) {
          const arms = 2 + e.phase;
          e.n += 0.2 * e.spinDir;
          for (let i = 0; i < arms; i++) G.eshoot(e.x, e.y, e.n + i * TAU / arms, 185, 11, { color: '#ffd06a' });
        }
        return e.at > 2.8;
      },
      charge(e, dt, g, p, d, ang) {
        if (e.at < 0.65) {
          e.tele = 2;
          if (e.at < 0.45) e.aimA = ang;
          e.face = e.aimA;
        } else {
          e.tele = 0;
          const hit = G.moveEntity(e, Math.cos(e.aimA) * 540 * dt, Math.sin(e.aimA) * 540 * dt);
          if (hit || e.at > 1.25) {
            G.ering(e.x, e.y, 14, 200, 12, Math.random(), { color: '#ffb36a' });
            g.shake = 10; G.sfx('boom');
            return true;
          }
        }
        return false;
      },
      summon(e, dt) {
        if (!e.n) {
          e.n = 1;
          for (let i = 0; i < 2; i++) G.spawnEnemy('fuse', e.x + G.rand(-50, 50), e.y + G.rand(-50, 50), 0.6);
        }
        return e.at > 0.9;
      }
    },
    ai: bossAI
  };

  // ---------- 第二层：虚空织者 ----------
  const weaver = {
    name: '虚空织者', boss: true, hp: 2000, r: 26, touch: 16, color: '#58c8ff', drift: 0,
    rest: [0.8, 0.6, 0.4],
    phases: [['cross', 'gapring', 'blink'], ['cross', 'orbs', 'gapring', 'blink', 'volley'], ['cross', 'orbs', 'volley', 'gapring', 'blink']],
    atks: {
      blink(e, dt, g) {
        if (e.at < 0.3) e.alpha = 1 - e.at / 0.3;
        else if (!e.n) {
          e.n = 1;
          const s = G.randomSpot(g.active || g.room, 170);
          e.x = s.x; e.y = s.y;
          G.burst(e.x, e.y, '#9ae0ff', 14, 200, 0.4, 3);
          if (e.phase >= 1) G.ering(e.x, e.y, 12, 190, 11, Math.random(), { color: '#8ad6ff' });
          if (e.phase === 2) for (let i = 0; i < 2; i++) G.spawnEnemy('mite', e.x + G.rand(-30, 30), e.y + G.rand(-30, 30), 0.4);
        } else e.alpha = Math.min(1, (e.at - 0.3) / 0.3);
        if (e.at > 0.65) { e.alpha = 1; return true; }
        return false;
      },
      cross(e, dt) {
        if (ev(e, 'acc', 0.095, dt)) {
          const arms = e.phase === 2 ? 6 : 4;
          e.n += 0.055 * e.spinDir;
          for (let i = 0; i < arms; i++) G.eshoot(e.x, e.y, e.n + i * TAU / arms, 205, 11, { color: '#6ad0ff' });
        }
        return e.at > 3.1;
      },
      gapring(e, dt, g, p, d, ang) {
        if (ev(e, 'acc', 0.7, dt)) {
          const n = 30, gap = Math.round(((ang % TAU + TAU) % TAU) / TAU * n) + G.randi(-2, 2);
          for (let i = 0; i < n; i++) {
            const k = ((i - gap) % n + n) % n;
            if (k <= 1 || k >= n - 1 || (k >= 14 && k <= 16)) continue;
            G.eshoot(e.x, e.y, i * TAU / n, 135, 11, { color: '#b49bff' });
          }
          e.n++; G.sfx('eshoot');
        }
        return e.n >= 3 + (e.phase ? 1 : 0);
      },
      orbs(e, dt) {
        if (!e.n) {
          e.n = 1;
          const k = e.phase === 2 ? 5 : 3;
          for (let i = 0; i < k; i++) G.eshoot(e.x, e.y, i * TAU / k + Math.random(), 150, 13, { color: '#ff7ad1', r: 8, homing: 1.7, life: 4.5 });
          G.sfx('eshoot');
        }
        return e.at > 1.3;
      },
      volley(e, dt, g, p, d, ang) {
        if (ev(e, 'acc', 0.32, dt)) {
          for (let i = -1; i <= 1; i++) G.eshoot(e.x, e.y, ang + i * 0.11, 330, 12, { color: '#8af4ff' });
          e.n++; G.sfx('eshoot');
        }
        return e.n >= 5;
      }
    },
    ai: bossAI
  };

  // ---------- 第三层：烬渊之心 ----------
  const heart = {
    name: '烬渊之心', boss: true, hp: 2900, r: 34, touch: 20, color: '#d05bff', drift: 0,
    rest: [0.8, 0.6, 0.4],
    phases: [['petal', 'nova', 'lance'], ['petal', 'twin', 'nova', 'lance', 'brood'], ['twin', 'rain', 'nova', 'lance', 'petal', 'brood']],
    atks: {
      petal(e, dt) {
        if (ev(e, 'acc', 0.1, dt)) {
          const k = e.phase ? 6 : 5, base = Math.sin(e.at * 2.2) * 1.1 * e.spinDir;
          for (let i = 0; i < k; i++) G.eshoot(e.x, e.y, base + i * TAU / k, 195, 12, { color: '#ff8ae0' });
        }
        return e.at > 3.2;
      },
      twin(e, dt) {
        if (ev(e, 'acc', 0.085, dt)) {
          e.n += 0.17;
          for (let i = 0; i < 2; i++) {
            G.eshoot(e.x, e.y, e.n + i * Math.PI, 175, 12, { color: '#c08aff' });
            G.eshoot(e.x, e.y, -e.n * 1.2 + i * Math.PI + 0.5, 215, 12, { color: '#ff8ae0' });
          }
        }
        return e.at > 3.2;
      },
      nova(e, dt) {
        e.tele = e.at < 0.5 ? 1 : 0;
        if (e.at > 0.5 && ev(e, 'acc', 0.5, dt)) {
          G.ering(e.x, e.y, 24, 125 + e.n * 22, 12, e.n % 2 ? TAU / 48 : 0, { color: '#ffb36a' });
          e.n++; G.sfx('eshoot');
        }
        return e.n >= 3 + e.phase;
      },
      lance(e, dt, g, p, d, ang) {
        const t = e.at % 1.1;
        if (t < 0.5) { e.tele = 2; e.aimA = ang; e.face = ang; e.acc = 0; }
        else {
          e.tele = 0;
          if (ev(e, 'acc', 0.05, dt)) { G.eshoot(e.x, e.y, e.aimA + G.rand(-0.04, 0.04), 440, 13, { color: '#fff08a' }); G.sfx('eshoot'); }
        }
        return e.at > 1.1 * (2 + e.phase);
      },
      brood(e, dt) {
        if (!e.n) {
          e.n = 1;
          for (let i = 0; i < 3; i++) G.spawnEnemy('mite', e.x + G.rand(-60, 60), e.y + G.rand(-60, 60), 0.5);
          G.spawnEnemy('gazer', e.x + G.rand(-90, 90), e.y + G.rand(-90, 90), 0.7);
        }
        return e.at > 1.0;
      },
      rain(e, dt, g, p) {
        if (ev(e, 'acc', 0.11, dt)) {
          const a = Math.random() * TAU, x = p.x + Math.cos(a) * 290, y = p.y + Math.sin(a) * 290;
          if (!G.pointSolid(x, y)) G.eshoot(x, y, a + Math.PI + G.rand(-0.25, 0.25), 150, 12, { color: '#c08aff', life: 4 });
        }
        return e.at > 2.8;
      }
    },
    ai: bossAI
  };

  G.ENEMIES.boss1 = warden;
  G.ENEMIES.boss2 = weaver;
  G.ENEMIES.boss3 = heart;
  G.BOSS_COUNT = 3;

  G.spawnBoss = function (room) {
    const g = G.game;
    const e = G.spawnEnemy('boss' + Math.min(g.floor, 3), room.cx, room.cy, 1.5);
    e.phase = 0; e.rest = 0.8; e.atk = null; e.lastAtk = null; e.tele = 0; e.alpha = 1; e.aimA = 0;
    e.at = 0; e.acc = 0; e.acc2 = 0; e.n = 0; e.spinDir = 1;
    g.boss = e;
    g.dmgAtBoss = g.dmgTaken;
    g.banner = null;
    G.bossIntro(e);
    G.sfx('phase');
  };

  G.onBossDeath = function (e) {
    G.ach.ev('boss', e);
    G.rumble(1, 1, 600);
    const g = G.game, room = g.active || g.room;
    g.boss = null;
    g.ebullets.length = 0;
    for (const o of g.enemies) if (o !== e && !o.dead) { o.dead = true; G.burst(o.x, o.y, o.def.color, 8, 160, 0.4, 3); }
    g.shake = 18;
    G.sfx('boom');
    // 击破演出：慢动作、白闪、三重冲击波
    g.slow = { t: 1.2, k: 0.22 }; g.flash = 0.85; g.sub = null;
    g.effects.push({ type: 'boom', x: e.x, y: e.y, rad: 160, t: 0, dur: 0.6, color: e.def.color });
    for (let i = 0; i < 3; i++) g.effects.push({ type: 'ring', x: e.x, y: e.y, rad: 160 + i * 110, t: -i * 0.12, dur: 0.8 + i * 0.15, color: i === 1 ? '#ffffff' : e.def.color });
    G.burst(e.x, e.y, '#ffffff', 30, 420, 0.9, 3);
    for (let i = 0; i < 24; i++) G.dropPickup('coin', e.x, e.y, 2);
    for (let i = 0; i < 5; i++) G.dropPickup('energy', e.x, e.y, 15);
    G.dropPickup('health', e.x, e.y, 30);
    room.cleared = true; room.locked = false; g.active = null;
    if (g.floor >= G.MAX_FLOOR) { g.winT = 2.6; g.banner = { text: '烬渊归于沉寂', t: 2.6 }; }
    else {
      g.items.push({ kind: 'portal', x: room.cx, y: room.cy, price: 0 });
      g.banner = { text: '传送门已开启', t: 2.2, small: true };
      G.sfx('portal');
    }
  };
})();
