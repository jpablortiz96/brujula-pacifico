# BRÚJULA

### Sistema de inteligencia territorial abierta del Pacífico colombiano

> **datos.gov.co tiene la información. BRÚJULA tiene el criterio.**

**Concurso Datos al Ecosistema 2026: IA para Colombia · MinTIC**

---

## Qué hace

BRÚJULA cruza la contratación pública (**SECOP II**) con **indicadores sociales**
—educación, pobreza (Sisbén), violencia— de los cuatro departamentos del Pacífico
colombiano para responder la pregunta que casi nadie responde con datos:

> *¿Dónde el Estado gastó dinero pero el territorio sigue olvidado?*

Sobre esa base ofrece un **copiloto conversacional** que consulta datos reales en
vivo, un **comparador** de municipios, un **detector de zonas olvidadas** y export
de evidencia (fichas y PDF). Todo con datos abiertos, sin cajas negras.

| Código DANE | Departamento    | Municipios |
|:-----------:|-----------------|:----------:|
| 19          | Cauca           | 42         |
| 27          | Chocó           | 30         |
| 52          | Nariño          | 64         |
| 76          | Valle del Cauca | 42         |

Cobertura actual: **178 municipios**, **189.892 contratos** SECOP II (90,7 % con
geolocalización), sobre 4 datasets base + el catálogo vivo de datos.gov.co.

---

## Stack

| Capa           | Tecnología                                              |
|----------------|---------------------------------------------------------|
| Frontend       | Next.js 16 · App Router · TypeScript estricto           |
| Estilos        | Tailwind CSS v4 · paleta Brutal-Gov                     |
| Base de datos  | Supabase (PostgreSQL + RPCs)                            |
| Copiloto       | Anthropic API — `claude-sonnet-5` (agente, 9 tools)     |
| Clasificación  | Anthropic API — `claude-haiku-4-5` (sectorización)      |
| Datos          | datos.gov.co · API Socrata                              |
| WhatsApp       | Twilio (canal ciudadano)                                |
| Export PDF     | Puppeteer + Chromium (serverless)                       |
| Scripts        | tsx (TypeScript directo, sin build)                     |

---

## Documentación

| Documento                                | Contenido                                        |
|------------------------------------------|--------------------------------------------------|
| [docs/DATOS.md](docs/DATOS.md)           | Datasets abiertos usados (fuente, entidad, uso)  |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Arquitectura técnica y flujo agéntico        |
| [docs/CRISP-ML.md](docs/CRISP-ML.md)     | Metodología CRISP-ML(Q) del proyecto             |
| [docs/DEPLOY.md](docs/DEPLOY.md)         | Guía de despliegue en Vercel + Supabase          |

---

## Setup local

```bash
# 1. Clonar
git clone https://github.com/jpablortiz96/brujula-pacifico.git
cd brujula-pacifico/brujula

# 2. Dependencias
npm install

# 3. Variables de entorno
cp .env.example .env.local
# Editar .env.local con credenciales de Supabase, Anthropic y Twilio

# 4. Esquema Supabase
# Supabase → SQL Editor → ejecutar los .sql de supabase/ (empezar por schema.sql)

# 5. Seed + ingesta
npm run seed:divipola
npm run ingest:secop

# 6. Desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

---

## Variables de entorno

| Variable                          | Requerida     | Descripción                          |
|-----------------------------------|---------------|--------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | Sí            | URL del proyecto Supabase            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Sí            | Anon key pública                     |
| `SUPABASE_SERVICE_ROLE_KEY`       | Sí (scripts)  | Service role para ingesta            |
| `ANTHROPIC_API_KEY`               | Sí            | API key de Anthropic                 |
| `NEXT_PUBLIC_APP_URL`             | No            | URL pública (default localhost:3000) |
| `TWILIO_ACCOUNT_SID`              | Opcional      | Canal WhatsApp                       |
| `TWILIO_AUTH_TOKEN`               | Opcional      | Canal WhatsApp                       |
| `TWILIO_WHATSAPP_FROM`            | Opcional      | Número/sandbox de WhatsApp           |

Ninguna credencial real se versiona: solo se sube `.env.example` con los nombres
de las variables en blanco.

---

## Comandos

```bash
npm run dev             # Servidor de desarrollo
npm run build           # Build de producción
npm run lint            # ESLint
npm run seed:divipola   # Insertar municipios del Pacífico
npm run ingest:secop    # Ingestar SECOP II del Pacífico
```

---

## Licencia

MIT — ver [LICENSE](LICENSE)
