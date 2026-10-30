import html, json, os, re
from pathlib import Path
company = os.environ.get('COMPANY_NAME', 'KROK Studio').strip()
slug = os.environ.get('SITE_SLUG', 'krok-studio').strip()
origin = os.environ.get('SITE_ORIGIN', '').strip().rstrip('/') + '/'
if not re.fullmatch(r'[a-z0-9]+([.-][a-z0-9]+)*', slug): raise SystemExit('invalid site slug')
if not origin.startswith('https://'): raise SystemExit('site_origin must use HTTPS')
title = f'{company} — KROK Browser Studio'
description = f'{company}: безпечна браузерна робоча область для створення, перевірки та публікації сайту.'
p = Path('index.html'); text = p.read_text()
text = text.replace('<title data-seo-title>KROK Browser Studio</title>', f'<title data-seo-title>{html.escape(title)}</title>')
text = text.replace('content="KROK Browser Studio — робоча область для керування роями агентів." data-seo-description', f'content="{html.escape(description, quote=True)}" data-seo-description')
text = text.replace('content="KROK Browser Studio" data-seo-og-title', f'content="{html.escape(title, quote=True)}" data-seo-og-title')
text = text.replace('content="Безпечна робоча область KROK Agent Swarm." data-seo-og-description', f'content="{html.escape(description, quote=True)}" data-seo-og-description')
if 'rel="canonical"' not in text: text = text.replace('  <link rel="stylesheet"', f'  <link rel="canonical" href="{html.escape(origin, quote=True)}" />\n  <link rel="stylesheet"')
p.write_text(text)
Path('robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: {origin}sitemap.xml\n')
Path('sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{html.escape(origin)}</loc></url></urlset>\n')
Path('site-config.json').write_text(json.dumps({'company_name': company, 'site_slug': slug, 'site_origin': origin}, ensure_ascii=False) + '\n')
