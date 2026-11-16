// 存档：把进行中的远征和设置写进浏览器本地存储，刷新或重开后可继续
'use strict';
(function () {
  const G = window.G;
  const KEY_RUN = 'jinyuan.run.v1', KEY_CFG = 'jinyuan.cfg.v1';
  const S = G.save = { meta: null, timer: 0, cfgStr: '', rec: { runs: 0, wins: 0, best: 0 }, ok: true };

  function get(k) { try { return window.localStorage.getItem(k); } catch (e) { S.ok = false; return null; } }
  function set(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { S.ok = false; return false; } }
  function del(k) { try { window.localStorage.removeItem(k); } catch (e) { S.ok = false; } }

  function packTiles(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    return btoa(s);
  }
  function unpackTiles(b64, n) {
    const s = atob(b64), u8 = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8[i] = s.charCodeAt(i);
    return u8;
  }

  // 只在安全的时刻存档：不在战斗中、没有 Boss、角色活着
  function canSave() {
    const g = G.game;
    return (g.state === 'play' || g.state === 'pause') && g.player && g.player.hp > 0 && !g.active && !g.boss && g.winT < 0 && g.dungeon;
  }

  S.write = function () {
    if (!canSave()) return false;
    const g = G.game, p = g.player, d = g.dungeon, doors = [];
    for (let i = 0; i < d.owner.length; i++) if (d.owner[i] >= 0) doors.push(i, d.owner[i]);
    const data = {
      v: 1, floor: g.floor, runTime: g.runTime, kills: g.kills, goldTotal: g.goldTotal, dmgTaken: g.dmgTaken, dmgDealt: g.dmgDealt,
      perks: g.perksTaken.map(k => k.id),
      player: { x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, shield: p.shield, maxShield: p.maxShield, energy: p.energy, maxEnergy: p.maxEnergy, gold: p.gold, weapons: p.weapons, cur: p.cur, stats: p.stats },
      dungeon: { w: d.w, h: d.h, tiles: packTiles(d.tiles), doors },
      rooms: d.rooms.map(r => Object.assign({}, r, { locked: false })),
      items: g.items.map(it => ({ kind: it.kind, x: it.x, y: it.y, price: it.price || 0, wid: it.wid, opened: it.opened, item: it.item, perk: it.perk ? it.perk.id : undefined })),
      pickups: g.pickups.map(k => ({ kind: k.kind, x: k.x, y: k.y, val: k.val }))
    };
    if (!set(KEY_RUN, JSON.stringify(data))) return false;
    S.meta = { floor: g.floor, kills: g.kills };
    return true;
  };

  S.clear = function () { del(KEY_RUN); S.meta = null; };

  // 读档并恢复到游戏中；存档损坏则丢弃
  S.resume = function () {
    const g = G.game;
    let data;
    try { data = JSON.parse(get(KEY_RUN)); } catch (e) { data = null; }
    try {
      if (!data || data.v !== 1) throw new Error('bad save');
      const perkOf = id => G.PERKS.find(k => k.id === id);
      const p = G.createPlayer(), sp = data.player;
      for (const k of ['x', 'y', 'hp', 'maxHp', 'shield', 'maxShield', 'energy', 'maxEnergy', 'gold', 'cur']) { if (typeof sp[k] !== 'number' || !isFinite(sp[k])) throw new Error('bad player'); p[k] = sp[k]; }
      p.weapons = [G.WEAPONS[sp.weapons[0]] ? sp.weapons[0] : 'pistol', G.WEAPONS[sp.weapons[1]] ? sp.weapons[1] : null];
      if (!p.weapons[p.cur]) p.cur = 0;
      Object.assign(p.stats, sp.stats);
      const dd = data.dungeon, n = dd.w * dd.h;
      const tiles = unpackTiles(dd.tiles, n), owner = new Int16Array(n).fill(-1);
      for (let i = 0; i < dd.doors.length; i += 2) owner[dd.doors[i]] = dd.doors[i + 1];
      const rooms = data.rooms;
      const d = { w: dd.w, h: dd.h, tiles, owner, rooms, floor: data.floor, start: rooms[0], boss: rooms.find(r => r.type === 'boss') };
      if (!d.boss || !rooms.length) throw new Error('bad dungeon');

      g.player = p;
      g.floor = data.floor; g.dmgMul = 1 + 0.2 * (data.floor - 1);
      g.runTime = data.runTime || 0; g.kills = data.kills || 0; g.goldTotal = data.goldTotal || 0; g.dmgTaken = data.dmgTaken || 0; g.dmgDealt = data.dmgDealt || 0;
      g.perksTaken = (data.perks || []).map(perkOf).filter(Boolean); g.perkChoices = [];
      g.enemies.length = g.bullets.length = g.ebullets.length = 0;
      g.pickups.length = g.items.length = g.particles.length = g.texts.length = g.effects.length = g.stains.length = 0;
      g.active = null; g.boss = null; g.winT = -1; g.shake = 0; g.fade = 1;
      g.dungeon = d;
      G.decorate(d);
      for (const it of data.items) {
        const o = { kind: it.kind, x: it.x, y: it.y, price: it.price || 0 };
        if (it.kind === 'weapon') { if (!G.WEAPONS[it.wid]) continue; o.wid = it.wid; }
        if (it.kind === 'chest') o.opened = !!it.opened;
        if (it.kind === 'goods') { o.item = it.item; if (it.item === 'perk') { o.perk = perkOf(it.perk); if (!o.perk) continue; } }
        g.items.push(o);
      }
      for (const k of data.pickups || []) g.pickups.push({ kind: k.kind, x: k.x, y: k.y, vx: 0, vy: 0, val: k.val, t: 1, r: 5 });
      if (G.collides(p.x, p.y, p.r)) { p.x = d.start.cx; p.y = d.start.cy; }
      p.invuln = 1;
      g.room = G.roomAt(p.x, p.y, 0) || d.start;
      g.cam.x = p.x - G.W / 2; g.cam.y = p.y - G.H / 2;
      G.prebakeNear(d, p.x, p.y);
      g.banner = { text: '继续远征 · 第 ' + g.floor + ' 层', t: 2.2 };
      g.state = 'play'; g.stateT = 0;
      G.input.down = false;
      S.timer = 0;
      return true;
    } catch (e) {
      S.clear();
      return false;
    }
  };

  // 游戏中每隔两秒自动存一次
  S.auto = function (dt) {
    S.timer += dt;
    if (S.timer < 2) return;
    S.timer = 0;
    S.write();
  };

  // ---------- 设置与战绩 ----------
  function cfgNow() { return JSON.stringify({ touch: !!G.touch.on, muted: !!G.audio.muted, music: !!G.audio.musicOn, rec: S.rec }); }
  S.syncCfg = function () {
    const s = cfgNow();
    if (s !== S.cfgStr) { S.cfgStr = s; set(KEY_CFG, s); }
  };
  S.record = function (win, floor) {
    S.rec.runs++;
    if (win) S.rec.wins++;
    S.rec.best = Math.max(S.rec.best, win ? G.MAX_FLOOR : floor);
    S.syncCfg();
  };

  S.init = function () {
    try {
      const c = JSON.parse(get(KEY_CFG));
      if (c) {
        if (typeof c.touch === 'boolean') G.touch.on = c.touch;
        if (typeof c.muted === 'boolean') G.audio.muted = c.muted;
        if (typeof c.music === 'boolean') G.audio.musicOn = c.music;
        if (c.rec) S.rec = { runs: c.rec.runs | 0, wins: c.rec.wins | 0, best: c.rec.best | 0 };
      }
    } catch (e) { /* 设置损坏时用默认值 */ }
    S.cfgStr = cfgNow();
    try {
      const d = JSON.parse(get(KEY_RUN));
      S.meta = d && d.v === 1 ? { floor: d.floor, kills: d.kills } : null;
    } catch (e) { S.meta = null; }
    // 切到后台或关闭页面前再存一次
    const flush = () => { S.write(); S.syncCfg(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  };
})();
