// 地牢：随机房间布局、瓦片地图、碰撞、房间锁门与波次
'use strict';
(function () {
  const G = window.G;
  const T = G.T = { VOID: 0, FLOOR: 1, WALL: 2, DOOR: 3, BLOCK: 4 };
  const CW = 28, CH = 22, GN = 5;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const SIZE = { start: [11, 9], chest: [9, 7], shop: [13, 7], boss: [21, 15] };
  G.GRID_N = GN;

  G.genDungeon = function (floor) {
    const w = CW * GN, h = CH * GN;
    const tiles = new Uint8Array(w * h);
    const owner = new Int16Array(w * h).fill(-1);
    const grid = {}, rooms = [];
    const key = (x, y) => x + ',' + y;
    const inb = (x, y) => x >= 0 && y >= 0 && x < GN && y < GN;
    const link = (a, b) => { a.links.push(b.id); b.links.push(a.id); };
    function add(gx, gy, parent) {
      const r = {
        id: rooms.length, gx, gy, type: 'combat', links: [],
        visited: false, seen: false, cleared: false, locked: false, wave: 0, waves: 0
      };
      rooms.push(r); grid[key(gx, gy)] = r;
      if (parent) link(parent, r);
      return r;
    }

    // 1. 随机生长出房间树
    const start = add(2, 2, null);
    start.type = 'start';
    const n = 6 + floor;
    let guard = 0;
    while (rooms.length < n && guard++ < 4000) {
      const r = G.pick(rooms);
      if (r.links.length >= 3) continue;
      const d = G.pick(DIRS), gx = r.gx + d[0], gy = r.gy + d[1];
      if (!inb(gx, gy) || grid[key(gx, gy)]) continue;
      add(gx, gy, r);
    }

    // 2. Boss 房挂在离起点最远的房间外侧
    const dist = new Array(rooms.length).fill(-1);
    dist[0] = 0;
    const q = [0];
    while (q.length) {
      const i = q.shift();
      for (const j of rooms[i].links) if (dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); }
    }
    const order = rooms.slice(1).sort((a, b) => dist[b.id] - dist[a.id]);
    let boss = null;
    for (const r of order) {
      for (const d of G.shuffle(DIRS.slice())) {
        const gx = r.gx + d[0], gy = r.gy + d[1];
        if (inb(gx, gy) && !grid[key(gx, gy)]) { boss = add(gx, gy, r); break; }
      }
      if (boss) break;
    }
    if (!boss) boss = order[0];
    boss.type = 'boss';

    // 3. 少量额外连接形成回路
    for (const a of rooms) {
      for (const d of [[1, 0], [0, 1]]) {
        const b = grid[key(a.gx + d[0], a.gy + d[1])];
        if (!b || a === boss || b === boss || a.links.indexOf(b.id) >= 0) continue;
        if (Math.random() < 0.22) link(a, b);
      }
    }

    // 4. 分配宝箱房与商店（优先死胡同）
    const cand = G.shuffle(rooms.filter(r => r.type === 'combat')).sort((a, b) => a.links.length - b.links.length);
    if (cand[0]) cand[0].type = 'chest';
    if (cand[1]) cand[1].type = 'shop';
    // 一间离起点较远的战斗房作为精英房（清完给一次增益三选一）
    const far = rooms.filter(r => r.type === 'combat').sort((a, b) => (Math.abs(b.gx - rooms[0].gx) + Math.abs(b.gy - rooms[0].gy)) - (Math.abs(a.gx - rooms[0].gx) + Math.abs(a.gy - rooms[0].gy)));
    if (far[0]) far[0].elite = true;

    // 5. 确定尺寸并铺地板
    for (const r of rooms) {
      let sz = SIZE[r.type];
      if (!sz) sz = [G.pick([13, 15, 17, 19]), G.pick([9, 11, 13])];
      r.w = sz[0]; r.h = sz[1];
      r.ctx = r.gx * CW + 14; r.cty = r.gy * CH + 11;
      r.x = r.ctx - (r.w - 1) / 2; r.y = r.cty - (r.h - 1) / 2;
      r.cx = (r.ctx + 0.5) * G.TILE; r.cy = (r.cty + 0.5) * G.TILE;
      if (r.type === 'combat') r.waves = r.elite ? 2 : Math.random() < 0.35 + floor * 0.15 ? 2 : 1;
      if (r.type === 'start') { r.cleared = true; }
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles[y * w + x] = T.FLOOR;
    }

    // 6. 走廊与门
    const setDoor = (x, y, r) => { tiles[y * w + x] = T.DOOR; owner[y * w + x] = r.id; };
    for (const a of rooms) {
      for (const j of a.links) {
        const b = rooms[j];
        if (b.id < a.id) continue;
        if (a.gy === b.gy) {
          const L = a.gx < b.gx ? a : b, R = a.gx < b.gx ? b : a;
          for (let dy = -1; dy <= 1; dy++) {
            const y = L.cty + dy;
            for (let x = L.x + L.w; x <= R.x - 1; x++) tiles[y * w + x] = T.FLOOR;
            setDoor(L.x + L.w, y, L); setDoor(R.x - 1, y, R);
          }
        } else {
          const U = a.gy < b.gy ? a : b, D = a.gy < b.gy ? b : a;
          for (let dx = -1; dx <= 1; dx++) {
            const x = U.ctx + dx;
            for (let y = U.y + U.h; y <= D.y - 1; y++) tiles[y * w + x] = T.FLOOR;
            setDoor(x, U.y + U.h, U); setDoor(x, D.y - 1, D);
          }
        }
      }
    }

    // 7. 墙壁：包住所有可走区域
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (tiles[y * w + x] !== T.VOID) continue;
        let near = false;
        for (let oy = -1; oy <= 1 && !near; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nx = x + ox, ny = y + oy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const t = tiles[ny * w + nx];
            if (t === T.FLOOR || t === T.DOOR) { near = true; break; }
          }
        }
        if (near) tiles[y * w + x] = T.WALL;
      }
    }

    // 8. 战斗房内的掩体（左右对称，避开门的轴线）
    for (const r of rooms) {
      if (r.type !== 'combat') continue;
      const cnt = G.randi(1, 3);
      for (let i = 0; i < cnt; i++) {
        const bx = G.randi(r.x + 2, r.ctx - 3), by = G.randi(r.y + 2, r.y + r.h - 3);
        if (Math.abs(by - r.cty) <= 2) continue;
        const tall = Math.random() < 0.4 && Math.abs(by + 1 - r.cty) > 2 && by + 1 <= r.y + r.h - 3;
        for (const x of [bx, 2 * r.ctx - bx]) {
          tiles[by * w + x] = T.BLOCK;
          if (tall) tiles[(by + 1) * w + x] = T.BLOCK;
        }
      }
    }

    start.visited = true; start.seen = true;
    for (const j of start.links) rooms[j].seen = true;
    return { w, h, tiles, owner, rooms, floor, start, boss };
  };

  // ---------- 碰撞 ----------
  G.tileSolid = function (tx, ty) {
    const d = G.game.dungeon;
    if (tx < 0 || ty < 0 || tx >= d.w || ty >= d.h) return true;
    const i = ty * d.w + tx, t = d.tiles[i];
    if (t === T.FLOOR) return false;
    if (t === T.DOOR) return d.rooms[d.owner[i]].locked;
    return true;
  };
  G.pointSolid = (x, y) => G.tileSolid(Math.floor(x / G.TILE), Math.floor(y / G.TILE));
  G.collides = function (x, y, r) {
    const S = G.TILE;
    const x0 = Math.floor((x - r) / S), x1 = Math.floor((x + r) / S);
    const y0 = Math.floor((y - r) / S), y1 = Math.floor((y + r) / S);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (G.tileSolid(tx, ty)) return true;
    return false;
  };
  // 分轴移动，返回是否撞墙
  function slide(e, ax, d) {
    // 沿另一轴试探 2~10 像素，若能让这一步走通，就朝空隙挪一点
    for (let k = 2; k <= 10; k += 2) for (const sg of [1, -1]) {
      const ox = ax === 'x' ? 0 : sg * k, oy = ax === 'x' ? sg * k : 0;
      if (!G.collides(e.x + ox + (ax === 'x' ? d : 0), e.y + oy + (ax === 'y' ? d : 0), e.r) && !G.collides(e.x + Math.sign(ox) * 1.5, e.y + Math.sign(oy) * 1.5, e.r)) {
        e.x += Math.sign(ox) * Math.min(k, 1.5 + Math.abs(d) * 0.6); e.y += Math.sign(oy) * Math.min(k, 1.5 + Math.abs(d) * 0.6); return;
      }
    }
  }
  G.moveEntity = function (e, dx, dy) {
    let hit = false;
    const pl = e === G.game.player;
    if (dx) { e.x += dx; if (G.collides(e.x, e.y, e.r)) { e.x -= dx; hit = true; if (pl && !dy) slide(e, 'x', dx); } }
    if (dy) { e.y += dy; if (G.collides(e.x, e.y, e.r)) { e.y -= dy; hit = true; if (pl && !dx) slide(e, 'y', dy); } }
    return hit;
  };
  G.raycast = function (x, y, ang, max) {
    const dx = Math.cos(ang) * 6, dy = Math.sin(ang) * 6;
    let d = 0;
    while (d < max && !G.pointSolid(x + dx, y + dy)) { x += dx; y += dy; d += 6; }
    return { x, y, d };
  };
  G.roomAt = function (x, y, margin) {
    const S = G.TILE, rooms = G.game.dungeon.rooms;
    for (const r of rooms) {
      if (x >= r.x * S + margin && x <= (r.x + r.w) * S - margin && y >= r.y * S + margin && y <= (r.y + r.h) * S - margin) return r;
    }
    return null;
  };
  G.randomSpot = function (room, minDist) {
    const g = G.game, p = g.player, S = G.TILE;
    for (let i = 0; i < 60; i++) {
      const tx = G.randi(room.x + 1, room.x + room.w - 2), ty = G.randi(room.y + 1, room.y + room.h - 2);
      if (G.tileSolid(tx, ty)) continue;
      const x = (tx + 0.5) * S, y = (ty + 0.5) * S;
      if (Math.hypot(x - p.x, y - p.y) >= minDist) return { x, y };
    }
    return { x: room.cx, y: room.cy };
  };

  // ---------- 房间流程 ----------
  const POOLS = [
    ['lunger', 'lunger', 'wick', 'wick', 'fuse', 'spore', 'mite'],
    ['lunger', 'wick', 'fuse', 'spore', 'brood', 'gazer', 'mite'],
    ['lunger', 'wick', 'fuse', 'spore', 'spore', 'brood', 'gazer', 'gazer']
  ];
  G.spawnWave = function (room) {
    const g = G.game, floor = g.floor;
    room.wave++;
    let budget = 6 + floor * 3 + G.randi(0, 3) + (room.wave - 1) * 2;
    let pool = POOLS[Math.min(floor, 3) - 1];
    if (room.gentle) { budget -= room.gentle === 1 ? 4 : 2; pool = ['lunger', 'lunger', 'mite', 'fuse', 'wick']; }
    else if (floor === 1 && room.ramp != null) budget = Math.min(budget, 7 + room.ramp * 1.5 + (room.wave - 1) * 2);
    if (room.elite) budget += 3;
    budget = Math.max(3, budget + G.diff().budget);
    let guard = 0, elite = room.elite && room.wave === room.waves;
    while (budget > 0 && guard++ < 60) {
      const type = G.pick(pool), def = G.ENEMIES[type];
      if (def.cost > budget) continue;
      const cnt = type === 'mite' ? 3 : 1;
      budget -= def.cost * cnt;
      for (let i = 0; i < cnt; i++) {
        const s = G.randomSpot(room, 150);
        const e = G.spawnEnemy(type, s.x, s.y, 0.7 + Math.random() * 0.5);
        // 精英房最后一波：一只强化的精英怪
        if (elite && type !== 'mite') { elite = false; e.elite = true; e.hp = e.maxhp = e.hp * 3; e.r *= 1.3; }
      }
    }
  };

  function clearRoom(room) {
    const g = G.game;
    room.cleared = true; room.locked = false; g.active = null;
    G.sfx('clear');
    g.banner = { text: '区域已肃清', t: 1.6, small: true };
    const n = G.randi(2, 4);
    for (let i = 0; i < n; i++) G.dropPickup('energy', room.cx + G.rand(-40, 40), room.cy + G.rand(-40, 40), 12);
    if (Math.random() < 0.35) G.dropPickup('health', room.cx, room.cy, 15);
    if (room.elite) { for (let i = 0; i < 10; i++) G.dropPickup('coin', room.cx, room.cy, 2); G.openPerkChoice('elite'); }
  }
  G.clearRoom = clearRoom;

  G.updateRooms = function () {
    const g = G.game, p = g.player, d = g.dungeon;
    const r = G.roomAt(p.x, p.y, 14);
    if (r) {
      if (r !== g.room) g.room = r;
      if (!r.visited) {
        r.visited = true; r.seen = true;
        for (const j of r.links) d.rooms[j].seen = true;
      }
      if ((r.type === 'combat' || r.type === 'boss') && !r.cleared && !r.locked) {
        r.locked = true; r.wave = 0; g.active = r;
        if (g.floor === 1 && r.type === 'combat') {
          const done = d.rooms.filter(o => o.type === 'combat' && o.cleared).length;
          if (done < 2 && !r.elite) { r.gentle = done + 1; if (done === 0) r.waves = 1; }
          r.ramp = done;
        }
        G.sfx('lock');
        if (r.type === 'boss') G.spawnBoss(r); else G.spawnWave(r);
      }
    }
    const a = g.active;
    if (a && a.type === 'combat' && g.enemies.length === 0) {
      if (a.wave < a.waves) G.spawnWave(a); else clearRoom(a);
    }
  };
})();
