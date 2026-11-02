#!/usr/bin/env python3
"""Genera las técnicas de Negro 2º-5º Dan desde el índice de clips y enlaza Azul (golpes/puñal) y Puntos vitales.
Uso: python3 tools/danes_yawara.py /ruta/idx_nuevo.json /ruta/indice-clips-mi-drive.csv
Idempotente: no duplica técnicas (ids uuid5 deterministas) ni clips ya mapeados."""
import json, re, sys, csv, uuid, collections
NS = uuid.UUID('6f1c1d0e-4b7a-4c55-9d52-1c0a0c0c0c0c')
idx = json.load(open(sys.argv[1], encoding='utf-8'))
mine = {r['codigo']: r['enlace_mi_drive'].split('/d/')[1].split('/')[0]
        for r in csv.DictReader(open(sys.argv[2], encoding='utf-8'))}
Y = json.load(open('content/yawara.json', encoding='utf-8'))
niv = {r['codigo']: r['id'] for r in Y['ops'][1]['rows']}
nivcod = {v: k for k, v in niv.items()}
tec = Y['ops'][2]['rows']
clips = json.load(open('content/yawara_clips.json', encoding='utf-8'))
def limpia(s): return re.sub(r'\\(.)', r'\1', s).strip()
def base(c, v): return c[:-len(v)] if v and c.endswith(v) else c
# --- 1. Azul: golpes (se parte en dos bloques) y puñal (a, b, d) ---
az = {t['id']: t for t in tec if t['nivel_id'] == niv['azul']}
golpes = sorted([t for t in az.values() if t['seccion'].startswith('Defensa contra golpes')], key=lambda t: t['orden'])
for i, t in enumerate(golpes):
    t['seccion'] = ('Defensa contra golpes › a1) Agarre de brazo y ataque de palo · agarre cruzado' if i < 10
                    else 'Defensa contra golpes › a2) Agarre de brazo y ataque de palo · agarre mismo lado')
    code = 'azul:3a%d-%02d' % (1 if i < 10 else 2, int(t['codigo']))
    clips[t['id']] = [{'v': '', 'id': mine[code]}]
for t in az.values():
    m = re.match(r'Defensa contra puñal › ([abd])\)', t['seccion'])
    if m:
        clips[t['id']] = [{'v': '', 'id': mine['azul:4%s-%02d' % (m[1], int(t['codigo']))]}]
# --- 2. Negro 1º: Puntos vitales -> un clip por cara ---
for t in tec:
    if t['nivel_id'] == niv['negro1'] and t['seccion'].startswith('Puntos vitales › '):
        cara = 'a' if '› a)' in t['seccion'] else 'b'
        clips[t['id']] = [{'v': 'completo', 'id': mine['negro1:6%s-01' % cara]}]
# --- 3. Danes: crear técnicas ---
ex = {t['id'] for t in tec}
nuevos = 0
for lv in ['negro2', 'negro3', 'negro4', 'negro5']:
    rows = [r for r in idx if r['codigo'].startswith(lv + ':')]
    def clave(r):
        c = r['codigo'].split(':')[1]; m = re.match(r'(\d+)([a-z]\d*|x)-(\d+)', c)
        return (m[1], m[2].rstrip('0123456789') != 'x', m[2], int(m[3]), c)
    rows.sort(key=clave)
    grupos = collections.OrderedDict()
    for r in rows:
        c = r['codigo'].split(':')[1]; b = base(c, r['variante'])
        nombre = limpia(r['nombre'])
        if lv == 'negro4' and b.startswith('2g-05'):
            nombre = nombre.replace('O-goshi', 'O-goshi / Koshi-guruma')
        k = (b, nombre if r['variante'] and False else nombre)
        grupos.setdefault((b, nombre), []).append(r)
    # variantes con mismo nombre -> una técnica con varios clips; con distinto nombre -> técnicas separadas
    orden = 0
    for (b, nombre), rs in grupos.items():
        r0 = rs[0]; orden += 1
        extra = r0['bloque'].endswith('x') or lv == 'negro2' and r0['bloque'] == '1x'
        letra = r0['bloque']
        bn = limpia(r0['bloque_nombre'].split(' - ', 1)[-1])
        if extra:
            seccion = 'Extras del vídeo › ' + bn
        else:
            seccion = '%s › %s) %s' % (limpia(r0['seccion']), letra[-1] if letra[-1].isalpha() else letra, bn)
        cod = r0['codigo'].split(':')[1]
        num = re.search(r'-(\d+)', b)[1].lstrip('0') or '0'
        tid = str(uuid.uuid5(NS, 'yawara-%s-%s-%s' % (lv, b, nombre)))
        if tid not in ex:
            tec.append({'id': tid, 'nivel_id': niv[lv], 'seccion': seccion, 'codigo': num, 'titulo': nombre,
                        'descripcion': None, 'orden': orden}); ex.add(tid); nuevos += 1
        clips[tid] = [{'v': r['variante'], 'id': mine[r['codigo']]} for r in rs]
open('content/yawara.json', 'w', encoding='utf-8').write(json.dumps(Y, ensure_ascii=False, separators=(',', ':')))
open('content/yawara_clips.json', 'w', encoding='utf-8').write(json.dumps(clips, separators=(',', ':')))
print('técnicas nuevas:', nuevos, '| con clip:', len(clips))
