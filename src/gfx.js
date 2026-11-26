// 图形底层：主题配色、程序生成的瓦片图集、地图分块缓存、房间装饰、动态光照
'use strict';
(function () {
  const G = window.G, S = G.TILE, T = G.T, TAU = Math.PI * 2;
  const CHUNK = 16, CPX = CHUNK * S;

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rgb(hex) {
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  G.rgba = (hex, a) => { const c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const shadeCache = {};
  // k>0 提亮，k<0 压暗
  G.shade = (hex, k) => {
    const key = hex + k;
    if (shadeCache[key]) return shadeCache[key];
    const c = rgb(hex).map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
    return (shadeCache[key] = 'rgb(' + c.join(',') + ')');
  };
  function prng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  G.THEMES = [
    { name: '灰烬矿道', floor: '#33291f', floorHi: '#41352a', wall: '#96724f', face: '#5e4532', roof: '#1f1712', void: '#090605', accent: '#ff9d4a', block: '#a06e3e', dark: '9,6,4', mote: '#ffb066' },
    { name: '霜蚀书库', floor: '#22323a', floorHi: '#2b3f49', wall: '#78aab8', face: '#3d6170', roof: '#131f26', void: '#04080b', accent: '#6fe0ff', block: '#8cc4d2', dark: '3,7,12', mote: '#bff3ff' },
    { name: '渊心祭坛', floor: '#2b2138', floorHi: '#372a47', wall: '#9a78cc', face: '#573f7c', roof: '#191224', void: '#06040a', accent: '#d27bff', block: '#a886dc', dark: '8,4,14', mote: '#e6b0ff' }
  ];
  G.theme = () => G.THEMES[Math.min(G.game.floor, 3) - 1];

  // ---------- 发光贴图 ----------
  const glows = {};
  G.glowSprite = function (color) {
    if (glows[color]) return glows[color];
    const c = mk(64, 64), x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, G.rgba(color, 0.95)); gr.addColorStop(0.3, G.rgba(color, 0.42)); gr.addColorStop(1, G.rgba(color, 0));
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return (glows[color] = c);
  };
  G.glow = function (ctx, color, x, y, r, a) {
    ctx.globalAlpha = a;
    ctx.drawImage(G.glowSprite(color), x - r, y - r, r * 2, r * 2);
  };

  // 敌方子弹：光晕 + 弹体 + 亮芯 预渲染成一张贴图
  const bsprites = {};
  G.bulletSprite = function (color, r) {
    const key = color + r;
    if (bsprites[key]) return bsprites[key];
    const R = Math.ceil(r * 2.6), c = mk(R * 2, R * 2), x = c.getContext('2d');
    const gr = x.createRadialGradient(R, R, r * 0.8, R, R, R);
    gr.addColorStop(0, G.rgba(color, 0.55)); gr.addColorStop(1, G.rgba(color, 0));
    x.fillStyle = gr; x.fillRect(0, 0, R * 2, R * 2);
    x.fillStyle = '#140e14'; x.beginPath(); x.arc(R, R, r + 2, 0, TAU); x.fill();
    x.fillStyle = color; x.beginPath(); x.arc(R, R, r + 1, 0, TAU); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(R, R, r * 0.55, 0, TAU); x.fill();
    c.R = R;
    return (bsprites[key] = c);
  };

  // ---------- 瓦片图集 ----------
  function noise(x, r, n, ox, oy, w, h) {
    for (let i = 0; i < n; i++) {
      x.fillStyle = r() < 0.55 ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.05)';
      x.fillRect(ox + Math.floor(r() * w), oy + Math.floor(r() * h), 1 + Math.floor(r() * 2), 1);
    }
  }
  function floorTile(x, ox, oy, th, v, fi, r) {
    x.fillStyle = th.floor; x.fillRect(ox, oy, S, S);
    x.fillStyle = th.floorHi; x.fillRect(ox + 1, oy + 1, S - 2, S - 2);
    noise(x, r, 46, ox + 1, oy + 1, S - 3, S - 2);
    x.fillStyle = 'rgba(255,255,255,0.07)'; x.fillRect(ox + 1, oy + 1, S - 2, 1); x.fillRect(ox + 1, oy + 1, 1, S - 2);
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(ox + 1, oy + S - 2, S - 2, 1); x.fillRect(ox + S - 2, oy + 1, 1, S - 2);
    if (v === 3) {
      x.fillStyle = th.floor; x.fillRect(ox + 15, oy + 1, 2, S - 2); x.fillRect(ox + 1, oy + 15, S - 2, 2);
      x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(ox + 17, oy + 2, 1, S - 4); x.fillRect(ox + 2, oy + 17, S - 4, 1);
    } else if (v === 4) {
      let cx = ox + 4 + r() * 8, cy = oy + 3;
      x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx, cy);
      for (let i = 0; i < 5; i++) { cx += r() * 8 - 2; cy += 4 + r() * 3; x.lineTo(cx, cy); }
      x.stroke();
    } else if (v === 5) {
      for (let i = 0; i < 3; i++) {
        const px = ox + 6 + r() * 20, py = oy + 6 + r() * 20;
        x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(px, py + 1, 3, 2, 0, 0, TAU); x.fill();
        x.fillStyle = G.shade(th.floorHi, 0.18); x.beginPath(); x.ellipse(px, py, 2.5, 1.8, 0, 0, TAU); x.fill();
      }
    } else if (v === 6) {
      x.fillStyle = th.floor; x.beginPath(); x.moveTo(ox + 1, oy + 1); x.lineTo(ox + 12, oy + 1); x.lineTo(ox + 1, oy + 10); x.closePath(); x.fill();
    } else if (v === 7) {
      if (fi === 0) { x.fillStyle = 'rgba(255,150,60,0.5)'; for (let i = 0; i < 4; i++) x.fillRect(ox + 5 + r() * 22, oy + 5 + r() * 22, 1.5, 1.5); }
      else if (fi === 1) { x.strokeStyle = 'rgba(220,245,255,0.16)'; x.lineWidth = 1; for (let i = 0; i < 4; i++) { const px = ox + 4 + r() * 20, py = oy + 4 + r() * 22; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 6, py - 4); x.stroke(); } }
      else { x.strokeStyle = G.rgba(th.accent, 0.3); x.lineWidth = 1.2; x.beginPath(); x.moveTo(ox + 11, oy + 9); x.lineTo(ox + 21, oy + 9); x.lineTo(ox + 16, oy + 23); x.closePath(); x.moveTo(ox + 16, oy + 9); x.lineTo(ox + 16, oy + 17); x.stroke(); }
    }
  }
  function faceTile(x, ox, oy, th, v, r) {
    x.fillStyle = th.wall; x.fillRect(ox, oy, S, 12);
    x.fillStyle = G.shade(th.wall, 0.28); x.fillRect(ox, oy, S, 2);
    noise(x, r, 14, ox, oy + 2, S, 9);
    x.fillStyle = G.shade(th.face, -0.5); x.fillRect(ox, oy + 11, S, 21);
    const rows = [[12, v % 2 ? 6 : 12], [22, v % 2 ? 22 : 28]];
    for (const [y, off] of rows) {
      for (let bx = off - 32; bx < 32; bx += 16) {
        const x0 = Math.max(0, bx + 1), x1 = Math.min(32, bx + 16);
        if (x1 <= x0) continue;
        x.fillStyle = G.shade(th.face, (r() - 0.5) * 0.22); x.fillRect(ox + x0, oy + y + 1, x1 - x0, 9);
        x.fillStyle = 'rgba(255,255,255,0.1)'; x.fillRect(ox + x0, oy + y + 1, x1 - x0, 1);
      }
    }
    noise(x, r, 20, ox, oy + 12, S, 19);
    if (v === 2) { x.fillStyle = G.rgba(th.accent, 0.35); for (let i = 0; i < 5; i++) x.fillRect(ox + r() * 30, oy + 14 + r() * 14, 2, 2); }
    if (v === 3) { x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(ox + 9, oy + 12); x.lineTo(ox + 13, oy + 19); x.lineTo(ox + 10, oy + 25); x.lineTo(ox + 14, oy + 31); x.stroke(); }
    const gr = x.createLinearGradient(0, oy + 24, 0, oy + 32);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)');
    x.fillStyle = gr; x.fillRect(ox, oy + 24, S, 8);
  }
  function blockTile(x, ox, oy, th, fi, r) {
    const cap = th.block, face = G.shade(th.block, -0.42);
    x.fillStyle = '#0a0808'; x.fillRect(ox + 1, oy, S - 2, S);
    x.fillStyle = cap; x.fillRect(ox + 2, oy + 1, S - 4, 12);
    x.fillStyle = G.shade(cap, 0.3); x.fillRect(ox + 2, oy + 1, S - 4, 2);
    x.fillStyle = face; x.fillRect(ox + 2, oy + 13, S - 4, 17);
    noise(x, r, 26, ox + 2, oy + 2, S - 5, 27);
    if (fi === 0) {
      x.strokeStyle = G.shade(cap, -0.6); x.lineWidth = 2;
      x.beginPath(); x.moveTo(ox + 4, oy + 15); x.lineTo(ox + 28, oy + 28); x.moveTo(ox + 28, oy + 15); x.lineTo(ox + 4, oy + 28); x.stroke();
      x.strokeRect(ox + 3, oy + 14, S - 6, 15);
      x.fillStyle = '#4a4a54'; for (const [px, py] of [[3, 14], [25, 14], [3, 25], [25, 25]]) x.fillRect(ox + px, oy + py, 4, 4);
    } else if (fi === 1) {
      x.strokeStyle = 'rgba(255,255,255,0.4)'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(ox + 6, oy + 26); x.lineTo(ox + 15, oy + 15); x.moveTo(ox + 13, oy + 27); x.lineTo(ox + 19, oy + 20); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(ox + 5, oy + 4, 9, 3);
    } else {
      x.fillStyle = G.rgba(th.accent, 0.8); x.fillRect(ox + 12, oy + 5, 8, 4);
      x.strokeStyle = G.rgba(th.accent, 0.6); x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(ox + 16, oy + 15); x.lineTo(ox + 16, oy + 27); x.moveTo(ox + 11, oy + 19); x.lineTo(ox + 21, oy + 19); x.stroke();
    }
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(ox + 2, oy + 28, S - 4, 2);
  }
  const atlases = {};
  function atlas(fi) {
    if (atlases[fi]) return atlases[fi];
    const th = G.THEMES[fi], c = mk(S * 8, S * 3), x = c.getContext('2d'), r = prng(1234 + fi * 77);
    for (let v = 0; v < 8; v++) floorTile(x, v * S, 0, th, v, fi, r);
    for (let v = 0; v < 4; v++) faceTile(x, v * S, S, th, v, r);
    for (let v = 0; v < 2; v++) {
      const ox = (4 + v) * S;
      x.fillStyle = th.roof; x.fillRect(ox, S, S, S);
      noise(x, r, 30, ox, S, S, S);
    }
    blockTile(x, 0, S * 2, th, fi, r);
    // 门槛
    floorTile(x, S, S * 2, th, 0, fi, r);
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(S + 2, S * 2 + 2, S - 4, S - 4);
    x.fillStyle = G.rgba(th.accent, 0.35); x.fillRect(S + 6, S * 2 + 14, S - 12, 4);
    return (atlases[fi] = c);
  }

  // ---------- 房间装饰（每层生成一次） ----------
  G.decorate = function (d) {
    const fi = Math.min(d.floor, 3) - 1;
    d.decals = []; d.torches = []; d.doors = []; d.chunks = {}; d.fi = fi;
    for (let i = 0; i < d.tiles.length; i++) if (d.tiles[i] === T.DOOR) d.doors.push({ tx: i % d.w, ty: Math.floor(i / d.w), owner: d.owner[i] });
    for (const r of d.rooms) {
      if (r.type === 'chest') d.decals.push({ kind: 'rug', x: r.cx, y: r.cy, w: 150, h: 96, color: '#ffc94a' });
      else if (r.type === 'shop') d.decals.push({ kind: 'rug', x: r.cx, y: r.cy + 6, w: 370, h: 110, color: '#5dff8a' });
      else if (r.type === 'start') d.decals.push({ kind: 'sigil', x: r.cx, y: r.cy, r: 62 });
      else if (r.type === 'boss') d.decals.push({ kind: 'sigil', x: r.cx, y: r.cy, r: 150 });
      const n = Math.floor(r.w * r.h / 16);
      for (let i = 0; i < n; i++) {
        d.decals.push({ kind: 'mark', v: G.randi(0, 3), seed: G.randi(1, 1e9), x: (r.x + 0.6 + Math.random() * (r.w - 1.2)) * S, y: (r.y + 0.6 + Math.random() * (r.h - 1.2)) * S });
      }
      for (const k of [-11, -7, -3, 3, 7, 11]) {
        const tx = r.ctx + k, ty = r.y - 1;
        if (tx <= r.x || tx >= r.x + r.w - 1) continue;
        if (d.tiles[ty * d.w + tx] === T.WALL) d.torches.push({ x: (tx + 0.5) * S, y: ty * S + 17, ph: Math.random() * 9 });
      }
      if (r.type === 'boss') {
        for (const [ax, ay] of [[1, 1], [r.w - 2, 1], [1, r.h - 2], [r.w - 2, r.h - 2]]) d.torches.push({ x: (r.x + ax + 0.5) * S, y: (r.y + ay + 0.5) * S, ph: Math.random() * 9, brazier: true });
      }
    }
  };

  function drawDecal(x, dc, th, fi) {
    if (dc.kind === 'rug') {
      const w = dc.w, h = dc.h, x0 = dc.x - w / 2, y0 = dc.y - h / 2;
      x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(x0 - 2, y0 - 2, w + 4, h + 6);
      x.fillStyle = G.rgba(dc.color, 0.2); x.fillRect(x0, y0, w, h);
      x.strokeStyle = G.rgba(dc.color, 0.55); x.lineWidth = 2; x.strokeRect(x0 + 5, y0 + 5, w - 10, h - 10);
      x.strokeStyle = G.rgba(dc.color, 0.28); x.lineWidth = 1; x.strokeRect(x0 + 10.5, y0 + 10.5, w - 21, h - 21);
      x.fillStyle = G.rgba(dc.color, 0.3);
      for (let px = x0 + 26; px < x0 + w - 16; px += 22) { x.beginPath(); x.moveTo(px, y0 + h / 2 - 7); x.lineTo(px + 6, y0 + h / 2); x.lineTo(px, y0 + h / 2 + 7); x.lineTo(px - 6, y0 + h / 2); x.closePath(); x.fill(); }
      x.fillStyle = G.rgba(dc.color, 0.4);
      for (let py = y0 + 3; py < y0 + h - 2; py += 6) { x.fillRect(x0 - 5, py, 5, 2); x.fillRect(x0 + w, py, 5, 2); }
    } else if (dc.kind === 'sigil') {
      const R = dc.r;
      x.strokeStyle = G.rgba(th.accent, 0.34); x.lineWidth = 3;
      x.beginPath(); x.arc(dc.x, dc.y, R, 0, TAU); x.stroke();
      x.lineWidth = 1.5; x.beginPath(); x.arc(dc.x, dc.y, R * 0.82, 0, TAU); x.stroke();
      x.strokeStyle = G.rgba(th.accent, 0.22);
      x.beginPath();
      for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i * TAU / 6 * 2; const px = dc.x + Math.cos(a) * R * 0.8, py = dc.y + Math.sin(a) * R * 0.8; if (i) x.lineTo(px, py); else x.moveTo(px, py); }
      x.stroke();
      x.beginPath();
      for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + i * TAU / 6 * 2; const px = dc.x + Math.cos(a) * R * 0.8, py = dc.y + Math.sin(a) * R * 0.8; if (i) x.lineTo(px, py); else x.moveTo(px, py); }
      x.stroke();
      x.strokeStyle = G.rgba(th.accent, 0.4); x.lineWidth = 2;
      for (let i = 0; i < 24; i++) { const a = i * TAU / 24; x.beginPath(); x.moveTo(dc.x + Math.cos(a) * R * 0.86, dc.y + Math.sin(a) * R * 0.86); x.lineTo(dc.x + Math.cos(a) * R * 0.96, dc.y + Math.sin(a) * R * 0.96); x.stroke(); }
    } else {
      const r = prng(dc.seed);
      if (dc.v === 0) {
        let cx = dc.x, cy = dc.y; const a0 = r() * TAU;
        x.strokeStyle = 'rgba(0,0,0,0.42)'; x.lineWidth = 1.3; x.beginPath(); x.moveTo(cx, cy);
        for (let i = 0; i < 6; i++) { const a = a0 + (r() - 0.5) * 1.4; cx += Math.cos(a) * 7; cy += Math.sin(a) * 7; x.lineTo(cx, cy); }
        x.stroke();
      } else if (dc.v === 1) {
        x.fillStyle = 'rgba(0,0,0,0.2)';
        for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(dc.x + r() * 16 - 8, dc.y + r() * 10 - 5, 8 + r() * 10, 5 + r() * 6, r() * 3, 0, TAU); x.fill(); }
      } else if (dc.v === 2) {
        if (fi === 0) {
          x.strokeStyle = 'rgba(235,225,200,0.34)'; x.lineWidth = 2.2; x.lineCap = 'round';
          const a = r() * TAU; x.beginPath(); x.moveTo(dc.x - Math.cos(a) * 7, dc.y - Math.sin(a) * 7); x.lineTo(dc.x + Math.cos(a) * 7, dc.y + Math.sin(a) * 7); x.stroke();
          x.fillStyle = 'rgba(235,225,200,0.34)'; x.beginPath(); x.arc(dc.x + 9, dc.y + 5, 3.4, 0, TAU); x.fill(); x.lineCap = 'butt';
        } else if (fi === 1) {
          const gr = x.createRadialGradient(dc.x, dc.y, 0, dc.x, dc.y, 26);
          gr.addColorStop(0, 'rgba(220,245,255,0.16)'); gr.addColorStop(1, 'rgba(220,245,255,0)');
          x.fillStyle = gr; x.fillRect(dc.x - 26, dc.y - 26, 52, 52);
        } else {
          x.strokeStyle = G.rgba(th.accent, 0.3); x.lineWidth = 1.5;
          x.beginPath(); x.arc(dc.x, dc.y, 7, 0, TAU); x.moveTo(dc.x - 7, dc.y); x.lineTo(dc.x + 7, dc.y); x.moveTo(dc.x, dc.y - 11); x.lineTo(dc.x, dc.y + 11); x.stroke();
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const px = dc.x + r() * 22 - 11, py = dc.y + r() * 16 - 8, s = 1.5 + r() * 2;
          x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(px, py + 1, s + 0.5, s * 0.7, 0, 0, TAU); x.fill();
          x.fillStyle = G.shade(th.floorHi, 0.2); x.beginPath(); x.ellipse(px, py, s, s * 0.7, 0, 0, TAU); x.fill();
        }
      }
    }
  }

  function bakeChunk(d, cx, cy) {
    const fi = d.fi, th = G.THEMES[fi], at = atlas(fi), c = mk(CPX, CPX), x = c.getContext('2d');
    const tx0 = cx * CHUNK, ty0 = cy * CHUNK;
    const at2 = (tx, ty) => (tx < 0 || ty < 0 || tx >= d.w || ty >= d.h ? T.VOID : d.tiles[ty * d.w + tx]);
    const walk = t => t === T.FLOOR || t === T.DOOR;
    x.translate(-tx0 * S, -ty0 * S);
    // 第一遍：地面
    for (let ty = ty0; ty < ty0 + CHUNK; ty++) for (let tx = tx0; tx < tx0 + CHUNK; tx++) {
      const t = at2(tx, ty), px = tx * S, py = ty * S;
      if (t === T.FLOOR || t === T.BLOCK) {
        const h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0, k = h % 16;
        const v = k < 9 ? k % 3 : k < 11 ? 3 : k === 11 || k === 15 ? 4 : k === 12 ? 5 : k === 13 ? 6 : 7;
        x.drawImage(at, v * S, 0, S, S, px, py, S, S);
      } else if (t === T.DOOR) x.drawImage(at, S, S * 2, S, S, px, py, S, S);
    }
    // 贴花（只画在地面上）
    for (const dc of d.decals) {
      if (dc.x < tx0 * S - 220 || dc.x > tx0 * S + CPX + 220 || dc.y < ty0 * S - 220 || dc.y > ty0 * S + CPX + 220) continue;
      drawDecal(x, dc, th, fi);
    }
    // 第二遍：墙体、掩体与接触阴影
    for (let ty = ty0; ty < ty0 + CHUNK; ty++) for (let tx = tx0; tx < tx0 + CHUNK; tx++) {
      const t = at2(tx, ty), px = tx * S, py = ty * S;
      if (walk(t)) {
        const up = at2(tx, ty - 1), lf = at2(tx - 1, ty), rt = at2(tx + 1, ty);
        if (up === T.WALL || up === T.BLOCK) { const gr = x.createLinearGradient(0, py, 0, py + 16); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(px, py, S, 16); }
        if (lf === T.WALL || lf === T.BLOCK) { const gr = x.createLinearGradient(px, 0, px + 10, 0); gr.addColorStop(0, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(px, py, 10, S); }
        if (rt === T.WALL || rt === T.BLOCK) { const gr = x.createLinearGradient(px + S - 7, 0, px + S, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)'); x.fillStyle = gr; x.fillRect(px + S - 7, py, 7, S); }
      } else if (t === T.WALL) {
        const h = ((tx * 83492791) ^ (ty * 2971215073)) >>> 0, dn = at2(tx, ty + 1);
        if (walk(dn) || dn === T.BLOCK) x.drawImage(at, (h % 7 < 4 ? h % 2 : 2 + h % 2) * S, S, S, S, px, py, S, S);
        else {
          x.drawImage(at, (4 + h % 2) * S, S, S, S, px, py, S, S);
          x.fillStyle = G.shade(th.wall, -0.15);
          if (walk(at2(tx - 1, ty))) x.fillRect(px, py, 3, S);
          if (walk(at2(tx + 1, ty))) x.fillRect(px + S - 3, py, 3, S);
          if (walk(at2(tx, ty - 1))) x.fillRect(px, py, S, 4);
          if (at2(tx, ty + 1) === T.WALL && (walk(at2(tx, ty + 2)) || at2(tx, ty + 2) === T.BLOCK)) { x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(px, py + S - 4, S, 4); }
        }
      } else if (t === T.BLOCK) x.drawImage(at, 0, S * 2, S, S, px, py, S, S);
    }
    return c;
  }

  // 每帧在后台烘焙一个分块，避免走到新区域时卡顿
  G.prebake = function (d) {
    if (!d.bakeQ) {
      d.bakeQ = [];
      const st = d.start;
      for (let cy = 0; cy < Math.ceil(d.h / CHUNK); cy++) for (let cx = 0; cx < Math.ceil(d.w / CHUNK); cx++) {
        let any = false;
        for (let ty = cy * CHUNK; ty < Math.min(d.h, (cy + 1) * CHUNK) && !any; ty++) for (let tx = cx * CHUNK; tx < Math.min(d.w, (cx + 1) * CHUNK); tx++) if (d.tiles[ty * d.w + tx] !== T.VOID) { any = true; break; }
        if (any) d.bakeQ.push([cx, cy, Math.hypot((cx + 0.5) * CHUNK - st.ctx, (cy + 0.5) * CHUNK - st.cty)]); else d.chunks[cx + ',' + cy] = EMPTY;
      }
      d.bakeQ.sort((a, b) => b[2] - a[2]);
    }
    while (d.bakeQ.length) {
      const q = d.bakeQ.pop(), key = q[0] + ',' + q[1];
      if (d.chunks[key]) continue;
      d.chunks[key] = bakeChunk(d, q[0], q[1]);
      break;
    }
  };
  const EMPTY = {};
  // 换层时（黑屏转场下）先把出生点周围的分块烘焙好
  G.prebakeNear = function (d, x, y) {
    G.prebake(d);
    const cx = Math.floor(x / CPX), cy = Math.floor(y / CPX);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const key = (cx + ox) + ',' + (cy + oy);
      if (!d.chunks[key] && cx + ox >= 0 && cy + oy >= 0) d.chunks[key] = bakeChunk(d, cx + ox, cy + oy);
    }
  };
  // 在主菜单期间分帧预热：三套瓦片图集、常用光晕贴图、光照画布
  let warmStep = 0;
  G.warm = function (ctx) {
    if (warmStep > 5) return;
    if (warmStep < 3) atlas(warmStep);
    else if (warmStep === 3) { for (const c of ['#ff9a3c', '#ffcf3e', '#6fe0ff', '#5dff8a', '#ffd27a', '#ffd86b']) G.glowSprite(c); for (const k in G.ENEMIES) G.glowSprite(G.ENEMIES[k].color); }
    else if (warmStep === 4) { for (const k in G.WEAPONS) G.glowSprite(G.WEAPONS[k].color); for (const r of [5, 6, 8]) for (const c of ['#ff5d5d', '#ffb84a', '#a4ff7a', '#8af4ff']) G.bulletSprite(c, r); }
    else { ctx.save(); ctx.globalAlpha = 0.01; for (const f of [G.FONT, G.FONT_T]) for (const b of ['', 'bold ']) { ctx.font = b + '14px ' + f; ctx.fillText('0123456789层击杀', -200, -200); } ctx.restore(); }
    warmStep++;
  };

  G.drawMap = function (ctx, g) {
    const d = g.dungeon, cam = g.cam;
    const cx0 = Math.max(0, Math.floor(cam.x / CPX)), cx1 = Math.min(Math.ceil(d.w / CHUNK) - 1, Math.floor((cam.x + G.W) / CPX));
    const cy0 = Math.max(0, Math.floor(cam.y / CPX)), cy1 = Math.min(Math.ceil(d.h / CHUNK) - 1, Math.floor((cam.y + G.H) / CPX));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const key = cx + ',' + cy;
      const c = d.chunks[key] || (d.chunks[key] = bakeChunk(d, cx, cy));
      if (c !== EMPTY) ctx.drawImage(c, cx * CPX, cy * CPX);
    }
  };

  // 锁住的门：两侧立柱 + 能量屏障
  G.drawDoors = function (ctx, g, th) {
    const d = g.dungeon, cam = g.cam;
    for (const dr of d.doors) {
      const r = d.rooms[dr.owner];
      if (!r.locked) continue;
      const px = dr.tx * S, py = dr.ty * S;
      if (px < cam.x - S || px > cam.x + G.W || py < cam.y - S || py > cam.y + G.H) continue;
      ctx.fillStyle = '#120e14'; ctx.fillRect(px, py, S, S);
      ctx.fillStyle = G.rgba(th.accent, 0.16 + Math.sin(g.time * 7 + dr.tx + dr.ty) * 0.06); ctx.fillRect(px, py, S, S);
      const vert = d.tiles[dr.ty * d.w + dr.tx - 1] === T.DOOR || d.tiles[dr.ty * d.w + dr.tx + 1] === T.DOOR;
      for (let i = 0; i < 3; i++) {
        const o = 5 + i * 11, fl = 0.75 + Math.sin(g.time * 14 + i * 2 + dr.tx) * 0.25;
        ctx.fillStyle = G.rgba(th.accent, fl);
        if (vert) ctx.fillRect(px + o - 2, py + 2, 4, S - 4); else ctx.fillRect(px + 2, py + o - 2, S - 4, 4);
        ctx.fillStyle = '#fff';
        if (vert) ctx.fillRect(px + o - 0.5, py + 3, 1.5, S - 6); else ctx.fillRect(px + 3, py + o - 0.5, S - 6, 1.5);
      }
      ctx.fillStyle = '#3a323c';
      if (vert) { ctx.fillRect(px, py, S, 3); ctx.fillRect(px, py + S - 3, S, 3); } else { ctx.fillRect(px, py, 3, S); ctx.fillRect(px + S - 3, py, 3, S); }
    }
  };

  G.drawTorches = function (ctx, g, lit) {
    const d = g.dungeon, cam = g.cam;
    for (const t of d.torches) {
      if (t.x < cam.x - 60 || t.x > cam.x + G.W + 60 || t.y < cam.y - 60 || t.y > cam.y + G.H + 60) continue;
      const f = Math.sin(g.time * 11 + t.ph) * 0.5 + Math.sin(g.time * 23 + t.ph * 2) * 0.5;
      if (!lit) {
        if (t.brazier) {
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(t.x, t.y + 9, 12, 4, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#2a2428'; ctx.fillRect(t.x - 2, t.y, 4, 9);
          ctx.fillStyle = '#4a4248'; ctx.beginPath(); ctx.moveTo(t.x - 11, t.y - 6); ctx.lineTo(t.x + 11, t.y - 6); ctx.lineTo(t.x + 6, t.y + 2); ctx.lineTo(t.x - 6, t.y + 2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#6a6068'; ctx.fillRect(t.x - 11, t.y - 7, 22, 2);
        } else {
          ctx.fillStyle = '#231d1d'; ctx.fillRect(t.x - 1.5, t.y - 1, 3, 9);
          ctx.fillStyle = '#4a4040'; ctx.fillRect(t.x - 4, t.y - 3, 8, 3);
        }
        continue;
      }
      const fy = t.y - (t.brazier ? 8 : 5), s = t.brazier ? 1.5 : 1;
      G.glow(ctx, '#ff9a3c', t.x, fy, (t.brazier ? 60 : 44) + f * 5, 0.5);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ff8a2a';
      ctx.beginPath(); ctx.moveTo(t.x - 4 * s, fy + 2); ctx.quadraticCurveTo(t.x - 5 * s, fy - 5 * s, t.x + f * 1.5, fy - (10 + f * 2) * s); ctx.quadraticCurveTo(t.x + 5 * s, fy - 5 * s, t.x + 4 * s, fy + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff0b0';
      ctx.beginPath(); ctx.ellipse(t.x, fy - 1, 1.8 * s, 3.4 * s, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
    }
  };

  // ---------- 光照：半分辨率暗幕上挖出光斑 ----------
  let lightC = null, lightX = null, mask = null;
  G.resetHooks.push(() => { lightC = null; });
  const masks = {};
  G.drawLighting = function (ctx, g, th) {
    if (!lightC) {
      lightC = mk(G.W / 2, G.H / 2); lightX = lightC.getContext('2d');
      mask = mk(128, 128);
      const mx = mask.getContext('2d'), gr = mx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      mx.fillStyle = gr; mx.fillRect(0, 0, 128, 128);
    }
    const x = lightX, cam = g.cam, p = g.player, d = g.dungeon;
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.clearRect(0, 0, G.W / 2, G.H / 2);
    x.fillStyle = 'rgba(' + th.dark + ',0.74)'; x.fillRect(0, 0, G.W / 2, G.H / 2);
    x.globalCompositeOperation = 'destination-out';
    const add = (wx, wy, r, a) => {
      const sx = (wx - cam.x) / 2, sy = (wy - cam.y) / 2, rr = r / 2;
      if (sx < -rr || sy < -rr || sx > G.W / 2 + rr || sy > G.H / 2 + rr) return;
      const q = Math.max(16, Math.round(r / 12) * 12);
      let m = masks[q];
      if (!m) { m = masks[q] = mk(q, q); m.getContext('2d').drawImage(mask, 0, 0, q, q); }
      x.globalAlpha = a; x.drawImage(m, Math.round(sx - q / 2), Math.round(sy - q / 2));
    };
    // 当前房间整体提亮，突出战斗区域
    const rm = G.roomAt(p.x, p.y, 0);
    if (rm) { x.globalAlpha = 0.6; x.fillStyle = '#fff'; x.fillRect((rm.x * S - cam.x - S) / 2, (rm.y * S - cam.y - S) / 2, (rm.w + 2) * S / 2, (rm.h + 2) * S / 2); }
    add(p.x, p.y, 330, 1);
    for (const t of d.torches) add(t.x, t.y + 8, (t.brazier ? 250 : 190) + Math.sin(g.time * 11 + t.ph) * 10, 0.85);
    for (const it of g.items) add(it.x, it.y, it.kind === 'portal' ? 220 : 110, 0.7);
    for (const b of g.bullets) add(b.x, b.y, 70, 0.5);
    const eb = g.ebullets, step = eb.length > 300 ? 3 : eb.length > 120 ? 2 : 1;
    for (let i = 0; i < eb.length; i += step) add(eb[i].x, eb[i].y, 54, 0.45);
    for (const e of g.enemies) if (e.def.boss) add(e.x, e.y, 260, 0.8);
    for (const e of g.effects) if (e.type === 'boom') add(e.x, e.y, e.rad * 3.2, 1 - e.t / e.dur);
    if (p.beam) { const b = p.beam; for (let k = 0; k <= 1; k += 0.125) add(b.x1 + (b.x2 - b.x1) * k, b.y1 + (b.y2 - b.y1) * k, 90, 0.5); }
    ctx.drawImage(lightC, 0, 0, G.W, G.H);
  };

  // 漂浮的尘埃 / 余烬（屏幕空间，带视差）
  G.drawMotes = function (ctx, g, th) {
    const t = g.time;
    ctx.fillStyle = th.mote;
    for (let i = 0; i < 40; i++) {
      const par = 0.3 + (i % 5) * 0.12;
      const x = (((i * 211.7 + Math.sin(t * 0.4 + i) * 30 + t * (6 + i % 7) - g.cam.x * par) % G.W) + G.W) % G.W;
      const y = (((i * 97.3 - t * (10 + i % 9) - g.cam.y * par) % G.H) + G.H) % G.H;
      const s = 1.5 + (i % 3);
      ctx.globalAlpha = 0.14 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7));
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
  };
  G.mkCanvas = mk;
})();
