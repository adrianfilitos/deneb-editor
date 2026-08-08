# Deneb — Editor de código con IA

Editor de código moderno con IA integrada, hecho con **Electron, React, Monaco y Vite**. Multiplataforma: **Windows, macOS y Linux**.

- **Landing page** (GitHub Pages): https://adrianfilitos.github.io/deneb-editor/
- **Editor web (demo)**: disponible en `/app` de la landing.
- **Escritorio**: instaladores para Windows, macOS y Linux en [Releases](https://github.com/adrianfilitos/deneb-editor/releases).

## Características

**Editor**
- Editor **Monaco**: sintaxis, minimapa, multi-cursor, plegado, breadcrumbs, esquema de símbolos y atajos tipo VS Code.
- **LSP real**: servidor Language Server Protocol (JSON-RPC) que ejecuta el **Language Service de TypeScript** en un Worker (el mismo motor que `tsserver`/VS Code): completado con resolución, hover, ir a definición, referencias, rename, firma, símbolos, folding, formato y resaltado — **entre archivos** del workspace.
- **Emmet** integrado (HTML/CSS/JSX) y **snippets de usuario** (`.deneb/snippets.json`).
- **Formato de documento** (`Shift+Alt+F`) y *format on save*.
- **Configuración por archivos**: `settings.json` y `keybindings.json` en `.deneb/` con prioridad sobre la UI.

**Depuración**
- **Debugger real (DAP + CDP)**: en el escritorio lanza `node --inspect-brk` y lo controla por **Chrome DevTools Protocol** vía WebSocket, implementando el **Debug Adapter Protocol** como VS Code (`js-debug`). Breakpoints verificados, stack de llamadas, variables del scope, paso a paso (F10) y consola real.
- En la web, un fallback por Worker permite breakpoints y variables para archivos JS/TS simples.

**Extensiones**
- **Extension Host de VS Code**: ejecuta el código JavaScript real de las extensiones (comandos, autocompletado, hover, webviews, tree views, menús contextuales).
- **Marketplace Open VSX**: busca e instala miles de extensiones reales.

**Trabajo diario**
- **Explorador de archivos**, búsqueda global con reemplazo, panel de problemas y salida.
- **Git con UI dedicada**: estado, staging, commits, ramas, historial, diffs, push/pull/fetch.
- **Terminal real**: PowerShell en Windows, zsh en macOS y bash en Linux.
- **Tareas (tasks.json)**: `.deneb/tasks.json` con ejecución en la terminal o panel de salida.
- **Live Server real** (Electron) y vista previa por Service Worker (web) con recarga automática.
- **Asistente de IA con herramientas**: lee/lista/busca/escribe archivos y ejecuta comandos con tu aprobación. Proveedores: **DeepSeek (recomendado)**, OpenAI, Anthropic y servidor local.
- 9 temas, modo Vim, modo Zen, editor dividido, atajos personalizables, actualizaciones automáticas.

## Uso

### Escritorio

Descarga el instalador de tu plataforma desde **Releases**. El instalador añade los comandos `deneb` y `deneb-ai` a tu PATH:

```bash
deneb            # abre el editor
deneb .          # abre la carpeta actual
deneb archivo.ts # abre un archivo
deneb-ai .       # abre el editor con el asistente de IA
```

### Web

Abre https://adrianfilitos.github.io/deneb-editor/app/ y usa "Abrir carpeta" o el proyecto demo.

## Configuración por archivos (.deneb/)

En la raíz de tu espacio de trabajo:

```jsonc
// .deneb/settings.json — ajustes con prioridad sobre la interfaz
{
  "fontSize": 16,
  "wordWrap": "on",
  "liveServer.port": 5501
}
```

```jsonc
// .deneb/keybindings.json — atajos personalizados
[
  { "key": "ctrl+shift+s", "command": "workbench.action.files.saveAll" },
  { "key": "f6", "command": "workbench.action.debug.start" }
]
```

```jsonc
// .deneb/snippets.json — autocompletado personalizado
{
  "log": { "prefix": "log", "body": "console.log('$1', $2)" }
}
```

```jsonc
// .deneb/tasks.json — tareas ejecutables
{
  "version": "2.0.0",
  "tasks": [
    { "label": "build", "type": "shell", "command": "npm", "args": ["run", "build"], "group": "build" }
  ]
}
```

## Depuración JS/TS

1. Abre un archivo `.js`/`.ts`.
2. Pulsa **F9** sobre una línea (o clic en el margen) para poner un breakpoint.
3. Pulsa **F5** (o "Ejecutar y depurar") para iniciar.
4. Usa **F10** para paso a paso y vuelve a pulsar **F5** para continuar.
5. Consulta variables y pila en el panel "Ejecutar y depurar".

## Desarrollo

```bash
npm install
npm run dev          # web en http://localhost:5173
npm run electron:dev # app de escritorio con recarga en caliente
npm run build        # compila la web
npm run electron:build:win     # instalador Windows (en Windows)
npm run electron:build:mac     # .dmg macOS (en macOS)
npm run electron:build:linux   # AppImage/deb Linux (en Linux)
```

### Tests

```bash
npm run test:ext               # motor de extensiones + when + paths
npm run test:ext:lsp           # LSP real (núcleo TypeScript)
npm run test:ext:debugger      # instrumentación del fallback web
npm run test:ext:debugger-cdp  # depurador CDP real sobre node --inspect
npm run test:ext:debugger-dap  # adaptador DAP real
npm run test:ext:electron-ls   # servidor Live Server real (Electron)
```

El CI (GitHub Actions) empaqueta las 3 plataformas en cada tag `v*`.

## IA

Ve a **Ajustes → Asistente de IA**, elige proveedor (DeepSeek por defecto), introduce tu clave de API y pulsa "Probar conexión". Tu clave se guarda solo localmente.

## Licencia

MIT
