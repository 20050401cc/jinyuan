// 声音：全部用 Web Audio 实时合成 —— 分层音效 + 随场景变化的生成式背景音乐
'use strict';
(function () {
  const G = window.G;
  const A = G.audio = { ctx: null, failed: false, last: {}, _muted: false, musicOn: true };
  Object.defineProperty(A, 'muted', {
    get() { return A._muted; },
    set(v) { A._muted = !!v; if (A.master) A.master.gain.setTargetAtTime(v ? 0 : 0.9, A.ctx.currentTime, 0.03); }
  });

  A.unlock = function () {
    if (A.failed) return;
    if (A.ctx) { if (A.ctx.state === 'suspended' && !document.hidden) A.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext, c = A.ctx = new AC();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18;
      A.master = c.createGain(); A.master.gain.value = A._muted ? 0 : 0.9;
      A.master.connect(comp); comp.connect(c.destination);
      A.sfxBus = c.createGain(); A.sfxBus.gain.value = 0.5; A.sfxBus.connect(A.master);
      A.musBus = c.createGain(); A.musBus.gain.value = 0.4; A.musBus.connect(A.master);
      // 简易空间感：两条交叉反馈的延迟线
      A.echo = c.createGain(); A.echo.gain.value = 1;
      const d1 = c.createDelay(1), d2 = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter(), wet = c.createGain();
      d1.delayTime.value = 0.23; d2.delayTime.value = 0.37; fb.gain.value = 0.42; lp.type = 'lowpass'; lp.frequency.value = 2200; wet.gain.value = 0.5;
      A.echo.connect(d1); d1.connect(d2); d2.connect(lp); lp.connect(fb); fb.connect(d1);
      d1.connect(wet); d2.connect(wet); wet.connect(A.master);
      const len = c.sampleRate;
      A.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = A.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.tick = schedule;
      setInterval(schedule, 60);
    } catch (err) { A.ctx = null; A.failed = true; }
  };
  document.addEventListener('visibilitychange', () => {
    if (!A.ctx) return;
    if (document.hidden) A.ctx.suspend(); else A.ctx.resume();
  });

  // ---------- 基础发声器 ----------
  let pm = 1; // 当前音效的随机音高系数
  function tone(type, f0, f1, dur, vol, at, bus, send) {
    const c = A.ctx, t = (at || c.currentTime), o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0 * pm, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * pm), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(bus || A.sfxBus);
    if (send) { const s = c.createGain(); s.gain.value = send; g.connect(s); s.connect(A.echo); }
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, f0, f1, type, at, bus, q) {
    const c = A.ctx, t = (at || c.currentTime), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noiseBuf; s.loop = true;
    f.type = type || 'lowpass'; f.Q.value = q || 0.8;
    f.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || A.sfxBus);
    s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.03);
  }
  const now = () => A.ctx.currentTime;
  function arp(type, freqs, step, dur, vol, send) { const t = now(); freqs.forEach((f, i) => tone(type, f, f, dur, vol, t + i * step, null, send)); }

  // ---------- 音效表 ----------
  const SFX = {
    shoot() { tone('square', 900, 300, 0.07, 0.26); noise(0.035, 0.3, 5000, 2000, 'highpass'); tone('sine', 180, 80, 0.06, 0.3); },
    smg() { tone('square', 1150, 520, 0.04, 0.17); noise(0.025, 0.22, 6000, 3000, 'highpass'); },
    shotgun() { noise(0.24, 0.75, 3400, 300); tone('sine', 150, 42, 0.2, 0.6); noise(0.05, 0.4, 7000, 4000, 'highpass'); },
    laser() { tone('sawtooth', 1320, 1250, 0.08, 0.07); tone('sine', 660, 640, 0.08, 0.1); },
    bounce() { tone('sine', 420, 980, 0.11, 0.3, 0, null, 0.3); tone('triangle', 840, 1960, 0.08, 0.12); },
    slash() { noise(0.13, 0.5, 2200, 7500, 'bandpass', 0, null, 1.5); tone('triangle', 900, 260, 0.1, 0.16); },
    launch() { tone('sine', 210, 62, 0.22, 0.6); noise(0.16, 0.4, 900, 200); },
    seeker() { tone('triangle', 640, 1400, 0.09, 0.2, 0, null, 0.3); tone('triangle', 960, 2000, 0.08, 0.12, now() + 0.05, null, 0.3); },
    hit() { tone('triangle', 240, 110, 0.05, 0.2); noise(0.03, 0.16, 3000, 1200, 'bandpass'); },
    kill() { tone('square', 540, 70, 0.17, 0.22); noise(0.14, 0.3, 2600, 400); tone('sine', 900, 1500, 0.06, 0.14, now() + 0.04, null, 0.4); },
    boom() { noise(0.55, 0.9, 1500, 90); tone('sine', 115, 28, 0.5, 0.75); noise(0.08, 0.5, 6000, 2500, 'highpass'); },
    hurt() { tone('sawtooth', 270, 55, 0.26, 0.42); noise(0.14, 0.4, 1200, 300); tone('square', 110, 70, 0.2, 0.2); },
    dash() { noise(0.2, 0.42, 900, 5200, 'bandpass', 0, null, 1.2); tone('sine', 300, 700, 0.12, 0.08); },
    coin() { const t = now(); tone('square', 988, 988, 0.05, 0.11, t); tone('square', 1319, 1319, 0.12, 0.11, t + 0.05, null, 0.25); },
    orb() { tone('sine', 620, 1040, 0.12, 0.2, 0, null, 0.35); tone('sine', 1240, 1560, 0.08, 0.08); },
    pick() { arp('triangle', [523, 659, 784], 0.05, 0.16, 0.24, 0.4); },
    lock() { tone('sawtooth', 120, 52, 0.35, 0.34); noise(0.08, 0.5, 2400, 600, 'bandpass', 0, null, 3); tone('square', 196, 185, 0.3, 0.1, now() + 0.06, null, 0.4); },
    clear() { arp('triangle', [523, 659, 784, 1047], 0.075, 0.3, 0.24, 0.5); tone('sine', 262, 262, 0.5, 0.16); },
    perk() { arp('triangle', [440, 554, 659, 880, 1109], 0.065, 0.5, 0.22, 0.6); tone('sine', 220, 220, 0.8, 0.18, 0, null, 0.4); },
    phase() { noise(0.7, 0.6, 200, 2600, 'bandpass', 0, null, 1); tone('sawtooth', 55, 230, 0.6, 0.4); tone('sine', 46, 40, 0.8, 0.5); },
    empty() { const t = now(); tone('square', 170, 150, 0.04, 0.16, t); tone('square', 130, 110, 0.05, 0.16, t + 0.07); },
    ui() { tone('sine', 880, 1180, 0.06, 0.16); tone('triangle', 1760, 1760, 0.03, 0.05); },
    eshoot() { tone('triangle', 430, 210, 0.07, 0.08); },
    portal() { tone('sine', 220, 880, 0.7, 0.2, 0, null, 0.6); noise(0.7, 0.2, 600, 5000, 'bandpass', 0, null, 2); },
    death() { const t = now(); [392, 349, 294, 220, 147].forEach((f, i) => tone('triangle', f, f * 0.97, 0.5, 0.26, t + i * 0.2, null, 0.6)); tone('sine', 73, 55, 1.6, 0.4, t + 0.8); },
    win() { const t = now(); [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, i === 6 ? 1.2 : 0.22, 0.26, t + i * 0.13, null, 0.6)); [262, 330, 392].forEach(f => tone('sine', f, f, 1.8, 0.14, t + 0.78, null, 0.4)); }
  };
  const FIXED = { coin: 1, pick: 1, clear: 1, perk: 1, death: 1, win: 1, ui: 1, portal: 1 };
  G.sfx = function (name) {
    if (!A.ctx || A._muted || A.ctx.state !== 'running') return;
    const t = A.ctx.currentTime;
    if (t - (A.last[name] || -1) < 0.045) return;
    A.last[name] = t;
    const f = SFX[name];
    if (!f) return;
    pm = FIXED[name] ? 1 : 0.94 + Math.random() * 0.12;
    f();
    pm = 1;
  };

  // ---------- 生成式背景音乐 ----------
  // 四小节和弦循环（相对根音的半音）：i - VI - III - VII
  const CHORDS = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]];
  const PENTA = [0, 3, 5, 7, 10, 12, 15];
  const ROOTS = [57, 62, 54]; // 三层各自的调：A、D、升F
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  let step = 0, nextT = 0, seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  function mode() {
    const g = G.game;
    if (!g || g.state === 'menu') return 'menu';
    if (g.state === 'dead' || g.state === 'win') return 'end';
    if (g.boss) return 'boss';
    if (g.active) return 'combat';
    return 'explore';
  }
  function pad(t, root, ch, dur, vol) {
    const c = A.ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(900, t + dur * 0.5); f.frequency.linearRampToValueAtTime(380, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.08);
    f.connect(g); g.connect(A.musBus);
    const s = c.createGain(); s.gain.value = 0.5; g.connect(s); s.connect(A.echo);
    for (const n of ch) for (const det of [-7, 7]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(root + n); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur * 1.1);
    }
  }
  const mt = (type, m, dur, vol, t, send) => tone(type, hz(m), hz(m), dur, vol, t, A.musBus, send);

  function playStep(t, md, s) {
    const g = G.game, fl = md === 'menu' ? 0 : Math.min(g.floor, 3) - 1, root = ROOTS[fl];
    const bar = Math.floor(s / 16) % 4, k = s % 16, ch = CHORDS[bar];
    const spb = md === 'boss' ? 0.119 : md === 'combat' ? 0.142 : md === 'menu' ? 0.2 : 0.165;
    if (k === 0) { pad(t, root - 12, ch, spb * 16, md === 'boss' ? 0.05 : 0.075); seed = 11 + bar * 97 + fl * 13 + (Math.floor(s / 64) % 3) * 31; }
    if (md === 'end') return spb;
    // 低音
    const bass = root - 24 + ch[0] + (ch[0] < -2 ? 12 : 0);
    if (md === 'boss') { if (k % 2 === 0) mt('sawtooth', bass + (k % 8 === 6 ? 12 : 0), spb * 1.6, 0.2, t); }
    else if (md === 'combat') { if (k % 4 === 0 || k === 10) mt('triangle', bass + 12, spb * 2.6, 0.34, t); }
    else if (k === 0 || k === 10) mt('sine', bass + 12, spb * 5, 0.36, t);
    // 琶音 / 旋律
    const dens = md === 'boss' ? 0.8 : md === 'combat' ? 0.62 : md === 'menu' ? 0.3 : 0.4;
    if ((k % 2 === 0 || md === 'boss' || md === 'combat') && rnd() < dens) {
      const fromChord = rnd() < 0.65;
      const n = fromChord ? ch[Math.floor(rnd() * 3)] + (rnd() < 0.5 ? 12 : 0) : PENTA[Math.floor(rnd() * PENTA.length)];
      const oct = fl === 1 ? 24 : 12;
      mt(fl === 2 ? 'square' : 'triangle', root + oct + n, spb * (md === 'explore' || md === 'menu' ? 3.2 : 1.5), fl === 2 ? 0.07 : 0.15, t, 0.7);
      if (fl === 1 && rnd() < 0.4) mt('sine', root + 36 + n, spb * 4, 0.06, t + spb * 0.5, 0.9);
    }
    // 鼓
    if (md === 'combat' || md === 'boss') {
      if (k % 4 === 0) { tone('sine', 130, 38, 0.16, 0.6, t, A.musBus); }
      if (k % 4 === 2) noise(0.03, md === 'boss' ? 0.16 : 0.1, 8000, 6000, 'highpass', t, A.musBus);
      if (md === 'boss') {
        if (k % 8 === 4) { noise(0.13, 0.3, 2600, 900, 'bandpass', t, A.musBus, 0.9); tone('triangle', 210, 140, 0.08, 0.2, t, A.musBus); }
        if (k === 14 || k === 15) noise(0.03, 0.12, 9000, 7000, 'highpass', t, A.musBus);
      }
    } else if (md === 'explore' && k === 8 && bar % 2 === 1) noise(0.5, 0.035, 500, 3000, 'bandpass', t, A.musBus, 2);
    return spb;
  }

  function schedule() {
    const c = A.ctx;
    if (!c || c.state !== 'running' || !A.musicOn) { nextT = 0; return; }
    if (nextT < c.currentTime) nextT = c.currentTime + 0.05;
    let guard = 0;
    while (nextT < c.currentTime + 0.22 && guard++ < 8) {
      const md = mode();
      nextT += playStep(nextT, md, step);
      step++;
    }
  }
})();
