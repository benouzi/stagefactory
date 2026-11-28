#!/bin/bash
set -e
/home/claude/local/build.sh >/dev/null
SRC=/home/claude/local/dist/StageFactory; P=/home/claude/pack; OUT=$P/out; VER=4.67.1; rm -rf $OUT $P/win $P/mac; mkdir -p $OUT $P/win
# ---------------- récepteur NDI : koffi (appel de la bibliothèque NDI installée sur l'ordinateur) et son binaire par plateforme. pack/* n'est pas dans git : on les reprend de npm s'ils manquent.
# (les quatre paquets en UNE commande : installés en deux fois, la seconde retirait koffi)
KS=$P/koffi-src; KV=3.3.8
if [ ! -d $KS/node_modules/koffi ] || [ ! -d $KS/node_modules/@koromix/koffi-win32-x64 ] || [ ! -d $KS/node_modules/@koromix/koffi-darwin-arm64 ] || [ ! -d $KS/node_modules/@koromix/koffi-darwin-x64 ]; then mkdir -p $KS; (cd $KS && { [ -f package.json ] || npm init -y >/dev/null; } && npm i --force --no-save koffi@$KV @koromix/koffi-win32-x64@$KV @koromix/koffi-darwin-x64@$KV @koromix/koffi-darwin-arm64@$KV >/dev/null 2>&1); fi
koffi(){ # $1 = dossier où poser node_modules, $2 = plateforme (win32-x64, darwin-arm64, darwin-x64)
  mkdir -p "$1/node_modules/@koromix"; cp -r $KS/node_modules/koffi "$1/node_modules/"; rm -rf "$1/node_modules/koffi/doc" "$1/node_modules/koffi/vendor"; find "$1/node_modules/koffi" \( -name "*.cc" -o -name "*.hh" -o -name "*.c" -o -name "*.h" -o -name "*.S" -o -name "*.asm" -o -name "*.inc" \) -delete; cp -r "$KS/node_modules/@koromix/koffi-$2" "$1/node_modules/@koromix/"; }
# ---------------- exécutables Node (pack/rt n'est pas dans git) : repris de npm s'ils manquent
NV=22.23.4; for pk in node-win-x64 $([ "$SF_ONLY" = win ] || echo node-bin-darwin-arm64 node-darwin-x64); do [ -d $P/rt/$pk-$NV/package ] || { mkdir -p $P/rt/$pk-$NV; (cd $P/rt/$pk-$NV && npm pack $pk@$NV >/dev/null 2>&1 && tar xzf $pk-$NV.tgz && rm $pk-$NV.tgz); }; done
# ---------------- Windows : installateur NSIS
cp -r $SRC/app $SRC/serveur.js $SRC/mcp.js $SRC/ndi.js $SRC/mcp-tools.json $P/win/; koffi $P/win win32-x64; cp $P/rt/node-win-x64-22.23.4/package/bin/node.exe $P/win/; cp $P/icon.ico $P/win/
cat > $P/win/LISEZMOI.txt <<'TXT'
STAGEFACTORY (ex-Onex Previz) - PREVISUALISATION 3D (Windows)

Lancer « StageFactory » depuis le Bureau ou le menu Démarrer.
L'application s'ouvre dans une fenêtre Chrome ou Edge. Une petite fenêtre noire réduite dans la barre
des tâches fait la passerelle DMX : elle s'arrête toute seule quand tu fermes l'application.

Au premier lancement, Windows demande d'autoriser « Node.js JavaScript Runtime » sur le réseau :
accepter (réseaux privés), sinon le DMX des consoles n'arrive pas.

DMX : menu Outils > DMX / réseau.
- Art-Net : port UDP 6454. L'univers Art-Net 0 correspond à l'univers 1 de l'application (réglable).
- sACN : port UDP 5568, univers 1 à 4 par défaut (réglable).
- Console sur le même PC (grandMA3 onPC, Titan, MadMapper) : préférer le sACN, ou l'Art-Net vers 127.0.0.1.

