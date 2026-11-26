// 商店素材与图标渲染（复用游戏里的角色绘制）。由 tools/art.py 注入到 烬渊.html 后用无头浏览器截图
'use strict';
window.addEventListener('load', () => {
  const G = window.G;
  G.debug.manual = true;
  const kind = location.hash.slice(1) || 'header';
  const q = new URLSearchParams(location.search), W = +q.get('w') || window.innerWidth, H = +q.get('h') || window.innerHeight;
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;background:transparent;overflow:hidden';
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H; cv.style.display = 'block';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d'), TAU = Math.PI * 2, g = { time: 1.3 };

  const glow = (col, x, y, r, a) => { ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, col, x, y, r, a); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; };
  const enemy = (type, x, y, s, face, extra) => {
    const e = Object.assign({ age: 2.1 + x * 0.01, face: face || 0, state: null, t: 1, flash: 0, id: 3, tele: 0, alpha: 1, r: G.ENEMIES[type].r }, extra || {});
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x, y + e.r * 0.85 * s, e.r * s, e.r * 0.38 * s, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); G.ENEMIES[type].draw(ctx, e); ctx.restore();
  };
  const hero = (x, y, s, aim, wpn) => {
    const p = { x: 0, y: 0, aim, walk: 1, moving: true, capeX: -6, capeY: 2, weapons: [wpn || 'launcher'], cur: 0, recoil: 0.3, dashT: 0, hurtFlash: 0 };
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(x, y + 12 * s, 12 * s, 4.5 * s, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); G.drawPlayerSprite(ctx, p, g); ctx.restore();
  };
  const orb = (x, y, r, col) => { glow(col, x, y, r * 4, 0.6); ctx.fillStyle = '#140e14'; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, TAU); ctx.fill(); };

  function backdrop(u) {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#070405'); gr.addColorStop(0.5, '#1a0b08'); gr.addColorStop(1, '#5a2208');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    glow('#ff7a2a', W * 0.5, H * 1.12, Math.max(W, H) * 0.7, 0.6);
    glow('#d05bff', W * 0.74, H * 0.42, H * 0.7, 0.28);
    for (let i = 0; i < 7; i++) {
      const x = W * (0.08 + i * 0.15), w = 30 * u + (i % 3) * 20 * u;
      const lg = ctx.createLinearGradient(0, H, 0, 0);
      lg.addColorStop(0, 'rgba(255,150,70,0.16)'); lg.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x - w, H); ctx.lineTo(x + w, H); ctx.lineTo(x + w * 0.3 + 40 * u, 0); ctx.lineTo(x - w * 0.3 + 40 * u, 0); ctx.fill();
    }
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? '#0a0506' : '#1c0e0a';
      const n = Math.ceil(W / (120 * u)) + 2;
      for (let i = 0; i < n; i++) {
        const x = i * 120 * u - 50 * u + (layer ? 55 * u : 0), h = (60 + ((i * 53 + layer * 31) % 110)) * u * 0.9, w = (34 + ((i * 29) % 30)) * u;
        ctx.beginPath(); ctx.moveTo(x - w, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + 4 * u, h + (layer ? 40 * u : 0)); ctx.fill();
        const bh = (70 + ((i * 71 + layer * 17) % 120)) * u * 0.8;
        ctx.beginPath(); ctx.moveTo(x + 50 * u - w * 0.8, H); ctx.lineTo(x + 50 * u + w * 0.8, H); ctx.lineTo(x + 56 * u, H - bh - (layer ? 60 * u : 0)); ctx.lineTo(x + 44 * u, H - bh - (layer ? 50 * u : 0)); ctx.fill();
      }
    }
    const sp = G.glowSprite('#ffb066');
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 140; i++) {
      const x = (i * 137.5 * u) % W, y = (i * 91.7 * u + i * i * 3) % H, s = (2 + (i % 4) * 1.8) * u;
      ctx.globalAlpha = 0.2 + (i % 5) * 0.12;
      ctx.drawImage(sp, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // 主体场景：旅人对峙渊心，弹幕与小怪环绕。cx, cy 为画面中心，u 为缩放
  function scene(cx, cy, u) {
    glow('#d05bff', cx + 150 * u, cy - 40 * u, 230 * u, 0.5);
    enemy('boss3', cx + 160 * u, cy - 50 * u, 3.3 * u, Math.PI * 0.85, { tele: 1 });
    const cols = ['#ff8ae0', '#c08aff', '#ffb36a'];
    for (let i = 0; i < 26; i++) {
      const a = i * TAU / 26 + 0.2, r = (150 + (i % 3) * 38) * u;
      orb(cx + 160 * u + Math.cos(a) * r, cy - 50 * u + Math.sin(a) * r * 0.8, 5 * u, cols[i % 3]);
    }
    enemy('lunger', cx - 40 * u, cy - 130 * u, 1.9 * u, 2.4, { state: 'wind' });
    enemy('gazer', cx + 340 * u, cy + 90 * u, 1.8 * u, Math.PI, { state: 'aim' });
    enemy('spore', cx + 20 * u, cy + 120 * u, 1.7 * u, 0);
    enemy('fuse', cx - 120 * u, cy + 130 * u, 1.7 * u, -0.6, { state: 'fuse' });
    enemy('wick', cx + 300 * u, cy - 170 * u, 1.7 * u, 2.6);
    // 旅人与开火的光
    const hx = cx - 190 * u, hy = cy + 20 * u, aim = Math.atan2(cy - 50 * u - hy, cx + 160 * u - hx);
    glow('#ffd27a', hx, hy, 120 * u, 0.4);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const d = (110 + i * 70) * u, x = hx + Math.cos(aim + (i - 1) * 0.05) * d, y = hy + Math.sin(aim + (i - 1) * 0.05) * d;
      glow('#ffb347', x, y, 34 * u, 0.7);
      ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 10 * u; ctx.beginPath(); ctx.moveTo(x - Math.cos(aim) * 26 * u, y - Math.sin(aim) * 26 * u); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * u; ctx.beginPath(); ctx.moveTo(x - Math.cos(aim) * 12 * u, y - Math.sin(aim) * 12 * u); ctx.lineTo(x, y); ctx.stroke();
    }
    hero(hx, hy, 3.6 * u, aim);
    glow('#ffd27a', hx + Math.cos(aim) * 44 * u, hy + Math.sin(aim) * 44 * u, 60 * u, 0.8);
  }

  function title(x, y, size, sub) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = size + 'px ' + G.FONT_T;
    ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = size * 0.35;
    const tg = ctx.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.5);
    tg.addColorStop(0, '#fff8ea'); tg.addColorStop(0.5, '#ffc98a'); tg.addColorStop(1, '#ee6a1c');
    ctx.fillStyle = tg; ctx.fillText('烬渊', x, y);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, size * 0.012); ctx.strokeStyle = 'rgba(60,15,0,0.5)'; ctx.strokeText('烬渊', x, y);
    if (sub) {
      ctx.font = 'bold ' + Math.round(size * 0.13) + 'px ' + G.FONT;
      ctx.fillStyle = '#ffd9b0'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = size * 0.05;
      ctx.fillText('J I N Y U A N', x, y + size * 0.66);
    }
    ctx.restore();
  }

  const dark = (a) => { ctx.fillStyle = 'rgba(5,2,4,' + a + ')'; ctx.fillRect(0, 0, W, H); };
  const vign = () => { const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.7)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); };

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (kind === 'logo') { title(W / 2, H / 2 - H * 0.06, H * 0.5, true); return; }
    if (kind === 'achsheet') {
      // 两行 × 16 列：第一行已解锁，第二行未解锁，每格 256
      G.ach.list.forEach((a, i) => {
        for (const on of [true, false]) {
          const x = i * 256, y = on ? 0 : 256;
          const bg = ctx.createRadialGradient(x + 128, y + 150, 10, x + 128, y + 128, 190);
          bg.addColorStop(0, on ? G.rgba(a.color, 0.45) : '#24202a'); bg.addColorStop(1, on ? '#120a0e' : '#0c0a0e');
          ctx.fillStyle = bg; ctx.fillRect(x, y, 256, 256);
          ctx.save(); ctx.translate(x + 128, y + 128);
          G.poly(ctx, 6, 92, Math.PI / 6); ctx.fillStyle = on ? '#17131c' : '#141218'; ctx.fill();
          ctx.lineWidth = 9; ctx.strokeStyle = on ? a.color : '#3a343e'; ctx.stroke();
          G.poly(ctx, 6, 76, Math.PI / 6); ctx.lineWidth = 2; ctx.strokeStyle = on ? G.rgba(a.color, 0.4) : '#2a262e'; ctx.stroke();
          ctx.restore();
          if (on) glow(a.color, x + 128, y + 128, 110, 0.35);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = '92px ' + G.FONT_T; ctx.fillStyle = on ? a.color : '#4a444e';
          ctx.fillText(a.glyph, x + 128, y + 134);
        }
      });
      return;
    }
    if (kind === 'icon') {
      const s = W / 256;
      ctx.fillStyle = '#120a0a'; ctx.beginPath(); ctx.roundRect(8 * s, 8 * s, 240 * s, 240 * s, 48 * s); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.roundRect(8 * s, 8 * s, 240 * s, 240 * s, 48 * s); ctx.clip();
      glow('#ff7a2a', 128 * s, 250 * s, 220 * s, 0.9);
      hero(124 * s, 126 * s, 6.2 * s, -0.35, 'pistol');
      ctx.restore();
      ctx.strokeStyle = '#ff9d4a'; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.roundRect(8 * s, 8 * s, 240 * s, 240 * s, 48 * s); ctx.stroke();
      return;
    }
    const u = Math.min(W / 1232, H / 706);
    backdrop(u);
    if (kind === 'hero') { scene(W * 0.5, H * 0.56, H / 900); vign(); return; }             // 3840×1240，不含文字
    if (kind === 'background') { scene(W * 0.5, H * 0.55, H / 900); dark(0.55); vign(); return; }
    if (kind === 'vertical' || kind === 'library') {
      const v = W / 760;
      scene(W * 0.52, H * 0.6, v * 0.95); vign();
      title(W / 2, H * 0.17, W * 0.3, true);
      return;
    }
    if (kind === 'small') { scene(W * 0.72, H * 0.6, H / 520); vign(); dark(0.15); title(W * 0.3, H * 0.44, H * 0.62, false); return; }
    // header / main：左侧标题，右侧场景
    scene(W * 0.7, H * 0.58, u * 0.95);
    vign();
    const lg = ctx.createLinearGradient(0, 0, W * 0.5, 0);
    lg.addColorStop(0, 'rgba(5,2,4,0.75)'); lg.addColorStop(1, 'rgba(5,2,4,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W * 0.5, H);
    title(W * 0.235, H * 0.44, H * 0.33, true);
  }
  const go = () => {
    draw();
    // 透明素材直接导出画布像素，避免截图丢失透明通道
    if (kind === 'logo' || kind === 'icon' || kind === 'achsheet') { const pre = document.createElement('pre'); pre.id = 'png'; pre.textContent = 'PNG:' + cv.toDataURL('image/png') + ':END'; document.body.appendChild(pre); }
    document.title = 'ready';
  };
  if (document.fonts) Promise.all(['64px "JY Brush"', 'bold 64px "JY Sans"'].map(f => document.fonts.load(f))).then(go, go); else go();
});
