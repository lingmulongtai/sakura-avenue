"""Rewrite the shared site header and footer in every top-level HTML page.

Each page marks the blocks to replace:

    <!-- site-header:<page-key> --> ... <!-- /site-header -->
    <!-- site-footer --> ... <!-- /site-footer -->

Add or rename a page in PAGES, then run from the repository root:

    python3 tools/sync_chrome.py
"""
import pathlib
import re

PAGES = [
    ('./', 'guide', '図解ガイド', 'Guide'),
    ('strategy.html', 'strategy', '戦略ノート', 'Strategy'),
    ('calculator.html', 'calculator', '得点計算', 'Score calculator'),
    ('glossary.html', 'glossary', '用語集', 'Glossary'),
    ('models.html', 'models', '3Dモデル', '3D models'),
]
OFFICIAL = 'https://kansai-harurobo.org/kansai_harurobocon/'
LANGSW = ('<div class="langsw" role="group" aria-label="Language">'
          '<button type="button" data-lang="ja" aria-pressed="true">日本語</button>'
          '<button type="button" data-lang="en" aria-pressed="false">EN</button></div>')


def header(cur):
    links = '\n'.join(
        '      <a href="%s"%s><span lang="ja">%s</span><span lang="en">%s</span></a>'
        % (href, ' aria-current="page"' if key == cur else '', ja, en)
        for href, key, ja, en in PAGES)
    sticky = '' if cur == 'guide' else ' sticky'  # the guide has its own sticky section nav
    return ('<header class="sitebar%s">\n  <div class="wrap">\n'
            '    <a class="brand" href="./"><img src="assets/icons/favicon.svg" alt="" width="28" height="28"><span class="brand-name">SAKURA AVENUE</span>'
            '<span class="brand-tag"><span lang="ja">非公式ガイド</span><span lang="en">Unofficial guide</span></span></a>\n'
            '    <nav class="pagelinks" aria-label="Site">\n%s\n    </nav>\n    %s\n  </div>\n</header>\n') % (sticky, links, LANGSW)


def footer():
    links = ''.join('<li><a href="%s"><span lang="ja">%s</span><span lang="en">%s</span></a></li>' % (href, ja, en)
                    for href, _, ja, en in PAGES)
    links += ('<li><a href="docs/関西春ロボコン2027_ルールブック.pdf"><span lang="ja">ルールブック（PDF）</span>'
              '<span lang="en">Rulebook (PDF, Japanese)</span></a></li>')
    source = (
        '<p><span lang="ja">出典：関西春ロボコン2027 競技課題「SAKURA AVENUE」ver.1.0.0（2026年10月1日、関西春ロボコン運営委員会）。'
        'このページは非公式の解説です。ルールの補足・変更やFAQは <a href="%s" target="_blank" rel="noopener">公式ホームページ</a> で確認してください。</span>'
        '<span lang="en">Source: Kansai Spring Robocon 2027 game rules "SAKURA AVENUE" ver.1.0.0 (October 1, 2026, Kansai Spring Robocon Organizing Committee). '
        'This is an unofficial explainer; the Japanese rulebook is authoritative. Check rule updates and the FAQ on the '
        '<a href="%s" target="_blank" rel="noopener">official website</a>.</span></p>') % (OFFICIAL, OFFICIAL)
    about = ('<span lang="ja">関西春ロボコン2027の競技課題「SAKURA AVENUE」を、アニメーションと動かせる図で読み解く非公式ガイドです。</span>'
             '<span lang="en">An unofficial guide to the Kansai Spring Robocon 2027 game "SAKURA AVENUE", told with animations and diagrams you can play with.</span>')
    return ('<footer class="sitefoot">\n  <div class="wrap">\n    <div class="foot-grid">\n'
            '      <div class="foot-brand"><a class="brand" href="./"><img src="assets/icons/favicon.svg" alt="" width="28" height="28">'
            '<span class="brand-name">SAKURA AVENUE</span></a><p>%s</p></div>\n'
            '      <nav aria-label="Footer"><ul class="foot-links">%s</ul></nav>\n'
            '    </div>\n    <div class="foot-source">%s</div>\n  </div>\n</footer>\n') % (about, links, source)


def main():
    root = pathlib.Path(__file__).resolve().parent.parent
    for page in sorted(root.glob('*.html')):
        src = page.read_text()
        out = re.sub(r'(<!-- site-header:(\w+) -->\n).*?(<!-- /site-header -->)',
                     lambda m: m.group(1) + header(m.group(2)) + m.group(3), src, flags=re.S)
        out = re.sub(r'(<!-- site-footer -->\n).*?(<!-- /site-footer -->)',
                     lambda m: m.group(1) + footer() + m.group(2), out, flags=re.S)
        if out != src:
            page.write_text(out)
            print('updated', page.name)


if __name__ == '__main__':
    main()
