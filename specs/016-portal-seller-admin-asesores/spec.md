# 016 — Portal para sellers, administradores y asesores (.NET) con tickets de soporte

- **Estado:** backlog (sin refinar)
- **Responsable:** Diego
- **Origen:** tarea 14 de la lista de trabajo
- **Rama:** proyecto aparte (no es el theme); repositorio por definir

## 1. Qué se pidió
Una página para **seller, administrador y asesores**, desarrollada con **.NET**. Incluye la
**creación de tickets de soporte** para asignarse a un asesor.

## 2. Contexto conocido
- No es parte del theme VTEX: es una aplicación aparte. La constitución del proyecto (`specs/constitution.md`) asume VTEX IO como plataforma única, así que esta spec exige **ampliar la constitución** con las reglas del proyecto .NET (stack, repositorio, despliegue, convenciones).
- Los actores existen solo en el diseño: sellers terceros (sin operar; Q2 y Q3 abiertas), administrador y asesores (spec 000 §4). Hoy no hay portal de seller ni sistema de tickets.
- El canal de atención al cliente y su responsable están sin definir (Q5). La spec 004 arregla el formulario de contacto, que podría alimentar los tickets.
- La spec 015 (WhatsApp con IA) necesitará un destino cuando el bot no pueda resolver: asesores y tickets.

## 3. Preguntas abiertas (para cuando se aborde)
- [ ] ¿Qué hace cada rol (seller, administrador, asesor)? ¿Qué ve y qué puede cambiar?
- [ ] ¿Quién crea un ticket (comprador, seller, ambos)? ¿Por qué canales entra (formulario, WhatsApp, correo)?
- [ ] ¿Cómo se asigna un ticket a un asesor (manual, automática, por cola)? ¿Hay estados y tiempos de respuesta?
- [ ] ¿Cómo se autentican los usuarios (cuentas propias, VTEX ID, Azure AD)? ¿Cómo se relacionan con los sellers de VTEX?
- [ ] ¿Qué datos se leen o escriben en VTEX (pedidos, catálogo, Master Data) y con qué API?
- [ ] ¿Dónde se aloja, y en qué repositorio y con qué plantilla .NET?
- [ ] ¿Debe incluir funciones de seller como la carga de productos? (ver `catalogo/como-cargan-los-sellers.md`)
- [ ] ¿Se parte de una versión mínima solo con tickets?

## 4. Relaciones
- 000 (actores, Q2, Q3, Q5), 001 (condiciones de sellers y privacidad), 004 (contacto), 002 (feedback en Master Data), 014 (carga de productos), 015 (escalamiento del chatbot).

> Esta spec se detallará cuando se aborde. Por tamaño probablemente se divida en varias (tickets, portal de seller, administración). Requiere decidir primero la arquitectura y el repositorio.