Le projet est sauvegardé automatiquement. Pour le transporter : Fichier > Exporter le projet (.json).
Désinstaller : Paramètres > Applications > StageFactory.
TXT
sed -i 's/$/\r/' $P/win/LISEZMOI.txt
cat > $P/onex.nsi <<NSI
Unicode true
SetCompressor /SOLID lzma
!include "MUI2.nsh"
Name "StageFactory"
OutFile "$OUT/StageFactory-Installation-Windows.exe"
InstallDir "\$LOCALAPPDATA\\Programs\\OnexPreviz"
InstallDirRegKey HKCU "Software\\OnexPreviz" "InstallDir"
RequestExecutionLevel user
!define MUI_ICON "$P/icon.ico"
!define MUI_UNICON "$P/icon.ico"
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Lancer StageFactory"
!define MUI_FINISHPAGE_RUN_FUNCTION Lancer
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "French"
VIProductVersion "$VER.0"
VIAddVersionKey /LANG=1036 "ProductName" "StageFactory"
VIAddVersionKey /LANG=1036 "FileDescription" "Onex - prévisualisation 3D et passerelle DMX"
VIAddVersionKey /LANG=1036 "FileVersion" "$VER"
VIAddVersionKey /LANG=1036 "LegalCopyright" "Benjamin Ducrot"
Function Lancer
  SetOutPath "\$INSTDIR"
  Exec '"\$INSTDIR\\node.exe" serveur.js --app'
