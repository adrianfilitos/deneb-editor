# Nova — Editor de código con IA

Editor de código moderno con IA integrada, hecho con **Electron, React, Monaco y Vite**.

- **Landing page** (GitHub Pages): la página de presentación del proyecto.
- **Editor web (demo)**: disponible en `/app` de la landing.
- **Escritorio (Windows)**: instalador `.exe` y versión portable en Releases.

## Características

- Editor **Monaco** con sintaxis, minimapa, multi-cursor, esquema de símbolos y atajos tipo VS Code.
- **Explorador de archivos**, búsqueda en archivos, panel de problemas y terminal real (PowerShell).
- **Asistente de IA** con herramientas: lee/lista/busca archivos del workspace, escribe archivos y ejecuta comandos (con tu aprobación). Proveedores: **DeepSeek (recomendado)**, OpenAI, Anthropic y servidor local.
- Atajos de teclado, tema claro/oscuro, ajustes, pestañas y edición dividida.

## Uso

### Web
Abre la URL de GitHub Pages del proyecto.

### Escritorio
Descarga el instalador desde **Releases** e instala. El instalador añade los comandos `nova` y `nova-ai` a tu PATH:

```bash
nova            # abre el editor
nova .          # abre la carpeta actual
nova archivo.ts # abre un archivo
nova-ai .       # abre el editor con el asistente de IA
```

### Desarrollo

```bash
npm install
npm run dev          # web en http://localhost:5173
npm run electron:dev # app de escritorio con recarga en caliente
npm run build        # compila la web
npm run electron:build  # genera instalador + portable en release/
```

## IA

Ve a **Ajustes → Asistente de IA**, elige proveedor (DeepSeek por defecto), introduce tu clave de API y pulsa "Probar conexión". Tu clave se guarda solo localmente.

## Licencia

MIT
