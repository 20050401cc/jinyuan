// 武器定义、开火逻辑、武器外形绘制
'use strict';
(function () {
  const G = window.G;

  G.WEAPONS = {
    pistol: { name: '火花手枪', desc: '不耗能量的可靠副手', proc: 1, cost: 0, cd: 0.26, dmg: 12, speed: 560, spread: 0.04, count: 1, color: '#ffd27a', sfx: 'shoot', len: 15, th: 5 },
    shotgun: { name: '碎岩霰弹', desc: '近距离一次喷出六枚弹丸', proc: 0.35, cost: 4, cd: 0.72, dmg: 9, speed: 520, spread: 0.55, count: 6, life: 0.42, color: '#ff9a5c', sfx: 'shotgun', len: 20, th: 7 },
    smg: { name: '蜂群速射', desc: '射速极快，弹道略散', proc: 0.4, cost: 1, cd: 0.075, dmg: 6, speed: 660, spread: 0.2, count: 1, color: '#fff27a', r: 3, sfx: 'smg', len: 18, th: 5 },
    laser: { name: '棱镜光束', desc: '持续照射并贯穿一排敌人', kind: 'beam', proc: 0.15, cost: 0.9, cd: 0.05, dmg: 4.5, color: '#7af0ff', sfx: 'laser', len: 21, th: 6 },
    bouncer: { name: '回响弹球', desc: '在墙壁间反弹四次', proc: 1, cost: 2, cd: 0.34, dmg: 14, speed: 430, spread: 0.03, count: 1, bounce: 4, r: 6, life: 3.2, color: '#9dff8a', sfx: 'bounce', len: 15, th: 8 },
    blade: { name: '烬刃', desc: '近身挥砍，可斩碎敌方子弹', kind: 'melee', proc: 1.4, cost: 0, cd: 0.36, dmg: 30, range: 74, arc: 2.3, color: '#ff7ad1', sfx: 'slash', len: 28, th: 4 },
    launcher: { name: '裂空榴弹', desc: '命中后范围爆炸', proc: 2, cost: 6, cd: 0.8, dmg: 36, speed: 380, spread: 0.02, count: 1, explode: 72, r: 7, life: 1.3, color: '#ffb347', sfx: 'launch', len: 20, th: 9 },
    seeker: { name: '追光弩', desc: '双发箭矢自动追踪目标', proc: 0.7, cost: 2, cd: 0.3, dmg: 10, speed: 360, spread: 0.5, count: 2, homing: 5, life: 2, color: '#c59bff', sfx: 'seeker', len: 19, th: 5 }
  };
  G.WEAPON_IDS = Object.keys(G.WEAPONS);

  // 进化武器：持有基础武器并集齐两项增益后，增益选择里会出现进化选项（不进入随机掉落池）
  Object.assign(G.WEAPONS, {
    dragon: { name: '炼狱龙息', desc: '喷出八枚火焰弹，命中必定点燃', shape: 'shotgun', evo: true, proc: 0.35, ignite: 2, cost: 4, cd: 0.7, dmg: 10, speed: 540, spread: 0.6, count: 8, life: 0.45, color: '#ff5a1a', sfx: 'shotgun', len: 22, th: 8 },
    judgement: { name: '天罚棱镜', desc: '光束命中时折射到附近两个敌人', shape: 'laser', evo: true, kind: 'beam', proc: 0.15, refract: true, cost: 0.6, cd: 0.05, dmg: 5.5, color: '#e8f8ff', sfx: 'laser', len: 23, th: 7 },
    abyssblade: { name: '断渊之刃', desc: '更大的斩击范围，斩下的子弹会反弹回去', shape: 'blade', evo: true, kind: 'melee', proc: 1.4, reflect: true, cost: 0, cd: 0.34, dmg: 38, range: 96, arc: 2.8, color: '#ff3ad1', sfx: 'slash', len: 34, th: 5 },
    permafrost: { name: '永冻之矢', desc: '三发贯穿箭矢，命中使敌人几乎冻结', shape: 'seeker', evo: true, proc: 0.7, freeze: true, cost: 2, cd: 0.3, dmg: 12, speed: 380, spread: 0.5, count: 3, homing: 5, life: 2.2, pierce: 2, color: '#bfe8ff', sfx: 'seeker', len: 21, th: 6 }
  });
  G.EVOLUTIONS = [
    { from: 'shotgun', to: 'dragon', perks: ['burn', 'blast'] },
    { from: 'laser', to: 'judgement', perks: ['chain', 'thrift'] },
    { from: 'blade', to: 'abyssblade', perks: ['wave', 'shadow'] },
    { from: 'seeker', to: 'permafrost', perks: ['frost', 'pierce'] }
  ];
  G.weaponShape = id => (G.WEAPONS[id] && G.WEAPONS[id].shape) || id;

  // 与开火逻辑一致的输出估算：含分裂弹仓、暴击期望、血之契约、射速与每秒耗能
  G.weaponStats = function (p, id) {
    const w = G.WEAPONS[id], s = p.stats, proj = !w.kind;
    const n = proj ? (w.count || 1) + s.multishot : 1, split = proj ? Math.pow(0.88, s.multishot) : 1;
    const rate = s.rate * (s.blood && p.hp / p.maxHp < 0.3 ? 1.2 : 1) / w.cd;
    const blood = s.blood ? 1 + Math.floor((1 - p.hp / p.maxHp) * 10) * 0.06 : 1;
    const dps = w.dmg * s.dmg * blood * n * split * (1 + Math.min(1, s.crit)) * rate;
    return { dps: Math.round(dps), eps: Math.round(w.cost * s.costMul * rate * 10) / 10 };
  };

  G.fireWeapon = function (p) {
    const g = G.game, w = G.WEAPONS[p.weapons[p.cur]], s = p.stats;
    const cost = w.cost * s.costMul;
    if (p.energy < cost) {
      if (p.emptyT <= 0) { G.floatText(p.x, p.y - 22, '能量不足', '#ffcf6b'); G.sfx('empty'); p.emptyT = 0.8; }
      p.cd = 0.2;
      return;
    }
    p.energy -= cost;
    // 血之契约：生命低于 30% 时射速 +20%
    p.cd = w.cd / s.rate / (s.blood && p.hp / p.maxHp < 0.3 ? 1.2 : 1);
    const fx = { proc: w.proc || 1, ignite: w.ignite || 0, freeze: !!w.freeze };
    p.recoil = 1; p.muzzle = 1;
    const ang = p.aim;
    const mx = p.x + Math.cos(ang) * 14, my = p.y + Math.sin(ang) * 14;
    // 血之契约：每损失 10% 生命伤害 +6%；影袭：闪避后的下一次攻击必定暴击
    const bloodMul = s.blood ? 1 + Math.floor((1 - p.hp / p.maxHp) * 10) * 0.06 : 1;
    const sure = p.shadowT > 0;
    if (sure) p.shadowT = 0;
    const roll = () => {
      const c = sure || Math.random() < s.crit;
      return { d: w.dmg * s.dmg * bloodMul * (c ? 2 : 1), c };
    };
    G.sfx(w.sfx);

    if (w.kind === 'beam') {
      const hit = G.raycast(mx, my, ang, 640);
      p.beam = { x1: mx, y1: my, x2: hit.x, y2: hit.y, t: 0.08 };
      for (const e of g.enemies.slice()) {
        if (e.spawnT > 0 || e.dead) continue;
        if (G.segDist(e.x, e.y, mx, my, hit.x, hit.y) < e.r + 5) { const r = roll(); G.hurtEnemy(e, r.d, r.c, 0, 0, fx); if (w.refract) G.refract(e, r.d * 0.4); }
      }
      if (Math.random() < 0.5) G.burst(hit.x, hit.y, w.color, 1, 90, 0.25, 2);
      return;
    }

    if (w.kind === 'melee') {
      g.effects.push({ type: 'slash', x: p.x, y: p.y, ang, range: w.range, arc: w.arc, t: 0, dur: 0.16, color: w.color });
      if (s.wave) { const r = roll(); G.spawnBullet({ friendly: true, x: mx, y: my, vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520, r: 9, dmg: r.d * 0.6, crit: r.c, life: 0.45, color: w.color, pierce: 99 }); }
      for (const e of g.enemies.slice()) {
        if (e.spawnT > 0 || e.dead) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < w.range + e.r && Math.abs(G.angDiff(Math.atan2(e.y - p.y, e.x - p.x), ang)) < w.arc / 2) {
          const r = roll();
          G.hurtEnemy(e, r.d, r.c, Math.cos(ang) * 260, Math.sin(ang) * 260, fx);
        }
      }
      const eb = g.ebullets;
      for (let i = eb.length - 1; i >= 0; i--) {
        const b = eb[i], d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < w.range + 6 && Math.abs(G.angDiff(Math.atan2(b.y - p.y, b.x - p.x), ang)) < w.arc / 2) {
          G.burst(b.x, b.y, '#fff', 3, 90, 0.2, 2);
          if (s.wave) p.energy = Math.min(p.maxEnergy, p.energy + 2);
          if (w.reflect) { const ra = Math.atan2(b.y - p.y, b.x - p.x); G.spawnBullet({ friendly: true, x: b.x, y: b.y, vx: Math.cos(ra) * 440, vy: Math.sin(ra) * 440, r: 4, dmg: 14 * s.dmg, life: 0.9, color: w.color, fx }); }
          eb[i] = eb[eb.length - 1]; eb.pop();
        }
      }
      return;
    }

    const n = w.count + s.multishot, split = Math.pow(0.88, s.multishot);
    for (let i = 0; i < n; i++) {
      let a;
      if (w.count > 1) a = ang + (Math.random() - 0.5) * w.spread;
      else a = ang + (n > 1 ? (i - (n - 1) / 2) * 0.13 : 0) + (Math.random() - 0.5) * w.spread;
      const sp = w.speed * s.bulletSpeed * (w.count > 2 ? G.rand(0.82, 1.1) : 1);
      const r = roll();
      G.spawnBullet({
        friendly: true, x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: w.r || 4, dmg: r.d * split, crit: r.c, life: w.life || 1.4, color: w.color,
        bounce: w.bounce || 0, pierce: s.pierce + (w.pierce || 0), homing: w.homing || 0, explode: w.explode || 0, fx
      });
    }
    G.burst(mx + Math.cos(ang) * 8, my + Math.sin(ang) * 8, w.color, 2, 120, 0.12, 2);
  };

  // 以原点为握把、沿 +x 方向画出武器
  G.drawWeapon = function (ctx, id, scale) {
    const w = G.WEAPONS[id], L = w.len * scale, H = w.th * scale;
    id = w.shape || id;
    ctx.lineJoin = 'round'; ctx.strokeStyle = '#140e14'; ctx.lineWidth = 2.5;
    if (id !== 'blade') { ctx.strokeRect(0, -H / 2, L, H); ctx.strokeRect(1 * scale, 0, 4 * scale, H / 2 + 4 * scale); }
    else { ctx.beginPath(); ctx.moveTo(4 * scale, -H / 2); ctx.lineTo(L, 0); ctx.lineTo(4 * scale, H / 2); ctx.closePath(); ctx.stroke(); ctx.strokeRect(-3 * scale, -2.5 * scale, 7 * scale, 5 * scale); }
    ctx.fillStyle = '#343a46';
    if (id === 'blade') {
      ctx.fillRect(-3 * scale, -2.5 * scale, 7 * scale, 5 * scale);
      ctx.fillStyle = w.color;
      ctx.beginPath(); ctx.moveTo(4 * scale, -H / 2); ctx.lineTo(L, 0); ctx.lineTo(4 * scale, H / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(4 * scale, -0.6 * scale, L * 0.6, 1.2 * scale);
      return;
    }
    ctx.fillRect(0, -H / 2, L, H);
    ctx.fillRect(1 * scale, 0, 4 * scale, H / 2 + 4 * scale);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, -H / 2, L, Math.max(1, scale));
    ctx.fillStyle = w.color;
    ctx.fillRect(L * 0.25, -H / 2 + scale, L * 0.5, Math.max(1, H * 0.3));
    if (id === 'shotgun') { ctx.fillStyle = '#0c0e12'; ctx.fillRect(L - 4 * scale, -0.5 * scale, 4 * scale, scale); }
    else if (id === 'smg') { ctx.fillStyle = '#20242c'; ctx.fillRect(L * 0.45, 0, 3 * scale, H / 2 + 5 * scale); }
    else if (id === 'laser') { ctx.fillRect(L - 2 * scale, -H / 2 - scale, 3 * scale, H + 2 * scale); }
    else if (id === 'bouncer') { ctx.beginPath(); ctx.arc(L, 0, H * 0.55, 0, Math.PI * 2); ctx.fill(); }
    else if (id === 'launcher') { ctx.fillStyle = '#0c0e12'; ctx.beginPath(); ctx.arc(L, 0, H * 0.4, 0, Math.PI * 2); ctx.fill(); }
    else if (id === 'seeker') {
      ctx.strokeStyle = w.color; ctx.lineWidth = 1.5 * scale;
      ctx.beginPath(); ctx.arc(L * 0.55, 0, L * 0.45, -1.1, 1.1); ctx.stroke();
    }
  };
})();
