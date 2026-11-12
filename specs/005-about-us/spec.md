# 005 — Página "Quiénes somos" (`/about-us`)

- **Estado:** draft
- **Responsable:** Por asignar
- **Rama:** `feat/005-about-us`
- **Depende de:** 000 (hallazgo #1); contenido de negocio sin definir

## 1. Contexto y problema
`/about-us` muestra texto de plantilla de VTEX en inglés y no explica qué es Repuestox.
Además es el lugar natural del aviso legal (razón social, NIT) que pide la spec 001.

## 2. Objetivos / No-objetivos
**Objetivos**
- Contar en español qué es Repuestox, qué vende y a quién.
- Mostrar datos de empresa (razón social, NIT, contacto) una vez se confirmen.

**No-objetivos**
- No se inventa contenido corporativo: el texto lo aporta el negocio.

## 3. Requisitos funcionales
- `RF-1` La página está en español y sin texto de plantilla.
- `RF-2` Incluye qué es Repuestox, las tres áreas (Carros, Motos, Herramientas) y cobertura (Colombia).
- `RF-3` Incluye aviso legal con razón social y NIT.
- `RF-4` Enlaza a contacto (spec 004) y a los documentos legales (spec 001).
- `RF-5` Enlazada desde el footer.

## 4. Criterios de aceptación
- `AC-1` Ningún texto de la página está en inglés ni es de plantilla.
- `AC-2` Los datos legales coinciden con los documentos oficiales (verificado por el responsable de negocio).
- `AC-3` Los enlaces a contacto y a legales funcionan.
- `AC-4` Se ve correctamente a 360, 768 y 1280 px.

## 5. Preguntas abiertas (bloquean el contenido)
- [ ] ¿Qué es Onewstore respecto de Repuestox? ¿Razón social y NIT? (spec 000 §10)
- [ ] ¿Quién redacta el texto y las imágenes?
- [ ] ¿Se mencionan sellers terceros mientras el marketplace no opere?
