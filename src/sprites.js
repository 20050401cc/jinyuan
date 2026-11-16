// 角色造型：玩家、七种敌人、三个 Boss（带描边、高光和待机/攻击动画）
'use strict';
(function () {
  const G = window.G, TAU = Math.PI * 2, OUT = '#140e14';

  function ink(ctx, fill, lw) {
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = lw || 2; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  function dot(ctx, x, y, r, col) { ctx.fillStyle = col; circ(ctx, x, y, r); ctx.fill(); }
  const C = (e, hex) => (e.flash > 0 ? '#ffffff' : hex);
  G.ink = ink;

  // ---------- 玩家：戴兜帽的提灯旅人 ----------
  G.drawPlayerSprite = function (ctx, p, g) {
    const ax = Math.cos(p.aim), ay = Math.sin(p.aim);
    const bob = p.moving ? Math.sin(p.walk) * 1.4 : Math.sin(g.time * 2.6) * 0.7;
    const body = p.hurtFlash > 0 ? '#ffffff' : '#34c7b5';
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.dashT > 0) { const a = Math.atan2(p.dvy, p.dvx); ctx.rotate(a); ctx.scale(1.25, 0.8); ctx.rotate(-a); }
    // 脚
    const st = p.moving ? Math.sin(p.walk) * 3 : 0;
    ctx.fillStyle = OUT; ell(ctx, -4, 11 + st * 0.4, 3.4, 2.4); ctx.fill(); ell(ctx, 4, 11 - st * 0.4, 3.4, 2.4); ctx.fill();
    // 披风随移动向后飘
    const cx = -p.capeX, cy = -p.capeY;
    ctx.beginPath(); ctx.moveTo(-8, -1 + bob); ctx.quadraticCurveTo(-11 + cx * 0.5, 7 + cy * 0.5, -7 + cx, 13 + cy);
    ctx.lineTo(-2 + cx, 10 + cy); ctx.lineTo(2 + cx, 14 + cy); ctx.lineTo(7 + cx, 11 + cy);
    ctx.quadraticCurveTo(11 + cx * 0.5, 7 + cy * 0.5, 8, -1 + bob); ctx.closePath(); ink(ctx, '#c9482e');
    // 身体与兜帽
    circ(ctx, 0, bob, 10.5); ink(ctx, body);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ell(ctx, -3, bob - 5, 5, 2.6, -0.4); ctx.fill();
    ctx.beginPath(); ctx.arc(0, bob, 10.5, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(0, bob - 4, -10.5, bob - 0.5); ctx.closePath();
    ctx.fillStyle = p.hurtFlash > 0 ? '#ffffff' : '#1e8277'; ctx.fill();
    // 面部暗影与发光双眼
    ctx.fillStyle = '#0b1f1d'; ell(ctx, ax * 3.5, bob + ay * 3.2 + 0.5, 6.2, 5.2); ctx.fill();
    const blink = (g.time * 0.35 + 0.1) % 1 < 0.03;
    if (!blink) {
      dot(ctx, ax * 5 - ay * 2.4, bob + ay * 4.4 + ax * 2.4 + 0.5, 1.5, '#ffeeb0');
      dot(ctx, ax * 5 + ay * 2.4, bob + ay * 4.4 - ax * 2.4 + 0.5, 1.5, '#ffeeb0');
    }
    // 围巾
    ctx.strokeStyle = '#ff8a3c'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, bob + 1, 9, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke(); ctx.lineCap = 'butt';
    // 武器与握持的手
    ctx.translate(0, bob);
    ctx.rotate(p.aim);
    if (ax < 0) ctx.scale(1, -1);
    ctx.translate(8 - p.recoil * 4, 4);
    G.drawWeapon(ctx, p.weapons[p.cur], 1);
    dot(ctx, 2, 1.5, 2.6, '#ffe2b8'); ctx.lineWidth = 1; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.restore();
  };

  // ---------- 普通敌人 ----------
  const DRAW = {
    lunger(ctx, e) {
      const c = C(e, '#ff6b4a'), d = C(e, '#b5381f');
      ctx.rotate(e.face);
      if (e.state === 'wind') ctx.scale(0.8, 1.22); else if (e.state === 'dash') ctx.scale(1.28, 0.8);
      const wag = Math.sin(e.age * 11) * 4;
      ctx.beginPath(); ctx.moveTo(-7, -4); ctx.quadraticCurveTo(-17, wag * 0.5, -23, wag); ctx.quadraticCurveTo(-16, wag * 0.5 + 3, -7, 4); ctx.closePath(); ink(ctx, d);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-2, s * 8); ctx.lineTo(-12, s * 15); ctx.lineTo(-8, s * 5); ctx.closePath(); ink(ctx, d); }
      ctx.beginPath(); ctx.moveTo(15, 0); ctx.quadraticCurveTo(9, -12, -5, -10); ctx.quadraticCurveTo(-13, 0, -5, 10); ctx.quadraticCurveTo(9, 12, 15, 0); ctx.closePath(); ink(ctx, c);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ell(ctx, -1, -5, 6, 2.4, 0.1); ctx.fill();
      ctx.fillStyle = '#fff';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(8, s * 5); ctx.lineTo(13.5, s * 1.2); ctx.lineTo(8, s * 1.4); ctx.closePath(); ctx.fill(); }
      for (const s of [-1, 1]) { dot(ctx, 3, s * 5.2, 2.5, e.state === 'wind' ? '#fff' : '#ffe14a'); dot(ctx, 3.9, s * 5.2, 1.1, '#2a0606'); }
    },
    wick(ctx, e) {
      const c = C(e, '#f4d58a'), d = C(e, '#c79a48'), f = Math.sin(e.age * 13) * 1.5;
      ctx.beginPath(); ctx.moveTo(-9, 11); ctx.lineTo(-8, -5); ctx.quadraticCurveTo(0, -10, 8, -5); ctx.lineTo(9, 11); ctx.closePath(); ink(ctx, c);
      ctx.fillStyle = d; ctx.fillRect(-8, 6, 16, 4);
      ctx.fillStyle = C(e, '#fff3cf'); ctx.beginPath(); ctx.moveTo(-8, -4); ctx.quadraticCurveTo(-5, 3, -3, -3); ctx.quadraticCurveTo(0, 5, 3, -3); ctx.quadraticCurveTo(6, 2, 8, -4); ctx.quadraticCurveTo(0, -9, -8, -4); ctx.fill();
      dot(ctx, -3.2, 1.5, 1.7, '#2a1a08'); dot(ctx, 3.2, 1.5, 1.7, '#2a1a08');
      ctx.fillStyle = '#2a1a08'; ctx.fillRect(-0.7, -12, 1.4, 5);
      ctx.beginPath(); ctx.moveTo(-4, -12); ctx.quadraticCurveTo(-5, -18, f, -23 - (e.t < 0.35 ? 4 : 0)); ctx.quadraticCurveTo(5, -18, 4, -12); ctx.quadraticCurveTo(0, -9, -4, -12); ctx.closePath(); ink(ctx, e.t < 0.35 ? '#fff' : '#ff9a2e', 1.5);
      ctx.fillStyle = '#fff3b0'; ell(ctx, 0, -14, 1.6, 3); ctx.fill();
      ctx.rotate(e.face);
      ctx.beginPath(); ctx.rect(7, -2.5, 10, 5); ink(ctx, '#4a3a22', 1.5);
    },
    spore(ctx, e) {
      const c = C(e, '#74c85f'), d = C(e, '#3f7a35'), swell = e.t < 0.45 ? 1.14 : 1 + Math.sin(e.age * 3) * 0.03;
      ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) { const a = 0.4 + i * 0.58, w = Math.sin(e.age * 6 + i) * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * 19 + w, Math.sin(a) * 17); ctx.stroke(); }
      ctx.lineCap = 'butt';
      ctx.scale(swell, swell);
      G.poly(ctx, 6, 16, Math.PI / 6); ink(ctx, d);
      G.poly(ctx, 6, 11.5, Math.PI / 6); ctx.fillStyle = c; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ell(ctx, -3, -7, 6, 2.2, -0.2); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = -0.6 + i * 2.1, x = Math.cos(a) * 6, y = Math.sin(a) * 6;
        circ(ctx, x, y, 3.4); ink(ctx, e.t < 0.45 ? '#fff' : '#d6ff8a', 1.2);
        dot(ctx, x - 0.8, y - 0.8, 1, '#ffffff');
      }
    },
    fuse(ctx, e) {
      const lit = e.state === 'fuse', blink = lit && Math.sin(e.age * 50) > 0;
      const c = blink ? '#ffffff' : C(e, '#ff8f2e'), r = 9.5 + (lit ? 3.5 : Math.sin(e.age * 10) * 0.8);
      ctx.rotate(e.face);
      ctx.strokeStyle = OUT; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const w = Math.sin(e.age * 22 + i * 2) * 3; ctx.beginPath(); ctx.moveTo(-5 + i * 5, s * 6); ctx.lineTo(-7 + i * 5 + w, s * 13.5); ctx.stroke(); }
      ctx.lineCap = 'butt';
      circ(ctx, 0, 0, r); ink(ctx, c);
      ctx.strokeStyle = blink ? '#ffd08a' : '#7a2f08'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, r - 1.5, 1.05, 2.1); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r - 1.5, -2.1, -1.05); ctx.stroke();
      dot(ctx, 0, 0, 3.6 + Math.sin(e.age * 16) * 0.9, '#fff3b0');
      dot(ctx, 6, -3, 1.6, '#2a0f04'); dot(ctx, 6, 3, 1.6, '#2a0f04');
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r + 1, 0); ctx.quadraticCurveTo(-r - 5, -5, -r - 8, -1); ctx.stroke();
      dot(ctx, -r - 8, -1, 2 + Math.sin(e.age * 30) * 0.8, '#ffe14a');
    },
    brood(ctx, e) {
      const c = C(e, '#a866f0'), d = C(e, '#6b3aa8'), s = 1 + Math.sin(e.age * 3) * 0.05, open = e.t < 0.6;
      ctx.scale(s, 2 - s);
      for (let i = 0; i < 5; i++) { const a = Math.PI + 0.35 + i * 0.6; circ(ctx, Math.cos(a) * 15, Math.sin(a) * 14, 5.5 + Math.sin(e.age * 4 + i) * 0.8); ink(ctx, C(e, '#e3c4ff'), 1.6); }
      circ(ctx, 0, 0, 18); ink(ctx, c, 2.4);
      ctx.fillStyle = d; ctx.beginPath(); ctx.arc(0, 0, 16.5, 0.25, Math.PI - 0.25); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ell(ctx, -6, -10, 7, 3, -0.4); ctx.fill();
      for (const [x, y, r] of [[-7, -3, 3.4], [7, -3, 3.4], [0, -8, 2.4]]) { dot(ctx, x, y, r, '#fff'); dot(ctx, x, y + 0.5, r * 0.5, '#2a0f4a'); }
      ell(ctx, 0, 8, open ? 6.5 : 5, open ? 5 : 1.6); ink(ctx, '#2a0f4a', 1.5);
      if (open) { ctx.fillStyle = '#fff'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 3.4 - 1.4, 4); ctx.lineTo(i * 3.4, 7.5); ctx.lineTo(i * 3.4 + 1.4, 4); ctx.fill(); } }
    },
    mite(ctx, e) {
      const c = C(e, '#cf98ff');
      ctx.rotate(e.face);
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(4, s * 3); ctx.quadraticCurveTo(9, s * 6, 11, s * (3 + Math.sin(e.age * 20) * 2)); ctx.stroke(); }
      ell(ctx, 0, 0, 7.5, 6.2 + Math.sin(e.age * 18 + e.id) * 0.7); ink(ctx, c, 1.8);
      dot(ctx, 3.2, -2.4, 1.7, '#fff'); dot(ctx, 3.2, 2.4, 1.7, '#fff');
      dot(ctx, 3.8, -2.4, 0.8, '#2a0f4a'); dot(ctx, 3.8, 2.4, 0.8, '#2a0f4a');
    },
    gazer(ctx, e) {
      const c = C(e, '#4fd0e2'), aim = e.state === 'aim', hov = Math.sin(e.age * 3) * 2;
      ctx.translate(0, hov);
      ctx.save(); ctx.rotate(e.age * (aim ? 5 : 1.2));
      for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(11, -3.5); ctx.lineTo(20, 0); ctx.lineTo(11, 3.5); ctx.closePath(); ink(ctx, C(e, '#2a8fa0'), 1.6); }
      ctx.restore();
      circ(ctx, 0, 0, 12.5); ink(ctx, c, 2.4);
      circ(ctx, 0, 0, 9); ctx.fillStyle = '#eafcff'; ctx.fill();
      const px = Math.cos(e.face) * 3.6, py = Math.sin(e.face) * 3.6;
      dot(ctx, px, py, 5.2, aim ? '#ff5d6c' : '#1b7f92'); dot(ctx, px, py, 2.4, '#06181c'); dot(ctx, px - 1.5, py - 1.7, 1.1, '#fff');
      if (aim) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 9.4, Math.PI * 1.15, Math.PI * 1.85); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 9.4, Math.PI * 0.15, Math.PI * 0.85); ctx.closePath(); ctx.fill(); }
    },

    // ---------- Boss ----------
    boss1(ctx, e) {
      const c = C(e, '#ff7a3a'), hot = e.tele ? '#ffffff' : '#ffd36a';
      ctx.save(); ctx.rotate(e.age * 0.5);
      for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.beginPath(); ctx.rect(27, -6, 10, 12); ink(ctx, C(e, '#6a3a22'), 2); }
      ctx.restore();
      G.poly(ctx, 8, 31, Math.PI / 8); ink(ctx, C(e, '#7a4226'), 3);
      G.poly(ctx, 8, 25, Math.PI / 8); ink(ctx, c, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ell(ctx, -8, -15, 11, 4, -0.35); ctx.fill();
      circ(ctx, 0, 2, 14); ink(ctx, '#1f0d06', 2.5);
      dot(ctx, 0, 2, 9 + Math.sin(e.age * 7) * 1.6, hot);
      dot(ctx, 0, 2, 4.5, '#fff8d8');
      ctx.strokeStyle = '#1f0d06'; ctx.lineWidth = 2.6;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 6, -10); ctx.lineTo(i * 6, 14); ctx.stroke(); }
      ctx.fillStyle = hot;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 7, -19); ctx.lineTo(s * 17, -16); ctx.lineTo(s * 8, -14); ctx.closePath(); ctx.fill(); }
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.rect(s * 21 - 4, 8, 8, 10); ink(ctx, '#3a2018', 2); }
    },
    boss2(ctx, e) {
      const c = C(e, '#58c8ff');
      ctx.strokeStyle = G.rgba('#9ae0ff', 0.7); ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6 + e.age * 0.4, w = Math.sin(e.age * 2.4 + i * 1.3) * 12;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
        ctx.quadraticCurveTo(Math.cos(a + 0.5) * 30 + w, Math.sin(a + 0.5) * 30, Math.cos(a + 0.2) * 44, Math.sin(a + 0.2) * 44 + w); ctx.stroke();
        dot(ctx, Math.cos(a + 0.2) * 44, Math.sin(a + 0.2) * 44 + w, 2.6, '#eafcff');
      }
      ctx.lineCap = 'butt';
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = OUT; ctx.lineWidth = 5; ell(ctx, 0, 0, 30, 10, e.age * 0.9 + i * 1.047); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = 2.6; ctx.stroke(); }
      G.poly(ctx, 4, 21, -e.age * 0.6); ink(ctx, C(e, '#123a5c'), 2.5);
      G.poly(ctx, 4, 13, e.age * 1.2); ink(ctx, c, 2);
      dot(ctx, 0, 0, 5 + Math.sin(e.age * 6), '#ffffff');
      dot(ctx, 0, 0, 2.2, '#0a2238');
    },
    boss3(ctx, e) {
      const c = C(e, '#d05bff'), beat = 1 + Math.pow(Math.max(0, Math.sin(e.age * 4)), 6) * 0.13;
      for (let i = 0; i < 8; i++) {
        const a = e.age * 0.45 + i * TAU / 8, w = Math.sin(e.age * 3 + i) * 5;
        ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.2) * 22, Math.sin(a - 0.2) * 22); ctx.quadraticCurveTo(Math.cos(a) * 44 + w, Math.sin(a) * 44 + w, Math.cos(a + 0.35) * 52, Math.sin(a + 0.35) * 52);
        ctx.quadraticCurveTo(Math.cos(a + 0.1) * 40, Math.sin(a + 0.1) * 40, Math.cos(a + 0.2) * 22, Math.sin(a + 0.2) * 22); ctx.closePath(); ink(ctx, C(e, '#4a1c66'), 2);
      }
      ctx.scale(beat, beat);
      circ(ctx, 0, 0, 27); ink(ctx, c, 3);
      ctx.strokeStyle = C(e, '#7a2aa8'); ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.quadraticCurveTo(Math.cos(a + 0.3) * 20, Math.sin(a + 0.3) * 20, Math.cos(a + 0.1) * 26, Math.sin(a + 0.1) * 26); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ell(ctx, -9, -14, 10, 4, -0.5); ctx.fill();
      ell(ctx, 0, 0, 14, e.tele ? 12 : 9); ink(ctx, '#fff0fb', 2);
      const px = Math.cos(e.face || 0) * 4, py = Math.sin(e.face || 0) * 3;
      dot(ctx, px, py, 6.5, e.tele ? '#ff5d6c' : '#7a1fa8'); dot(ctx, px, py, 3, '#12041c'); dot(ctx, px - 2, py - 2, 1.4, '#fff');
    }
  };
  for (const k in DRAW) if (G.ENEMIES[k]) G.ENEMIES[k].draw = DRAW[k];
})();
