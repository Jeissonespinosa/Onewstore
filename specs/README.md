# Specs — Spec-Driven Development en Repuestox

Flujo: **constitución → spec → plan técnico → tareas → implementación → verificación**.
Nada se implementa sin una spec aprobada; el código (bloques JSON/CSS/React) es la
consecuencia de la spec, no al revés.

## Estructura

```
specs/
  README.md                 este archivo (proceso + índice + roadmap)
  constitution.md           reglas inmutables del proyecto (stack, convenciones, límites)
  _template.md              plantilla para nuevas specs
  000-contexto-global/      spec.md (contexto: negocio, actores, dominio, estado)
  001-tyc-marketplace/      spec.md · plan.md · tasks.md
  002-feedback-rating/      spec.md · plan.md · tasks.md
  003-menu-categorias-global/ spec.md · plan.md · tasks.md
  004-contact-us-roto/      spec.md (arreglo del formulario de contacto)
  005-about-us/             spec.md (página Quiénes somos)
  006-ajustes-calidad-tienda/ spec.md (checkout, redes, 404, tests)
```

Solo `spec.md` se escribe ahora; `plan.md` y `tasks.md` se generan tras aprobar la spec
(ver "Ciclo de vida").

## Ciclo de vida de una spec

| Estado | Significa | Salida |
|---|---|---|
| `draft` | Se está escribiendo/investigando | `spec.md` con preguntas abiertas |
| `review` | Lista para revisión del equipo (y legal en la 001) | Preguntas abiertas resueltas |
| `approved` | Contrato congelado; cambios requieren nueva revisión | `plan.md` + `tasks.md` |
| `implementing` | Rama `feat/<id>-<slug>` en curso | PRs que referencian tareas |
| `done` | Criterios de aceptación verificados en un workspace VTEX | Spec marcada `done` + CHANGELOG |

Regla: **una spec = una rama = uno o varios PRs**. Cada PR cita los criterios de
aceptación (`AC-n`) que cubre.

## Índice de specs

| ID | Spec | Responsable | Estado | Depende de |
|---|---|---|---|---|
| 000 | Contexto global de Repuestox (negocio, actores, dominio, casos de uso, estado) | Diego | draft | — |
| 001 | TyC para marketplace (Colombia, referencia UE) | Diego | draft | 000, 004, 005 (requiere revisión legal) |
| 002 | Feedback y rating de clientes y sellers | Diego | draft | 000, 001 (consentimiento/moderación en TyC) |
| 003 | Acceso rápido a categorías desde cualquier página | Diego | draft | 000 |
| 004 | Formulario de contacto roto (`/contact-us`) | Por asignar | draft | 000 |
| 005 | Página "Quiénes somos" (`/about-us`) | Por asignar | draft | 000 (contenido de negocio) |
| 006 | Ajustes de calidad de la tienda | Por asignar | draft | 000 |

## Roadmap propuesto

1. **Semana 0 — Fundaciones:** aprobar `constitution.md` y `_template.md`; decidir preguntas abiertas de las 3 specs.
2. **Semana 1 — 003 (menú global):** independiente, menor riesgo, entrega valor visible rápido. En paralelo, investigación legal de 001.
3. **Semana 1-2 — 001 (TyC):** investigación → borrador → revisión legal → publicación de páginas (`/terminos-y-condiciones`, etc.) + checkbox de aceptación.
4. **Semana 2-4 — 002 (feedback):** primero modelo de datos y moderación, luego UI de compradores, luego sellers.

Orden por dependencias y riesgo: 003 → 001 → 002. Las specs 004-006 (arreglos pequeños) se
intercalan; conviene cerrar 004 y 005 antes de publicar la 001, porque aportan contacto y aviso
legal. Las preguntas Q1-Q11 de la spec 000 son decisiones de negocio que desbloquean varias
specs a la vez.

## Definition of Done (común)

- [ ] Todos los `AC-n` de la spec verificados en un workspace propio (`vtex use <nombre>` + `vtex link`).
- [ ] Probado en móvil (≤640 px) y escritorio.
- [ ] Sin enlaces internos rotos (si toca categorías: `python3 scripts/gen-categorias.py --dry-run`).
- [ ] README/CHANGELOG actualizados.
- [ ] Spec marcada `done` con enlace al PR.
