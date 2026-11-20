#!/bin/bash
# Assemble la version locale (PC / Mac) à partir des fichiers de l'application.
set -e
D=/home/claude/local/dist/StageFactory; NM=/home/claude/npmx/node_modules; rm -rf /home/claude/local/dist; mkdir -p $D/app/lib/three/build $D/app/lib/three/examples/jsm $D/app/lib/three-mesh-bvh $D/app/lib/fflate $D/app/lib/pdfjs $D/app/lib/libredwg/dist $D/app/lib/libredwg/wasm $D/app/vendor
cp /home/claude/app/{index.html,stage.js,app.js,plan.js,rig.js,dmx.js,audio.js,ai.js,desk.js,prog.js,cine.js,lib.js,led.js,venue.js,cad.js,wins.js,view.js,parc.js,dock.js,ponts.js,drawer.js,decor.js,catalog.js,decor-list.js,publish.js,linearray.js,la-data.js,sceno-core.js,sceno-props.js,scene-data.json} $D/app/
cp /home/claude/app/vendor/dxf-parser.js /home/claude/app/vendor/pdf-lib.js $D/app/vendor/
# lecteurs de plans : PDF (pdf.js) et DWG (LibreDWG en WebAssembly), servis en local pour travailler hors ligne
cp $NM/pdfjs-dist/build/pdf.min.mjs $NM/pdfjs-dist/build/pdf.worker.min.mjs $D/app/lib/pdfjs/
cp $NM/@mlightcad/libredwg-web/dist/libredwg-web.js $D/app/lib/libredwg/dist/; cp $NM/@mlightcad/libredwg-web/wasm/libredwg-web.js $NM/@mlightcad/libredwg-web/wasm/libredwg-web.wasm $D/app/lib/libredwg/wasm/
cp $NM/three/build/three.module.js $D/app/lib/three/build/
for d in controls environments postprocessing shaders math geometries utils loaders libs; do cp -r $NM/three/examples/jsm/$d $D/app/lib/three/examples/jsm/; done
cp $NM/three-mesh-bvh/build/index.module.js $D/app/lib/three-mesh-bvh/; cp $NM/fflate/esm/browser.js $D/app/lib/fflate/
python3 - "$D/app/index.html" <<'PY'
import sys,re
p=sys.argv[1]; s=open(p).read()
s2=s.replace('"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"','"./lib/three/build/three.module.js"').replace('"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"','"./lib/three/examples/jsm/"').replace('"https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.8.3/build/index.module.js"','"./lib/three-mesh-bvh/index.module.js"')
assert s2.count('./lib/')==3
s2=s2.replace('<script type="importmap">','<script>window.ONEX_LIBS = { fflate: "./lib/fflate/browser.js", pdf: "./lib/pdfjs/", dwg: "./lib/libredwg/" };</script>\n<script type="importmap">',1)
s2=re.sub(r'<link[^>]+fonts\.googleapis[^>]*>','',s2); s2=re.sub(r'<link[^>]+fonts\.gstatic[^>]*>','',s2)
open(p,'w').write(s2)
PY
cp /home/claude/local/serveur.js /home/claude/local/mcp.js $D/; [ -f /home/claude/local/mcp-tools.json ] && cp /home/claude/local/mcp-tools.json $D/
printf '@echo off\r\ntitle StageFactory\r\ncd /d "%%~dp0"\r\nwhere node >nul 2>nul\r\nif errorlevel 1 (\r\n  echo Node.js n est pas installe sur ce PC.\r\n  echo Installe la version LTS depuis https://nodejs.org puis relance ce fichier.\r\n  start "" https://nodejs.org\r\n  pause\r\n  exit /b 1\r\n)\r\nnode serveur.js\r\npause\r\n' > $D/Lancer-Windows.bat
cat > $D/Lancer-Mac.command <<'SH'
#!/bin/bash
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé sur ce Mac."
  echo "Installe la version LTS depuis https://nodejs.org puis relance ce fichier."
  open https://nodejs.org
  read -n 1 -s -r -p "Appuie sur une touche pour fermer."
  exit 1
fi
node serveur.js
SH
chmod +x $D/Lancer-Mac.command
cat > $D/LISEZMOI.txt <<'TXT'
STAGEFACTORY (ex-Onex Previz) — PRÉVISUALISATION 3D, VERSION LOCALE (PC et Mac)

1. Installer Node.js une seule fois (version LTS) : https://nodejs.org
2. Lancer l'application
   - Windows : double-clic sur « Lancer-Windows.bat »
   - Mac : clic droit sur « Lancer-Mac.command » puis Ouvrir (la première fois, macOS demande une confirmation)
3. Le navigateur s'ouvre sur http://localhost:8765. Utiliser Chrome ou Edge.
   La fenêtre noire doit rester ouverte : c'est elle qui fait la passerelle DMX.

RECEVOIR LE DMX (menu Outils > DMX / réseau)
- Art-Net : port UDP 6454. La console envoie en broadcast ou vers l'adresse IP de ce poste (affichée au lancement).
  L'univers Art-Net 0 correspond à l'univers 1 de l'application (réglable).
- sACN (E1.31) : port UDP 5568, multicast. Univers 1 à 4 écoutés par défaut (réglable).
- Si la console tourne sur le MÊME ordinateur (grandMA3 onPC, Titan, MadMapper) :
  préférer le sACN, ou l'Art-Net envoyé vers 127.0.0.1. Deux logiciels ne peuvent pas toujours
  écouter le port Art-Net en même temps sur un même poste.
- Autoriser Node.js dans le pare-feu quand Windows ou macOS le demande.

Patcher dans la console les mêmes appareils, aux mêmes adresses et dans le même mode que dans
l'application : la fenêtre « DMX / réseau » liste le patch et l'affectation de chaque canal.
Pour un appareil réel, importer son fichier GDTF (Fichier > Importer).

CRÉER UNE SALLE DEPUIS DES PLANS (Fichier > Créer une salle depuis des plans)
Déposer plans et coupes (PDF, DWG, DXF, images), fiche technique, notes. Un plan se pose en fond et se cale
à la main (échelle, zéro au nez de scène, orientation). Avec une clé API (assistant, touche I) ou le connecteur
Claude, l'IA lit le dossier et règle la salle : cadre, gradin, fosse, passerelles, perches.

Le projet est sauvegardé automatiquement dans le navigateur. Pour le transporter :
Fichier > Exporter le projet (.json), puis Fichier > Ouvrir sur l'autre poste.
TXT
du -sh $D; (cd /home/claude/local/dist && rm -f StageFactory.zip && zip -qr StageFactory.zip StageFactory && ls -la StageFactory.zip | cut -c20-)
