"""Reconstruction 3D de la future salle polyvalente d'Onex (projet lauréat « Tous en scène »,
Pierre-Alain Dupraz Architectes / The Space Factory) d'après la présentation du 16.04.2025.

Échelle relevée sur le plan « One man show » (p.33) : 42,5 px/m dans le rendu 500 dpi,
recoupée avec les cotes de niveau de la coupe longitudinale (p.28 : 0.00 / 4.60 / 11.20).
Repère : Y vers le haut, 0 = sol de salle (428.15) ; Z = 0 au nez de scène (bord de fosse),
Z positif vers le public ; X positif = cour (convention, l'orientation réelle n'est pas donnée).
"""
import json, base64, math, struct
import numpy as np

PX = 42.5
def zx(px): return (px - 545) / PX       # abscisse plan -> Z
def xy(py): return (1135 - py) / PX      # ordonnée plan -> X

W = 8.9            # demi-largeur intérieure
Z0, Z1 = -10.0, 22.0   # mur de fond de scène / mur arrière salle
WALL = 0.35

class G:
    def __init__(s, id, label, color, hidden=False):
        s.id, s.label, s.color, s.hidden = id, label, color, hidden
        s.v, s.i, s.l = [], [], []
    def box(s, x0, x1, y0, y1, z0, z1):
        x0, x1 = sorted((x0, x1)); y0, y1 = sorted((y0, y1)); z0, z1 = sorted((z0, z1))
        b = len(s.v)
        for x in (x0, x1):
            for y in (y0, y1):
                for z in (z0, z1):
                    s.v.append((x, y, z))
        # indices: (x,y,z) bit -> 4x+2y+z
        F = [(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
        for a, b1, c, d in F:
            s.i += [b+a, b+b1, b+c, b+a, b+c, b+d]
    def beam(s, p0, p1, w, h=None):
        h = h or w
        p0, p1 = np.array(p0, float), np.array(p1, float)
        d = p1 - p0; L = np.linalg.norm(d); d /= L
        up = np.array([0, 1, 0.]) if abs(d[1]) < .9 else np.array([1, 0, 0.])
        u = np.cross(d, up); u /= np.linalg.norm(u); v = np.cross(u, d)
        b = len(s.v)
        for t in (p0, p1):
            for a in (-1, 1):
                for c in (-1, 1):
                    s.v.append(tuple(t + u*a*w/2 + v*c*h/2))
        # vertices: end*4 + a*2 + c
        F = [(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
        for a, b1, c, d2 in F:
            s.i += [b+a, b+b1, b+c, b+a, b+c, b+d2]
    def line(s, p0, p1):
        s.l.append((p0, p1))

groups = []
def grp(*a, **k):
    g = G(*a, **k); groups.append(g); return g

sol      = grp('sol', 'Sol / plateau', '#4a4642')
fosse    = grp('fosse', 'Fosse (gradinée)', '#5b5248')
fosseP   = grp('fosse_plat', 'Fosse couverte', '#4f4a45', hidden=True)
fossePr  = grp('fosse_prat', 'Praticables de fosse', '#5b5248')
fautF    = grp('fauteuils_fosse', 'Fauteuils fosse', '#7a3b36')
fautB    = grp('fauteuils_balcon', 'Fauteuils balcon', '#7a3b36')
balcon   = grp('balcon', 'Balcon / régie', '#55524e')
murs     = grp('murs', 'Murs (habillage bois)', '#a88a66')
mursH    = grp('murs_haut', 'Murs hauts (résille)', '#2e2f33')
struct_  = grp('structure', 'Poteaux bois', '#c4a072')
charp    = grp('charpente', 'Charpente treillis', '#b8976c')
gril     = grp('gril', 'Passerelles techniques +6,95', '#8a9099')
perches  = grp('perches', 'Perches plateau', '#d9a640')
esc      = grp('escaliers', 'Escalier balcon', '#6b6660')
toit     = grp('toit', 'Toiture', '#6d6a66', hidden=True)
rep      = grp('reperes', 'Repères (axe, nez)', '#e2574c')

# ---------------- sol ----------------
FZ0, FZ1, FX = 0.2, 5.95, 7.65   # fosse : z 0,20 -> 5,95 ; x ±7,65 ; fond -1,40 (coupes p.34)
FD = -1.40
sol.box(-W, W, -0.2, 0, Z0, 0)
sol.box(-W, W, -0.2, 0, 0, FZ0); sol.box(-W, -FX, -0.2, 0, FZ0, FZ1); sol.box(FX, W, -0.2, 0, FZ0, FZ1)
sol.box(-W, W, -0.2, 0, FZ1, Z1)
# dégagement fond de scène et cage d'escalier
sol.box(-W, W, -0.2, 0, -11.5, Z0)
sol.box(-W, W, -0.2, 0, Z1, 23.4)

# ---------------- fosse ----------------
fosse.box(-FX, FX, FD-0.2, FD, FZ0, FZ1)
for x0, x1, z0, z1 in [(-FX-0.2, -FX, FZ0, FZ1), (FX, FX+0.2, FZ0, FZ1), (-FX, FX, FZ0-0.2, FZ0), (-FX, FX, FZ1, FZ1+0.2)]:
    fosse.box(x0, x1, FD, -0.2, z0, z1)   # s'arrête sous la dalle : pas de face confondue avec le sol
fosseP.box(-FX, FX, -0.25, 0, FZ0, FZ1)
# praticables gradinés + 5 rangs (~118 places)
zones = [(FZ0, 2.45, -0.95), (2.45, 3.40, -0.80), (3.40, 4.40, -0.65), (4.40, 5.35, -0.48), (5.35, FZ1, -0.30)]
for z0, z1, h in zones:
    fossePr.box(-FX, FX, FD, h, z0, z1)

def seat(g, x, y, z, w=0.50):
    """Fauteuil tourné vers la scène (-Z)."""
    g.box(x-w/2+0.03, x+w/2-0.03, y+0.40, y+0.48, z-0.22, z+0.22)       # assise
    g.box(x-w/2+0.03, x+w/2-0.03, y+0.45, y+0.98, z+0.20, z+0.28)       # dossier
    g.box(x-w/2, x-w/2+0.04, y, y+0.65, z-0.18, z+0.25)                 # flanc
    g.box(x+w/2-0.04, x+w/2, y, y+0.65, z-0.18, z+0.25)

nseats = {'fosse': 0, 'tribune': 0, 'balcon': 0}
SEATPOS = {'fosse': [], 'balcon': []}
for zp, (z0, z1, h) in zip([630, 670, 712, 752, 786], zones):
    z = zx(zp)
    for k in range(24):
        x = -6.3 + k * (12.6 / 23)
        seat(fautF, x, h, z, 0.5); nseats['fosse'] += 1; SEATPOS['fosse'].append((x, h, z))

# tribune télescopique : construite et animée dans l'app (fader)

# ---------------- balcon / régie ----------------
BZ0, BZ1, BH = zx(1360), 20.8, 4.35
balcon.box(-W, W, BH-0.3, BH, BZ0, Z1)
balcon.box(-7.65, 7.65, BH, BH+1.0, BZ0, BZ0+0.06)    # garde-corps (ouvert au droit des circulations latérales)
for s_ in (1, -1):
    for hh in (0.5, 1.0):
        balcon.box(s_*7.65, s_*W, BH+hh-0.02, BH+hh+0.02, BZ0, BZ0+0.04)   # portillons
balcon.box(-1.06, 1.06, BH, BH+0.8, 19.45, 20.25)     # pupitre régie
# écrans : remplacés par les consoles modélisées dans l'application
murs.box(-W, W, 0, BH-0.3, BZ1, BZ1+0.2)              # mur sous balcon
for y0 in (810, 835, 860, 885, 910, 935, 960, 985, 1010, 1205, 1230, 1255):
    seat(fautB, xy(y0 + 12), BH, zx(1395), 0.52); nseats['balcon'] += 1; SEATPOS['balcon'].append((xy(y0 + 12), BH, zx(1395)))

# ---------------- murs ----------------
ZO0, ZO1 = -11.85, 23.75
HL, HT = 6.5, 10.6
def wallx(sign):
    x0, x1 = sign*W, sign*(W+WALL)
    doors = [(6.55, 7.65), (15.65, 16.75)]   # portes latérales public (triangles gris des plans)
    zc = ZO0
    for d0, d1 in doors:
        murs.box(x0, x1, 0, HL, zc, d0); murs.box(x0, x1, 2.5, HL, d0, d1); zc = d1
    murs.box(x0, x1, 0, HL, zc, ZO1)
    mursH.box(x0, x1, HL, HT, ZO0, ZO1)
wallx(1); wallx(-1)
# mur de fond de scène (entre plateau et dégagement) avec deux portes
murs.box(-W, -6.9, 0, HL, Z0-0.24, Z0); murs.box(-5.7, 5.7, 0, HL, Z0-0.24, Z0); murs.box(6.9, W, 0, HL, Z0-0.24, Z0)
murs.box(-6.9, -5.7, 2.6, HL, Z0-0.24, Z0); murs.box(5.7, 6.9, 2.6, HL, Z0-0.24, Z0)
mursH.box(-W, W, HL, HT, Z0-0.24, Z0)
murs.box(-W-WALL, W+WALL, 0, HL, ZO0, -11.5); mursH.box(-W-WALL, W+WALL, HL, HT, ZO0, -11.5)
# mur arrière salle (vers cage d'escalier) : porte bas jardin + porte balcon
ZB = Z1
murs.box(-W, -6.8, 0, HL, ZB, ZB+0.25); murs.box(-5.4, W, 0, BH, ZB, ZB+0.25)
murs.box(-6.8, -5.4, 2.5, HL, ZB, ZB+0.25)
murs.box(-5.4, 2.6, BH, HL, ZB, ZB+0.25); murs.box(4.0, W, BH, HL, ZB, ZB+0.25)
murs.box(2.6, 4.0, BH+2.3, HL, ZB, ZB+0.25)
mursH.box(-W, W, HL, HT, ZB, ZB+0.25)
murs.box(-W-WALL, W+WALL, 0, HL, 23.4, ZO1); mursH.box(-W-WALL, W+WALL, HL, HT, 23.4, ZO1)

# ---------------- escalier vers le balcon ----------------
n = 24; rise = BH / n; run = 7.4 / n
for k in range(n):
    xa = -5.0 + k * run
    esc.box(xa, xa + run, 0, rise * (k + 1), Z1 + 0.25, 23.4)
esc.box(2.4, 4.6, BH - 0.25, BH, Z1 + 0.25, 23.4)

# ---------------- structure bois ----------------
TZ = [zx(168) + 125 / PX * k for k in range(11)]
for z in TZ:
    for s in (1, -1):
        struct_.box(s*W, s*(W-0.3), 0, 9.3, z-0.12, z+0.12)

# ---------------- charpente (treillis mixte acier-bois) ----------------
YT0, YT1, YB = 10.05, 10.37, 9.26
for z in TZ:
    charp.box(-W, W, YT0, YT1, z-0.14, z+0.14)          # membrure sup. BLC
    charp.box(-W, W, YB-0.04, YB+0.04, z-0.04, z+0.04)  # membrure inf. acier
    nseg = 12; dx = 2*W / nseg
    for k in range(nseg + 1):
        xk = -W + k*dx
        charp.box(xk-0.07, xk+0.07, YB, YT0, z-0.08, z+0.08)
        if k < nseg:
            a, b = (xk, YB, z), (xk+dx, YT0, z)
            if k >= nseg/2: a, b = (xk, YT0, z), (xk+dx, YB, z)
            charp.beam(a, b, 0.035)
xs = np.arange(-W+0.3, W, 0.6)
for x in xs:
    charp.box(x-0.06, x+0.06, YT1, YT1+0.2, Z0, Z1)      # solives
toit.box(-W-WALL, W+WALL, 10.57, 10.85, ZO0, ZO1)
toit.box(-W-WALL, W+WALL, 10.85, 11.2, ZO0, ZO0+0.35); toit.box(-W-WALL, W+WALL, 10.85, 11.2, ZO1-0.35, ZO1)

# ---------------- passerelles techniques +6,95 ----------------
# Relecture de la coupe p.33 : passerelles latérales le long des murs (vues en élévation, treillis de ~1,9 m),
# 2 passerelles transversales coupées par le plan de coupe (un technicien debout dedans), galerie de poursuite au fond.
# Tout le reste est ouvert : les perches descendent de la charpente.
GY = 6.95
SIDE_W = 1.0                                    # largeur des passerelles latérales
TRANS = [(zx(630), zx(680)), (zx(915), zx(960))]  # ≈ 2,0–3,2 m et 8,7–9,8 m depuis le nez de scène
REAR_Z = zx(1365)                               # galerie de poursuite : du ≈ 19,3 m au mur du fond
XI = W - SIDE_W                                 # bord intérieur des passerelles latérales
def deck(x0, x1, z0, z1):
    gril.box(x0, x1, GY - 0.05, GY, z0, z1)
    # caillebotis (lignes du maillage)
    for x in np.arange(x0, x1 + 1e-6, 0.5): gril.line((x, GY + 0.002, z0), (x, GY + 0.002, z1))
    for z in np.arange(z0, z1 + 1e-6, 0.5): gril.line((x0, GY + 0.002, z), (x1, GY + 0.002, z))
def rail_x(x, z0, z1):      # garde-corps longeant Z, à l'abscisse x
    for hh in (0.5, 1.1): gril.line((x, GY + hh, z0), (x, GY + hh, z1))
    for z in np.arange(z0, z1 + 1e-6, 1.5): gril.line((x, GY, z), (x, GY + 1.1, z))
def rail_z(z, x0, x1):      # garde-corps longeant X, à la cote z
    for hh in (0.5, 1.1): gril.line((x0, GY + hh, z), (x1, GY + hh, z))
    for x in np.arange(x0, x1 + 1e-6, 1.5): gril.line((x, GY, z), (x, GY + 1.1, z))
for sgn in (1, -1):         # latérales, du fond de scène à la galerie
    xa, xb = sorted((sgn * XI, sgn * W))
    deck(xa, xb, Z0, REAR_Z)
    rail_x(sgn * XI, Z0, TRANS[0][0]); rail_x(sgn * XI, TRANS[0][1], TRANS[1][0]); rail_x(sgn * XI, TRANS[1][1], REAR_Z)
    # treillis porteur (élévation vue sur la coupe, ~1,9 m de haut)
    for z in np.arange(Z0, REAR_Z + 1e-6, 2.94 / 2):
        gril.line((sgn * XI, GY, z), (sgn * XI, GY + 1.9, z))
    gril.line((sgn * XI, GY + 1.9, Z0), (sgn * XI, GY + 1.9, REAR_Z))
for z0, z1 in TRANS:        # transversales, d'une latérale à l'autre
    deck(-XI, XI, z0, z1)
    rail_z(z0, -XI, XI); rail_z(z1, -XI, XI)
deck(-W, W, REAR_Z, Z1)     # galerie de poursuite
rail_z(REAR_Z, -XI, XI)
# porteurs sous les passerelles + suspentes vers la charpente
for z in TZ:
    for x0, x1 in ((-W, -XI), (XI, W)):
        gril.box(x0, x1, GY - 0.25, GY - 0.05, z - 0.05, z + 0.05)
    gril.line((-XI, GY, z), (-XI, YB, z)); gril.line((XI, GY, z), (XI, YB, z))
for z0, z1 in TRANS + [(REAR_Z, Z1)]:
    for zz in (z0, z1):
        gril.box(-XI, XI, GY - 0.2, GY - 0.05, zz - 0.04, zz + 0.04)
        for x in (-XI / 2, 0, XI / 2): gril.line((x, GY, zz), (x, YB, zz))

# ---------------- perches (cintres motorisés, plateau) ----------------
PY = 6.0
PZ = [zx(x) for x in (133, 163, 195, 226, 257, 288, 320, 351, 382, 413, 444, 475, 506, 537)]
for z in PZ:
    perches.box(-8.0, 8.0, PY-0.025, PY+0.025, z-0.025, z+0.025)
    for x in (-6.0, -2.0, 2.0, 6.0):
        perches.line((x, PY, z), (x, YB, z))

# ---------------- tubes fixes sous charpente (visibles sur les rendus) ----------------
tubes = grp('tubes', 'Tubes fixes +6,55', '#1b1b1d')
for z in TZ:
    if z > 0.5: tubes.box(-XI, XI, 6.525, 6.575, z - 0.025, z + 0.025)
for x in (-5.0, 0.0, 5.0):
    tubes.box(x - 0.025, x + 0.025, 6.525, 6.575, 0.6, REAR_Z)
    for z in TZ:
        if z > 0.5: tubes.line((x, 6.55, z), (x, YB, z))

# ---------------- repères ----------------
rep.line((0, 0.01, Z0), (0, 0.01, 0))
rep.line((-FX, 0.01, 0), (FX, 0.01, 0))
for x in range(-8, 9, 2):
    rep.line((x, 0.01, -0.15), (x, 0.01, 0.15))

# ---------------- export ----------------
blob = bytearray(); meta = []
def put(arr):
    global blob
    while len(blob) % 4: blob += b'\0'
    off = len(blob); b = arr.tobytes(); blob += b
    return [off, len(b)]
for g in groups:
    if g.id in ('fauteuils_fosse', 'fauteuils_balcon', 'fosse_prat', 'fosse_plat'): continue
    e = {'id': g.id, 'label': g.label, 'color': g.color}
    if g.hidden: e['hidden'] = True
    if g.v:
        P = np.round(np.array(g.v) * 1000).astype(np.int16)
        e['pos'] = put(P); e['idx'] = put(np.array(g.i, np.uint32)); e['ntri'] = len(g.i)//3
    if g.l:
        L = np.round(np.array(g.l).reshape(-1, 3) * 1000).astype(np.int16)
        e['lines'] = put(L); e['nseg'] = len(g.l)
    meta.append(e)
out = {'groups': meta, 'seats': nseats, 'seatPos': {k: [[round(c, 3) for c in p] for p in v] for k, v in SEATPOS.items()}, 'bin': base64.b64encode(bytes(blob)).decode()}
json.dump(out, open('/home/claude/app/scene-data.json', 'w'))
print(nseats, sum(nseats.values()), 'tris', sum(m.get('ntri', 0) for m in meta), 'bytes', len(blob))
