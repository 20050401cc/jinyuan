// 成就：本地记录 + 解锁提示；桌面版接入 Steam 后会同步解锁对应的 Steam 成就（API 名见 apiName）
'use strict';
(function () {
  const G = window.G;
  const KEY = 'jinyuan.ach.v1';
  const LIST = [
    { id: 'first_blood', api: 'ACH_FIRST_BLOOD', glyph: '初', color: '#ff9d4a', name: '初燃', desc: '击败第一个敌人' },
    { id: 'slayer', api: 'ACH_SLAYER_300', glyph: '戮', color: '#ff6b4a', name: '余烬收割者', desc: '累计击败 300 个敌人' },
    { id: 'boss1', api: 'ACH_BOSS_WARDEN', glyph: '炉', color: '#ff7a3a', name: '熔炉熄火', desc: '击败熔炉守卫' },
    { id: 'boss2', api: 'ACH_BOSS_WEAVER', glyph: '织', color: '#58c8ff', name: '断网', desc: '击败虚空织者' },
    { id: 'boss3', api: 'ACH_BOSS_HEART', glyph: '心', color: '#d05bff', name: '渊心寂灭', desc: '击败烬渊之心，完成远征' },
    { id: 'untouched', api: 'ACH_UNTOUCHED', glyph: '净', color: '#8fb7ff', name: '毫发无伤', desc: '不受任何伤害击败一位守护者' },
    { id: 'speed', api: 'ACH_SPEEDRUN', glyph: '疾', color: '#fff27a', name: '疾行者', desc: '在 15 分钟内完成远征' },
    { id: 'arsenal', api: 'ACH_ARSENAL', glyph: '械', color: '#c59bff', name: '军械库', desc: '累计持有过全部 8 种武器' },
    { id: 'rich', api: 'ACH_RICH', glyph: '财', color: '#ffd24a', name: '拾荒之王', desc: '同时持有 300 枚金币' },
    { id: 'shopper', api: 'ACH_SHOPPER', glyph: '商', color: '#5dff8a', name: '常客', desc: '在商店累计购买 10 次' },
    { id: 'chests', api: 'ACH_CHESTS', glyph: '箱', color: '#e7b24a', name: '寻宝人', desc: '累计打开 15 个宝箱' },
    { id: 'perks', api: 'ACH_PERKS_5', glyph: '博', color: '#ff7ad1', name: '博采众长', desc: '一次远征中获得 5 项增益' },
    { id: 'dasher', api: 'ACH_DASH_300', glyph: '影', color: '#3ff0da', name: '残影步', desc: '累计闪避 300 次' },
    { id: 'blade', api: 'ACH_BLADE_BOSS', glyph: '刃', color: '#ff7ad1', name: '近身搏杀', desc: '用烬刃给守护者最后一击' },
    { id: 'fall', api: 'ACH_FIRST_FALL', glyph: '堕', color: '#a89ea8', name: '坠入余烬', desc: '第一次倒下' },
    { id: 'veteran', api: 'ACH_VETERAN', glyph: '老', color: '#ffb05a', name: '老兵', desc: '累计完成 3 次远征' }
  ];
  const A = G.ach = { list: LIST, unlocked: {}, stats: { kills: 0, chests: 0, buys: 0, dashes: 0, wins: 0, weapons: [] }, toasts: [] };

  function store() { try { localStorage.setItem(KEY, JSON.stringify({ u: A.unlocked, s: A.stats })); } catch (e) { /* 忽略 */ } }
  A.init = function () {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d) { A.unlocked = d.u || {}; Object.assign(A.stats, d.s || {}); }
    } catch (e) { /* 损坏时重置 */ }
    // 已解锁的成就在桌面版启动时补同步到 Steam
    if (G.desktop && G.desktop.achieve) for (const a of LIST) if (A.unlocked[a.id]) G.desktop.achieve(a.api);
  };
  A.count = () => LIST.filter(a => A.unlocked[a.id]).length;

  function unlock(id) {
    if (A.unlocked[id]) return;
    const a = LIST.find(x => x.id === id);
    if (!a) return;
    A.unlocked[id] = Date.now();
    A.toasts.push({ a, t: 0 });
    store();
    G.sfx('perk');
    if (G.desktop && G.desktop.achieve) G.desktop.achieve(a.api);
  }
  A.unlock = unlock;

  // 游戏事件
  A.ev = function (type, arg) {
    const g = G.game, s = A.stats;
    if (type === 'kill') { s.kills++; unlock('first_blood'); if (s.kills >= 300) unlock('slayer'); }
    else if (type === 'boss') {
      const n = arg.type === 'boss1' ? 'boss1' : arg.type === 'boss2' ? 'boss2' : 'boss3';
      unlock(n);
      if (g.dmgTaken === g.dmgAtBoss) unlock('untouched');
      const p = g.player;
      if (p && p.weapons[p.cur] === 'blade') unlock('blade');
    } else if (type === 'win') {
      s.wins++; unlock('boss3');
      if (g.runTime < 15 * 60) unlock('speed');
      if (s.wins >= 3) unlock('veteran');
    } else if (type === 'death') unlock('fall');
    else if (type === 'chest') { s.chests++; if (s.chests >= 15) unlock('chests'); }
    else if (type === 'buy') { s.buys++; if (s.buys >= 10) unlock('shopper'); }
    else if (type === 'dash') { s.dashes++; if (s.dashes >= 300) unlock('dasher'); }
    else if (type === 'weapon') { if (arg && s.weapons.indexOf(arg) < 0) { s.weapons.push(arg); if (s.weapons.length >= G.WEAPON_IDS.length) unlock('arsenal'); } }
    else if (type === 'perk') { if (g.perksTaken.length >= 5) unlock('perks'); }
    A.dirty = true;
  };

  let saveT = 0;
  A.tick = function (dt) {
    const g = G.game, p = g.player;
    if (g.state === 'play' && p && p.gold >= 300) unlock('rich');
    for (let i = A.toasts.length - 1; i >= 0; i--) { A.toasts[i].t += dt; if (A.toasts[i].t > 4) A.toasts.splice(i, 1); }
    saveT += dt;
    if (A.dirty && saveT > 3) { saveT = 0; A.dirty = false; store(); }
  };
  window.addEventListener('pagehide', store);

  // 解锁提示（右上角滑入）
  A.drawToasts = function (ctx) {
    A.toasts.slice(0, 3).forEach((o, i) => {
      const t = o.t, k = t < 0.35 ? 1 - Math.pow(1 - t / 0.35, 3) : t > 3.6 ? 1 - (t - 3.6) / 0.4 : 1;
      const w = 280, h = 58, x = G.W - 14 - w * k, y = 150 + i * 66;
      ctx.globalAlpha = Math.max(0, Math.min(1, k));
      G.ui.panel(ctx, x, y, w, h, o.a.color, 0.92);
      badge(ctx, x + 32, y + h / 2, 20, o.a, true);
      G.text(ctx, '成就解锁', x + 62, y + 18, 11, '#ffb05a', 'left', true);
      G.text(ctx, o.a.name, x + 62, y + 38, 16, '#fff', 'left', true);
      ctx.globalAlpha = 1;
    });
  };
  function badge(ctx, x, y, r, a, on) {
    ctx.save(); ctx.translate(x, y);
    G.poly(ctx, 6, r, Math.PI / 6); ctx.fillStyle = on ? '#17131c' : '#0e0c10'; ctx.fill();
    ctx.strokeStyle = on ? a.color : '#3a343e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    G.text(ctx, on ? a.glyph : '?', x, y + 1, r * 0.85, on ? a.color : '#4a444e', 'center', true);
  }

  // 成就一览界面
  G.drawAchievements = function (ctx) {
    const g = G.game, U = G.ui;
    if (g.back === 'menu') G.drawMenuBackdrop(ctx);
    ctx.fillStyle = 'rgba(7,4,9,0.8)'; ctx.fillRect(0, 0, G.W, G.H);
    const w = 860, x0 = (G.W - w) / 2;
    U.panel(ctx, x0, 22, w, 560, '#ff9d4a', 0.92);
    U.glowText(ctx, '成 就', G.W / 2, 56, 34, '#ffe9c8', '#ff9d4a', true);
    G.text(ctx, A.count() + ' / ' + LIST.length, G.W / 2, 86, 13, '#c8b0a0', 'center', true);
    const s = A.stats;
    G.text(ctx, '累计击败 ' + s.kills + ' · 开箱 ' + s.chests + ' · 购买 ' + s.buys + ' · 闪避 ' + s.dashes + ' · 武器 ' + s.weapons.length + '/' + G.WEAPON_IDS.length, G.W / 2, 104, 11, '#8a8088', 'center');
    LIST.forEach((a, i) => {
      const col = i % 2, row = Math.floor(i / 2), x = x0 + 24 + col * 412, y = 120 + row * 50, on = !!A.unlocked[a.id];
      ctx.fillStyle = on ? 'rgba(255,176,90,0.07)' : 'rgba(255,255,255,0.025)'; U.rr(ctx, x, y, 400, 44, 6); ctx.fill();
      badge(ctx, x + 24, y + 22, 16, a, on);
      G.text(ctx, a.name, x + 50, y + 14, 14, on ? '#fff' : '#8a8088', 'left', true);
      G.text(ctx, a.desc, x + 50, y + 32, 11, on ? '#c8bcc0' : '#6a6470', 'left');
      if (on) G.text(ctx, '✓', x + 382, y + 22, 16, a.color, 'center', true);
    });
    if (G.button(ctx, G.W / 2 - 100, 524, 200, 42, '返回', true)) G.closeSub();
  };
})();
