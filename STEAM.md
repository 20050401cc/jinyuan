# 烬渊 · Steam 上架交付说明

这份文档说明 1.0.0 交付包里有什么、上架前你需要自己完成哪些事，以及每一步怎么做。

## 一、交付物

| 位置 | 内容 |
| --- | --- |
| `desktop/dist/Jinyuan-win32-x64/` | **Windows 64 位桌面版**（Electron 38）。整个文件夹就是要上传到 Steam 的游戏本体，入口 `Jinyuan.exe`。约 225 MB。 |
| `烬渊.html` | 单文件网页版（同一份游戏代码），也是桌面版内置的游戏文件。 |
| `steam/store/` | 商店与库图形，尺寸按 Steamworks 要求生成（见第五节）。 |
| `steam/screenshots/` | 10 张 1920×1080 截图（01～07 实机玩法，08～10 剧情过场与守护者登场）。 |
| `steam/achievements/` | 16 个成就的图标（已解锁 / 未解锁各一张，256×256）和 `achievements.csv`（API 名、名称、描述）。 |
| `steam/sdk/app_build.vdf` | SteamPipe 上传脚本模板。 |
| `assets/fonts/` | 内嵌字体（思源黑体、马善政楷书，均为 SIL OFL 1.1，可商用）及授权文本。 |

重新生成：

```bash
python build.py
```

```bash
cd desktop && npm run pack
```

```bash
python tools/art.py
```

依次是：重建 `烬渊.html`；重建桌面版；重建商店图、图标和成就图标。

## 二、这一版做了什么（相对网页版）

- **桌面版**：独立窗口，默认全屏，记住全屏/窗口状态和窗口大小；F11 或 Alt+Enter 切换；主菜单有「退出游戏」；失去焦点自动暂停；单实例运行；禁止页面跳转和开发者工具。
- **手柄**：标准布局（Xbox / PlayStation / Steam Deck）。左摇杆移动、右摇杆瞄准、RT 射击（只按 RT 时自动瞄准最近敌人）、A/LT 闪避、X 互动、Y/LB 换枪、Start 暂停；所有菜单都能用十字键 / 摇杆 + A/B 操作；支持震动；手柄断开自动暂停。
- **键盘也能操作所有菜单**：方向键选择、回车确认、Esc 返回。
- **设置界面**：操作方式、主音量 / 音效 / 音乐、全屏、画面清晰度（高清 / 标准）、屏幕震动强度、伤害数字、手柄震动、帧率显示，可恢复默认。
- **画面**：按屏幕分辨率渲染（2K / 4K 下清晰），宽度在 16:10 到 16:9 之间自适应，更宽的屏幕两侧留黑边。
- **内嵌字体**：不再依赖系统字体，Steam Deck / Linux 上中文也能正常显示。
- **成就**：16 个，本地记录并弹出提示；接入 Steamworks 后自动同步到 Steam 成就。
- **多语言（1.1.0）**：简体中文、繁體中文、English、日本語，按系统语言自动选择，可随时切换。
- **剧情与演出（1.1.0）**：守灯人的故事——序章、两段幕间、终章与片尾字幕，全部为程序绘制的过场插画；守护者电影式登场与阶段台词；楼层标题卡、旅人从光柱落下、Boss 击破慢动作与冲击波、倒下时的慢动作褪色。

## 三、必须由你本人完成的事

这些涉及账号、付款和法律信息，无法代办：

1. **注册 Steamworks 开发者**：<https://partner.steamgames.com/>，完成身份、银行和税务信息（中国大陆个人或公司均可，需填写税务表）。
2. **支付 Steam Direct 费用**：每款游戏 100 美元（游戏收入达到 1000 美元后返还）。付款后获得 **App ID**，同时会自动生成一个 **Depot ID**。
3. **填写商店页**：名称、简介、标签、系统需求、定价、支持的语言（界面和字幕：**简体中文、繁體中文、英语、日语**；无配音）、内容调查问卷（本作含卡通暴力）。英文商店名建议用 *Ember Abyss*。
4. **「即将推出」页面至少公开 2 周**后才能发布。
5. **提交审核**：商店页和构建各需审核一次，通常 3～5 个工作日。

## 四、技术接入步骤

### 1. 接入 Steamworks（成就同步、Steam 覆盖界面）

```bash
cd desktop && npm i steamworks.js
```

然后把 `desktop/steam_appid.example.txt` 复制为 `steam_appid.txt`，内容改成你的 App ID，再 `npm run pack`。桌面版启动时会自动初始化 Steamworks；未安装该模块或 Steam 未运行时游戏照常运行。

在 Steamworks 后台「成就」页面，按 `steam/achievements/achievements.csv` 逐个添加，**API 名称必须一字不差**，图标用同目录的 JPG。