FunctionEnd
Section "StageFactory"
  ; ferme une version encore ouverte (sinon node.exe est verrouille et ne peut pas etre remplace)
  DetailPrint "Fermeture de StageFactory s'il est ouvert..."
  nsExec::Exec \`powershell -NoProfile -WindowStyle Hidden -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { \$\$_.Path -like '*OnexPreviz*' } | Stop-Process -Force"\`
  Pop \$0
  Sleep 1200
  ; node.exe peut rester verrouille par le connecteur Claude, qui le relance aussitot : on renomme l'ancien (Windows l'autorise meme en cours d'execution) et on pose le nouveau a cote
  Delete "\$INSTDIR\\node.old*.exe"
  IfFileExists "\$INSTDIR\\node.exe" 0 +4
  System::Call 'kernel32::GetTickCount()i.r1'
  Rename "\$INSTDIR\\node.exe" "\$INSTDIR\\node.old\$1.exe"
  ; pas de /REBOOTOK : il faisait demander un redemarrage de Windows a chaque installation. Le fichier renomme est efface a l'installation suivante (Delete node.old*.exe ci-dessus)
  Delete "\$INSTDIR\\node.old\$1.exe"
  SetOutPath "\$INSTDIR"
  RMDir /r "\$INSTDIR\\app"
  RMDir /r "\$INSTDIR\\node_modules"
  File /r "$P/win/*.*"
  WriteUninstaller "\$INSTDIR\\Desinstaller.exe"
  ; raccourcis de l'ancien nom (Onex Previz) retires : le dossier d'installation et le registre gardent leur nom, pour une mise a jour en place
  Delete "\$DESKTOP\\Onex Previz.lnk"
  RMDir /r "\$SMPROGRAMS\\Onex Previz"
  CreateDirectory "\$SMPROGRAMS\\StageFactory"
  CreateShortCut "\$SMPROGRAMS\\StageFactory\\StageFactory.lnk" "\$INSTDIR\\node.exe" "serveur.js --app" "\$INSTDIR\\icon.ico" 0 SW_SHOWMINIMIZED
  CreateShortCut "\$SMPROGRAMS\\StageFactory\\Lisez-moi.lnk" "\$INSTDIR\\LISEZMOI.txt"
  CreateShortCut "\$DESKTOP\\StageFactory.lnk" "\$INSTDIR\\node.exe" "serveur.js --app" "\$INSTDIR\\icon.ico" 0 SW_SHOWMINIMIZED
  WriteRegStr HKCU "Software\\OnexPreviz" "InstallDir" "\$INSTDIR"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OnexPreviz" "DisplayName" "StageFactory"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OnexPreviz" "DisplayVersion" "$VER"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OnexPreviz" "Publisher" "Benjamin Ducrot"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OnexPreviz" "DisplayIcon" "\$INSTDIR\\icon.ico"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OnexPreviz" "UninstallString" '"\$INSTDIR\\Desinstaller.exe"'
  WriteRegDWORD HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OnexPreviz" "NoModify" 1
  WriteRegDWORD HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OnexPreviz" "NoRepair" 1
SectionEnd
Section "Uninstall"
  ; ferme une version encore ouverte (sinon node.exe est verrouille et ne peut pas etre remplace)
  DetailPrint "Fermeture de StageFactory s'il est ouvert..."
  nsExec::Exec \`powershell -NoProfile -WindowStyle Hidden -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { \$\$_.Path -like '*OnexPreviz*' } | Stop-Process -Force"\`
  Pop \$0
  Sleep 1200
  Delete "\$DESKTOP\\StageFactory.lnk"
  RMDir /r "\$SMPROGRAMS\\StageFactory"
  RMDir /r "\$INSTDIR"
  DeleteRegKey HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OnexPreviz"
  DeleteRegKey HKCU "Software\\OnexPreviz"
SectionEnd
NSI
# NSIS : celui rangé dans pack/nsis s'il y est, sinon celui du système (apt-get install nsis)
if [ -x $P/nsis/linux/makensis ]; then NSISDIR=$P/nsis $P/nsis/linux/makensis -V2 $P/onex.nsi; else makensis -V2 $P/onex.nsi; fi
[ "$SF_ONLY" = win ] && { ls -la $OUT; exit 0; }          # SF_ONLY=win : seulement l'installeur Windows
# ---------------- Mac : application dans un zip, une par type de processeur
mac(){ # $1 = nom, $2 = binaire node
  local A="$P/mac/$1/StageFactory.app"; mkdir -p "$A/Contents/MacOS" "$A/Contents/Resources"
  cp -r $SRC/app $SRC/serveur.js $SRC/mcp.js $SRC/ndi.js $SRC/mcp-tools.json "$A/Contents/Resources/"; koffi "$A/Contents/Resources" "$3"; cp "$2" "$A/Contents/Resources/node"; chmod +x "$A/Contents/Resources/node"; cp $P/icon.icns "$A/Contents/Resources/"
  cat > "$A/Contents/Info.plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>StageFactory</string>
  <key>CFBundleDisplayName</key><string>StageFactory</string>
  <key>CFBundleIdentifier</key><string>ch.benjaminducrot.onexpreviz</string>
  <key>CFBundleVersion</key><string>$VER</string>
  <key>CFBundleShortVersionString</key><string>$VER</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>onex</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSLocalNetworkUsageDescription</key><string>StageFactory reçoit le DMX (Art-Net, sACN) envoyé par les consoles lumière du réseau, et les sources vidéo NDI.</string>
</dict></plist>
PL
  cat > "$A/Contents/MacOS/onex" <<'SH'
#!/bin/bash
# Lance le serveur local et la passerelle DMX ; il s'arrête quand la fenêtre de l'application est fermée.
R="$(cd "$(dirname "$0")/../Resources" && pwd)"
mkdir -p "$HOME/Library/Logs"
cd "$R" && exec ./node serveur.js --app >> "$HOME/Library/Logs/OnexPreviz.log" 2>&1
SH
  chmod +x "$A/Contents/MacOS/onex"
  cat > "$P/mac/$1/LISEZMOI.txt" <<'TXT'
ONEX — PRÉVISUALISATION 3D (Mac)

1. Glisser « StageFactory » dans le dossier Applications.
2. Premier lancement : clic droit sur l'application > Ouvrir, puis confirmer.
   Sur macOS 15 ou plus récent : Réglages Système > Confidentialité et sécurité > « Ouvrir quand même ».
   Si macOS dit que l'application est endommagée, ouvrir le Terminal et coller :
   xattr -dr com.apple.quarantine "/Applications/StageFactory.app"
3. L'application s'ouvre dans une fenêtre Chrome (ou Edge), sinon dans le navigateur par défaut.
   Chrome est recommandé. La passerelle DMX tourne en arrière-plan et s'arrête quand la fenêtre est fermée.
4. Accepter la demande d'accès au réseau local, sinon le DMX des consoles n'arrive pas.

DMX : menu Outils > DMX / réseau.
- Art-Net : port UDP 6454. L'univers Art-Net 0 correspond à l'univers 1 de l'application (réglable).
- sACN : port UDP 5568, univers 1 à 4 par défaut (réglable).
- Console sur le même Mac (grandMA3 onPC, MadMapper) : préférer le sACN, ou l'Art-Net vers 127.0.0.1.

Le projet est sauvegardé automatiquement. Pour le transporter : Fichier > Exporter le projet (.json).
Journal en cas de souci : ~/Library/Logs/OnexPreviz.log
TXT
  (cd "$P/mac/$1" && zip -qry "$OUT/StageFactory-$1.zip" "StageFactory.app" LISEZMOI.txt)
}
mac Mac-Apple-Silicon $P/rt/node-bin-darwin-arm64-22.23.4/package/bin/node darwin-arm64
mac Mac-Intel $P/rt/node-darwin-x64-22.23.4/package/bin/node darwin-x64
ls -la $OUT | cut -c24-
