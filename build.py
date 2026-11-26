# 把 index.html、src/ 下的脚本和 assets/fonts 下的字体合并成一个可独立分发的单文件：烬渊.html
# 用法：python build.py
import base64, io, os, re

D = os.path.dirname(os.path.abspath(__file__))
html = io.open(os.path.join(D, 'index.html'), encoding='utf8').read()

def inline_js(m):
    code = io.open(os.path.join(D, m.group(1)), encoding='utf8').read()
    assert '</script' not in code.lower(), m.group(1)
    return '<script>\n' + code + '\n</script>'

def inline_css(m):
    path = os.path.join(D, m.group(1))
    css = io.open(path, encoding='utf8').read()
    def font(f):
        data = open(os.path.join(os.path.dirname(path), f.group(1)), 'rb').read()
        return "url(data:font/woff2;base64," + base64.b64encode(data).decode() + ")"
    return '<style>\n' + re.sub(r"url\('([^']+\.woff2)'\)", font, css) + '</style>'

out, n = re.subn(r'<script src="([^"]+)"></script>', inline_js, html)
out, m = re.subn(r'<link rel="stylesheet" href="([^"]+)">', inline_css, out)
assert 'src="' not in out and 'href="' not in out, '仍有外部引用'
dst = os.path.join(D, '烬渊.html')
io.open(dst, 'w', encoding='utf8', newline='\n').write(out)
print('ok: %d scripts, %d stylesheets inlined, %.0f KB' % (n, m, os.path.getsize(dst) / 1024))
