# Assets visuales del README

Este directorio contiene los assets usados por el README público de BRÚJULA. Las capturas son evidencia del deployment real en Vercel, no mockups.

## Regeneración

```bash
npx tsx scripts/capture-readme-screenshots.ts
```

Base URL por defecto:

```bash
https://brujula-pacifico.vercel.app
```

Para capturar otro entorno:

```bash
README_CAPTURE_BASE_URL=http://localhost:3000 npx tsx scripts/capture-readme-screenshots.ts
```

Herramienta usada: `puppeteer 25.1.0`.

Fecha de la última captura: `2026-07-12T01:20:18.891Z`.

## Condiciones de espera

El script:

- navega con timeout de 90 segundos;
- espera `domcontentloaded`;
- intenta `networkidle`, sin depender exclusivamente de ese estado;
- espera selectores clave por ruta;
- en mapas Leaflet espera `.leaflet-container` y tiles visibles;
- valida texto visible esperado;
- rechaza estados visibles con `NaN`, `undefined` o `Cargando`;
- espera entre 4 y 5 segundos adicionales antes de la captura;
- guarda diagnósticos en `screenshots/diagnostics/` si una ruta falla.

## Capturas

| Archivo | URL | Viewport | Tiempo observado | Datos dinámicos | Condición principal | Privacidad |
|---|---:|---:|---:|---|---|---|
| `01-landing.webp` | `/` | 1600x1000@1 | 9.1 s | Sí | `BRÚJULA`, contratos SECOP | Sin datos personales |
| `02-dashboard-territorial.webp` | `/dashboard` | 1600x1000@1 | 29.8 s | Sí | KPIs, tabla y `.leaflet-container` | Sin datos personales |
| `03-agente-ia.webp` | `/agente` | 1600x1000@1 | 11.8 s | No ejecuta IA | `textarea`, 9 herramientas | Sin consultas privadas |
| `04-zonas-olvidadas.webp` | `/zonas-olvidadas` | 1600x1000@1 | 37.8 s | Sí | ranking, Argelia y mapa | Sin datos personales |
| `05-mi-plata.webp` | `/mi-plata` | 1600x1000@1 | 26.6 s | Sí | Tumaco y desglose sectorial | Sin datos personales |
| `06-comparador.webp` | `/comparador` | 1600x1000@1 | 18.0 s | Sí | Tumaco, Cali y veredicto | Sin datos personales |
| `07-simulador.webp` | `/simulador` | 1600x1000@1 | 18.1 s | Sí | escenario y advertencia no causal | Sin datos personales |
| `08-radar-sectorial.webp` | `/radar` | 1600x1000@1 | 10.7 s | Sí | hallazgo y desbalance | Sin datos personales |
| `09-brief-ejecutivo.webp` | `/brief` | 1600x1000@1 | 21.9 s | Interfaz | formulario de brief | No genera PDF ni archivos |
| `10-bitacora.webp` | `/bitacora` | 1600x1000@1 | 9.1 s | Sí | KPIs y registros | No muestra teléfonos ni tokens |
| `11-whatsapp.webp` | `/whatsapp` | 1600x1000@1 | 10.0 s | No | guía pública del sandbox | No muestra credenciales |
| `12-offline-pwa.webp` | `/offline` | 1600x1000@1 | 9.7 s | Local | estado sin paquetes descargados | No accede a datos del usuario |
| `13-mobile-landing.webp` | `/` | 390x844@2 | 6.7 s | Sí | hero móvil y KPIs | Sin datos personales |
| `14-mobile-mi-plata.webp` | `/mi-plata` | 390x844@2 | 18.8 s | Sí | Tumaco y barras sectoriales | Sin datos personales |

El detalle máquina-legible queda en `screenshots/capture-report.json`.

## Hero y diagramas

- `brujula-readme-hero.svg`: SVG original, local, sin logos oficiales ni fuentes externas.
- `diagrams/*.mmd`: fuentes Mermaid usadas o reflejadas en el README.

## Advertencias

- Las cifras de capturas son dinámicas y dependen del estado de producción al momento de ejecutar el script.
- La captura de `/brief` muestra la interfaz del generador; no prueba la descarga del PDF.
- La captura de `/offline` muestra el estado local sin paquetes descargados, que es el comportamiento esperado en una sesión limpia.
- El canal de WhatsApp usa Twilio Sandbox público; los secretos de Twilio no están presentes en las capturas.
