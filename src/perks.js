// 肉鸽增益与商店货架
'use strict';
(function () {
  const G = window.G;

  G.PERKS = [
    { id: 'vital', glyph: '命', color: '#ff6b7a', name: '炽热心脏', desc: '生命上限 +25，并立即回复 25 点生命', apply: p => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
    { id: 'ward', glyph: '盾', color: '#8fb7ff', name: '加厚护盾', desc: '护盾上限 +20', apply: p => { p.maxShield += 20; p.shield += 20; } },
    { id: 'cell', glyph: '能', color: '#6fe0ff', name: '扩容电池', desc: '能量上限 +60，并立即充满', apply: p => { p.maxEnergy += 60; p.energy = p.maxEnergy; } },
    { id: 'power', glyph: '力', color: '#ff9a5c', name: '余烬淬火', desc: '所有武器伤害 +20%', apply: p => { p.stats.dmg *= 1.2; } },
    { id: 'haste', glyph: '速', color: '#fff27a', name: '急促扳机', desc: '射速 +18%', apply: p => { p.stats.rate *= 1.18; } },
    { id: 'swift', glyph: '疾', color: '#9dff8a', name: '轻盈步伐', desc: '移动速度 +12%', apply: p => { p.stats.speed *= 1.12; } },
    { id: 'mend', glyph: '愈', color: '#b9d2ff', name: '快速充能', desc: '护盾更早开始恢复，恢复速度 +60%', apply: p => { p.stats.shieldDelay *= 0.65; p.stats.shieldRate *= 1.6; } },
    { id: 'siphon', glyph: '汲', color: '#7af0ff', name: '能量虹吸', desc: '每次击杀回复 3 点能量', apply: p => { p.stats.killEnergy += 3; } },
    { id: 'keen', glyph: '锐', color: '#ffe14a', name: '弱点洞察', desc: '暴击率 +15%（暴击造成双倍伤害）', apply: p => { p.stats.crit += 0.15; } },
    { id: 'pierce', glyph: '贯', color: '#c59bff', name: '穿甲弹头', desc: '子弹可额外贯穿 1 个敌人', apply: p => { p.stats.pierce += 1; } },
    { id: 'blink', glyph: '闪', color: '#5ad6e6', name: '残影', desc: '闪避冷却缩短 30%', apply: p => { p.stats.dashCd *= 0.7; } },
    { id: 'leech', glyph: '噬', color: '#7dff9a', name: '战意回复', desc: '每次击杀回复 2 点生命', apply: p => { p.stats.killHeal += 2; } },
    { id: 'velocity', glyph: '迅', color: '#ffd27a', name: '高压枪膛', desc: '子弹飞行速度 +30%', apply: p => { p.stats.bulletSpeed *= 1.3; } },
    { id: 'multi', glyph: '叠', color: '#ff7ad1', name: '分裂弹仓', desc: '子弹类武器每次开火多射出 1 发，单发伤害 -12%（光束和近战不受影响）', apply: p => { p.stats.multishot += 1; } },
    { id: 'thorns', glyph: '棘', color: '#8fb7ff', name: '反击脉冲', desc: '受伤时向四周释放一圈子弹', once: true, apply: p => { p.stats.thorns = true; } },
    { id: 'greed', glyph: '财', color: '#ffd86b', name: '拾荒者', desc: '获得的金币 +50%', apply: p => { p.stats.goldMul += 0.5; } },
    { id: 'thrift', glyph: '省', color: '#a4ff7a', name: '节能回路', desc: '武器能量消耗 -25%', apply: p => { p.stats.costMul *= 0.75; } },
    // ---- 机制型增益：改变攻击方式，可以互相联动 ----
    { id: 'burn', glyph: '灼', color: '#ff8a3a', tag: 1, name: '灼烧弹头', desc: '命中使敌人燃烧 3 秒，每秒受到 8 点伤害（可叠加）', apply: p => { p.stats.burn += 1; } },
    { id: 'blast', glyph: '爆', color: '#ffb347', tag: 1, once: true, name: '余烬爆裂', desc: '燃烧中的敌人死亡时爆炸，并点燃周围的敌人', apply: p => { p.stats.burnBlast = true; if (!p.stats.burn) p.stats.burn = 1; } },
    { id: 'chain', glyph: '雷', color: '#8ad6ff', tag: 1, name: '连锁电弧', desc: '命中时有 20% 几率向附近 3 个敌人弹出电弧（50% 伤害）', apply: p => { p.stats.chain += 0.2; } },
    { id: 'frost', glyph: '霜', color: '#bfe8ff', tag: 1, once: true, name: '寒霜弹头', desc: '命中使敌人减速 40%，减速中的敌人受到的伤害 +20%', apply: p => { p.stats.frost = true; } },
    { id: 'blood', glyph: '血', color: '#ff4a5a', tag: 1, once: true, name: '血之契约', desc: '生命上限 -20；每损失 10% 生命，伤害 +6%', apply: p => { p.maxHp = Math.max(40, p.maxHp - 20); p.hp = Math.min(p.hp, p.maxHp); p.stats.blood = true; } },
    { id: 'wave', glyph: '斩', color: '#ff7ad1', tag: 1, once: true, name: '残光剑气', desc: '近战挥砍会射出一道穿透剑气；每斩碎一颗子弹回复 2 点能量', apply: p => { p.stats.wave = true; } },
    { id: 'shadow', glyph: '袭', color: '#3ff0da', tag: 1, once: true, name: '影袭', desc: '闪避后 1.5 秒内的下一次攻击必定暴击', apply: p => { p.stats.shadow = true; } }
  ];

  // 按当前构筑加权抽取：已有流派的关联增益更容易出现，用不上的增益更少出现
  const has = id => G.game.perksTaken.some(k => k.id === id);
  function weight(k) {
    const p = G.game.player, ws = p ? p.weapons.filter(Boolean).map(G.weaponShape) : [];
    const melee = ws.indexOf('blade') >= 0, proj = ws.some(id => !G.WEAPONS[id].kind);
    let w = k.tag ? 1.1 : 1;
    if (k.id === 'blast') w *= has('burn') ? 3 : 0.6;
    if (k.id === 'burn' && (has('blast') || has('burn'))) w *= 1.8;
    if (k.id === 'chain' && (has('chain') || has('thrift'))) w *= 1.6;
    if (k.id === 'frost' && has('pierce')) w *= 1.8;
    if (k.id === 'pierce' && has('frost')) w *= 1.6;
    if (k.id === 'wave') w *= melee ? 3 : 0.25;
    if (k.id === 'shadow' && (melee || has('keen'))) w *= 1.8;
    if (k.id === 'multi' && !proj) w *= 0.2;
    if (k.id === 'velocity' && !proj) w *= 0.3;
    for (const e of G.EVOLUTIONS) if (ws.indexOf(e.from) >= 0 && e.perks.indexOf(k.id) >= 0) w *= 2;
    return w;
  }
  G.rollPerks = function (n) {
    const taken = G.game.perksTaken;
    const pool = G.PERKS.filter(k => !(k.once && taken.indexOf(k) >= 0)).map(k => ({ k, w: weight(k) }));
    const out = [];
    while (out.length < n && pool.length) {
      let r = Math.random() * pool.reduce((a, o) => a + o.w, 0), i = 0;
      while (i < pool.length - 1 && (r -= pool[i].w) > 0) i++;
      out.push(pool.splice(i, 1)[0].k);
    }
    return out;
  };
  // 可进化的武器：持有基础武器并已获得配方里的两项增益
  G.evolutionsReady = function () {
    const p = G.game.player;
    return G.EVOLUTIONS.filter(e => p.weapons.indexOf(e.from) >= 0 && e.perks.every(has));
  };
  function evoCard(e) {
    const to = G.WEAPONS[e.to];
    return { id: 'evo_' + e.to, glyph: '进', color: to.color, tag: 2, evo: e, name: to.name, desc: to.desc,
      apply: p => { const i = p.weapons.indexOf(e.from); if (i >= 0) { p.weapons[i] = e.to; p.cur = i; G.ach.ev('weapon', e.to); } } };
  }
  G.applyPerk = function (perk) {
    const g = G.game;
    perk.apply(g.player);
    if (perk.evo) { G.sfx('phase'); g.shake = 8; G.burst(g.player.x, g.player.y, perk.color, 40, 300, 0.7, 4); return; }
    g.perksTaken.push(perk);
    G.ach.ev('perk');
  };
  // mode：floor（守护者之后，选完进入下一层）| elite（精英房战利品）| start（启程之礼）
  G.openPerkChoice = function (mode) {
    const g = G.game;
    g.perkMode = mode || 'floor';
    g.perkChoices = G.rollPerks(3);
    const evo = G.evolutionsReady()[0];
    if (evo && g.perkMode !== 'start') g.perkChoices[1] = evoCard(evo);
    g.state = 'perk';
    g.stateT = 0;
  };
  G.choosePerk = function (i) {
    const g = G.game, perk = g.perkChoices[i];
    if (!perk) return;
    G.applyPerk(perk);
    G.sfx('perk');
    if (g.perkMode !== 'floor') { g.state = 'play'; g.stateT = 0; G.input.down = false; G.save.timer = 0.5; return; }
    const cleared = g.floor;
    G.startFloor(g.floor + 1);
    // 层间幕间剧情，播完（或跳过）后从新楼层的标题卡开始
    G.playStory('ch' + cleared, () => {
      g.state = 'play'; g.stateT = 0; g.fade = 1;
      g.floorCard = { t: 0, n: g.floor }; g.player.dropT = 0.85; g.player.invuln = 1.4;
    });
  };

  // 给宝箱房和商店摆放物品
  G.stockRooms = function () {
    const g = G.game;
    for (const r of g.dungeon.rooms) {
      if (r.type === 'chest') g.items.push({ kind: 'chest', x: r.cx, y: r.cy - 10, opened: false, price: 0 });
      if (r.type === 'shop') {
        const perk = G.rollPerks(1)[0];
        const goods = [
          { kind: 'goods', item: 'heal', price: 25 },
          { kind: 'goods', item: 'energy', price: 15 },
          { kind: 'weapon', wid: null, price: 45 + g.floor * 5 },
          { kind: 'goods', item: 'perk', perk, price: 70 + g.floor * 10 }
        ];
        goods.forEach((it, i) => {
          it.x = r.cx + (i - 1.5) * 84; it.y = r.cy - 8;
          g.items.push(it);
        });
        goods[2].wid = G.randomWeapon();
      }
    }
  };
})();
