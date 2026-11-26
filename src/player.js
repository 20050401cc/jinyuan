// 玩家：移动、闪避、三条资源、射击、互动
'use strict';
(function () {
  const G = window.G;

  G.createPlayer = function () {
    return {
      x: 0, y: 0, r: 11, aim: 0,
      hp: 100, maxHp: 100, shield: 50, maxShield: 50, energy: 200, maxEnergy: 200,
      gold: 0, weapons: ['pistol', null], cur: 0,
      cd: 0, invuln: 0, shieldT: 0, dashT: 0, dashCd: 0, dvx: 0, dvy: 0, ghostT: 0,
      emptyT: 0, recoil: 0, muzzle: 0, moving: false, capeX: 0, capeY: 0, stepT: 0, beam: null, near: null, walk: 0, hurtFlash: 0,
      stats: {
        dmg: 1, rate: 1, speed: 1, crit: 0.05, pierce: 0, multishot: 0, costMul: 1, bulletSpeed: 1,
        shieldDelay: 3.5, shieldRate: 14, dashCd: 1.1, killEnergy: 0, killHeal: 0, thorns: false, goldMul: 1
      }
    };
  };

  G.updatePlayer = function (dt) {
    const g = G.game, p = g.player, I = G.input, K = I.keys, s = p.stats;
    p.aim = Math.atan2(I.my + g.cam.y - p.y, I.mx + g.cam.x - p.x);

    let mx = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
    let my = (K.KeyS || K.ArrowDown ? 1 : 0) - (K.KeyW || K.ArrowUp ? 1 : 0);
    let ml = Math.hypot(mx, my);
    if (ml) { mx /= ml; my /= ml; }
    if (G.touch.mvx || G.touch.mvy) { mx = G.touch.mvx; my = G.touch.mvy; ml = 1; }
    if (G.pad.mvx || G.pad.mvy) { mx = G.pad.mvx; my = G.pad.mvy; ml = 1; }

    p.dashCd -= dt; p.invuln -= dt; p.cd -= dt; p.emptyT -= dt; p.hurtFlash -= dt;
    p.recoil = Math.max(0, p.recoil - dt * 8);
    p.muzzle = Math.max(0, p.muzzle - dt * 14);
    p.moving = ml > 0 || p.dashT > 0;
    const cvx = p.dashT > 0 ? p.dvx / 640 * 9 : mx * 5, cvy = p.dashT > 0 ? p.dvy / 640 * 9 : my * 5, ck = 1 - Math.exp(-12 * dt);
    p.capeX += (cvx - p.capeX) * ck; p.capeY += (cvy - p.capeY) * ck;
    if (p.beam) { p.beam.t -= dt; if (p.beam.t <= 0) p.beam = null; }

    if (p.dashT > 0) {
      p.dashT -= dt;
      G.moveEntity(p, p.dvx * dt, p.dvy * dt);
      p.ghostT -= dt;
      if (p.ghostT <= 0) { p.ghostT = 0.03; g.effects.push({ type: 'ghost', x: p.x, y: p.y, t: 0, dur: 0.22 }); }
    } else {
      if (I.pressed.Space && p.dashCd <= 0) {
        const dx = ml ? mx : Math.cos(p.aim), dy = ml ? my : Math.sin(p.aim);
        p.dashT = 0.17; p.dvx = dx * 640; p.dvy = dy * 640;
        p.dashCd = s.dashCd; p.invuln = Math.max(p.invuln, 0.24);
        G.sfx('dash');
        G.ach.ev('dash');
        for (let i = 0; i < 5; i++) g.effects.push({ type: 'dust', x: p.x + G.rand(-8, 8), y: p.y + 8 + G.rand(-4, 4), t: 0, dur: 0.4 });
      } else if (ml) {
        const sp = 195 * s.speed;
        G.moveEntity(p, mx * sp * dt, my * sp * dt);
        p.walk += dt * 13;
        p.stepT -= dt;
        if (p.stepT <= 0) { p.stepT = 0.2; g.effects.push({ type: 'dust', x: p.x - mx * 6, y: p.y + 10, t: 0, dur: 0.3 }); }
      }
    }

    // 护盾：一段时间未受伤后自动恢复；能量有微量自然回复
    p.shieldT -= dt;
    if (p.shieldT <= 0 && p.shield < p.maxShield) p.shield = Math.min(p.maxShield, p.shield + s.shieldRate * dt);
    if (p.energy < p.maxEnergy) p.energy = Math.min(p.maxEnergy, p.energy + 1.5 * dt);

    if (p.weapons[1]) {
      if (I.pressed.KeyQ || I.wheel) { p.cur ^= 1; p.cd = Math.max(p.cd, 0.12); G.sfx('ui'); }
      if (I.pressed.Digit1 && p.cur !== 0) { p.cur = 0; G.sfx('ui'); }
      if (I.pressed.Digit2 && p.cur !== 1) { p.cur = 1; G.sfx('ui'); }
    }
    if (I.down && p.cd <= 0 && p.dashT <= 0) G.fireWeapon(p);

    // 最近的可互动物
    p.near = null;
    let bd = 48;
    for (const it of g.items) {
      if (it.kind === 'chest' && it.opened) continue;
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      if (d < bd) { bd = d; p.near = it; }
    }
    if (I.pressed.KeyE && p.near) G.interact(p.near);
  };

  G.hurtPlayer = function (dmg) {
    const g = G.game, p = g.player;
    if (g.state !== 'play' || p.invuln > 0 || p.dashT > 0 || G.debug.god) return;
    dmg = Math.round(dmg);
    g.dmgTaken += dmg;
    G.rumble(0.7, 0.9, 160);
    const abs = Math.min(p.shield, dmg);
    p.shield -= abs;
    p.hp -= dmg - abs;
    p.invuln = 0.5; p.shieldT = p.stats.shieldDelay; p.hurtFlash = 0.25;
    g.shake = Math.max(g.shake, dmg - abs > 0 ? 9 : 5);
    G.sfx('hurt');
    G.burst(p.x, p.y, dmg - abs > 0 ? '#ff5d6c' : '#8fb7ff', 8, 160, 0.35, 3);
    if (p.stats.thorns) {
      const off = Math.random() * 6.28;
      for (let i = 0; i < 12; i++) {
        const a = off + i * Math.PI / 6;
        G.spawnBullet({ friendly: true, x: p.x, y: p.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, dmg: 16 * p.stats.dmg, color: '#8fb7ff', life: 0.8 });
      }
    }
    if (p.hp <= 0) { p.hp = 0; G.endRun(false); }
  };

  // ---------- 互动：武器、宝箱、商店、传送门 ----------
  G.takeWeapon = function (it) {
    const g = G.game, p = g.player;
    if (!p.weapons[1]) {
      p.weapons[1] = it.wid; p.cur = 1;
      g.items.splice(g.items.indexOf(it), 1);
    } else {
      const old = p.weapons[p.cur];
      p.weapons[p.cur] = it.wid;
      it.wid = old; it.price = 0;
    }
    p.cd = 0.2;
    G.sfx('pick');
    G.ach.ev('weapon', p.weapons[p.cur]);
    G.floatText(p.x, p.y - 26, G.WEAPONS[p.weapons[p.cur]].name, '#fff', 14);
  };

  G.randomWeapon = function () {
    const p = G.game.player;
    const pool = G.WEAPON_IDS.filter(id => id !== 'pistol' && p.weapons.indexOf(id) < 0 && !G.game.items.some(it => it.wid === id));
    return G.pick(pool.length ? pool : G.WEAPON_IDS.filter(id => id !== 'pistol'));
  };

  G.interact = function (it) {
    const g = G.game, p = g.player;
    if (it.price) {
      if (p.gold < it.price) { G.floatText(p.x, p.y - 22, '金币不足', '#ffcf6b'); G.sfx('empty'); return; }
      p.gold -= it.price;
      G.ach.ev('buy');
    }
    if (it.kind === 'weapon') {
      G.takeWeapon(it);
    } else if (it.kind === 'chest') {
      it.opened = true;
      G.ach.ev('chest');
      G.sfx('pick');
      G.burst(it.x, it.y, '#ffd86b', 18, 200, 0.5, 3);
      g.items.push({ kind: 'weapon', wid: G.randomWeapon(), x: it.x, y: it.y + 40, price: 0 });
      for (let i = 0; i < 8; i++) G.dropPickup('coin', it.x, it.y, 2);
      for (let i = 0; i < 3; i++) G.dropPickup('energy', it.x, it.y, 15);
    } else if (it.kind === 'goods') {
      if (it.item === 'heal') { p.hp = Math.min(p.maxHp, p.hp + 40); G.floatText(p.x, p.y - 22, '+40 生命', '#7dff9a'); }
      else if (it.item === 'energy') { p.energy = p.maxEnergy; G.floatText(p.x, p.y - 22, '能量已充满', '#6fe0ff'); }
      else if (it.item === 'perk') { G.applyPerk(it.perk); G.floatText(p.x, p.y - 22, it.perk.name, '#ffd86b', 14); }
      G.sfx('perk');
      g.items.splice(g.items.indexOf(it), 1);
    } else if (it.kind === 'portal') {
      G.sfx('portal');
      G.openPerkChoice();
    }
  };

  G.itemLabel = function (it) {
    const price = it.price ? '（' + it.price + ' 金币）' : '';
    if (it.kind === 'weapon') return (it.price ? '购买 ' : '拾取 ') + G.WEAPONS[it.wid].name + price;
    if (it.kind === 'chest') return '打开宝箱';
    if (it.kind === 'portal') return '进入传送门';
    if (it.item === 'heal') return '购买 生命药剂' + price;
    if (it.item === 'energy') return '购买 能量电池' + price;
    return '购买 ' + it.perk.name + price;
  };
})();
