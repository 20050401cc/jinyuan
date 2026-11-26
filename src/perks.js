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
    { id: 'multi', glyph: '叠', color: '#ff7ad1', name: '分裂弹仓', desc: '每次开火多射出 1 发子弹，单发伤害 -12%', apply: p => { p.stats.multishot += 1; p.stats.dmg *= 0.88; } },
    { id: 'thorns', glyph: '棘', color: '#8fb7ff', name: '反击脉冲', desc: '受伤时向四周释放一圈子弹', once: true, apply: p => { p.stats.thorns = true; } },
    { id: 'greed', glyph: '财', color: '#ffd86b', name: '拾荒者', desc: '获得的金币 +50%', apply: p => { p.stats.goldMul += 0.5; } },
    { id: 'thrift', glyph: '省', color: '#a4ff7a', name: '节能回路', desc: '武器能量消耗 -25%', apply: p => { p.stats.costMul *= 0.75; } }
  ];

  G.rollPerks = function (n) {
    const taken = G.game.perksTaken;
    const pool = G.PERKS.filter(k => !(k.once && taken.indexOf(k) >= 0));
    return G.shuffle(pool.slice()).slice(0, n);
  };
  G.applyPerk = function (perk) {
    const g = G.game;
    perk.apply(g.player);
    g.perksTaken.push(perk);
    G.ach.ev('perk');
  };
  G.openPerkChoice = function () {
    const g = G.game;
    g.perkChoices = G.rollPerks(3);
    g.state = 'perk';
    g.stateT = 0;
  };
  G.choosePerk = function (i) {
    const g = G.game, perk = g.perkChoices[i];
    if (!perk) return;
    G.applyPerk(perk);
    G.sfx('perk');
    G.startFloor(g.floor + 1);
    g.state = 'play';
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
