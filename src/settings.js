// 设置：音量、显示（全屏 / 清晰度 / 自适应宽高比）、操作方式、手柄震动等，以及设置界面
'use strict';
(function () {
  const G = window.G;
  const KEY = 'jinyuan.settings.v1';
  G.VERSION = '1.1.0';
  G.desktop = window.jinyuanDesktop || null; // 桌面版（Electron）注入的接口

  const DEF = {
    lang: '', story: 'first', inputMode: 'auto', master: 0.8, sfx: 0.8, music: 0.6,
    fullscreen: true, hires: true, shake: 1, dmgNum: true, rumble: true, fps: false
  };
  const S = G.settings = Object.assign({}, DEF);

  function store() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 存储不可用时忽略 */ } }
  G.saveSettings = store;

  G.initSettings = function () {
    try {
      const c = JSON.parse(localStorage.getItem(KEY));
      if (c) for (const k in DEF) if (typeof c[k] === typeof DEF[k]) S[k] = c[k];
    } catch (e) { /* 损坏时用默认值 */ }
    if (!S.lang) S.lang = G.detectLang();
    G.setLang(S.lang);
    if (S.inputMode === 'auto') S.inputMode = G.touch.on ? 'touch' : 'pc';
    if (G.desktop && G.desktop.isFullscreen) S.fullscreen = !!G.desktop.isFullscreen();
    G.applySettings();
  };

  // 操作方式：pc（键鼠）| touch（触屏）| pad（手柄）
  G.setInputMode = function (m) {
    if (S.inputMode === m) return;
    S.inputMode = m;
    G.touch.on = m === 'touch';
    if (m !== 'touch' && G.motion) { G.motion.on = false; G.motion.status = 'off'; }
    store();
  };

  G.applyAudio = function () {
    const A = G.audio;
    if (!A.ctx) return;
    A.sfxBus.gain.value = 0.5 * S.sfx;
    A.musBus.gain.value = 0.4 * S.music;
    A.master.gain.value = A.muted ? 0 : A.vol();
  };
  G.applySettings = function () {
    G.touch.on = S.inputMode === 'touch';
    G.debug.fps = S.fps;
    G.applyAudio();
  };

  // ---------- 显示 ----------
  let canvasRef = null;
  G.fit = function (canvas) {
    if (canvas) canvasRef = canvas;
    const cv = canvasRef, iw = window.innerWidth, ih = window.innerHeight;
    // 逻辑高度固定 600，宽度随屏幕在 16:10 ~ 16:9 之间自适应，更宽的屏幕两侧留黑边
    const W = Math.round(G.H * G.clamp(iw / ih, 1.6, 16 / 9));
    if (W !== G.W) { G.W = W; G.resetHooks.forEach(f => f()); }
    const s = Math.min(iw / G.W, ih / G.H), dpr = window.devicePixelRatio || 1;
    cv.style.width = Math.floor(G.W * s) + 'px';
    cv.style.height = Math.floor(G.H * s) + 'px';
    const k = S.hires ? G.clamp(s * dpr, 1, 3) : G.clamp(s, 0.75, 1.25);
    const bw = Math.round(G.W * k), bh = Math.round(G.H * k);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    G.pxk = bw / G.W;
  };

  G.isFullscreen = () => (G.desktop ? S.fullscreen : !!document.fullscreenElement);
  G.setFullscreen = function (on) {
    if (G.desktop) { S.fullscreen = on; G.desktop.setFullscreen(on); store(); return; }
    try {
      if (on && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch (e) { /* 浏览器不支持 */ }
  };

  // ---------- 设置界面 ----------
  const pct = v => Math.round(v * 100) + '%';
  const VOL = v => G.clamp(Math.round((v + 0.0001) * 10) / 10, 0, 1);
  const MODES = ['pc', 'touch', 'pad'], MODE_NAME = { pc: '键盘 + 鼠标', touch: '触屏', pad: '手柄' };
  const SHAKES = [0, 0.5, 1], SHAKE_NAME = ['关', '弱', '标准'];
  const STORY = ['first', 'always', 'off'], STORY_NAME = { first: '仅首次', always: '每次', off: '关闭' };
  const ROWS = [
    { label: '语言 / Language', get: () => G.langName(), step: d => G.cycleLang(d) },
    { label: '剧情过场', get: () => STORY_NAME[S.story] || '仅首次', step: d => { S.story = STORY[(Math.max(0, STORY.indexOf(S.story)) + d + 3) % 3]; } },
    { label: '操作方式', get: () => MODE_NAME[S.inputMode], step: d => G.setInputMode(MODES[(MODES.indexOf(S.inputMode) + d + 3) % 3]) },
    { label: '主音量', get: () => pct(S.master), step: d => { S.master = VOL(S.master + d * 0.1); G.applyAudio(); G.sfx('ui'); } },
    { label: '音效音量', get: () => pct(S.sfx), step: d => { S.sfx = VOL(S.sfx + d * 0.1); G.applyAudio(); G.sfx('coin'); } },
    { label: '音乐音量', get: () => pct(S.music), step: d => { S.music = VOL(S.music + d * 0.1); G.applyAudio(); } },
    { label: '显示模式', get: () => (G.isFullscreen() ? '全屏' : '窗口'), step: () => G.setFullscreen(!G.isFullscreen()) },
    { label: '画面清晰度', get: () => (S.hires ? '高清' : '标准（更流畅）'), step: () => { S.hires = !S.hires; G.fit(); } },
    { label: '屏幕震动', get: () => SHAKE_NAME[SHAKES.indexOf(S.shake)] || '标准', step: d => { S.shake = SHAKES[(Math.max(0, SHAKES.indexOf(S.shake)) + d + 3) % 3]; } },
    { label: '伤害数字', get: () => (S.dmgNum ? '显示' : '隐藏'), step: () => { S.dmgNum = !S.dmgNum; } },
    { label: '手柄震动', get: () => (S.rumble ? '开' : '关'), step: () => { S.rumble = !S.rumble; if (S.rumble) G.rumble(0.6, 0.6, 180); } },
    { label: '显示帧率', get: () => (S.fps ? '开' : '关'), step: () => { S.fps = !S.fps; G.debug.fps = S.fps; } }
  ];

  G.drawSettings = function (ctx) {
    const g = G.game, U = G.ui, I = G.input, w = 600, x0 = (G.W - w) / 2;
    if (g.back === 'menu') G.drawMenuBackdrop(ctx);
    ctx.fillStyle = 'rgba(7,4,9,0.78)'; ctx.fillRect(0, 0, G.W, G.H);
    U.panel(ctx, x0, 18, w, 570, '#ff9d4a', 0.92);
    U.glowText(ctx, '设 置', G.W / 2, 54, 34, '#ffe9c8', '#ff9d4a', true);
    U.divider(ctx, G.W / 2, 80, 120, '#ff9d4a');
    ROWS.forEach((r, i) => {
      const y = 92 + i * 34, it = G.uiItem(x0 + 24, y, w - 48, 31, { lr: true, primary: i === 0 });
      if (it.hover) { ctx.fillStyle = 'rgba(255,176,90,0.12)'; U.rr(ctx, x0 + 24, y, w - 48, 31, 6); ctx.fill(); ctx.strokeStyle = 'rgba(255,176,90,0.6)'; ctx.lineWidth = 1; ctx.stroke(); }
      G.text(ctx, r.label, x0 + 44, y + 16, 15, it.hover ? '#fff' : '#d8ccd4', 'left', true, false, 240);
      const vx = x0 + w - 150;
      G.text(ctx, '◀', vx - 92, y + 16, 13, it.hover ? '#ffb05a' : '#6a6070', 'center');
      G.text(ctx, r.get(), vx, y + 16, 15, '#ffe9c8', 'center', true, false, 160);
      G.text(ctx, '▶', vx + 92, y + 16, 13, it.hover ? '#ffb05a' : '#6a6070', 'center');
      if (r.label.indexOf('音量') >= 0) {
        const v = r.label === '主音量' ? S.master : r.label === '音效音量' ? S.sfx : S.music;
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(vx - 60, y + 26, 120, 3);
        ctx.fillStyle = '#ffb05a'; ctx.fillRect(vx - 60, y + 26, 120 * v, 3);
      }
      const d = it.lr || (it.click ? (G.nav.active ? 1 : I.mx < vx ? -1 : 1) : 0);
      if (d) { r.step(d); store(); }
    });
    const by = 504;
    if (G.button(ctx, G.W / 2 - 230, by, 200, 44, '恢复默认')) {
      const keep = { lang: S.lang, inputMode: S.inputMode, fullscreen: S.fullscreen };
      Object.assign(S, DEF, keep); G.applySettings(); G.fit(); store();
    }
    if (G.button(ctx, G.W / 2 + 30, by, 200, 44, '返回', true)) G.closeSub();
    G.text(ctx, G.pad.active ? '方向键 / 左摇杆 选择 · 左右 调整 · B 返回' : '点击左右两侧调整 · Esc 返回', G.W / 2, 566, 12, '#8a8088', 'center');
  };

  G.openSub = function (state) { const g = G.game; g.back = g.state; g.state = state; g.stateT = 0; };
  G.closeSub = function () { const g = G.game; g.state = g.back || 'menu'; g.stateT = 0; store(); };
})();
