---
name: implementar-spec
description: Ejecuta una spec de Repuestox (carpeta specs/NNN-*) por grupos de tareas, verificando cada una. Úsalo cuando el usuario pida "implementar la spec 003", "continuar con las tareas", "empezar la spec NNN", "generar el plan o las tareas de una spec", o retomar el trabajo de una spec en una sesión nueva.
---

# Implementar una spec de Repuestox

Flujo de spec-driven development del proyecto. Las specs viven en `specs/`; no se usa OpenSpec.
Trabaja **un grupo de tareas a la vez**, no el plan completo ni tarea por tarea.

## 0. Argumento
El usuario indica la spec (`003`, `menu-categorias-global`, etc.). Si no la indica, lista las
specs de `specs/README.md` con su estado y pregunta cuál. No elijas por tu cuenta.

## 1. Leer antes de actuar (siempre, desde disco)
1. `specs/constitution.md` (reglas inmutables).
2. `specs/000-contexto-global/spec.md` (contexto, actores, preguntas abiertas Q1-Q11).
3. `specs/<spec>/spec.md`, y `plan.md` y `tasks.md` si existen.
4. `git status` y `git branch --show-current`.

Los archivos pueden haber cambiado desde la última sesión: no te fíes de lo que recuerdes.

## 2. Comprobaciones previas (parar y avisar si falla alguna)
- **Estado de la spec:** si es `draft` con preguntas abiertas que bloquean el trabajo (revisa la
  sección "Preguntas abiertas" y la tabla Q1-Q11 de la spec 000), dilo y pregunta antes de seguir.
  Una pregunta abierta de negocio **no se resuelve suponiendo**: se pregunta al usuario.
- **Rama:** debe ser `feat/<NNN>-<slug>` (o `fix/`, `chore/` según la spec), creada **desde `release`**
  (la rama base del proyecto; no `master`). Si estás en `release`, `master` o en otra rama, propón
  crearla; no trabajes directamente sobre `release` ni `master`. Las fusiones van a `release`.
- **Cambios ajenos:** si hay cambios sin commit que no son tuyos, déjalos intactos. No los
  incluyas en tus commits (`git add` solo de rutas concretas, nunca `git add -A`).
- **Faltan `plan.md` o `tasks.md`:** ve al paso 3. Si existen, ve al paso 4.

## 3. Generar plan y tareas (solo si faltan)
1. Inspecciona el repo (solo lectura) antes de escribir: bloques, estilos, scripts y tests que
   la spec toca. Distingue lo observado de lo asumido.
2. Escribe `plan.md` (contexto, objetivos y no-objetivos, decisiones con alternativas, riesgos,
   reversión, preguntas abiertas deferrables) y `tasks.md`.
3. `tasks.md`: grupos numerados (`## 1. …`), cada tarea como `- [ ] N.M descripción` y con su
   **verificación** (test, comando o comportamiento observable). Tests y documentación van en el
   mismo grupo que el trabajo que los exige, no en un grupo final. Si hay algo incierto sobre
   la plataforma (p. ej. si un bloque de VTEX soporta un comportamiento), el grupo 1 es un
   **spike** que lo resuelve antes de construir.
4. **Para y pide aprobación** del plan y las tareas. No implementes en el mismo turno.

## 4. Ejecutar un grupo
1. Elige el **primer grupo con tareas sin marcar**. No saltes grupos: el orden es de dependencias.
2. Anuncia en una línea qué grupo vas a hacer y qué tareas incluye.
3. Por cada tarea: implementa, **ejecuta su verificación** y solo entonces cambia `- [ ]` por
   `- [x]` en `tasks.md`.
4. Si una verificación falla, no marques la tarea: diagnostica, corrige o reporta el bloqueo.
5. Si descubres algo que contradice el plan o la spec, **para**, explícalo y propón el cambio a
   `plan.md` o `spec.md`; no lo resuelvas en silencio en el código.
6. Al terminar el grupo: resumen breve (hecho, verificado, pendiente) y **commit**; luego
   pregunta si sigue con el siguiente grupo. No encadenes grupos sin confirmación.

