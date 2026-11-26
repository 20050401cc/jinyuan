# 按游戏实际用到的字裁剪字体，生成 assets/fonts/*.woff2 和 fonts.css
# 用法：python tools/fonts.py <NotoSansSC[wght].ttf> <MaShanZheng-Regular.ttf>
# 两款字体均为 SIL Open Font License 1.1，可随游戏免费分发（授权文本见 assets/fonts/）
import glob, io, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(D, 'assets', 'fonts')
os.makedirs(OUT, exist_ok=True)

chars = set(chr(c) for c in range(0x20, 0x7F))
chars |= set('·、，。！？「」（）：；—…《》“”‘’◀▶✓×％＋－')
for p in glob.glob(os.path.join(D, 'src', '*.js')) + glob.glob(os.path.join(D, 'tools', '*.js')):
    chars |= set(ch for ch in io.open(p, encoding='utf8').read() if ord(ch) > 0x7F)
chars = sorted(chars)
# 楷书只用于简体中文标题：不收录译文表里的字
brush = set(chr(c) for c in range(0x20, 0x7F))
for p in glob.glob(os.path.join(D, 'src', '*.js')):
    if not os.path.basename(p).startswith('lang_'):
        brush |= set(ch for ch in io.open(p, encoding='utf8').read() if ord(ch) > 0x7F)
brush = sorted(brush)

def make(src, name, chars):
    font = TTFont(src)
    cmap = font.getBestCmap()
    missing = [c for c in chars if ord(c) not in cmap and ord(c) > 0x7F]
    opt = subset.Options()
    opt.flavor = 'woff2'
    opt.layout_features = ['*']
    opt.name_IDs = ['*']
    opt.notdef_outline = True
    sub = subset.Subsetter(opt)
    sub.populate(unicodes=[ord(c) for c in chars])
    sub.subset(font)
    dst = os.path.join(OUT, name)
    font.flavor = 'woff2'
    font.save(dst)
    print('%s: %d KB, missing %d: %s' % (name, os.path.getsize(dst) // 1024, len(missing), ''.join(missing)[:80]))

make(sys.argv[1], 'jy-sans.woff2', chars)
make(sys.argv[2], 'jy-brush.woff2', brush)
io.open(os.path.join(OUT, 'fonts.css'), 'w', encoding='utf8').write(
    "@font-face { font-family: 'JY Sans'; src: url('jy-sans.woff2') format('woff2'); font-weight: 100 900; font-display: block; }\n"
    "@font-face { font-family: 'JY Brush'; src: url('jy-brush.woff2') format('woff2'); font-weight: 400; font-display: block; }\n")
print('chars:', len(chars))
