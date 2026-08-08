; Deneb — instalador: añade comandos CLI (deneb, deneb-ai) y el directorio al PATH del usuario.

!macro customInstall
  SetOutPath "$INSTDIR"
  File /oname=deneb.cmd "${BUILD_RESOURCES_DIR}\cli\deneb.cmd"
  File /oname=deneb-ai.cmd "${BUILD_RESOURCES_DIR}\cli\deneb-ai.cmd"

  ; Añade $INSTDIR al PATH del usuario si no está ya presente
  ReadRegStr $R0 HKCU "Environment" "Path"
  StrCmp $R0 "" addOnly
  Push "$INSTDIR"
  Push "$R0"
  Call StrStr
  Pop $R1
  StrCmp $R1 "" addPath done
  addPath:
    StrCpy $R0 "$R0;$INSTDIR"
    Goto write
  addOnly:
    StrCpy $R0 "$INSTDIR"
  write:
    WriteRegExpandStr HKCU "Environment" "Path" $R0
    SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment"
  done:
!macroend

!ifndef BUILD_UNINSTALLER
; StrStr: busca $1 dentro de $2 (resultado en el tope de la pila)
Function StrStr
  Exch $1
  Exch
  Exch $2
  Push $3
  Push $4
  StrLen $3 $1
  StrCpy $4 0
  loop:
    StrCpy $0 $2 $3 $4
    StrCmp $0 "" notfound
    StrCmp $0 $1 found
    IntOp $4 $4 + 1
    Goto loop
  found:
    StrCpy $0 $2 "" $4
    Goto out
  notfound:
    StrCpy $0 ""
  out:
    Pop $4
    Pop $3
    Exch 2
    Pop $1
    Pop $2
    Exch $0
FunctionEnd
!endif
