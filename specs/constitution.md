# Constitución del proyecto Repuestox

Principios que toda spec debe respetar. Cambiarlos requiere decisión explícita del equipo.

1. **Plataforma:** VTEX IO, app `onewstore.store-theme`. Preferir bloques nativos y apps oficiales de VTEX antes de código propio.
2. **Código propio solo si es necesario:** `react/` ya existe (VehicleSelector, TyreSizeSelector). Todo componente nuevo lleva tests en `react/__tests__`.
3. **Páginas de categoría generadas:** `store/blocks/home/category-*.jsonc` y `store/routes.json` (rutas de categoría) NO se editan a mano; se cambia `catalogo/estructura-categorias-v2.json` y se regenera con `scripts/gen-categorias.py`.
4. **Estilos:** tokens en `styles/configs/style.json`; overrides en `styles/css/<app>.css`. Sin estilos inline.
5. **Idioma:** UI y documentación en español (Colombia); identificadores de código en inglés o en el estilo ya existente (`rx-…`).
6. **Datos personales:** Ley 1581 de 2012 (habeas data). No guardar más datos de los necesarios; toda recolección necesita finalidad y consentimiento documentados.
7. **Flujo de trabajo:** nunca trabajar sobre `master`/producción; cada persona usa su propio workspace y rama `feat/*`.
8. **Verificabilidad:** cada requisito de una spec se redacta de forma que pueda comprobarse (criterios de aceptación `AC-n`).
9. **Rendimiento y accesibilidad:** navegación operable por teclado, contraste AA, sin degradar LCP de home/PLP/PDP.
