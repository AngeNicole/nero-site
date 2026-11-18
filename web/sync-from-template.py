"""Rebuild the Astro sources from phase-4-applications/site.template.html.

The template is still the thing that is edited and still what publish-pages.sh
ships. Until that switches, this keeps the Astro copy honest: run it after any
template change rather than editing both and hoping they match.

    python3 -I nero/web/sync-from-template.py        (run from Portfolio/)
"""
import pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]      # Portfolio/
NERO = ROOT / 'nero'
W = NERO / 'web'
TPL = NERO / 'phase-4-applications' / 'site.template.html'

FONTS = {'FR': 'fonts/Fraunces-normal.ttf',
         'FRI': 'fonts/Fraunces-italic.ttf',
         'SAT': 'fonts/Satoshi-normal.woff2'}


def main():
    t = TPL.read_text(encoding='utf-8')
    for d in ('src/styles', 'public/js', 'public/img', 'public/fonts'):
        p = W / d
        p.mkdir(parents=True, exist_ok=True)
        for f in p.glob('*'):
            if f.is_file():
                f.unlink()

    # __TOKEN__ placeholders become real files
    imgmap, imgs = {}, 0
    for k in sorted(set(re.findall(r'__([A-Z0-9]+)__', t))):
        if k in FONTS:
            src = NERO / FONTS[k]
            if src.exists():
                shutil.copy(src, W / 'public' / 'fonts' / src.name)
            continue
        for ext in ('png', 'jpg'):
            p = NERO / 'phase-2-guidelines' / 'embed' / f'{k}.{ext}'
            if p.exists():
                shutil.copy(p, W / 'public' / 'img' / f'{k}.{ext}')
                imgmap[k] = f'/img/{k}.{ext}'
                imgs += 1
                break

    t = re.sub(r'data:image/(?:png|jpeg);base64,__([A-Z0-9]+)__',
               lambda m: imgmap.get(m.group(1), m.group(0)), t)
    t = t.replace('url("data:font/ttf;base64,__FR__")', 'url("/fonts/Fraunces-normal.ttf")')
    t = t.replace('url("data:font/woff2;base64,__SAT__")', 'url("/fonts/Satoshi-normal.woff2")')
    left = sorted(set(re.findall(r'__[A-Z0-9]+__', t)))
    if left:
        sys.exit(f'placeholders left unresolved: {left}')

    styles = re.findall(r'<style(?:\s[^>]*)?>(.*?)</style>', t, re.S)
    scripts = [s.strip() for s in re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', t, re.S) if s.strip()]
    externals = re.findall(r'<script[^>]*\ssrc="(https?://[^"]+)"[^>]*>', t)

    loader_css = next(s for s in styles if '#ldr' in s and '--p' in s)
    site_css = max(styles, key=len)
    (W / 'src' / 'styles' / 'loader.css').write_text(loader_css.strip() + '\n', encoding='utf-8')
    (W / 'src' / 'styles' / 'nero.css').write_text(site_css.strip() + '\n', encoding='utf-8')

    named, rest = {}, []
    for b in scripts:
        if "getElementById('ldr')" in b and 'loader' not in named:
            named['loader'] = b
        elif 'nero-theme' in b and len(b) < 400 and 'theme' not in named:
            named['theme'] = b
        else:
            rest.append(b)
    for n, b in named.items():
        (W / 'public' / 'js' / f'{n}.js').write_text(b + '\n', encoding='utf-8')
    (W / 'public' / 'js' / 'site.js').write_text('\n\n'.join(rest) + '\n', encoding='utf-8')

    body = re.sub(r'<style(?:\s[^>]*)?>.*?</style>\s*', '', t, flags=re.S)
    body = re.sub(r'<script(?:\s[^>]*)?>.*?</script>\s*', '', body, flags=re.S)
    body = re.sub(r'<title>.*?</title>\s*', '', body, flags=re.S)
    body = re.sub(r'<meta name="claude:[^>]*>\s*', '', body)
    body = re.sub(r'<noscript>\s*</noscript>\s*', '', body).strip()

    page = pathlib.Path(W / 'src' / 'pages' / 'index.astro').read_text(encoding='utf-8')
    head, _, tail = page.partition('  <body>\n')
    _, _, scripts_tail = tail.partition('\n\n    {/*')
    new_tail = '  <body>\n' + body + '\n\n    {/*' + scripts_tail
    (W / 'src' / 'pages' / 'index.astro').write_text(head + new_tail, encoding='utf-8')

    print(f'photographs {imgs} | loader.css {len(loader_css)//1024}KB | '
          f'nero.css {len(site_css)//1024}KB | scripts {len(named)+1}')
    print('external scripts the page still needs:', *externals, sep='\n  ')


if __name__ == '__main__':
    main()
