"""Split index.astro's body into one component per section.

The port moved the markup into Astro but left it as one long page, which is
still hand-written HTML in a different folder. This cuts it at the top-level
sections so each part of the site is its own file, and so the band that asks
you to book a visit stops existing three times.

    python3 -I nero/web/componentise.py
"""
import pathlib, re, sys

W = pathlib.Path(__file__).resolve().parent
PAGE = W / 'src' / 'pages' / 'index.astro'
COMP = W / 'src' / 'components'

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'param', 'source', 'track', 'wbr'}
TAG = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)(/?)>', re.S)

# section id or class -> component name
NAMES = {
    'top': 'SiteHeader', 'nav': 'MainNav', 'rail': 'ChapterRail',
    'home': 'Room', 'lighting-note': 'LightingNote', 'collection': 'Collection',
    'making': 'Making', 'story': 'Story', 'team': 'Atelier',
    'showroom': 'Showroom', 'pool': 'ImagePool', 'pieces': 'Pieces',
    'ldr': None, 'main': None,
}


def pascal(s):
    return ''.join(w.capitalize() for w in re.split(r'[^a-zA-Z0-9]+', s) if w)


def top_level_blocks(body):
    """Yield (name, html) for each depth-0 element, and plain text between."""
    depth, out, start, cur = 0, [], 0, None
    for m in TAG.finditer(body):
        closing, tag, attrs, selfclose = m.group(1), m.group(2).lower(), m.group(3), m.group(4)
        if tag in VOID or selfclose:
            continue
        if not closing:
            if depth == 0:
                if start < m.start():
                    out.append((None, body[start:m.start()]))
                cur, start = (tag, attrs), m.start()
            depth += 1
        else:
            depth -= 1
            if depth == 0 and cur:
                out.append((cur, body[start:m.end()]))
                start, cur = m.end(), None
    if start < len(body):
        out.append((None, body[start:]))
    return out


def name_for(tag, attrs, seen):
    idm = re.search(r'id="([^"]+)"', attrs)
    clm = re.search(r'class="([^"]+)"', attrs)
    key = idm.group(1) if idm else None
    if key in NAMES:
        return NAMES[key]
    if key:
        return pascal(key)
    if clm and clm.group(1).strip() and not idm:
        first = clm.group(1).split()[0]
        if first not in ('vband',):
            n = seen.get(first, 0) + 1
            seen[first] = n
            return pascal(first) + ('' if n == 1 else str(n))
    if clm and 'vband' in clm.group(1):
        n = seen.get('BookBand', 0) + 1
        seen['BookBand'] = n
        return f'BookBand{n}'
    if tag == 'footer':
        return 'SiteFooter'
    if tag == 'main':
        return None            # main is the wrapper; its children are split instead
    n = seen.get(tag, 0) + 1
    seen[tag] = n
    return f'{tag.capitalize()}{n}'


def main():
    page = PAGE.read_text(encoding='utf-8')
    head, sep, rest = page.partition('  <body>\n')
    if not sep:
        sys.exit('could not find the body in index.astro')
    body, sep2, tail = rest.partition('\n\n    {/*')
    COMP.mkdir(parents=True, exist_ok=True)
    for f in COMP.glob('*.astro'):
        f.unlink()

    seen, parts, imports = {}, [], []
    for meta, html in top_level_blocks(body):
        if meta is None:
            if html.strip():
                parts.append(html.rstrip())
            continue
        tag, attrs = meta
        name = name_for(tag, attrs, seen)
        if name is None:
            if tag == 'main':
                open_tag = html[:html.index('>') + 1]
                inner = html[len(open_tag):html.rindex('</main>')]
                parts.append('    ' + open_tag)
                for m2, h2 in top_level_blocks(inner):
                    if m2 is None:
                        if h2.strip():
                            parts.append(h2.rstrip())
                        continue
                    t2, a2 = m2
                    n2 = name_for(t2, a2, seen)
                    if n2 is None:
                        parts.append(h2.rstrip())
                        continue
                    (COMP / f'{n2}.astro').write_text('---\n---\n' + h2.strip() + '\n', encoding='utf-8')
                    imports.append(n2)
                    parts.append(f'      <{n2} />')
                parts.append('    </main>')
            else:
                parts.append(html.rstrip())
            continue
        (COMP / f'{name}.astro').write_text('---\n---\n' + html.strip() + '\n', encoding='utf-8')
        imports.append(name)
        parts.append(f'    <{name} />')

    imp = '\n'.join(f"import {n} from '../components/{n}.astro';" for n in imports)
    head = head.replace("import '../styles/nero.css';",
                        "import '../styles/nero.css';\n" + imp)
    PAGE.write_text(head + '  <body>\n' + '\n'.join(parts) + '\n\n    {/*' + tail,
                    encoding='utf-8')
    print(f'{len(imports)} components: ' + ', '.join(imports))


if __name__ == '__main__':
    main()
