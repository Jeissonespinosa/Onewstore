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
| `/_v/feedback/purchase` | `orderId`, `rating` (1-5), `comment?` (≤1000), `reason?` (solo con 1-3★), `email?` | Guarda la calificación de la compra. Una por pedido. El correo es el que escribió la persona |
| `/_v/feedback/site` | `type` (`problema`/`sugerencia`/`otro`), `message` (≤1000), `viewport` (`movil`/`escritorio`), `pageUrl?`, `email?`, `orderId?` | Guarda el feedback del botón flotante. Correo: el que escribió la persona (opcional) |
| `/_v/feedback/identity` | (vacío) | Devuelve `authenticated` y `email` (el de la cuenta de la sesión, o `null`) para **precargar** el formulario. Solo a la propia sesión, `no-store` |

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

`ADMIN_DS` (general sobre Master Data: no se puede limitar a una entidad), `vbase-read-write` (contador
de envíos) y salida a `api.vtex.com` y `portal.vtexcommercestable.com.br` (este último lo usa el
cliente `Session`). **No hay políticas de pedidos**: el correo del pedido se descartó (OMS devuelve un
alias `…@ct.vtex.com.br` y exigía permisos amplios), ver `plan.md`, decisión 5.

## Leer el feedback (equipo)

Los datos están en dos entidades de Master Data, ambas con campos privados:

| Entidad | Qué guarda | Campos |
|---|---|---|
| `purchasefeedback` | Calificación de la compra (una por pedido; el `id` es el número de pedido) | `orderId`, `rating`, `reason`, `comment`, `email`, `createdIn` |
| `sitefeedback` | Feedback del botón flotante | `type`, `message`, `email`, `pageUrl`, `viewport`, `createdIn` |

**Siempre trata `comment` y `message` como texto**: se guardan tal cual, también si traen HTML o
`<script>` (verificado en la 002, AC-10). No los pegues en una página sin escaparlos.

### Por la API (verificado)

Con la sesión de administrador (PowerShell, tras `vtex use <workspace>`; las entidades son de la
cuenta, así que ves los mismos datos en cualquier workspace):

```powershell
$t = (vtex local token).Trim()
# Compras: todas
curl.exe -s "https://<workspace>--onewstore.myvtex.com/api/dataentities/purchasefeedback/search?_schema=v1&_fields=id,orderId,rating,reason,comment,email,createdIn" -H "VtexIdclientAutCookie: $t"
# Una compra por número de pedido (el filtro por `orderId` funciona)
curl.exe -s "https://<workspace>--onewstore.myvtex.com/api/dataentities/purchasefeedback/search?_schema=v1&_fields=id,rating,comment,email&_where=orderId=<pedido>" -H "VtexIdclientAutCookie: $t"
# Sitio: todos
curl.exe -s "https://<workspace>--onewstore.myvtex.com/api/dataentities/sitefeedback/search?_schema=v1&_fields=id,type,message,email,pageUrl,viewport,createdIn" -H "VtexIdclientAutCookie: $t"
```

Respuesta: una lista JSON. **No se pudo comprobar** el filtro por `pageUrl` (con una ruta que lleva `/` devolvió
"O filtro informado é inválido"), ni la paginación para más de un puñado de registros: la
documentación de Master Data usa la cabecera `REST-Range: resources=0-99`, sin verificar aquí.

### Exportar a CSV (verificado)

En Windows PowerShell 5.1 hay que **guardar el resultado antes de exportar**: si se encadena
`ConvertFrom-Json | Export-Csv` en una sola tubería, el CSV sale con las propiedades del arreglo
(`Count`, `Length`...) en vez de los registros.

```powershell
$d = curl.exe -s "https://<workspace>--onewstore.myvtex.com/api/dataentities/purchasefeedback/search?_schema=v1&_fields=id,orderId,rating,reason,comment,email,createdIn" -H "VtexIdclientAutCookie: $t" | ConvertFrom-Json
$d | Export-Csv -Path "$env:USERPROFILE\Desktop\feedback-compras.csv" -NoTypeInformation -Encoding UTF8
```

Para el feedback del sitio, cambia la entidad a `sitefeedback` y los campos a
`id,type,message,email,pageUrl,viewport,createdIn` (misma forma, sin probar el CSV de esa entidad).
Salió bien con 3 registros de prueba. **Sin verificar:** tildes y eñes (los datos de prueba no
tenían), y una exportación con muchos registros. El archivo lleva correos de personas: no lo
dejes en carpetas compartidas.

### En el admin de VTEX (verificado el 2026-11-24: las entidades no aparecen)

El bloqueo por facturas sin pagar ya no está: Master Data carga sus pantallas. Pero **no sirve para
leer este feedback**, porque las entidades creadas por API no se muestran en la interfaz clásica:

1. Admin → buscar «Master Data» (Store Settings / Storefront) abre `onewstore.vtexcrm.com.br`.
   Pide iniciar sesión de nuevo (token por correo, Google o contraseña).
2. «Applications» solo lista «Profile System» (Clientes y Endereços); «Reload Applications» no
   cambia nada.
3. «Advanced Settings → Data structure» abre `onewstore.ds.vtexcrm.com.br` (otro inicio de sesión).
   Su pestaña «Data Entities» lista 18 entidades nativas (Address, Customer, Orders…);
   **`purchasefeedback` y `sitefeedback` no están**.

Por la API sí existen: ese día, `search?_schema=v1` sobre ambas devolvió `HTTP 200` con una lista
vacía (`[]`), es decir, sin registros. Tras enviar un feedback desde el botón flotante, `sitefeedback`
devolvió ese registro (tipo, mensaje, correo, `pageUrl`, `viewport` y `createdIn` correctos) y
`purchasefeedback` siguió vacía; **y «Data Entities» siguió sin listar la entidad**, ya con datos.
**Decisión (2026-11-24): la lectura es por la API**, no por el admin de Master Data (ver Q11).

### Quién lo lee y cómo se entera (Q11)

**Decidido el 2026-11-24 (Q11 de la spec 000):** el feedback lo revisan los **asesores como tickets de
soporte**, que se asignan a un asesor. Eso se hará en un sistema aparte: la página para sellers,
administradores y asesores, desarrollada en .NET, que **lee el feedback por la API** de Master Data
(las consultas de «Por la API»). Ese sistema no está en este repo y aún no tiene spec.

Mientras no exista, no hay aviso: alguien tiene que consultar los datos con los comandos de arriba.
Este servicio no envía correos ni crea tickets. Cuando se construya el sistema .NET habrá que definir
cómo se autentica contra Master Data (hoy solo lo permite una sesión o token de administrador), cómo
detecta registros nuevos (el servicio no marca «leído» ni «asignado»; hoy se filtra por `createdIn`)
y si un registro crea un ticket por cada feedback o solo por los negativos.

### Borrar datos de prueba

`DELETE https://<workspace>--onewstore.myvtex.com/api/dataentities/<entidad>/documents/<id>` con el
mismo `VtexIdclientAutCookie`. Los datos son de la cuenta: cuidado con borrar feedback real.