## 5. Verificación: qué puedes y qué no
- **Puedes** comprobar: tests (`python -m unittest scripts/tests/…`, `react/__tests__`), el
  generador (`python scripts/gen-categorias.py --dry-run`), enlaces rotos, JSON válido,
  búsquedas en el código.
- **Puedes comprobar en el navegador** lo que se ve en el sitio (carga de la página, menús,
  formularios, consola, red, aspecto a distintos anchos) usando la extensión de Claude para
  Chrome (herramientas `mcp__claude-in-chrome__*`; carga el skill `claude-in-chrome` antes) o el
  navegador integrado. Pide a `vtex link` en el workspace de Diego si no está corriendo: **no
  inicies sesión con credenciales ni publiques nada**; la URL es
  `https://<workspace>--onewstore.myvtex.com/`. Reglas del navegador: abre una pestaña nueva, no
  uses diálogos `alert/confirm`, y no envíes formularios que guarden datos reales ni hagas
  pagos; para pruebas de envío usa datos ficticios y avisa antes.
- **Aun así puedes necesitar al usuario** para: iniciar `vtex link` / elegir el workspace,
  sesiones autenticadas, Lighthouse con métricas fiables, lector de pantalla y cualquier cosa que
  el navegador no alcance. Deja la tarea **sin marcar**, dile exactamente qué probar (URL, pasos,
  resultado esperado) y anota en el resumen qué quedó sin verificar.
- Si verificas en el navegador, deja constancia en el resumen (URL, qué viste, ancho de pantalla).
- Nunca declares "funciona" por haber editado el archivo.

## 6. Reglas del repositorio
- **Páginas generadas:** `store/blocks/home/category-*.jsonc`, `store/blocks/header/category-menu.jsonc`
  (cuando exista) y las rutas de categoría de `store/routes.json` **no se editan a mano**. Se
  cambia `catalogo/estructura-categorias-v2.json` o `scripts/gen-categorias.py` y se regenera.
- **Python:** en Windows el comando es `python` (no `python3`). Si no se reconoce, está en
  `%LOCALAPPDATA%\Programs\Python\Python313\python.exe`.
- **Test conocido en rojo:** `test_ROJO_HOY_csv_hoja_bajo_macro_sin_sub_va_en_columna_hoja` falla
  desde antes; no lo atribuyas a tu cambio. Cualquier otro fallo sí es tuyo.
- Los archivos de `scripts/` generan `__pycache__`: no los dejes en el árbol.
- **Estilos:** tokens en `styles/configs/style.json`; overrides en `styles/css/<app>.css`.
- **Idioma:** textos de UI y documentación en español de Colombia.
- **Datos personales:** cualquier campo nuevo que recoja datos requiere aviso de privacidad
  (Ley 1581) y se limita a lo necesario.
- **Release:** nunca ejecutes `vtex release`, `vtex publish` ni `vtex install` en producción.

## 7. Commits
- Un commit por grupo de tareas, rutas explícitas en `git add`.
- Mensaje: `<tipo>(<spec>): <qué>` en inglés o español, cuerpo con las tareas cubiertas
  (p. ej. `Tareas 2.1-2.3 de specs/003`). Termina con la línea de coautoría que indique la sesión.
- No hagas push ni abras PR salvo que el usuario lo pida. Al fusionar, la rama destino es `release`.

## 8. Cierre de una spec
Cuando todas las tareas estén `[x]` y los criterios `AC-n` verificados:
1. Marca la spec como `done` en `specs/README.md` y en su `spec.md` (campo Estado).
2. Anota en el resumen qué `AC-n` se comprobaron y cuáles quedaron en manos del usuario.
3. Si el cambio altera el contexto del negocio (nuevos actores, flujos, estado de producción),
   actualiza `specs/000-contexto-global/spec.md`.

## 9. Cuándo NO usar este skill
- Para ideas o decisiones aún sin spec: escribe primero la spec con `specs/_template.md`.
- Para revisar o auditar código existente: usa el agente `code-reviewer`.
