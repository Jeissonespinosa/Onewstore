# 015 — Botón de WhatsApp con chatbot de IA para comprar

- **Estado:** backlog (sin refinar)
- **Responsable:** William
- **Origen:** tarea 13 de la lista de trabajo
- **Rama:** `feat/015-whatsapp-chatbot-ia` (cuando se aborde)

## 1. Qué se pidió
Incluir un botón de WhatsApp para que, mediante un **chatbot potenciado con IA**, se puedan
**hacer compras directamente en VTEX**. Se va a **preguntar a VTEX** sobre esta funcionalidad.

## 2. Contexto conocido
- Hoy WhatsApp solo aparece como botón de compartir; no hay canal de atención por WhatsApp (spec 000 §4, atención al cliente; Q5 sin responder).
- No se sabe si VTEX ofrece algo equivalente de forma nativa o por una app del VTEX App Store; **no se asume**. La respuesta de VTEX define si es configuración, integración o desarrollo propio.
- Comprar por un chatbot toca pagos, datos personales y términos de compra: depende de la pasarela (Q3), de los TyC (001) y de la política de privacidad.
- La spec 002 prevé un botón flotante de feedback: habrá que decidir cómo conviven dos elementos flotantes (WhatsApp y feedback), sobre todo en móvil.

## 3. Preguntas abiertas (para cuando se aborde)
- [ ] **Pendiente de William:** ¿qué ofrece VTEX para venta conversacional por WhatsApp (nativo, app de terceros, API)? ¿Costos y requisitos (cuenta de WhatsApp Business)?
- [ ] ¿La IA solo asesora (recomienda, resuelve dudas) o llega a **cerrar la compra**? Si cierra la compra, ¿cómo se paga?
- [ ] ¿Quién responde cuando el bot no puede resolver (asesores humanos)? ¿En qué horario?
- [ ] ¿Qué datos del cliente maneja el bot y dónde se guardan (Ley 1581)? ¿Cómo se informa que habla con una IA?
- [ ] ¿Cómo se evita que el bot venda algo incompatible con el vehículo del cliente?

## 4. Relaciones
- 001 (TyC y privacidad), 002 (botón flotante), 009 y 010 (móvil y carga), preguntas Q3 y Q5 de la spec 000.

> Esta spec se detallará cuando William tenga la respuesta de VTEX. Es la de mayor incertidumbre técnica y legal de la lista.
