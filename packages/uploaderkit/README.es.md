<div align="center">

# uploaderkit

**Subida de archivos para React y Node, desde un solo contrato.**  
Scopes que ambos lados validan, un uploader headless con progreso / abort / compresión, y un servicio de almacenamiento en servidor con providers intercambiables.

[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-%5E18%20%7C%7C%20%5E19-61dafb.svg)](https://react.dev/)
[![Tailwind](https://img.shields.io/badge/tailwindcss-v4-38bdf8.svg)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)](https://www.typescriptlang.org/)

[🇬🇧 English](./README.md) | **🇲🇽 Español**

</div>

---

## Tabla de contenidos

- [Características](#características)
- [Inicio rápido](#inicio-rápido)
- [Instalación](#instalación)
- [Configuración de Tailwind v4](#configuración-de-tailwind-v4)
- [Scopes — el contrato](#scopes--el-contrato)
  - [Definir scopes](#definir-scopes)
  - [Replace — nunca dejar un archivo muerto](#replace--nunca-dejar-un-archivo-muerto)
- [Cliente](#cliente)
  - [`useUploader`](#useuploader)
  - [Disparo de la subida — `select` vs `manual`](#disparo-de-la-subida--select-vs-manual)
  - [Reintentos y concurrencia](#reintentos-y-concurrencia)
  - [Estrategias de subida](#estrategias-de-subida)
  - [Validación](#validación)
  - [Compresión de imágenes](#compresión-de-imágenes)
  - [Slots con nombre (`useSlottedUploader`)](#slots-con-nombre-useslotteduploader)
- [Componentes de UI](#componentes-de-ui)
  - [`Uploader`](#uploader)
  - [`SlottedUploader`](#slotteduploader)
  - [Confirmaciones](#confirmaciones)
  - [Vista previa (`FileViewer`)](#vista-previa-fileviewer)
  - [Leer un archivo guardado](#leer-un-archivo-guardado)
  - [Labels — todo el copy es reemplazable](#labels--todo-el-copy-es-reemplazable)
  - [Theming](#theming)
  - [Headless por completo](#headless-por-completo)
- [Servidor](#servidor)
  - [`createStorage`](#createstorage)
  - [Express](#express)
  - [Next.js App Router](#nextjs-app-router)
  - [Cifrado](#cifrado)
- [Providers de almacenamiento](#providers-de-almacenamiento)
- [Feedback para el desarrollador](#feedback-para-el-desarrollador)
- [Subpath exports](#subpath-exports)
- [Licencia](#licencia)

---

## Características

- **Un contrato, los dos lados** — un registro de scopes declara dónde aterriza un archivo, quién puede leerlo, qué se acepta y qué tan grande puede ser. El navegador y el servidor validan contra el mismo objeto, así que un rechazo nunca es una sorpresa al final de una subida de 40 MB.
- **Headless primero** — `useUploader` es dueño de la selección, la validación, la compresión, el progreso por archivo, el abort y el estado de error; no renderiza nada. `/ui` es una piel opcional encima, así que una app con su propio design system no pierde comportamiento al saltársela.
- **Validación en el cliente antes del primer byte** — extensión, tamaño y magic numbers, para que un `.exe` renombrado a `.pdf` nunca salga de la máquina.
- **Progreso de subida real** — la estrategia por defecto usa XHR porque `fetch` sigue sin tener progreso de subida usable en los navegadores. Toda subida en vuelo se puede abortar, por archivo o todas de golpe.
- **Compresión de imágenes en el scope** — declara `compress` y las imágenes se reescalan y reencodean antes de viajar. El EXIF (GPS, cámara) se pierde en el proceso.
- **Transporte intercambiable** — el `UploadStrategy` es una sola función `(file, scope, entityId, { onProgress, signal })`. Cambia el endpoint, el header de auth o el protocolo completo sin tocar el estado del hook.
- **Servicio de almacenamiento en servidor** — `createStorage` vuelve a correr la misma validación, cifra los scopes que lo piden y responde URLs firmadas con expiración para los objetos privados.
- **Guardas en el arranque** — un scope privado sobre un provider que no puede firmar, o un scope cifrado sin un cipher inyectado, lanza al construir. El deploy falla en voz alta en vez de dar 500 en la primera subida.
- **Adaptadores de framework** — handlers estructurales para Express (la app es dueña de multer) y para el App Router de Next.js (`Request`/`Response` nativos). No se arrastra ninguna dependencia de framework.
- **Adaptadores de provider** — Google Cloud Storage (esquema de dos buckets), cualquier backend compatible con S3 (AWS, Cloudflare R2, Backblaze B2, MinIO, Wasabi) y un provider en memoria para pruebas. Todos son peers opcionales: elegir GCS nunca instala el SDK de AWS.
- **Slots con nombre** — `SlottedUploader` llena un archivo por posición nombrada (hoja membretada, identificación, constancia fiscal); un drop masivo rutea cada archivo a su slot y lo renombra para que resubir sobrescriba en su lugar.
- **Sin cipher por defecto** — los scopes privados declaran `encrypt: true` y la app inyecta los `CryptoHooks`. `createAesGcmCrypto` está disponible como implementación de referencia.
- **Tú eliges cuándo dispara la subida** — `uploadOn: 'select'` manda en cuanto un archivo válido aterriza; `'manual'` retiene los archivos hasta `upload()` — el flujo de formulario. `onUploadStart` anuncia el momento en que un batch sale.
- **Retry con backoff + tope de concurrencia** — resiliencia opt-in para redes inestables: las fallas transitorias de la estrategia se reintentan con backoff exponencial, y los batches grandes se encolan tras un límite de concurrencia.
- **Diálogos de confirmación integrados** — `confirmRemove` / `confirmReplace` ponen un segundo paso accesible antes de las acciones destructivas (el foco cae en cancelar), y `ConfirmDialog` se exporta para uso de la app.
- **Paste y captura de cámara** — la zona con foco acepta un screenshot pegado, y `capture` abre la cámara del móvil directamente.
- **Copy traducible** — todos los strings visibles fluyen por un objeto de labels. Español por defecto, `EN_LABELS` incluido, cualquier idioma con un override parcial.
- **Tema re-brandeable** — la capa con estilos lee variables CSS `--color-ui-*` así un solo override en `:root` re-brandea toda la capa con estilos.
- **Tamaños, iconos y motion** — `size='sm' | 'md'` compacta cada fila y zona, `icon` cambia (o quita) el glifo de la zona, y toda la superficie anima: las filas hacen fade-in, el drag escala la zona, los overlays entran y salen con transición, el indicador de subida pulsa.
- **Touch-first por defecto** — en pointers coarse la zona se lee como objetivo de tap ("Toca para elegir un archivo") con feedback de presión, en vez de anunciar un drag que nadie puede hacer; `capture` abre la cámara directo.

---

## Inicio rápido

```bash
pnpm add uploaderkit react react-dom
```

```ts
// scopes.ts — lo importan el cliente Y el servidor
import { defineScopes, MB } from 'uploaderkit'

export const scopes = defineScopes({
	'invoice-evidence': {
		path: (invoiceId, file) => `Invoices/${invoiceId}/evidence/${file.name}`,
		visibility: 'private',
		accept: ['pdf', 'png', 'jpg'],
		maxBytes: 8 * MB,
		encrypt: true,
	},
})
```

```tsx
// cliente
import { Uploader } from 'uploaderkit/ui'
import { createXhrUploadStrategy } from 'uploaderkit/react'

const strategy = createXhrUploadStrategy({ endpoint: `${apiUrl}/storage` })

;<Uploader
	scopes={scopes}
	scope='invoice-evidence'
	entityId={invoiceId}
	strategy={strategy}
	onUploaded={stored => saveToDb(stored)}
/>
```

```ts
// servidor
import { createStorage } from 'uploaderkit/server'
import { createMemoryProvider } from 'uploaderkit/adapters/memory'

export const storage = createStorage({
	scopes,
	provider: createMemoryProvider(),
	crypto: { encrypt, decrypt },
})
```

---

## Instalación

```bash
pnpm add uploaderkit
# peer, solo si usas /react o /ui
pnpm add react react-dom
```

Peers opcionales — instala únicamente el provider que uses:

```bash
pnpm add @google-cloud/storage                            # /adapters/gcs
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner # /adapters/s3
```

Las entradas de servidor no dependen de nada más que de este paquete: el
adaptador de Express calza estructuralmente con Express 4 y 5, y el de Next.js
usa la Fetch API.

---

## Configuración de Tailwind v4

Solo hace falta para `/ui`. Registra las clases del paquete una vez para que
Tailwind las genere:

```css
/* app/globals.css */
@import 'tailwindcss';
@import 'uploaderkit/tailwind.css';
```

Los hooks de `/react` no llevan estilos, así que una app headless se salta esto
por completo.

---

## Scopes — el contrato

Un **scope** es un destino con nombre: la única fuente de verdad sobre dónde
aterriza un archivo, quién puede leerlo y qué se acepta ahí. El registro es un
objeto plano que importan el cliente y el servidor, y eso es lo que hace que
las dos validaciones coincidan por construcción.

### Definir scopes

```ts
import { defineScopes, MB } from 'uploaderkit'

export const scopes = defineScopes({
	'user-avatar': {
		path: userId => `Users/${userId}/avatar`,
		visibility: 'public',
		accept: ['png', 'jpg', 'jpeg', 'webp'],
		maxBytes: 5 * MB,
		category: 'image',
		compress: { maxWidth: 512, quality: 0.8, stripExif: true },
	},
})
```

| Campo        | Significado                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`       | `(entityId, file) => string` — la key de almacenamiento. Tú controlas colisiones y forma de carpetas.                                                         |
| `visibility` | `'public'` (URL directa) o `'private'` (solo URL firmada con expiración).                                                                                     |
| `accept`     | Extensiones permitidas aquí. Más angosto que el preset de la categoría, nunca más ancho.                                                                      |
| `maxBytes`   | Tope duro. Se exportan los helpers `KB` / `MB` / `GB`.                                                                                                        |
| `category`   | `'image' \| 'pdf' \| 'document' \| 'data' \| 'video' \| 'audio' \| 'certificate' \| 'key' \| 'any'`. Elige el preset que decide si se leen los magic numbers. |
| `encrypt`    | Entrega los bytes al cipher de la app antes de que salgan del servidor.                                                                                       |
| `compress`   | Pipeline de imagen en el cliente: `maxWidth`, `maxHeight`, `quality`, `stripExif` (por defecto `true`).                                                       |
| `maxFiles`   | Cuántos archivos puede tener una entidad aquí. Default `1`; el uploader deriva `multiple` de esto.                                                            |
| `replace`    | Qué borra una subida. Derivado por default — ver [Replace](#replace--nunca-dejar-un-archivo-muerto).                                                          |
| `prefix`     | `(entityId) => string` — objetos que un replace `'entity'` puede borrar. Default: la carpeta de la key resuelta.                                              |
| `metadata`   | Etiquetas libres que se reenvían al provider cuando las soporta.                                                                                              |

`defineScopes` devuelve un `ScopeRegistry`: `names`, `get(name)`, `has(name)` y
`accept(name)` — este último es el string listo para `<input accept>`.

### Replace — nunca dejar un archivo muerto

El object storage no limpia solo. Un scope cuya key incluye el nombre del
archivo escribe un objeto NUEVO cada vez, así que re-subir un logo deja el
anterior pagando renta para siempre. `replace` decide eso, y su default se
deriva para que no haya prop que olvidar:

| El scope                                          | `replace` derivado | Por qué                                                        |
| ------------------------------------------------- | ------------------ | -------------------------------------------------------------- |
| `maxFiles: 1` (default), la key lleva `file.name` | `'entity'`         | Cada subida cae en una key nueva — hay que barrer la anterior. |
| `maxFiles: 1`, la key ignora `file.name`          | `'key'`            | La key es estable; el provider ya sobrescribe en su lugar.     |
| `maxFiles > 1`                                    | `'key'`            | Es una colección: los hermanos son el punto.                   |

Declararlo explícito solo sirve para salirse: `replace: false` conserva todas
las versiones.

El barrido `'entity'` corre **después** de un put exitoso y borra todo lo que
esté bajo el prefijo de la entidad y no sea la key nueva. Dos guardas evitan
que alcance de más, ambas al momento de `defineScopes`:

- `replace: 'entity'` junto con `maxFiles > 1` truena. Un scope no puede
  guardar una colección y borrarla en cada subida.
- Dos scopes cuyas carpetas se solapan truenan si alguno barre, así que subir
  un avatar nunca puede borrar los documentos del mismo usuario. Dale a cada
  uno su carpeta, o acota uno con `prefix`.

---

## Cliente

### `useUploader`

La máquina de estados headless: selección → validación → (compresión) → subida
con progreso y abort. No renderiza nada; tú renderizas `files` como la pantalla
lo necesite.

```tsx
import { useUploader } from 'uploaderkit/react'

const { files, accept, addFiles, upload, abort, isUploading, hasPending } =
	useUploader({
		scopes,
		scope: 'invoice-evidence',
		entityId: invoiceId,
		strategy,
		multiple: true,
		maxFiles: 3,
		uploadOn: 'manual', // el default — ver "Disparo de la subida"
		onUploadStart: files => setSending(true),
		onUploaded: stored => saveToDb(stored),
		onError: message => toast.error(message),
		retry: { attempts: 3, backoffMs: 500 },
		concurrency: 3,
	})

<input type='file' accept={accept} onChange={e => addFiles(e.target.files!)} />
```

Cada entrada de `files` es un `UploaderFile`:

| Campo      | Significado                                                              |
| ---------- | ------------------------------------------------------------------------ |
| `id`       | Id estable para la fila; también el argumento de `abort` y `removeFile`. |
| `file`     | El `File` tal como se seleccionó.                                        |
| `status`   | `'idle' \| 'uploading' \| 'success' \| 'error'`.                         |
| `progress` | 0–100 mientras sube, 100 al terminar.                                    |
| `error`    | Mensaje humano, de la validación o de la falla de la estrategia.         |
| `preview`  | Object URL para imágenes — miniatura local antes de subir.               |
| `stored`   | El `StoredFile` que confirmó el servidor.                                |

`upload()` manda todos los archivos que siguen en `idle` y resuelve con los
confirmados. `abort(id)` cancela una subida, `abort()` las cancela todas — un
archivo abortado vuelve a `idle`, no a `error`, para que el usuario reintente
sin limpiar nada. `hasPending` es `true` mientras algún archivo espera en
`idle` — la bandera que lee un botón de submit.

Omite `strategy` para selección y validación solo locales.

### Disparo de la subida — `select` vs `manual`

No toda pantalla quiere el mismo momento. El contrato lo hace explícito en vez
de fijar un solo comportamiento:

- **`uploadOn: 'select'`** — el archivo viaja en cuanto valida. Las pantallas
  de arrastrar / adjuntar y listo: evidencias, avatares, galerías. El
  `Uploader` con estilos usa este default.
- **`uploadOn: 'manual'`** (default del hook) — los archivos esperan en `idle`
  hasta que la app llama `upload()`. El flujo de formulario: todos los campos
  más el documento se confirman como una sola acción en el submit.

```tsx
const uploader = useUploader({ scopes, scope, entityId, strategy }) // manual

const onSubmit = async (event: FormEvent) => {
	event.preventDefault()
	if (!form.valid || !uploader.hasPending) return
	const stored = await uploader.upload() // dispara aquí, con el submit
	await saveRecord({ ...form.values, file: stored[0] })
}
```

A nivel de los componentes con estilos la elección es un contrato de tres —
`uploadOn: 'select' | 'submit' | 'manual'` — un modo por tipo de pantalla:

| Modo       | Quién manda                            | Úsalo para                                                                               |
| ---------- | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `'select'` | La zona, en cuanto aterriza un archivo | Avatares, reemplazos rápidos — el archivo ES la acción                                   |
| `'submit'` | El formulario, vía `controllerRef`     | Todo archivo que depende del resto de un form para tener sentido (documentos, catálogos) |
| `'manual'` | El botón propio de la zona             | Evidencias y flujos puntuales sin form alrededor — suelta ahora, manda cuando quieras    |

Prefiere `'submit'` siempre que el archivo pertenezca a un formulario que el
usuario puede abandonar. Un scope de key estable sobrescribe en cada put, así
que una subida que dispara al seleccionar **ya** cambió lo que la entidad
sirve — el logo de un cliente, la foto de un producto — aunque el operador le
dé Cancelar después. Diferir es lo que hace que "cancelar" signifique
cancelar. (`SlottedUploader` solo ofrece `'select'` y `'submit'`: no tiene
superficie de botón, así que un slot en espera bajo `'manual'` nunca podría
salir.)

El cableado de `'submit'`:

```tsx
const uploaderRef = useRef<UploaderController | null>(null)
const [staged, setStaged] = useState(false)

const onSubmit = async () => {
	if (uploaderRef.current?.hasPending) await uploaderRef.current.upload()
	await handleSubmit(save)() // lee los valores que la subida acaba de escribir
}

<Uploader
	{...props}
	uploadOn='submit'
	controllerRef={uploaderRef}
	onPendingChange={setStaged}
/>
<button disabled={!isDirty && !staged}>Guardar</button>
```

Dos detalles fáciles de equivocar:

- Vacía la cola **antes** de `handleSubmit(...)()`, no dentro del callback de
  submit. Una subida aterriza en el form vía `setValue`, y un callback que ya
  recibió su argumento `data` leería los valores de antes.
- `onPendingChange` es lo que le avisa al form que tiene trabajo sin mandar.
  Un archivo en espera nunca toca los campos, así que un botón de guardar
  condicionado solo a `isDirty` se queda deshabilitado en un formulario limpio
  al que el usuario acaba de soltarle un archivo.

Bajo `'submit'` la zona no renderiza botón de subida propio: dos formas de
mandar el mismo batch es una de más, y la del formulario es la que sabe si el
resto de los campos son válidos.

`onUploadStart(files)` se dispara cuando un batch sale de verdad — desde
cualquiera de los dos triggers — para que un formulario entre a su estado
"enviando" en el momento real, no en la selección.

### Reintentos y concurrencia

Ambos opt-in, ambos viviendo por completo dentro del hook:

```ts
retry: { attempts: 3, backoffMs: 500 }, // o el atajo: retry: 3
concurrency: 3,
```

- **`retry`** re-ejecuta una llamada fallida de la estrategia antes de mostrar
  el error, con backoff exponencial (`backoffMs`, luego ×2 por intento). Los
  aborts nunca se reintentan, y las fallas de validación nunca llegan a la
  estrategia. El progreso de la fila se reinicia entre intentos; el usuario
  solo ve un error cuando falla el último.
- **`concurrency`** limita cuántos archivos suben a la vez; el resto se
  encola. Treinta fotos en un móvil ya no son treinta XHR simultáneos.

### Renombrar a la entrada

`rename` reescribe el nombre de cada archivo antes de entrar a la máquina —
un folio, un input del cliente, un slug. Corre **antes de la validación** (un
rename que rompe la extensión se rechaza como cualquier archivo inválido), y
el `path` del scope lee el nombre nuevo al armar la key de almacenamiento:

```ts
useUploader({
	scopes,
	scope: 'invoice-evidence',
	entityId,
	strategy,
	rename: file => `${folio}-${file.name}`,
})
```

Los slots con nombre ya renombran a `{slot}.{ext}` — ese contrato sigue
siendo suyo.

### Estrategias de subida

Una estrategia es el transporte físico de un archivo. El hook es dueño del
estado, la estrategia es dueña de los bytes:

```ts
type UploadStrategy = (
	file: File,
	scope: string,
	entityId: string,
	options: { onProgress: (percent: number) => void; signal: AbortSignal }
) => Promise<StoredFile>
```

La de fábrica hace un POST multipart a
`POST {endpoint}/{scope}/{entityId}/upload`, que es exactamente lo que exponen
los adaptadores de framework de más abajo:

```ts
import { createXhrUploadStrategy } from 'uploaderkit/react'

const strategy = createXhrUploadStrategy({
	endpoint: `${apiUrl}/storage`,
	// Se evalúa por subida, así un JWT rotativo se lee al momento de mandar.
	headers: () => ({ Authorization: `Bearer ${getToken()}` }),
	fieldName: 'file',
	// Sesiones por cookie: la api responde en otro origen, así que el navegador
	// descarta la cookie de sesión salvo que la petición la pida.
	credentials: 'include',
})
```

Escribir la tuya es una sola función — PUT firmado directo al bucket, un
protocolo resumible, una cola. Abortar debe rechazar con un error llamado
`AbortError`; el hook mapea eso a `idle` en vez de `error`.

### Validación

Corre en el cliente para dar feedback y otra vez en el servidor por seguridad.
Tres chequeos, en orden: **extensión** contra el `accept` del scope, **tamaño**
contra `maxBytes`, y **magic numbers** — los primeros bytes del archivo, para
que un `.exe` renombrado a `.pdf` se rechace antes de viajar.

Los mensajes son en español y seguros de mostrar al usuario por diseño; la
falla aterriza en `files[i].error` y en `onError`.

### Compresión de imágenes

Cuando el scope declara `compress`, las imágenes se reescalan y reencodean en
un canvas antes de que la estrategia las vea:

```ts
compress: { maxWidth: 512, maxHeight: 512, quality: 0.8, stripExif: true }
```

El EXIF se pierde como efecto colateral inherente al reencode — las fotos de
cámara traen coordenadas GPS, y un bucket público es el peor lugar para eso. El
pipeline cae de vuelta al archivo original siempre que no puede ayudar, así que
nunca hace fallar una subida. `compressImage(file, options)` se exporta para
usos sueltos.

### Slots con nombre (`useSlottedUploader`)

Para formularios donde cada posición lleva exactamente un documento. Este hook
envuelve `useUploader` tal cual: solo decide **en qué slot** cae un archivo y lo
renombra a `{slot}.{ext}`, para que el `path` del scope dé una key estable y
resubir sobrescriba en su lugar.

```tsx
const { slots, accept, addFiles, addToSlot, removeSlot, abort, isUploading } =
	useSlottedUploader({
		scopes,
		scope: 'company-identity',
		entityId: companyId,
		strategy,
		slots: [
			{ id: 'letterhead', label: 'Hoja membretada', extensions: ['pdf'] },
			{ id: 'logo', label: 'Logo', extensions: ['png', 'svg'] },
		],
		value: slotFiles, // SlottedFile[] — la persistencia es tuya
		onChange: setSlotFiles,
		matchBy: 'extension', // o 'name', o un matcher propio en `match`
	})
```

Las subidas son **controladas**: `value`/`onChange` dejan la persistencia en
quien llama, y el hook mezcla las subidas que el padre todavía no absorbe, así
dos drops rápidos no pueden hacer que el estado controlado pierda uno.

`matchBy: 'extension'` (el default) prefiere un slot vacío, así soltar tres
archivos llena tres posiciones; `'name'` calza un archivo nombrado como su slot
(`letterhead-a4.pdf` → slot `letterhead-a4`). `slotOfStored` recupera el slot de
un archivo persistido cuando rehidratas desde la base de datos.

---

## Componentes de UI

Ambos componentes son pieles sobre los hooks — misma validación, compresión,
progreso y abort. Importa `uploaderkit/tailwind.css` una vez (ver
[Configuración de Tailwind v4](#configuración-de-tailwind-v4)).

### `Uploader`

Una zona de drop, uno o varios archivos dentro.

```tsx
import { Uploader } from 'uploaderkit/ui'

;<Uploader
	scopes={scopes}
	scope='invoice-evidence'
	entityId={invoiceId}
	strategy={strategy}
	multiple
	maxFiles={3}
	label='Evidencia'
	description='PDF o foto, hasta 8 MB'
	stored={saved} // ya persistidos, se renderizan arriba de la zona
	onRemoveStored={forget} // borrar en remoto sigue siendo decisión tuya
	confirmRemove // segundo paso en diálogo; o { title, message }
	onUploaded={persist}
	resolveViewUrl={file => api.signedUrl(file.key)}
	capture='environment' // móvil: abre la cámara trasera directo
/>
```

Acepta todas las opciones de `useUploader` más las props de presentación de
arriba, y pone `uploadOn` en `'select'` por defecto. `'manual'` le da a la
zona un botón de subida para los archivos que esperan; `'submit'` entrega el
envío a tu formulario a través de `controllerRef` (ver
[Disparo de la subida](#disparo-de-la-subida--select-vs-manual)).
`resolveViewUrl` vuelve a firmar un objeto privado justo antes de
previsualizarlo, para el caso en que la URL guardada ya expiró.

La zona también acepta un archivo **pegado** mientras tiene el foco (los
screenshots aterrizan como subidas), y `capture` hace que un dispositivo táctil
ofrezca su cámara en vez del picker. En un pointer coarse el prompt cambia al
copy de tap (`labels.tapPrompt`) con feedback de presión — un usuario de
celular nunca lee sobre arrastrar.

Perillas de presentación: `size='sm'` compacta la zona y todas las filas;
`icon` reemplaza el glifo de la zona con cualquier nodo (`icon={null}` lo
quita). Colores y radios salen de las variables del tema — ver
[Theming](#theming).

`shortcut='mod+u'` liga una tecla global (⌘U / Ctrl+U) que abre el picker y
renderiza un hint `kbd` pequeño dentro de la zona, para que el usuario lo
descubra. Nunca dispara mientras se escribe en un campo, y dos zonas con el
mismo combo avisan en desarrollo — con varios uploaders en pantalla, dale a
cada uno el suyo.

### `SlottedUploader`

Una fila de estado por slot más una zona de drop masiva cuyo matcher rutea cada
archivo:

```tsx
import { SlottedUploader } from 'uploaderkit/ui'

;<SlottedUploader
	scopes={scopes}
	scope='company-identity'
	entityId={companyId}
	strategy={strategy}
	title='Documentos de la empresa'
	slots={[
		{ id: 'letterhead', label: 'Hoja membretada', extensions: ['pdf'] },
		{
			id: 'logo',
			label: 'Logo',
			extensions: ['png', 'svg'],
			hint: 'Fondo transparente',
		},
	]}
	value={slotFiles}
	onChange={setSlotFiles}
	confirmRemove // diálogo antes de olvidar un slot lleno
	confirmReplace // diálogo que nombra ambos archivos antes de sobrescribir
	hideDropzone={false}
/>
```

`confirmReplace` intercepta el archivo elegido _después_ del pick — así el
diálogo puede nombrar lo que se va a perder y lo que lo reemplaza. Ambas props
aceptan `true` para la copia por defecto o `{ title, message }` para
sobrescribirla.

**Filas en espera.** Con `uploadOn: 'submit'` el archivo elegido no viaja:
descansa en su fila con miniatura, nombre y _listo para subir_, más Reemplazar y
Quitar, hasta que el formulario llama a `controllerRef.current.upload()`. El
punto de estado se pone ámbar para decirlo. El nombre que se muestra es el de
almacenamiento — el archivo se renombra a `{slot}.{ext}` antes de entrar a la
máquina, y es el que la entidad va a servir.

### Confirmaciones

Las acciones destructivas sobre archivos llevan un segundo paso: un diálogo
accesible (portal, foco atrapado, **el foco cae en cancelar** para que un
Enter perdido nunca destruya nada; Escape y el fondo cancelan).
`ConfirmDialog` se exporta para envolver tus propias acciones en la misma UX:

```tsx
import { ConfirmDialog } from 'uploaderkit/ui'

;<ConfirmDialog
	open={confirming}
	title='Eliminar expediente'
	message='Se borrarán también sus documentos.'
	variant='danger'
	onConfirm={destroy}
	onCancel={() => setConfirming(false)}
/>
```

### Vista previa (`FileViewer`)

Ambos uploaders integran el visor de pantalla completa; se exporta standalone
para cualquier pantalla que persista un `StoredFile`. Hace portal a `<body>`
(ningún stacking context ancestro puede atraparlo), atrapa el foco mientras
está abierto y lo restaura al cerrar, y bloquea el scroll de la página detrás.
Cuando `resolveUrl` falla — una firma expirada, una conexión caída — el visor
muestra un error con botón de reintento en vez de cargar por siempre. En
viewports angostos un PDF se renderiza como tarjeta de descarga en vez de un
frame embebido (iOS Safari congela los PDF embebidos).

Pasa `files` (la colección) junto a `file` (el que se clickeó) y el visor se
vuelve galería: flechas laterales, `←`/`→` en el teclado, contador `2 / 5` y —
en pointers finos — un pie que muestra los atajos (`Esc`, `←` `→`), para que
nadie tenga que adivinarlos:

```tsx
<FileViewer file={viendo} files={imagenesGuardadas} onClose={cerrar} />
```

Teclado: `Esc` cierra, `←`/`→` recorren la galería, `D` descarga y `O` abre el
archivo en pestaña — cada uno anunciado en el pie con pointers finos. Nunca se
reclama una tecla con modificador, así que `⌘D` sigue guardando en marcadores.

`renderError` reemplaza el panel de "no se pudo cargar" integrado. Recibe el
archivo que falló más un `retry` que vuelve a resolverlo, para que un panel
propio conserve la recuperación que da el default:

```tsx
<FileViewer
	file={viendo}
	onClose={cerrar}
	renderError={({ file, retry }) => (
		<MiPanelDeError name={file.fileName} onRetry={retry} />
	)}
/>
```

`useFileViewer` es dueño del estado abrir/cerrar que si no repetirías en cada
pantalla:

```tsx
const viewer = useFileViewer({ resolveUrl })

<button onClick={() => viewer.open(stored)}>Ver</button>
<FileViewer {...viewer.viewerProps} />
```

### Leer un archivo guardado

Un `<img>` o un `<iframe>` no pueden mandar header `Authorization`, así que un
objeto privado o cifrado nunca renderiza desde su url cruda. Dos helpers hacen
la lectura autenticada por ti — misma regla, dos formatos de salida:

```tsx
import {
	createBlobUrlResolver,
	createBytesResolver,
} from 'uploaderkit/react'

// Para el visor: hace fetch con los headers de la app y devuelve un object URL.
const resolveViewUrl = createBlobUrlResolver({
	baseUrl: apiUrl,
	headers: () => ({ Authorization: `Bearer ${getToken()}` }),
	credentials: 'include',
})

<Uploader {...props} resolveViewUrl={resolveViewUrl} />

// Para código que procesa el archivo en vez de mostrarlo.
const readBytes = createBytesResolver({ baseUrl: apiUrl, headers })
const pdf = await PDFDocument.load(await readBytes(stored.url))
```

La regla que comparten es de **origen, no de forma**: una url que sirve
`baseUrl` — relativa a la app, o absoluta en el mismo origen — es tuya y viaja
con tus headers y tus `credentials`; una en un origen **ajeno** ya es
alcanzable y se pide pelada, porque el token nunca debe ir a un host de
terceros. El `encryptedUrl` de tu servidor normalmente persiste una url
absoluta que apunta de vuelta a tu propia ruta `/view`: esa cuenta como tuya. Leer los bytes por tu propio endpoint es además
lo que le ahorra a un bucket público su propia política de CORS: un `<img>`
está exento de CORS, un `fetch` por bytes no.

`viewUrlFileName(url)` recupera el nombre visible de una url `/view?key=…`.

### Soltar para reemplazar

Una fila llena del `SlottedUploader` es en sí misma un drop target: arrastrar
un archivo encima la ilumina con la pill &ldquo;Suelta para reemplazar&rdquo;,
y el drop pasa por el mismo diálogo de `confirmReplace` que el botón. Una fila
vacía acepta el drop como llenado directo — sin pasar por el matcher de la
zona masiva.

### Labels — todo el copy es reemplazable

Todo el texto visible fluye por un solo objeto. El español es el default;
`EN_LABELS` viene listo, y cualquier override parcial gana sobre la base:

```tsx
import { EN_LABELS } from 'uploaderkit'

// toda la superficie en inglés
<Uploader {...props} labels={EN_LABELS} />

// o reescribe un solo string
<Uploader {...props} labels={{ dropPrompt: 'Suelta aquí tu factura' }} />
```

Los hooks aceptan la misma opción `labels`, que cubre los mensajes que emiten
(formato no permitido en el slot, archivo sin slot, el fallback de subida
fallida). Ver `UploaderLabels` para la lista completa de keys.

### Theming

La capa con estilos lee variables CSS `--color-ui-*` / `--radius-ui*`,
declaradas con defaults en `tailwind.css`. Una app re-brandea toda la capa
con estilos con un solo override:

```css
:root {
	--color-ui-primary: #c41e3a;
	--color-ui-primary-hover: #8b1529;
	--radius-ui: 0.25rem;
}
```

El override escopa como cualquier variable CSS: ponlo en un `div` wrapper para
re-brandear un solo uploader en vez de toda la app.

El motion viene con los componentes: las filas animan al entrar
(`--animate-ui-fade-in`), el visor y el diálogo
de confirmación hacen fade/scale al entrar y salir, el drag levanta la zona y
la presión la comprime, y el indicador del slot pulsa mientras sube. Todo es
CSS — nada que configurar, y sobreescribible desde la app para
`prefers-reduced-motion`.

`Dropzone`, `FileItem` y `FileViewer` se exportan por separado para armar otro
acomodo con las mismas piezas.

### Headless por completo

Una app con su propio design system usa `/react` directo y no pierde nada — la
validación, la compresión, el progreso, el abort y el ruteo de slots viven en
los hooks. `/ui` existe para que una pantalla que no necesita markup propio no
tenga que escribirlo.

---

## Servidor

### `createStorage`

El lado servidor del contrato: vuelve a correr la misma validación que corrió
el navegador, cifra lo que el scope declare, y habla con un `StorageProvider`.

```ts
import { createStorage } from 'uploaderkit/server'
import { createGcsProvider } from 'uploaderkit/adapters/gcs'

const storage = createStorage({
	scopes,
	provider: createGcsProvider({ publicBucket, privateBucket }),
	crypto: { encrypt, decrypt }, // requerido si algún scope declara `encrypt`
	signedUrlTtl: 300, // segundos
})
```

| Método                                           | Responde                                                        |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `upload({ scope, entityId, file, uploadedBy })`  | Un `UploadResult`: el `StoredFile` a persistir, más `replaced`. |
| `read({ scope, key })`                           | Bytes crudos, descifrados cuando el scope está cifrado.         |
| `remove({ scope, key })`                         | `true` cuando el objeto existía.                                |
| `signedUrl({ scope, key, download, expiresIn })` | Una URL fresca con expiración. Lanza en scopes públicos.        |
| `list(prefix)`                                   | `{ key, size }[]`.                                              |

La construcción es defensiva: un scope privado sobre un provider que no puede
firmar, o un scope cifrado sin `crypto`, lanza un `ScopeError` **antes de la
primera petición** — mientras el deploy todavía puede fallar en voz alta.

#### Qué reemplazó una subida

`upload()` responde un `UploadResult` — un `StoredFile` más las keys que el
barrido eliminó:

```ts
const { key, url, replaced } = await storage.upload({ scope, entityId, file })

// El bucket ya no las tiene. Lo que persististe también debe olvidarlas, o tu
// UI sigue renderizando objetos que ya no existen.
await db.files.deleteMany({ key: { $in: replaced } })
```

`replaced` viene vacío salvo que el scope resuelva a un replace `'entity'`, y
solo lista lo que el provider confirmó borrado. El barrido corre **después** de
un put exitoso — un fallo entre los dos dejaría a la entidad sin nada — y un
delete que falla se traga: la subida que pidió quien llama sí ocurrió, y un
objeto huérfano no vale fallarla.

La `url` de un objeto público lleva una huella corta `?v=` de su contenido, así
un scope de key estable (un avatar) deja de servir la imagen anterior desde un
CDN o la caché del navegador después de sobrescribir.

### Express

Formas estructurales de request/response en vez de los tipos de Express, para
que el paquete no cargue dependencias y cualquier app de Express 4/5 las
cumpla. La app conserva la propiedad de multer:

```ts
import { createExpressStorageHandlers } from 'uploaderkit/server/express'

const handlers = createExpressStorageHandlers(storage, {
	authorize: async req => (req.user ? { userId: req.user.id } : null),
})

const upload = multer({ storage: multer.memoryStorage() })
router.post(
	'/:scope/:entityId/upload',
	useAuth,
	upload.single('file'),
	handlers.upload
)
router.delete('/:scope/:entityId', useAuth, handlers.remove)
router.get('/:scope/:entityId/signed-url', useAuth, handlers.signedUrl)
```

`authorize` devuelve el usuario que actúa (o `{}` para "permitido") para seguir,
o `null` para responder 401.

### Next.js App Router

La misma superficie sobre la Fetch API:

```ts
// app/api/storage/[scope]/[entityId]/upload/route.ts
import { createNextStorageHandlers } from 'uploaderkit/server/next'

const handlers = createNextStorageHandlers(storage, {
	authorize: async request => {
		const session = await auth(request)
		return session ? { userId: session.userId } : null
	},
})

export const POST = handlers.upload
```

Omitir `authorize` deja el router **abierto** — solo aceptable detrás de un
proxy autenticado.

### Cifrado

Un scope cifrado necesita **dos** cosas cableadas, y `createStorage` lanza al
arrancar si falta cualquiera: el cipher y `encryptedUrl`.

```ts
const storage = createStorage({
	scopes,
	provider,
	crypto,
	// Dónde puede LEER un cliente un objeto cifrado. El bucket guarda
	// ciphertext, así que una URL firmada serviría basura — esto tiene que
	// apuntar a tu ruta autenticada de view, que descifra a la salida.
	encryptedUrl: ({ scope, entityId, key }) =>
		`/api/storage/${scope}/${entityId}/view?key=${encodeURIComponent(key)}`,
})
```

El `StoredFile.url` de esos scopes es esa ruta, así un `<img>` o el
`FileViewer` renderizan el archivo real. Ambos adaptadores de framework
exponen la ruta como `handlers.view`, respondiendo los bytes descifrados con
`Cache-Control: private, no-store` — el contenido descifrado nunca debe caer
en un caché compartido:

```ts
// Express
router.get('/:scope/:entityId/view', useAuth, handlers.view)

// Next App Router — app/api/storage/[scope]/[entityId]/view/route.ts
export const GET = handlers.view
```

No se impone ningún cipher: un scope declara `encrypt: true` y la app inyecta
los `CryptoHooks`. `createAesGcmCrypto` es la implementación de referencia
(AES-256-GCM, layout `[iv 12][tag 16][ciphertext]`) para que no la escribas a
mano:

```ts
import { createAesGcmCrypto } from 'uploaderkit/server'

const crypto = createAesGcmCrypto(process.env.STORAGE_KEY!) // openssl rand -hex 32
```

La llave debe ser exactamente 64 caracteres hex (32 bytes) — sin derivación
desde passphrase a propósito, porque derivar dejaría a dos instancias corriendo
un secreto "casi igual" y produciendo archivos mutuamente ilegibles en
silencio.

Los objetos cifrados se guardan como `application/octet-stream`, así nada
intenta renderizar texto cifrado; `read()` descifra a la salida.

---

## Providers de almacenamiento

Un provider es la traducción delgada hacia un bucket. Los tres implementan el
mismo contrato, así que cambiar de uno a otro nunca toca los scopes ni el
servicio.

```ts
// Google Cloud Storage — dos buckets: activos públicos, documentos privados
import { createGcsProvider } from 'uploaderkit/adapters/gcs'

const provider = createGcsProvider({
	publicBucket,
	privateBucket,
	publicUrl: (bucket, key) => `https://cdn.example.com/${key}`,
})
```

```ts
// Compatible con S3 — AWS, Cloudflare R2, Backblaze B2, MinIO, Wasabi
import { createS3Provider } from 'uploaderkit/adapters/s3'

const provider = createS3Provider({
	client, // un S3Client de @aws-sdk/client-s3; entre backends solo cambian endpoint/credenciales
	bucket: 'uploads',
	publicUrl: key => `https://cdn.example.com/${key}`,
})
```

```ts
// Pruebas y desarrollo local
import { createMemoryProvider } from 'uploaderkit/adapters/memory'

const provider = createMemoryProvider() // las URLs firmadas son falsas pero cargan la expiración
```

El bucket de S3 se trata como privado y `publicUrl` mapea las keys que expone
un CDN o un dominio público — los buckets modernos bloquean las ACL por objeto,
así que el adaptador no puede inventarse una URL pública estable. Ambos SDK son
peers opcionales: importar un adaptador sin su SDK instalado falla solo para la
app que eligió ese backend.

---

## Feedback para el desarrollador

Dos niveles, para que una config rota aparezca donde todavía se puede arreglar:

- **`ScopeError` — lanzado, de inmediato.** Configs que nunca pueden funcionar:
  un scope malformado, un nombre de scope inexistente, ids de slot duplicados,
  un scope privado sobre un provider que no firma, un scope cifrado sin
  `CryptoHooks`. Fallan al importar o al arrancar, nunca frente a un usuario.
  Los adaptadores de framework lo relanzan en vez de serializarlo al cliente.
- **Avisos de desarrollo — una vez por caso.** Configs que corren pero
  probablemente no son lo que querías: llamar `upload()` sin estrategia, soltar
  varios archivos en modo single, un slot que acepta extensiones que su scope
  rechaza. Van con el prefijo `[uploaderkit]`, callan en producción, y nunca
  condicionan el comportamiento.

Las fallas a nivel petición son una tercera familia aparte:
`StorageRequestError` carga un status HTTP y un mensaje en español seguro de
mostrar, que los adaptadores de framework convierten a JSON.

---

## Subpath exports

| Ruta de importación           | Contenido                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uploaderkit`                 | `defineScopes`, `validateForScope`, `resolveKey`, `toAcceptAttribute`, `formatFileSize`, `KB`/`MB`/`GB`, `ScopeError`, `DEFAULT_LABELS`/`EN_LABELS`, tipos |
| `uploaderkit/react`           | `useUploader`, `useSlottedUploader`, `createXhrUploadStrategy`, `compressImage`, matchers de slot, tipos                                                   |
| `uploaderkit/ui`              | `Uploader`, `SlottedUploader`, `Dropzone`, `FileItem`, `FileViewer`, `ConfirmDialog`, `cn`                                                                 |
| `uploaderkit/server`          | `createStorage`, `createAesGcmCrypto`, `StorageRequestError`, tipos                                                                                        |
| `uploaderkit/server/express`  | `createExpressStorageHandlers` — handlers estructurales para una app de Express que es dueña de multer                                                     |
| `uploaderkit/server/next`     | `createNextStorageHandlers` — handlers de App Router sobre la Fetch API                                                                                    |
| `uploaderkit/adapters/gcs`    | `createGcsProvider` — Google Cloud Storage de dos buckets (peer opcional)                                                                                  |
| `uploaderkit/adapters/s3`     | `createS3Provider` — AWS, R2, B2, MinIO, Wasabi (peers opcionales)                                                                                         |
| `uploaderkit/adapters/memory` | `createMemoryProvider` — pruebas y desarrollo local                                                                                                        |
| `uploaderkit/tailwind.css`    | Registro de fuente Tailwind v4 para las clases de `/ui`                                                                                                    |

---

## Licencia

MIT © Ricardo Tapia
