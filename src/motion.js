// 体感操控（手机端可选）：倾斜设备移动（方向传感器），甩动设备闪避（加速度计）
'use strict';
(function () {
  const G = window.G;
  const DEAD = 4, FULL = 17, SHAKE = 17; // 死区角度、满速角度、甩动阈值(m/s²)
  const M = G.motion = {
    on: false, status: 'off', // off | wait | ok | denied | none
    supported: typeof window.DeviceOrientationEvent !== 'undefined',
    mvx: 0, mvy: 0, base: null, cur: null, lastEvt: 0, askedAt: 0, shakeAt: -1e9, rect: null, prevState: ''
  };

  // 把设备坐标系下的前后/左右倾角换算成屏幕方向上的倾角
  function screenTilt(beta, gamma) {
    let ang = 0;
    if (screen.orientation && typeof screen.orientation.angle === 'number') ang = screen.orientation.angle;
    else if (typeof window.orientation === 'number') ang = window.orientation;
    ang = ((ang % 360) + 360) % 360;
    if (ang === 90) return { x: beta, y: -gamma };
    if (ang === 270) return { x: -beta, y: gamma };
    if (ang === 180) return { x: -gamma, y: -beta };
    return { x: gamma, y: beta };
  }
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    M.cur = screenTilt(e.beta, e.gamma);
    M.lastEvt = performance.now();
    if (M.on && M.status !== 'ok') M.status = 'ok';
  }
  function onMotion(e) {
    if (!M.on || M.status !== 'ok' || G.game.state !== 'play') return;
    const a = e.acceleration;
    if (!a || a.x == null) return;
    const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0), now = performance.now();
    if (mag > SHAKE && now - M.shakeAt > 450) { M.shakeAt = now; G.input.pressed.Space = true; }
  }
  function listen() {
    if (M.listening) return;
    M.listening = true;
    window.addEventListener('deviceorientation', onOrient);
    window.addEventListener('devicemotion', onMotion);
  }

  // 必须在用户手势（点击 / 触摸结束）的事件处理里调用：iOS 要在这里申请传感器权限
  M.toggle = function () {
    G.sfx('ui');
    if (M.on) { M.on = false; M.status = 'off'; M.mvx = M.mvy = 0; return; }
    if (!M.supported) { M.status = 'none'; return; }
    const start = () => { M.on = true; M.status = 'wait'; M.base = null; M.cur = null; M.askedAt = performance.now(); listen(); };
    const DO = window.DeviceOrientationEvent, DM = window.DeviceMotionEvent;
    if (DO && typeof DO.requestPermission === 'function') {
      const asks = [DO.requestPermission()];
      if (DM && typeof DM.requestPermission === 'function') asks.push(DM.requestPermission().catch(() => 'denied'));
      Promise.all(asks).then(r => { if (r[0] === 'granted') start(); else M.status = 'denied'; }).catch(() => { M.status = 'denied'; });
    } else start();
  };
  M.calibrate = function () { M.base = null; };

  // 每帧：把相对中立位的倾角换算成移动向量
  G.updateMotion = function () {
    const g = G.game;
    M.mvx = M.mvy = 0;
    if (!M.on) { M.prevState = g.state; return; }
    if (!G.touch.on) { M.on = false; M.status = 'off'; return; }
    if (M.status === 'wait' && performance.now() - M.askedAt > 1500) { M.on = false; M.status = 'none'; return; }
    if (g.state === 'play' && M.prevState !== 'play') M.base = null; // 开局、换层、取消暂停时重新校准
    M.prevState = g.state;
    if (M.status !== 'ok' || !M.cur || g.state !== 'play') return;
    if (!M.base) M.base = { x: M.cur.x, y: M.cur.y };
    const ax = v => { const d = Math.abs(v) - DEAD; return d <= 0 ? 0 : Math.sign(v) * Math.min(1, d / (FULL - DEAD)); };
    let x = ax(M.cur.x - M.base.x), y = ax(M.cur.y - M.base.y);
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    M.mvx = x; M.mvy = y;
  };

  const LABEL = {
    off: '体感操控：关（点此开启）',
    wait: '体感操控：正在检测传感器…',
    ok: '体感操控：开 · 倾斜移动 · 甩动闪避',
    denied: '体感操控：未获得传感器权限',
    none: '体感操控：此设备或打开方式不支持'
  };
  // 开关按钮：只负责绘制和登记位置，点击在事件处理里判定（见下）
  G.motionToggle = function (ctx, x, y, w, h) {
    const on = M.status === 'ok', bad = M.status === 'denied' || M.status === 'none';
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, on ? '#1f4a46' : '#332d3a'); gr.addColorStop(1, on ? '#12302d' : '#201c26');
    ctx.fillStyle = gr; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 6); else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = on ? '#3ff0da' : bad ? '#ff8a8a' : 'rgba(255,255,255,0.22)'; ctx.lineWidth = on ? 2 : 1; ctx.stroke();
    G.text(ctx, LABEL[M.status], x + w / 2, y + h / 2 + 0.5, 14, on ? '#bff8ef' : bad ? '#ffb0b0' : '#e0d6e0', 'center', true);
    M.rect = { x, y, w, h };
  };

  G.initMotion = function (canvas) {
    const hit = (cx, cy) => {
      const r = M.rect;
      if (!r) return false;
      const b = canvas.getBoundingClientRect(), x = (cx - b.left) / b.width * G.W, y = (cy - b.top) / b.height * G.H;
      return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    };
    canvas.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (t && hit(t.clientX, t.clientY)) M.toggle(); });
    canvas.addEventListener('click', e => { if (hit(e.clientX, e.clientY)) M.toggle(); });
  };
})();
