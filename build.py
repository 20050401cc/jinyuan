# 把 index.html 和 src/ 下的脚本合并成一个可独立分发的单文件：烬渊.html
# 用法：python build.py
import io, os, re

D = os.path.dirname(os.path.abspath(__file__))
html = io.open(os.path.join(D, 'index.html'), encoding='utf8').read()

def inline(m):
    code = io.open(os.path.join(D, m.group(1)), encoding='utf8').read()
    assert '</script' not in code.lower(), m.group(1)
    return '<script>\n' + code + '\n</script>'

out, n = re.subn(r'<script src="([^"]+)"></script>', inline, html)
assert 'src="' not in out, '仍有外部引用'
dst = os.path.join(D, '烬渊.html')
io.open(dst, 'w', encoding='utf8', newline='\n').write(out)
print('ok: %d scripts inlined, %.0f KB' % (n, os.path.getsize(dst) / 1024))
