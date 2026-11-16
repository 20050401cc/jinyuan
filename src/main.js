// 主循环与流程：开局、换层、结算、状态机
'use strict';
(function () {
  const G = window.G;
  G.MAX_FLOOR = 3;

  const g = G.game = {
    state: 'menu', stateT: 0, time: 0, floor: 1, dmgMul: 1,
    dungeon: null, player: null, room: null, active: null, boss: null,
    enemies: [], bullets: [], ebullets: [], pickups: [], items: [], particles: [], texts: [], effects: [], stains: [], fade: 0,
    cam: { x: 0, y: 0 }, shake: 0, banner: null, winT: -1,
    runTime: 0, kills: 0, goldTotal: 0, dmgTaken: 0, dmgDealt: 0, perkChoices: [], perksTaken: []
  };

  G.startFloor = function (n) {
    g.floor = n;
    g.dmgMul = 1 + 0.2 * (n - 1);
    g.enemies.length = g.bullets.length = g.ebullets.length = 0;
    g.pickups.length = g.items.length = g.particles.length = g.texts.length = g.effects.length = g.stains.length = 0;
    g.fade = 1;
    g.active = null; g.boss = null; g.winT = -1; g.shake = 0;
    g.dungeon = G.genDungeon(n);
    G.decorate(g.dungeon);
    const p = g.player, st = g.dungeon.start;
    p.x = st.cx; p.y = st.cy;
    p.shield = p.maxShield; p.dashT = 0; p.invuln = 1; p.beam = null; p.near = null;
    g.room = st;
    G.stockRooms();
    g.cam.x = p.x - G.W / 2; g.cam.y = p.y - G.H / 2;
    G.prebakeNear(g.dungeon, p.x, p.y);
    G.save.timer = 1.5;
    g.banner = { text: '第 ' + n + ' 层 · ' + G.THEMES[Math.min(n, 3) - 1].name, t: 2.4 };
  };

  G.newRun = function () {
    G.save.clear();
    g.player = G.createPlayer();
    g.runTime = 0; g.kills = 0; g.goldTotal = 0; g.dmgTaken = 0; g.dmgDealt = 0;
    g.perksTaken = []; g.perkChoices = [];
    G.startFloor(1);
    g.state = 'play'; g.stateT = 0;
    G.input.down = false;
  };

  G.endRun = function (win) {
    if (g.state !== 'play') return;
    g.state = win ? 'win' : 'dead';
    g.banner = null;
    G.save.clear();
    G.save.record(win, g.floor);
    G.sfx(win ? 'win' : 'death');
    g.stateT = 0;
    if (!win) { G.burst(g.player.x, g.player.y, '#35d0bd', 30, 260, 0.8, 4); g.shake = 16; }
  };

  function updatePlay(dt) {
    const I = G.input, p = g.player;
    g.runTime += dt;
    G.updatePlayer(dt);
    if (g.state !== 'play') return;
    G.updateRooms();
    G.updateEnemies(dt);
    G.updateBullets(dt);
    G.updatePickups(dt);
    G.updateFx(dt);
    const tx = p.x - G.W / 2 + (I.mx - G.W / 2) * 0.18, ty = p.y - G.H / 2 + (I.my - G.H / 2) * 0.18;
    const k = 1 - Math.exp(-10 * dt);
    g.cam.x += (tx - g.cam.x) * k; g.cam.y += (ty - g.cam.y) * k;
    g.shake *= Math.pow(0.0015, dt);
    if (g.banner) g.banner.t -= dt;
    if (g.winT > 0) { g.winT -= dt; if (g.winT <= 0) G.endRun(true); }
    G.save.auto(dt);
  }

  G.update = function (dt) {
    const I = G.input;
    G.updateMotion();
    G.updateTouch();
    g.time += dt; g.stateT += dt;
    if (g.dungeon) G.prebake(g.dungeon);
    if (g.fade > 0 && g.state !== 'perk') g.fade = Math.max(0, g.fade - dt * 1.6);
    if (I.pressed.KeyM) G.audio.muted = !G.audio.muted;
    if (I.pressed.F3) G.debug.fps = !G.debug.fps;
    if ((g.cfgT = (g.cfgT || 0) + dt) > 1) { g.cfgT = 0; G.save.syncCfg(); }
    switch (g.state) {
      case 'menu':
        if (I.pressed.Enter) { if (!(G.save.meta && G.save.resume())) G.newRun(); }
        break;
      case 'play':
        if (I.pressed.Escape || I.pressed.KeyP) { g.state = 'pause'; g.stateT = 0; G.save.write(); break; }
        updatePlay(dt);
        break;
      case 'pause':
        if (I.pressed.Escape || I.pressed.KeyP) g.state = 'play';
        break;
      case 'dead':
      case 'win':
        G.updateFx(dt);
        g.shake *= Math.pow(0.0015, dt);
        if (g.stateT > 0.5 && (I.pressed.KeyR || I.pressed.Enter)) G.newRun();
        break;
    }
  };

  let ctx = null;
  G.draw = function () {
    G.motion.rect = null;
    if (g.state === 'menu') { G.drawMenu(ctx); G.warm(ctx); }
    else {
      G.drawWorld(ctx);
      G.drawHUD(ctx);
      G.drawTouch(ctx);
      if (g.fade > 0) { ctx.fillStyle = 'rgba(4,2,5,' + g.fade.toFixed(3) + ')'; ctx.fillRect(0, 0, G.W, G.H); }
      if (g.state === 'pause') G.drawPause(ctx);
      else if (g.state === 'perk') G.drawPerk(ctx);
      else if (g.state === 'dead') G.drawEnd(ctx, false);
      else if (g.state === 'win') G.drawEnd(ctx, true);
    }
    if (!G.touch.on) G.drawCursor(ctx);
    G.drawRotateHint(ctx);
  };

  // 单步推进（主循环与调试共用）
  G.tick = function (dt) {
    G.update(dt);
    G.draw();
    G.endFrameInput();
  };

  function fit(canvas) {
    const s = Math.min(window.innerWidth / G.W, window.innerHeight / G.H);
    canvas.style.width = Math.floor(G.W * s) + 'px';
    canvas.style.height = Math.floor(G.H * s) + 'px';
  }

  window.addEventListener('load', () => {
    const canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    G.initInput(canvas);
    G.initTouch(canvas);
    G.initMotion(canvas);
    G.save.init();
    fit(canvas);
    window.addEventListener('resize', () => fit(canvas));
    document.addEventListener('visibilitychange', () => { if (document.hidden && g.state === 'play') g.state = 'pause'; });
    let last = performance.now();
    G.fps = 60;
    function frame(ts) {
      let dt = (ts - last) / 1000;
      last = ts;
      if (dt > 0) G.fps = G.fps * 0.92 + (1 / dt) * 0.08;
      if (dt > 0.05) dt = 0.05;
      if (!G.debug.manual) G.tick(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
})();
