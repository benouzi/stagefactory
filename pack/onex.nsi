Unicode true
SetCompressor /SOLID lzma
!include "MUI2.nsh"
Name "StageFactory"
OutFile "/home/claude/pack/out/StageFactory-Installation-Windows.exe"
InstallDir "$LOCALAPPDATA\Programs\OnexPreviz"
InstallDirRegKey HKCU "Software\OnexPreviz" "InstallDir"
RequestExecutionLevel user
!define MUI_ICON "/home/claude/pack/icon.ico"
!define MUI_UNICON "/home/claude/pack/icon.ico"
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
VIProductVersion "4.53.0.0"
VIAddVersionKey /LANG=1036 "ProductName" "StageFactory"
VIAddVersionKey /LANG=1036 "FileDescription" "Onex - prévisualisation 3D et passerelle DMX"
VIAddVersionKey /LANG=1036 "FileVersion" "4.53.0"
VIAddVersionKey /LANG=1036 "LegalCopyright" "Benjamin Ducrot"
Function Lancer
  SetOutPath "$INSTDIR"
  Exec '"$INSTDIR\node.exe" serveur.js --app'
FunctionEnd
Section "StageFactory"
  ; ferme une version encore ouverte (sinon node.exe est verrouille et ne peut pas etre remplace)
  DetailPrint "Fermeture de StageFactory s'il est ouvert..."
  nsExec::Exec `powershell -NoProfile -WindowStyle Hidden -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $$_.Path -like '*OnexPreviz*' } | Stop-Process -Force"`
  Pop $0
  Sleep 1200
  ; node.exe peut rester verrouille par le connecteur Claude, qui le relance aussitot : on renomme l'ancien (Windows l'autorise meme en cours d'execution) et on pose le nouveau a cote
  Delete "$INSTDIR\node.old*.exe"
  IfFileExists "$INSTDIR\node.exe" 0 +4
  System::Call 'kernel32::GetTickCount()i.r1'
  Rename "$INSTDIR\node.exe" "$INSTDIR\node.old$1.exe"
  ; pas de /REBOOTOK : il faisait demander un redemarrage de Windows a chaque installation. Le fichier renomme est efface a l'installation suivante (Delete node.old*.exe ci-dessus)
  Delete "$INSTDIR\node.old$1.exe"
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR\app"
  RMDir /r "$INSTDIR\node_modules"
  File /r "/home/claude/pack/win/*.*"
  WriteUninstaller "$INSTDIR\Desinstaller.exe"
  ; raccourcis de l'ancien nom (Onex Previz) retires : le dossier d'installation et le registre gardent leur nom, pour une mise a jour en place
  Delete "$DESKTOP\Onex Previz.lnk"
  RMDir /r "$SMPROGRAMS\Onex Previz"
  CreateDirectory "$SMPROGRAMS\StageFactory"
  CreateShortCut "$SMPROGRAMS\StageFactory\StageFactory.lnk" "$INSTDIR\node.exe" "serveur.js --app" "$INSTDIR\icon.ico" 0 SW_SHOWMINIMIZED
  CreateShortCut "$SMPROGRAMS\StageFactory\Lisez-moi.lnk" "$INSTDIR\LISEZMOI.txt"
  CreateShortCut "$DESKTOP\StageFactory.lnk" "$INSTDIR\node.exe" "serveur.js --app" "$INSTDIR\icon.ico" 0 SW_SHOWMINIMIZED
  WriteRegStr HKCU "Software\OnexPreviz" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OnexPreviz" "DisplayName" "StageFactory"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OnexPreviz" "DisplayVersion" "4.53.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OnexPreviz" "Publisher" "Benjamin Ducrot"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OnexPreviz" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OnexPreviz" "UninstallString" '"$INSTDIR\Desinstaller.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OnexPreviz" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OnexPreviz" "NoRepair" 1
SectionEnd
Section "Uninstall"
  ; ferme une version encore ouverte (sinon node.exe est verrouille et ne peut pas etre remplace)
  DetailPrint "Fermeture de StageFactory s'il est ouvert..."
  nsExec::Exec `powershell -NoProfile -WindowStyle Hidden -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $$_.Path -like '*OnexPreviz*' } | Stop-Process -Force"`
  Pop $0
  Sleep 1200
  Delete "$DESKTOP\StageFactory.lnk"
  RMDir /r "$SMPROGRAMS\StageFactory"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\OnexPreviz"
  DeleteRegKey HKCU "Software\OnexPreviz"
SectionEnd
