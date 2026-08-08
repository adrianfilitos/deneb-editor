#!/usr/bin/env bash
# Deneb launcher para macOS/Linux (empaquetado)
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -x "$APP_DIR/deneb" ]; then
  "$APP_DIR/deneb" "$@" &
else
  echo "Deneb no encontrado. Ejecuta desde dentro de la app o usa el binario empaquetado." >&2
  exit 1
fi
