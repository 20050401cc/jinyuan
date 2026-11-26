// 核心：命名空间、数学工具、键鼠输入
'use strict';
(function () {
  const G = window.G = { W: 960, H: 600, TILE: 32, pxk: 1, debug: { god: false, fps: false } };
  G.resetHooks = [];

  G.rand = (a, b) => a + Math.random() * (b - a);
  G.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  G.pick = a => a[Math.floor(Math.random() * a.length)];
  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  G.angDiff = (a, b) => {
    let d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  // 点到线段距离
  G.segDist = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
    t = G.clamp(t, 0, 1);
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
  };

  // ---------- 输入 ----------
  const input = G.input = { keys: {}, pressed: {}, mx: 480, my: 300, down: false, clicked: false, wheel: 0 };
  G.initInput = function (canvas) {
    const setMouse = e => {
      const r = canvas.getBoundingClientRect();
      input.mx = (e.clientX - r.left) / r.width * G.W;
      input.my = (e.clientY - r.top) / r.height * G.H;
    };
    window.addEventListener('keydown', e => {
      const k = e.code;
      if (!input.keys[k]) input.pressed[k] = true;
      input.keys[k] = true;
      if (k === 'Space' || k === 'Tab' || k.indexOf('Arrow') === 0 || k === 'F11') e.preventDefault();
      if (G.pad) G.pad.active = false;
      if (G.settings && G.settings.inputMode === 'pad' && G.game.state === 'play') G.setInputMode('pc');
      if (k === 'F11' || (k === 'Enter' && e.altKey)) { G.setFullscreen(!G.isFullscreen()); input.pressed.Enter = false; }
      G.audio.unlock();
    });
    window.addEventListener('keyup', e => { input.keys[e.code] = false; });
    window.addEventListener('blur', () => { input.keys = {}; input.down = false; });
    window.addEventListener('mousemove', e => {
      setMouse(e);
      input.moveT = performance.now();
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) { if (G.nav) G.nav.active = false; if (G.pad) G.pad.active = false; }
    });
    canvas.addEventListener('mousedown', e => {
      setMouse(e);
      if (e.button === 0) { input.down = true; input.clicked = true; }
      if (G.nav) G.nav.active = false;
      G.audio.unlock();
    });
    window.addEventListener('mouseup', e => { if (e.button === 0) input.down = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { input.wheel = e.deltaY > 0 ? 1 : -1; e.preventDefault(); }, { passive: false });
  };
  G.endFrameInput = function () { input.pressed = {}; input.clicked = false; input.wheel = 0; };

})();
