# 多语言辅助：提取需要翻译的中文原文、检查译文覆盖率、用 OpenCC 生成繁体中文表
# 用法：python tools/i18n.py keys | check | zht
import glob, io, json, os, re, sys

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CJK = re.compile(r'[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]')

def strip_comments(s):
    out = []
    for line in s.split('\n'):
        i, q = 0, None
        while i < len(line):
            c = line[i]
            if q:
                if c == chr(92): i += 1
                elif c == q: q = None
            elif c in '\'"`': q = c
            elif line.startswith('//', i): line = line[:i]; break
            elif line.startswith('/*', i):
                j = line.find('*/', i)
                line = line[:i] + (line[j + 2:] if j >= 0 else ''); continue
            i += 1
        out.append(line)
    return '\n'.join(out)

def keys():
    ks = []
    for p in sorted(glob.glob(os.path.join(D, 'src', '*.js'))):
        if os.path.basename(p).startswith('lang_'): continue
        s = strip_comments(io.open(p, encoding='utf8').read())
        for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'", s):
            v = m.group(1).replace(chr(92) + "'", "'")
            if CJK.search(v) and v not in ks: ks.append(v)
    return ks

def load(lang):
    s = io.open(os.path.join(D, 'src', 'lang_%s.js' % lang), encoding='utf8').read()
    return json.loads(s[s.index('{'):s.rindex('}') + 1])

def write(lang, title, d):
    body = json.dumps(d, ensure_ascii=False, indent=2)
    io.open(os.path.join(D, 'src', 'lang_%s.js' % lang), 'w', encoding='utf8', newline='\n').write(
        '// %s（以简体中文原文为键；由 tools/i18n.py 检查覆盖率）\n\'use strict\';\nwindow.G.I18N.%s = %s;\n' % (title, lang, body))

if __name__ == '__main__':
    cmd = sys.argv[1]
    ks = keys()
    if cmd == 'keys':
        io.open(os.path.join(D, '_keys.txt'), 'w', encoding='utf8').write('\n'.join(ks))
        print(len(ks), 'keys -> _keys.txt')
    elif cmd == 'check':
        bad = 0
        IGNORE = {'「', '，。、！？」』）…—·,.!?', '0123456789层击杀', '音量', '简体中文', '繁體中文', '日本語'}
        for lang in ('en', 'ja', 'zht'):
            d = load(lang)
            # 英文版的徽记保留汉字作装饰
            miss = [k for k in ks if k not in d and k not in IGNORE and not (lang == 'en' and len(k) == 1)]
            ph = [k for k in ks if k in d and sorted(re.findall(r'\{\d\}', k)) != sorted(re.findall(r'\{\d\}', d[k]))]
            extra = [k for k in d if k not in ks]
            print(lang, 'missing', len(miss), 'placeholder-mismatch', len(ph), 'unused', len(extra))
            for k in miss[:40] + ph: print('   ', repr(k))
            bad += len(miss) + len(ph)
        sys.exit(1 if bad else 0)
    elif cmd == 'zht':
        from opencc import OpenCC
        cc = OpenCC('s2twp')
        en = load('en')
        fix = json.load(io.open(os.path.join(D, 'tools', 'zht_fix.json'), encoding='utf8')) if os.path.exists(os.path.join(D, 'tools', 'zht_fix.json')) else {}
        d = {}
        for k in ks:
            d[k] = fix.get(k, cc.convert(k))
        write('zht', '繁體中文', d)
        print('zht', len(d))