### 2. 上传构建（SteamPipe）

1. 下载 Steamworks SDK，解压后使用 `tools/ContentBuilder/builder/steamcmd.exe`。
2. 把 `steam/sdk/app_build.vdf` 里的 App ID 和 Depot ID 替换掉，`ContentRoot` 指向打包好的 `desktop/dist/Jinyuan-win32-x64/`。
3. 运行：`steamcmd +login 你的账号 +run_app_build 完整路径\app_build.vdf +quit`。
4. 在 Steamworks 后台「安装 → 通用」里把启动项设为 `Jinyuan.exe`，操作系统选 Windows 64 位。

### 3. Steam 云存档（建议开启）

存档、设置和成就都保存在 `%APPDATA%\Jinyuan\Local Storage\`。在后台「Steam Cloud → Auto-Cloud」里添加：根目录 `WinAppDataRoaming`，子目录 `Jinyuan/Local Storage`，模式 `*`，递归。

### 4. Steam Deck

游戏的手柄操作和字体都已为 Deck 准备好，但**还没有在真机上测过**。建议先在 Deck 上通过 Proton 运行测试版，确认无误后再在后台申请 Deck 兼容性审核，并勾选「完全支持控制器」。

## 五、商店图形对照

| Steamworks 字段 | 文件 |
| --- | --- |
| 页眉胶囊 920×430 | `header_capsule_920x430.png` |
| 小胶囊 462×174 | `small_capsule_462x174.png` |
| 主胶囊 1232×706 | `main_capsule_1232x706.png` |
| 竖版胶囊 748×896 | `vertical_capsule_748x896.png` |
| 库胶囊 600×900 | `library_capsule_600x900.png` |
| 库页眉 920×430 | `library_header_920x430.png` |
| 库主视觉 3840×1240（不含文字） | `library_hero_3840x1240.png` |
| 库标志 1280×720（透明） | `library_logo_1280x720.png` |
| 页面背景 1438×810 | `page_background_1438x810.png` |
| 社区图标 184×184 | `community_icon_184x184.jpg` |
| 客户端图标 | `client_icon_32x32.png`；程序图标在 `desktop/icon.ico` |
| 截图（至少 5 张） | `steam/screenshots/screenshot_01~10.png` |

## 六、上架前建议补齐的部分（未做）

- **译文校对**：英文、日文由开发时撰写，繁体由 OpenCC 转换后人工修正了台湾用词，正式上架前建议请母语者通读一遍（尤其是剧情）。韩语等其它语言需要另加含对应字形的字体。
- **内容量**：一局约 15～25 分钟、3 层、3 个 Boss。按 Steam 同类游戏的评价习惯，正式售卖建议增加层数 / Boss / 难度等级 / 局外成长，或以低价或免费发布。
- **真人测试**：目前所有验证都是自动化脚本完成的（见第七节），手感、难度、音效听感没有真人评估过。
- **宣传视频**：商店页强烈建议放 30～60 秒实机视频，需用录屏软件录制。
- **代码签名**：未签名的 exe 首次运行时 Windows 可能弹出 SmartScreen 提示；经 Steam 安装的游戏一般影响不大，如需签名要购买代码签名证书。
- **按键重新绑定**：目前键位固定。

## 七、已做的验证

- 无头 Edge 1920×1080 下：主菜单（三种操作方式）、设置、成就、暂停、增益选择、商店、各层战斗与 Boss 截图检查，无报错。
- 键盘导航：回车开始、Esc 暂停、方向键进入设置并调音量、Esc 逐级返回。
- 模拟手柄：A 开始、左摇杆移动、RT 射击、A 闪避、Start 暂停、十字键 + A 进入设置、B 返回、断开手柄自动暂停。
- 机器人整局：打通三层并通关，成就按事件解锁，无报错。
- 打包后的 `Jinyuan.exe` 自检（`JY_SMOKE` 模式）：启动、开局、内嵌字体加载、全屏切换、成就接口调用均正常，GPU 渲染约 60 帧，无报错。
- 1.1.0：四种语言下逐屏截图检查（主菜单、设置、成就、剧情回顾、增益、结算、过场字幕），`python tools/i18n.py check` 译文覆盖率 100%；简体与英文各跑一遍完整流程（序章 → 三位守护者登场与阶段台词 → 击破慢动作 → 两段幕间 → 终章 → 结算，以及倒下的慢动作流程），无报错；桌面版在可见窗口中菜单与过场均稳定在显示器刷新率（实测 180 帧）。
- 未验证：真实手柄、Steam Deck 真机、Steamworks 实际连接（需要你的 App ID）；英文、日文、繁体译文未经母语者校对。
