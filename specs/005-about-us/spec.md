# 005 — Página "Quiénes somos" (`/about-us`)

- **Estado:** hecha salvo el contenido de negocio
- **Responsable:** Por asignar
- **Rama:** `feat/motorizacion` (se hizo aquí)
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

## 4bis. Estado (2026-11-27)
La página se rehízo en `/quienes-somos` (la ruta cambió: el resto de las propias están en
español y a `/about-us` no enlazaba nadie). Cumple RF-1, RF-2, RF-4 (enlaza a `/contacto`) y
RF-5 (enlazada desde el footer). **RF-3 no**: razón social y NIT siguen sin asignar (Q1), así
que esa sección existe vacía y no se pinta hasta que alguien la escriba en el Site Editor.
Tampoco se enlazan los documentos legales, que no existen todavía (spec 001).

Sobre Q1: el negocio confirmó el 2026-11-27 que **el nombre de la empresa es Repuestox**, lo
que zanja la duda con "One W Store". Pero siguen faltando **NIT y razón social formal**, que es
lo que pide RF-3, así que la sección sigue vacía: "Repuestox" a secas no es un aviso legal, y
todo el sitio ya lo dice. La cuenta VTEX figura con `companyName` "William Baquero Romero";
**no se publicó**, es el titular de la cuenta.

## 5. Preguntas abiertas (bloquean el contenido)
- [ ] ¿Qué es Onewstore respecto de Repuestox? ¿Razón social y NIT? (spec 000 §10)
- [ ] ¿Quién redacta el texto y las imágenes?
- [ ] ¿Se mencionan sellers terceros mientras el marketplace no opere?
