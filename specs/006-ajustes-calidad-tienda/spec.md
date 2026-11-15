# 006 — Ajustes de calidad de la tienda

- **Estado:** draft
- **Responsable:** Por asignar
- **Rama:** `chore/006-ajustes-calidad`
- **Depende de:** 000 (hallazgos #3 a #7)

## 1. Contexto y problema
La spec 000 detectó varios problemas menores. Se agrupan aquí por ser pequeños; si alguno
crece, se separa en su propia spec.

## 2. Alcance (un ítem = un bloque de trabajo independiente)
| Ítem | Hallazgo | Acción |
|---|---|---|
| A | Checkout genérico ("Place your logo here") | Logo y estilos de marca en el checkout. Se coordina con la spec 001 (RF-7) |
| B | Redes del footer apuntan a las portadas de Facebook/Instagram/TikTok | Enlaces a las cuentas reales de Repuestox (o quitarlos si no existen) |
| C | `product-rating-summary` y Q&A declarados pero sin efecto | Quitarlos hasta la spec 002, o dejarlos si ya se va a instalar la app |
| D | URL inexistente muestra "sin resultados" con HTTP 200 | Página 404 clara; verificar si VTEX permite devolver 404 real |
| E | `TyreSizeSelector` sin test (constitución #2) | Añadir test en `react/__tests__`, siguiendo `VehicleSelector.test.js` |

## 3. Requisitos funcionales
- `RF-1` Cada ítem se implementa y verifica por separado.
- `RF-2` El ítem E incluye casos de cascada Ancho → Perfil → Rin y de facets vacíos.
- `RF-3` El ítem D muestra un mensaje de página no encontrada con enlaces a categorías.

## 4. Criterios de aceptación
- `AC-A` El checkout muestra el logo de Repuestox.
- `AC-B` Cada enlace de red social abre una cuenta de Repuestox, o no hay icono.
- `AC-C` El PDP no tiene bloques vacíos.
- `AC-D` Una URL inexistente muestra un 404 claro.
- `AC-E` Los tests de `TyreSizeSelector` pasan en CI/local.

## 5. Preguntas abiertas
- [ ] ¿Existen cuentas oficiales de redes de Repuestox?
- [ ] ¿Se puede devolver un 404 real en VTEX IO para rutas del theme? (spike corto)
- [ ] ¿Se instala la app de reseñas pronto (ítem C)?
