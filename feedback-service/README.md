# feedback-service

App de VTEX IO (`onewstore.feedback-service`) que recibe el feedback de la tienda y lo guarda en
Master Data con **campos privados**. Spec 002 (`specs/002-feedback-rating/`).

Existe porque VTEX bloquea desde el 26-oct-2026 la creación de campos públicos en Master Data
(ver `plan.md`, spike 1.5): el navegador ya no puede escribir directo, así que escribe aquí y el
servicio guarda con las credenciales de la app. La spec 004 (`/contact-us`) reutilizará este patrón.

## Rutas (públicas, bajo el dominio de la tienda)

Todas son `POST` con `Content-Type: application/json`, se sirven en `/_v/feedback/...`, comprueban el
origen (`Origin`/`Referer` de la tienda), responden con `Cache-Control: no-store` y **no aceptan
parámetros en la URL**. Cuerpo máximo: 10 KB. Todas las respuestas son JSON con `ok` y, si falla,
un `code`.

| Ruta | Cuerpo | Qué hace |
|---|---|---|
| `/_v/feedback/purchase` | `orderId`, `rating` (1-5), `comment?` (≤1000), `reason?` (solo con 1-3★) | Guarda la calificación de la compra. Una por pedido. El correo del pedido lo toma el servidor |
| `/_v/feedback/site` | `type` (`problema`/`sugerencia`/`otro`), `message` (≤1000), `viewport` (`movil`/`escritorio`), `pageUrl?`, `email?`, `orderId?` | Guarda el feedback del botón flotante. Correo: cuenta → pedido → el escrito (opcional) |
| `/_v/feedback/identity` | `orderId?` | Devuelve `authenticated`, `source` (`account`/`order`/`null`) y `maskedEmail` (`d***@gmail.com`). **Nunca el correo completo** |

Códigos de error: `origin` (403), `bad-json`, `bad-body`, `bad-order`, `bad-rating`, `bad-reason`,
`bad-type`, `bad-viewport`, `bad-email`, `message-required`, `message-too-long`,
`comment-too-long` (400), `already-rated` (409), `rate-limited` (429), `unavailable` (502).
El campo trampa `website`, si viene relleno, se responde `200 ok` y **no se guarda nada**.

Límites: 5 envíos por sesión/IP cada 10 minutos (contador en VBase, no atómico). Solo se guarda la
**ruta** de la página (sin dominio, consulta ni fragmento). El texto se guarda tal cual y siempre
debe mostrarse como texto plano. El servicio no escribe correos en sus registros.

## Entidades de Master Data

Se crean **a mano**: el builder `masterdata` falla en `builder-hub` ("Schema creation ... failed").
Las definiciones están en `schemas/` y todos sus campos son privados (sin `v-security` público).
Un administrador las crea una vez por cuenta, con su sesión de VTEX (PowerShell, desde la raíz del repo):

```powershell
vtex use <workspace>
$t = (vtex local token).Trim()
curl.exe -i -X PUT "https://<workspace>--onewstore.myvtex.com/api/dataentities/purchasefeedback/schemas/v1" -H "Content-Type: application/json" -H "VtexIdclientAutCookie: $t" --data-binary "@feedback-service/schemas/purchasefeedback.json"
curl.exe -i -X PUT "https://<workspace>--onewstore.myvtex.com/api/dataentities/sitefeedback/schemas/v1" -H "Content-Type: application/json" -H "VtexIdclientAutCookie: $t" --data-binary "@feedback-service/schemas/sitefeedback.json"
```

Respuesta esperada: `HTTP 200` ("JSON Schema persisted successfully"). Los nombres de entidad no
admiten guiones. **Master Data es de la cuenta, no del workspace**: crear las entidades las crea
también para producción. No pegues el token en ningún sitio.

## Desarrollo

```powershell
cd feedback-service\node
yarn            # instala dependencias
yarn test       # pruebas unitarias (jest)
cd ..
vtex use <workspace>
vtex link       # sirve las rutas en https://<workspace>--onewstore.myvtex.com/_v/feedback/...
```

- Con un `vtex link` abierto, no lances otro: si queda uno viejo sirviendo, parece que el cambio no
  se aplica. Los cambios en `manifest.json` o `service.json` piden relanzar el link.
- `builder-hub` fuerza `@vtex/api` 7, TypeScript 5.5.3 y `@types/node` 20; el `tsconfig.json` no
  debe llevar `noEmit`.
- Un `5xx` del servicio lo sustituye el CDN por su página de error (se ve como un 404 de la tienda).
  Por eso los errores esperados usan 4xx con un `code`.
- Nunca ejecutes `vtex publish` ni `vtex install` en producción sin acordarlo antes.

## Políticas del manifest

`ADMIN_DS` (general sobre Master Data: no se puede limitar a una entidad) y salida a
`api.vtex.com` y `portal.vtexcommercestable.com.br` (este último lo usa el cliente `Session`).
La lectura del correo de un pedido (`clients/orders.ts`) **no está verificada** (tarea 1.2 de la
spec 002): hace falta un pedido real y, probablemente, una política de OMS. Mientras tanto devuelve
`null` y el servicio sigue funcionando sin ese correo.
