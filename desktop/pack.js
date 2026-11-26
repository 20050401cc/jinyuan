// 打包 Windows 桌面版：先把 ../烬渊.html 复制进来，再用 @electron/packager 生成 dist/Jinyuan-win32-x64
// 用法：npm run pack
'use strict';
const fs = require('fs');
const path = require('path');
const { packager } = require('@electron/packager');

(async () => {
  const src = path.join(__dirname, '..', '烬渊.html');
  if (!fs.existsSync(src)) throw new Error('先在上级目录运行 python build.py 生成 烬渊.html');
  fs.mkdirSync(path.join(__dirname, 'game'), { recursive: true });
  fs.copyFileSync(src, path.join(__dirname, 'game', 'index.html'));
  const out = await packager({
    dir: __dirname,
    name: 'Jinyuan',
    executableName: 'Jinyuan',
    platform: 'win32',
    arch: 'x64',
    out: path.join(__dirname, 'dist'),
    overwrite: true,
    asar: true,
    icon: path.join(__dirname, 'icon.ico'),
    appVersion: require('./package.json').version,
    appCopyright: '© 2026 烬渊',
    win32metadata: { ProductName: '烬渊', FileDescription: '烬渊', CompanyName: '烬渊', InternalName: 'Jinyuan', OriginalFilename: 'Jinyuan.exe' },
    ignore: [/^\/dist($|\/)/, /^\/pack\.js$/, /^\/icon\.ico$/, /^\/steam($|\/)/]
  });
  // Steam 会读取可执行文件旁边的 steam_appid.txt（仅开发测试时需要，上架后由 Steam 客户端提供）
  const id = path.join(__dirname, 'steam_appid.txt');
  if (fs.existsSync(id)) fs.copyFileSync(id, path.join(out[0], 'steam_appid.txt'));
  console.log('打包完成：' + out[0]);
})().catch(e => { console.error(e); process.exit(1); });
