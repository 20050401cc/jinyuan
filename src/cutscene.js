// 过场演出：剧情播放器、剧情回顾、守护者登场、阶段台词、楼层标题卡、慢动作与转场
'use strict';
(function () {
  const G = window.G, TAU = Math.PI * 2;
  const KEY = 'jinyuan.story.v1';
  const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const out3 = x => 1 - Math.pow(1 - G.clamp(x, 0, 1), 3);

  // 已到达（解锁回顾）与已观看（「仅首次」模式下跳过）的章节
  const mem = { r: {}, s: {} };
  function store() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* 忽略 */ } }
  G.initStory = function () {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) { Object.assign(mem.r, d.r || {}); Object.assign(mem.s, d.s || {}); } } catch (e) { /* 损坏时重置 */ }
  };
  G.storyReached = id => !!mem.r[id];

  // ---------- 转场：从黑场淡入 ----------
  let trans = 0, transD = 1;
  G.transIn = function (d) { transD = d || 0.6; trans = transD; };
  G.drawTrans = function (ctx, dt) {
    if (trans <= 0) return;
    ctx.fillStyle = 'rgba(3,2,4,' + ease(trans / transD).toFixed(3) + ')'; ctx.fillRect(0, 0, G.W, G.H);
  };
  G.tickTrans = dt => { trans = Math.max(0, trans - dt); };

  // ---------- 剧情播放器 ----------
  let cur = null;
  const CARD = 2.8, CROSS = 1.0;
  const cps = () => (G.cjk() ? 20 : 46);
  G.playStory = function (id, done, force) {
    const g = G.game, set = G.settings.story;
    mem.r[id] = 1; store();
    if (!force && (set === 'off' || (set === 'first' && mem.s[id]))) { done(); return false; }
    cur = { id, ch: G.STORY[id], i: -1, t: 0, done, out: -1, prev: null, prevT: 0, ask: 0, all: 0 };
    g.state = 'story'; g.stateT = 0;
    G.sfx('portal');
    return true;
  };
  function shotText(s) { return s && s.text ? G.tr(s.text) : ''; }
  function shotDur(s) {
    const sc = G.SCENES[s.scene];
    if (sc && sc.dur) return sc.dur;
    return 1 + Array.from(shotText(s)).length / cps() + 3.2;
  }
  function next() {
    cur.prev = cur.i >= 0 ? { i: cur.i, t: cur.t } : null; cur.prevT = 0;
    cur.i++; cur.t = 0;
    if (cur.i >= cur.ch.shots.length) { cur.i--; cur.prev = null; cur.out = 0; }
  }
  function finish() {
    mem.s[cur.id] = 1; store();
    const d = cur.done; cur = null;
    G.transIn(0.8);
    d();
  }
  G.updateStory = function (dt) {
    if (!cur) { G.game.state = 'menu'; return; }
    const I = G.input, N = G.nav;
    cur.t += dt; cur.all += dt; cur.prevT += dt; cur.ask -= dt;
    if (cur.out >= 0) { cur.out += dt; if (cur.out > 0.9) finish(); return; }
    let adv = I.pressed.Space || I.pressed.Enter || N.activate;
    const skip = I.pressed.Escape || N.back;
    if (I.clicked) {
      if (I.mx > G.W - 170 && I.my < 54) { cur.out = 0; return; }
      adv = true;
    }
    N.activate = false;
    if (skip) { if (cur.ask > 0) { cur.out = 0; return; } cur.ask = 2.4; }
    if (cur.all < 0.4) adv = false;
    const s = cur.ch.shots[cur.i];
    if (cur.i < 0) { if (adv || cur.t > CARD) next(); return; }
    const typed = 0.9 + Array.from(shotText(s)).length / cps();
    if (adv) { if (shotText(s) && cur.t < typed) cur.t = typed; else next(); }
    else if (cur.t > shotDur(s)) next();
  };

  function paint(ctx, idx, t) {
    const s = cur.ch.shots[idx], fn = G.SCENES[s.scene];
    ctx.save(); if (fn) fn(ctx, t, G.W, G.H); ctx.restore();
  }
  // 插画画进离屏画布再放大（最高 1.5 倍分辨率，兼顾清晰与低端设备性能），字幕仍按屏幕分辨率绘制
  const bufs = [null, null];
  G.resetHooks.push(() => { bufs[0] = bufs[1] = null; });
  function paintBuf(n, idx, t) {
    const W = G.W, H = G.H, sk = Math.min(1.5, G.pxk), bw = Math.round(W * sk), bh = Math.round(H * sk);
    if (!bufs[n] || bufs[n].width !== bw || bufs[n].height !== bh) bufs[n] = G.mkCanvas(bw, bh);
    const b = bufs[n].getContext('2d');
    b.setTransform(sk, 0, 0, sk, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
    b.fillStyle = '#030204'; b.fillRect(0, 0, W, H);
    paint(b, idx, t);
    return bufs[n];
  }
  G.drawStory = function (ctx) {
    if (!cur) return;
    const W = G.W, H = G.H;
    ctx.fillStyle = '#030204'; ctx.fillRect(0, 0, W, H);
    if (cur.i >= 0) {
      ctx.drawImage(paintBuf(0, cur.i, cur.t), 0, 0, W, H);
      if (cur.prev && cur.prevT < CROSS) {
        // 上一镜头淡出
        ctx.globalAlpha = 1 - ease(cur.prevT / CROSS);
        ctx.drawImage(paintBuf(1, cur.prev.i, cur.prev.t + cur.prevT), 0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }
    // 宽银幕黑边
    const bar = out3(cur.all / 0.8), top = 44 * bar, bot = 112 * bar;
    ctx.fillStyle = '#030204'; ctx.fillRect(0, 0, W, top); ctx.fillRect(0, H - bot, W, bot);
    if (cur.i < 0) drawCard(ctx);
    else drawCaption(ctx, cur.ch.shots[cur.i]);
    // 进度点与操作提示
    const n = cur.ch.shots.length;
    for (let i = 0; i < n; i++) { ctx.fillStyle = i === cur.i ? '#ffb05a' : i < cur.i ? 'rgba(255,176,90,0.45)' : 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.arc(W / 2 + (i - (n - 1) / 2) * 14, H - 16, i === cur.i ? 3 : 2.2, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 0.75;
    G.text(ctx, cur.ask > 0 ? '再按一次跳过' : (G.pad.active ? 'B' : 'Esc') + ' ' + G.tr('跳过') + ' ▶', W - 20, 22, 12, cur.ask > 0 ? '#ffb05a' : '#a89080', 'right', cur.ask > 0);
    G.text(ctx, G.touch.on ? '轻触继续' : G.pad.active ? 'A 继续' : '点击 / 空格 继续', W - 20, H - 16, 11, '#7a6a62', 'right');
    G.text(ctx, cur.ch.title, 20, 22, 12, '#a89080', 'left');
    ctx.globalAlpha = 1;
    if (cur.out >= 0) { ctx.fillStyle = 'rgba(3,2,4,' + ease(cur.out / 0.9).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
  };
  function drawCard(ctx) {
    const W = G.W, H = G.H, t = cur.t, a = ease(t / 0.7) * (1 - ease((t - CARD + 0.6) / 0.6));
    const parts = String(G.tr(cur.ch.title)).split(' · ');
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'lighter'; G.glow(ctx, '#ff7a2a', W / 2, H / 2, 260, 0.25 * a); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
    G.text(ctx, parts[0], W / 2, H / 2 - 46, 15, '#c8a080', 'center', true);
    G.ui.glowText(ctx, parts[1] || parts[0], W / 2, H / 2 + 4, 52, '#fff0dc', '#ff8a3a', true);
    G.ui.divider(ctx, W / 2, H / 2 + 46, 160 * out3(t / 1.2), '#ff9d4a');
    ctx.globalAlpha = 1;
  }
  function drawCaption(ctx, s) {
    const txt = shotText(s);
    if (!txt) return;
    const W = G.W, H = G.H, size = G.cjk() ? 19 : 18, lh = size * 1.6;
    ctx.font = size + 'px ' + G.FONT;
    const lines = G.wrapLines(ctx, txt, Math.min(780, W - 120));
    let left = Math.max(0, Math.floor((cur.t - 0.9) * cps()));
    const y0 = H - 66 - (lines.length - 1) * lh / 2, quote = txt.indexOf('「') >= 0 || txt.indexOf('"') >= 0 || txt.indexOf('“') >= 0;
    lines.forEach((l, i) => {
      const ch = Array.from(l), shown = ch.slice(0, left).join('');
      left = Math.max(0, left - ch.length);
      if (!shown) return;
      ctx.font = size + 'px ' + G.FONT;
      const full = ctx.measureText(l).width, x = W / 2 - full / 2;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
      G.text(ctx, shown, x, y0 + i * lh, size, quote ? '#ffe2b8' : '#efe6dc', 'left');
      ctx.restore();
    });
  }

  // ---------- 剧情回顾 ----------
  const LOCK = { prologue: '开始一次远征后解锁', ch1: '击败熔炉守卫后解锁', ch2: '击败虚空织者后解锁', ending: '完成远征后解锁' };
  G.drawGallery = function (ctx) {
    const g = G.game, U = G.ui, w = 640, x0 = (G.W - w) / 2;
    if (g.back === 'menu') G.drawMenuBackdrop(ctx);
    ctx.fillStyle = 'rgba(7,4,9,0.8)'; ctx.fillRect(0, 0, G.W, G.H);
    U.panel(ctx, x0, 40, w, 520, '#ff9d4a', 0.92);
    U.glowText(ctx, '剧情', G.W / 2, 78, 32, '#ffe9c8', '#ff9d4a', true);
    U.divider(ctx, G.W / 2, 106, 120, '#ff9d4a');
    G.STORY_ORDER.forEach((id, i) => {
      const ch = G.STORY[id], on = !!mem.r[id], y = 126 + i * 86;
      const it = G.uiItem(x0 + 28, y, w - 56, 76, { primary: i === 0 });
      ctx.fillStyle = it.hover && on ? 'rgba(255,176,90,0.14)' : on ? 'rgba(255,176,90,0.06)' : 'rgba(255,255,255,0.025)';
      U.rr(ctx, x0 + 28, y, w - 56, 76, 8); ctx.fill();
      if (it.hover) { ctx.strokeStyle = on ? '#ffb05a' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.save(); ctx.translate(x0 + 70, y + 38); G.poly(ctx, 6, 24, Math.PI / 6); ctx.fillStyle = '#17131c'; ctx.fill(); ctx.strokeStyle = on ? '#ffb05a' : '#3a343e'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      G.text(ctx, on ? ['序', '一', '二', '终'][i] : '?', x0 + 70, y + 39, 20, on ? '#ffb05a' : '#4a444e', 'center', true, G.lang === 'zh', 40);
      G.text(ctx, on ? ch.title : '？？？', x0 + 108, y + 26, 17, on ? '#fff' : '#8a8088', 'left', true, false, w - 170);
      G.text(ctx, on ? Array.from(G.tr(ch.shots[0].text)).slice(0, G.cjk() ? 30 : 70).join('') + '…' : LOCK[id], x0 + 108, y + 52, 12, on ? '#b8aab0' : '#6a6470', 'left', false, false, w - 170);
      if (on) G.text(ctx, '▶', x0 + w - 56, y + 38, 16, it.hover ? '#ffb05a' : '#6a6070', 'center');
      if (it.click && on) G.playStory(id, () => { g.state = 'gallery'; g.stateT = 0; }, true);
    });
    if (G.button(ctx, G.W / 2 - 100, 486, 200, 44, '返回', true)) G.closeSub();
  };

  // ---------- 守护者登场 ----------
  G.bossIntro = function (e) {
    const g = G.game;
    e.spawnT = e.spawnMax = 1.3;
    g.floorCard = null;
    g.cine = { e, t: 0, dur: 4.4, L: G.BOSS_LINES[e.type] || { epi: '', line: '', phase: [] }, landed: false };
  };
  G.updateCine = function (dt) {
    const g = G.game, c = g.cine, e = c.e, I = G.input;
    c.t += dt;
    if (e.spawnT > 0) e.spawnT -= dt;
    if (e.spawnT <= 0 && !c.landed) {
      c.landed = true; e.spawnT = 0;
      G.burst(e.x, e.y, e.def.color, 40, 320, 0.8, 4); g.shake = 14; G.sfx('boom'); G.rumble(0.8, 0.5, 300);
      g.effects.push({ type: 'ring', x: e.x, y: e.y, rad: 220, t: 0, dur: 0.7, color: e.def.color });
    }
    const p = g.player, f = ease(c.t / 0.9) * (1 - ease((c.t - c.dur + 0.8) / 0.8));
    const tx = G.lerp(p.x, e.x, 0.85 * f) - G.W / 2, ty = G.lerp(p.y, e.y, 0.85 * f) - G.H / 2, k = 1 - Math.exp(-6 * dt);
    g.cam.x += (tx - g.cam.x) * k; g.cam.y += (ty - g.cam.y) * k;
    g.shake *= Math.pow(0.0015, dt);
    G.updateFx(dt);
    const skip = I.pressed.Escape || I.pressed.Space || I.pressed.Enter || I.clicked || G.nav.activate || G.nav.back;
    if (skip && c.t > 0.5 && c.t < c.dur - 0.7) c.t = c.dur - 0.7;
    if (c.t >= c.dur) { if (e.spawnT > 0) e.spawnT = 0; g.cine = null; }
  };
  G.drawCine = function (ctx) {
    const g = G.game, c = g.cine;
    if (!c) return;
    const W = G.W, H = G.H, t = c.t, e = c.e, col = e.def.color;
    const bar = out3(t / 0.5) * (1 - ease((t - c.dur + 0.5) / 0.5));
    ctx.fillStyle = '#040205'; ctx.fillRect(0, 0, W, 64 * bar); ctx.fillRect(0, H - 92 * bar, W, 92 * bar);
    const k = out3((t - 1.0) / 0.45), fade = 1 - ease((t - c.dur + 0.6) / 0.6);
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = fade;
    // 斜扫的墨迹色带
    const y = H * 0.74, sw = (W + 200) * k;
    const gr = ctx.createLinearGradient(-100, 0, sw, 0);
    gr.addColorStop(0, G.rgba(col, 0)); gr.addColorStop(0.25, G.rgba(col, 0.55)); gr.addColorStop(0.85, G.rgba(col, 0.75)); gr.addColorStop(1, G.rgba('#ffffff', 0.9));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-100, y - 30); ctx.lineTo(sw, y - 40); ctx.lineTo(sw - 30, y + 34); ctx.lineTo(-100, y + 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(8,4,10,0.55)'; ctx.beginPath(); ctx.moveTo(-100, y - 24); ctx.lineTo(sw, y - 33); ctx.lineTo(sw - 26, y + 28); ctx.lineTo(-100, y + 34); ctx.closePath(); ctx.fill();
    const nx = W / 2 + (1 - k) * 120;
    ctx.globalAlpha = fade * k;
    ctx.font = 'bold 13px ' + G.FONT;
    const ew = ctx.measureText(G.tr(c.L.epi)).width + 28;
    ctx.fillStyle = 'rgba(8,4,10,0.8)'; G.ui.rr(ctx, nx - ew / 2, y - 64, ew, 24, 12); ctx.fill();
    ctx.strokeStyle = G.rgba(col, 0.8); ctx.lineWidth = 1; ctx.stroke();
    G.text(ctx, c.L.epi, nx, y - 51.5, 13, '#ffe9c8', 'center', true);
    G.ui.glowText(ctx, e.def.name, nx, y + 1, 46, '#ffffff', col, true);
    ctx.globalAlpha = fade;
    if (c.L.line) {
      const txt = G.tr(c.L.line), n = Math.max(0, Math.floor((t - 1.6) * cps())), shown = Array.from(txt).slice(0, n).join('');
      ctx.save(); ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
      G.text(ctx, shown, W / 2, H - 46, 18, '#ffe2b8', 'center', false, false, W - 80);
      ctx.restore();
    }
    ctx.restore();
  };

  // ---------- 战斗中的台词字幕 ----------
  G.say = function (text, dur) { if (text) G.game.sub = { text, t: 0, dur: dur || 3.6 }; };
  G.drawSub = function (ctx, dt) {
    const g = G.game, s = g.sub;
    if (!s) return;
    s.t += dt;
    if (s.t > s.dur) { g.sub = null; return; }
    const a = ease(s.t / 0.3) * (1 - ease((s.t - s.dur + 0.5) / 0.5)), y = G.H - 112;
    ctx.globalAlpha = a;
    const gr = ctx.createLinearGradient(G.W / 2 - 300, 0, G.W / 2 + 300, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(G.W / 2 - 300, y - 18, 600, 36);
    G.text(ctx, s.text, G.W / 2, y, 16, '#ffe2b8', 'center', false, false, 560);
    ctx.globalAlpha = 1;
  };

  // ---------- 楼层标题卡 ----------
  G.drawFloorCard = function (ctx, dt) {
    const g = G.game, f = g.floorCard;
    if (!f || g.cine) return;
    f.t += dt;
    const t = f.t, D = 3.6;
    if (t > D) { g.floorCard = null; g.hintT0 = g.time; return; }
    const a = ease((t - 0.25) / 0.5) * (1 - ease((t - D + 0.7) / 0.7)), y = G.H * 0.2, th = G.THEMES[Math.min(f.n, 3) - 1];
    const lw = 240 * out3((t - 0.2) / 0.9);
    ctx.globalAlpha = a;
    const gr = ctx.createLinearGradient(0, 0, G.W, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.62)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, y - 62, G.W, 124);
    ctx.fillStyle = th.accent;
    ctx.fillRect(G.W / 2 - 40 - lw, y - 34, lw, 1.5); ctx.fillRect(G.W / 2 + 40, y - 34, lw, 1.5);
    G.text(ctx, G.tf('第 {0} 层', f.n), G.W / 2, y - 34, 15, th.accent, 'center', true);
    G.ui.glowText(ctx, th.name, G.W / 2, y + 10 - (1 - out3(t / 0.8)) * 14, 50, '#fff3e0', th.accent, true);
    G.ui.divider(ctx, G.W / 2, y + 46, lw * 0.7, th.accent);
    ctx.globalAlpha = 1;
  };
})();
