// 主循环与流程：开局、换层、结算、状态机
'use strict';
(function () {
  const G = window.G;
  G.MAX_FLOOR = 3;

  const g = G.game = {
    state: 'menu', stateT: 0, time: 0, floor: 1, dmgMul: 1,
    dungeon: null, player: null, room: null, active: null, boss: null,
    enemies: [], bullets: [], ebullets: [], pickups: [], items: [], particles: [], texts: [], effects: [], stains: [], fade: 0,
    cam: { x: 0, y: 0 }, shake: 0, banner: null, winT: -1, cine: null, sub: null, floorCard: null, slow: null, flash: 0, dying: 0,
    runTime: 0, kills: 0, goldTotal: 0, dmgTaken: 0, dmgDealt: 0, perkChoices: [], perksTaken: []
  };

  G.startFloor = function (n) {
    g.floor = n;
    g.dmgMul = 1 + 0.2 * (n - 1);
    g.enemies.length = g.bullets.length = g.ebullets.length = 0;
    g.pickups.length = g.items.length = g.particles.length = g.texts.length = g.effects.length = g.stains.length = 0;
    g.fade = 1;
    g.active = null; g.boss = null; g.winT = -1; g.shake = 0; g.cine = null; g.bigMap = false; g.sub = null; g.slow = null; g.flash = 0; g.dying = 0;
    g.dungeon = G.genDungeon(n);
    G.decorate(g.dungeon);
    const p = g.player, st = g.dungeon.start;
    p.x = st.cx; p.y = st.cy;
    p.shield = p.maxShield; p.dashT = 0; p.invuln = 1.4; p.beam = null; p.near = null; p.dropT = 0.85;
    g.room = st;
    G.stockRooms();
    g.cam.x = p.x - G.W / 2; g.cam.y = p.y - G.H / 2;
    G.prebakeNear(g.dungeon, p.x, p.y);
    G.save.timer = 1.5;
    g.banner = null;
    g.floorCard = { t: 0, n };
  };

  // 首次远征前播放序章
  G.newRun = function () {
    G.playStory('prologue', startRun);
  };
  function startRun() {
    G.save.clear();
    g.player = G.createPlayer();
    g.runTime = 0; g.kills = 0; g.goldTotal = 0; g.dmgTaken = 0; g.dmgDealt = 0;
    g.perksTaken = []; g.perkChoices = [];
    G.startFloor(1);
    G.ach.ev('weapon', 'pistol');
    g.state = 'play'; g.stateT = 0;
    G.input.down = false;
    G.transIn(0.5);
  }

  // 倒下时先慢动作 1.3 秒，再进入结算
  G.endRun = function (win) {
    if (g.state !== 'play' || g.dying > 0) return;
    if (!win) {
      g.dying = 1.3; g.slow = { t: 1.3, k: 0.28 }; g.banner = null; g.sub = null;
      G.save.clear();
      G.rumble(1, 1, 450); G.sfx('hurt');
      g.player.invuln = 99;
      return;
    }
    finishRun(true);
  };
  function finishRun(win) {
    g.state = win ? 'win' : 'dead';
    g.banner = null; g.sub = null; g.dying = 0; g.slow = null;
    G.save.clear();
    G.save.record(win, g.floor);
    G.sfx(win ? 'win' : 'death');
    G.ach.ev(win ? 'win' : 'death');
    g.stateT = 0;
    g.deathLine = G.pick(G.DEATH_LINES);
    if (!win) { G.burst(g.player.x, g.player.y, '#35d0bd', 30, 260, 0.8, 4); g.shake = 16; }
    else G.playStory('ending', () => { g.state = 'win'; g.stateT = 0; });
  }

  function updatePlay(dt) {
    const I = G.input, p = g.player;
    g.runTime += dt;
    if (p.dropT > 0) {
      p.dropT -= dt;
      if (p.dropT <= 0) { G.burst(p.x, p.y + 8, '#ffe2b8', 16, 180, 0.45, 3); g.effects.push({ type: 'ring', x: p.x, y: p.y + 6, rad: 70, t: 0, dur: 0.45, color: '#ffe2b8' }); g.shake = Math.max(g.shake, 5); G.sfx('dash'); }
    }
    if (g.dying > 0) { p.moving = false; p.beam = null; }
    else G.updatePlayer(dt);
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
    if (!g.dying) G.save.auto(dt);
  }

  let lastState = '';
  G.update = function (dt) {
    const I = G.input;
    if (g.state === 'menu' && ['menu', 'settings', 'ach', 'gallery'].indexOf(lastState) < 0) G.introT = 0;
    lastState = g.state;
    G.introT = (G.introT || 0) + dt;
    G.tickTrans(dt);
    g.flash = Math.max(0, g.flash - dt * 2.2);
    G.updatePad(dt);
    G.updateMotion();
    G.updateTouch();
    g.time += dt; g.stateT += dt;
    if (g.dungeon) G.prebake(g.dungeon);
    if (g.fade > 0 && g.state !== 'perk') g.fade = Math.max(0, g.fade - dt * 1.6);
    if (I.pressed.KeyM) G.toggleMute();
    if (g.toast) { g.toast.t -= dt; if (g.toast.t <= 0) g.toast = null; }
    if (I.pressed.F3) { G.settings.fps = G.debug.fps = !G.debug.fps; G.saveSettings(); }
    G.ach.tick(dt);
    if ((g.cfgT = (g.cfgT || 0) + dt) > 1) { g.cfgT = 0; G.save.syncCfg(); }
    switch (g.state) {
      case 'menu':
        if (G.introT < 1.4 && (I.clicked || I.pressed.Enter || I.pressed.Space || G.nav.activate)) { G.introT = 1.5; I.clicked = false; G.nav.activate = false; }
        break;
      case 'story':
        G.updateStory(dt);
        break;
      case 'settings':
      case 'ach':
      case 'gallery':
        if (I.pressed.Escape || G.nav.back) G.closeSub();
        break;
      case 'play': {
        if (g.cine) { G.updateCine(dt); break; }
        if (I.pressed.Tab) g.bigMap = !g.bigMap;
        if (g.bigMap && I.pressed.Escape) { g.bigMap = false; I.pressed.Escape = false; }
        if (!g.dying && (I.pressed.Escape || I.pressed.KeyP)) { g.state = 'pause'; g.stateT = 0; g.bigMap = false; G.save.write(); break; }
        let sdt = dt;
        if (g.slow && g.slow.t > 0) { g.slow.t -= dt; sdt = dt * g.slow.k; if (g.slow.t <= 0) g.slow = null; }
        updatePlay(sdt);
        if (g.dying > 0) { g.dying -= dt; if (g.dying <= 0) finishRun(false); }
        break;
      }
      case 'pause':
        if (I.pressed.Escape || I.pressed.KeyP || G.nav.back) g.state = 'play';
        break;
      case 'dead':
      case 'win':
        G.updateFx(dt);
        g.shake *= Math.pow(0.0015, dt);
        if (g.stateT > 0.5 && I.pressed.KeyR) G.newRun();
        break;
    }
  };

  let ctx = null;
  G.draw = function () {
    G.navBeginFrame();
    ctx.setTransform(G.pxk, 0, 0, G.pxk, 0, 0);
    G.motion.rect = null;
    const sub = g.state === 'settings' || g.state === 'ach' || g.state === 'gallery';
    const dt = Math.min(0.05, Math.max(0, (G.frameDt || 0.016)));
    if (g.state === 'story') G.drawStory(ctx);
    else if (g.state === 'menu' || (sub && g.back === 'menu')) {
      if (g.state === 'menu') G.drawMenu(ctx);
      else if (g.state === 'settings') G.drawSettings(ctx);
      else if (g.state === 'gallery') G.drawGallery(ctx);
      else G.drawAchievements(ctx);
      G.warm(ctx);
    } else {
      G.drawWorld(ctx);
      if (g.cine) G.drawCine(ctx);
      else {
        G.drawHUD(ctx);
        G.drawSub(ctx, g.state === 'play' ? dt : 0);
        G.drawFloorCard(ctx, g.state === 'play' ? dt : 0);
        G.drawTouch(ctx);
      }
      if (g.flash > 0) { ctx.fillStyle = 'rgba(255,246,230,' + Math.min(1, g.flash).toFixed(3) + ')'; ctx.fillRect(0, 0, G.W, G.H); }
      if (g.fade > 0) { ctx.fillStyle = 'rgba(4,2,5,' + g.fade.toFixed(3) + ')'; ctx.fillRect(0, 0, G.W, G.H); }
      if (g.state === 'pause') G.drawPause(ctx);
      else if (g.state === 'perk') G.drawPerk(ctx);
      else if (g.state === 'dead') G.drawEnd(ctx, false);
      else if (g.state === 'win') G.drawEnd(ctx, true);
      else if (g.state === 'settings') G.drawSettings(ctx);
      else if (g.state === 'ach') G.drawAchievements(ctx);
    }
    G.drawTrans(ctx);
    G.ach.drawToasts(ctx);
    // 过场中鼠标静止 2 秒后隐藏光标
    const idle = g.state === 'story' && performance.now() - (G.input.moveT || 0) > 2000;
    if (!G.touch.on && !g.cine && !idle && !(G.pad.active && g.state !== 'play')) G.drawCursor(ctx);
    G.drawRotateHint(ctx);
  };

  // 单步推进（主循环与调试共用）
  G.tick = function (dt) {
    G.frameDt = dt;
    G.update(dt);
    G.draw();
    G.navEndFrame();
    G.endFrameInput();
  };

  window.addEventListener('load', () => {
    const canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    if (document.fonts) for (const f of ['16px "JY Sans"', 'bold 16px "JY Sans"', '16px "JY Brush"']) document.fonts.load(f).catch(() => {});
    G.initInput(canvas);
    G.initTouch(canvas);
    G.initMotion(canvas);
    G.save.init();
    G.initSettings();
    G.ach.init();
    G.initStory();
    G.fit(canvas);
    window.addEventListener('resize', () => G.fit());
    window.addEventListener('blur', () => { if (g.state === 'play') { g.state = 'pause'; g.stateT = 0; } });
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
