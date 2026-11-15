# 012 — Ingreso con Apple y Google

- **Estado:** backlog (sin refinar)
- **Responsable:** William
- **Origen:** tarea 10 de la lista de trabajo
- **Rama:** `feat/012-login-social` (cuando se aborde)

## 1. Qué se pidió
Permitir al usuario ingresar con Apple y Google. William va a **preguntar a VTEX si lo ofrece**.

## 2. Contexto conocido
- El login actual usa `vtex.login` y `vtex.my-account` (spec 000 §4); no se ha probado el flujo.
- No se sabe qué proveedores de identidad soporta VTEX ID en esta cuenta; **no se asume que Apple y Google estén disponibles**. La respuesta de VTEX decide si es configuración o desarrollo.
- Un login con terceros recoge datos personales: la política de privacidad y los TyC (spec 001) deben cubrirlo (Ley 1581).

## 3. Preguntas abiertas (para cuando se aborde)
- [ ] **Pendiente de William:** ¿VTEX ofrece login con Google y con Apple? ¿Por configuración o requiere desarrollo? ¿Con qué costo o requisitos (cuenta de desarrollador de Apple, etc.)?
- [ ] ¿Se mantienen correo/contraseña (o código por correo) además de los sociales?
- [ ] ¿Qué pasa con compradores que ya compraron como invitados con ese correo?
- [ ] Si VTEX no lo ofrece, ¿se abandona o se evalúa una alternativa?

## 4. Relaciones
- 001 (privacidad), 002 (correo del usuario autenticado en el feedback), 009 (login en móvil).

> Esta spec se detallará cuando William tenga la respuesta de VTEX. Si no se ofrece de forma nativa, se cierra como `descartada` o se redefine.
