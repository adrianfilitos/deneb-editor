#!/usr/bin/env bash
# Nova launcher para macOS/Linux (empaquetado)
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -x "$APP_DIR/nova" ]; then
  "$APP_DIR/nova" "$@" &
else
  echo "Nova no encontrado. Ejecuta desde dentro de la app o usa el binario empaquetado." >&2
  exit 1
fi
