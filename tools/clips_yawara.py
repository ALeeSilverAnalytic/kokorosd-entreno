#!/usr/bin/env python3
"""Añade a cada técnica de Yawara el/los enlaces «Clip» de Drive.
Uso: python3 tools/clips_yawara.py content/yawara_clips.json
El JSON de entrada es {tecnica_id: [{"v": "" | "a" | "b", "id": drive_id}, ...]}.
Es idempotente: quita antes cualquier «[Clip…](drive…)» ya puesto al final del título."""
import json, re, sys
SUF = re.compile(r' \[Clip[^\]]*\]\(https://drive\.google\.com/file/d/[^)\s]+\)')
mapa = json.load(open(sys.argv[1], encoding='utf-8'))
p = 'content/yawara.json'
c = json.load(open(p, encoding='utf-8'))
n = 0
for op in c['ops']:
    if op['t'] != 'tecnica':
        continue
    for t in op['rows']:
        t['titulo'] = SUF.sub('', t['titulo'])
        cl = sorted(mapa.get(t['id'], []), key=lambda x: x['v'])
        for x in cl:
            lab = 'Clip' + (' ' + x['v'] if x['v'] else '')
            t['titulo'] += ' [%s](https://drive.google.com/file/d/%s/view)' % (lab, x['id'])
        n += bool(cl)
open(p, 'w', encoding='utf-8').write(json.dumps(c, ensure_ascii=False, separators=(',', ':')))
print('técnicas con clip:', n)
