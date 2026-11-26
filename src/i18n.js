// 多语言：以简体中文原文作键，其它语言在 lang_*.js 中提供译文；G.text / G.textO 绘制时自动翻译
'use strict';
(function () {
  const G = window.G;
  G.LANGS = [
    { id: 'zh', name: '简体中文', html: 'zh-CN' },
    { id: 'zht', name: '繁體中文', html: 'zh-TW' },
    { id: 'en', name: 'English', html: 'en' },
    { id: 'ja', name: '日本語', html: 'ja' }
  ];
  // 简体中文只需少量「同字异义」的覆盖项（以 # 开头的键）
  G.I18N = { zh: { '#闪': '闪' }, zht: {}, en: {}, ja: {} };
  G.lang = 'zh';

  // 内嵌的开源字体（思源黑体 / 马善政楷书裁剪版），系统字体作后备
  G.FONT_SANS = '"JY Sans","Microsoft YaHei","PingFang SC","Hiragino Sans","Noto Sans CJK SC",sans-serif';
  G.FONT = G.FONT_SANS;
  G.FONT_T = '"JY Brush","STXingkai","KaiTi",' + G.FONT_SANS;

  let dict = G.I18N.zh;
  // 翻译一条原文；没有译文时原样返回
  G.tr = function (s) {
    if (!dict || typeof s !== 'string') return s;
    const v = dict[s];
    return v === undefined ? s : v;
  };
  // 带参数的模板：G.tf('第 {0} 层', 3)
  G.tf = function (key) {
    const a = arguments;
    return String(G.tr(key)).replace(/\{(\d)\}/g, (m, i) => (a[+i + 1] === undefined ? '' : a[+i + 1]));
  };
  // 英文按单词换行，其余按字
  G.cjk = () => G.lang !== 'en';

  G.detectLang = function () {
    const l = ((navigator.languages && navigator.languages[0]) || navigator.language || 'zh').toLowerCase();
    if (/^zh-(tw|hk|mo|hant)/.test(l) || l.indexOf('hant') >= 0) return 'zht';
    if (l.indexOf('zh') === 0) return 'zh';
    if (l.indexOf('ja') === 0) return 'ja';
    return 'en';
  };

  G.setLang = function (id) {
    if (!G.LANGS.some(l => l.id === id)) id = 'zh';
    G.lang = id;
    dict = G.I18N[id];
    // 楷书字体只覆盖简体字，其它语言的标题改用粗黑体
    G.FONT_T = id === 'zh' ? '"JY Brush","STXingkai","KaiTi",' + G.FONT_SANS : G.FONT_SANS;
    const L = G.LANGS.find(l => l.id === id);
    try {
      document.documentElement.lang = L.html;
      document.title = G.tr('烬渊 · 地牢远征');
    } catch (e) { /* 非浏览器环境 */ }
  };
  G.langName = () => G.LANGS.find(l => l.id === G.lang).name;
  G.cycleLang = function (d) {
    const i = G.LANGS.findIndex(l => l.id === G.lang);
    const n = G.LANGS[(i + (d || 1) + G.LANGS.length) % G.LANGS.length].id;
    G.setLang(n);
    G.settings.lang = n;
    G.saveSettings();
  };

  // 按宽度把一段文字拆成多行
  G.wrapLines = function (ctx, str, maxW) {
    str = G.tr(str);
    const out = [];
    for (const para of String(str).split('\n')) {
      let line = '';
      if (G.cjk()) {
        for (const ch of para) {
          if (line && ctx.measureText(line + ch).width > maxW && '，。、！？」』）…—·,.!?'.indexOf(ch) < 0) { out.push(line); line = ''; }
          line += ch;
        }
      } else {
        for (const w of para.split(' ')) {
          const t = line ? line + ' ' + w : w;
          if (line && ctx.measureText(t).width > maxW) { out.push(line); line = w; } else line = t;
        }
      }
      out.push(line);
    }
    return out;
  };
})();
