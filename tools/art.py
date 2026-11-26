# 用无头 Edge 渲染 Steam 商店素材和程序图标，输出到 steam/store/ 和 desktop/icon.*
# 用法：python tools/art.py
import base64, io, os, re, subprocess, tempfile
from urllib.parse import quote
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.join(D, 'steam', 'store')
os.makedirs(OUT, exist_ok=True)
tmp = tempfile.mkdtemp(prefix='jyart_')
s = io.open(os.path.join(D, '烬渊.html'), encoding='utf8').read()
s = s.replace('</body>', '<script>\n' + io.open(os.path.join(D, 'tools', 'art.js'), encoding='utf8').read() + '\n</script>\n</body>')
page = os.path.join(tmp, 'art.html')
io.open(page, 'w', encoding='utf8').write(s)
url = 'file:///' + quote(page.replace('\\', '/'), safe='/:')

# Steamworks 要求的尺寸（2025 版商店图形规格）
ASSETS = [
    ('header', 920, 430, 'header_capsule_920x430.png'),
    ('small', 462, 174, 'small_capsule_462x174.png'),
    ('main', 1232, 706, 'main_capsule_1232x706.png'),
    ('vertical', 748, 896, 'vertical_capsule_748x896.png'),
    ('library', 600, 900, 'library_capsule_600x900.png'),
    ('hero', 3840, 1240, 'library_hero_3840x1240.png'),
    ('logo', 1280, 720, 'library_logo_1280x720.png'),
    ('background', 1438, 810, 'page_background_1438x810.png'),
    ('header', 920, 430, 'library_header_920x430.png'),
    ('icon', 256, 256, '_icon256.png'),
    ('achsheet', 4096, 512, '_achsheet.png'),
]
for kind, w, h, name in ASSETS:
    dst = os.path.join(OUT, name)
    args = [EDGE, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
            '--window-size=%d,%d' % (w, h), '--virtual-time-budget=4000', '--user-data-dir=' + os.path.join(tmp, 'prof'),
            '--screenshot=' + dst, url + '?w=%d&h=%d#%s' % (w, h, kind)]
    if kind in ('logo', 'icon', 'achsheet'):
        args = [x for x in args if not x.startswith('--screenshot=')] + ['--dump-dom']
        r = subprocess.run(args[:-2] + ['--dump-dom', url + '?w=%d&h=%d#%s' % (w, h, kind)], capture_output=True, timeout=180)
        m = re.search(r'PNG:data:image/png;base64,([A-Za-z0-9+/=]+):END', r.stdout.decode('utf8', 'replace'))
        open(dst, 'wb').write(base64.b64decode(m.group(1)))
    else:
        subprocess.run(args, capture_output=True, timeout=180)
    with Image.open(dst) as im:
        if im.size != (w, h): im.crop((0, 0, w, h)).save(dst)
        print(name, im.size, im.mode)

with Image.open(os.path.join(OUT, '_icon256.png')) as im0: icon = im0.convert('RGBA')
icon.save(os.path.join(D, 'desktop', 'icon.png'))
icon.save(os.path.join(D, 'desktop', 'icon.ico'), sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
icon.resize((184, 184), Image.LANCZOS).convert('RGB').save(os.path.join(OUT, 'community_icon_184x184.jpg'), quality=92)
icon.resize((32, 32), Image.LANCZOS).save(os.path.join(OUT, 'client_icon_32x32.png'))
os.replace(os.path.join(OUT, '_icon256.png'), os.path.join(OUT, 'icon_256x256.png'))
print('icons ok')

# 成就图标：Steamworks 需要每个成就一张已解锁、一张未解锁（256×256 JPG）
ACH = os.path.join(D, 'steam', 'achievements')
os.makedirs(ACH, exist_ok=True)
src = io.open(os.path.join(D, 'src', 'achievements.js'), encoding='utf8').read()
ids = re.findall(r"\{ id: '([a-z_0-9]+)', api: '([A-Z_0-9]+)', glyph: '[^']*', color: '[^']*', name: '([^']*)', desc: '([^']*)' \}", src)
with Image.open(os.path.join(OUT, '_achsheet.png')) as sheet:
    sheet = sheet.convert('RGB')
    rows = ['API Name,Display Name (zh),Description (zh),Icon,Icon Gray']
    for i, (aid, api, name, desc) in enumerate(ids):
        sheet.crop((i * 256, 0, i * 256 + 256, 256)).save(os.path.join(ACH, api + '.jpg'), quality=92)
        sheet.crop((i * 256, 256, i * 256 + 256, 512)).save(os.path.join(ACH, api + '_locked.jpg'), quality=92)
        rows.append('%s,%s,%s,%s.jpg,%s_locked.jpg' % (api, name, desc, api, api))
io.open(os.path.join(ACH, 'achievements.csv'), 'w', encoding='utf-8-sig').write('\n'.join(rows) + '\n')
os.remove(os.path.join(OUT, '_achsheet.png'))
print('achievements:', len(ids))
