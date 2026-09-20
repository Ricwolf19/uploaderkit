<div align="center">

# uploaderkit

**File uploads for React and Node, from one shared contract.**  
Scopes both sides validate against, a headless uploader with progress / abort / compression, and a server storage service with pluggable providers.

[![npm](https://img.shields.io/npm/v/uploaderkit.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/uploaderkit)
[![downloads](https://img.shields.io/npm/dm/uploaderkit.svg?color=cb3837)](https://www.npmjs.com/package/uploaderkit)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-%5E18%20%7C%7C%20%5E19-61dafb.svg)](https://react.dev/)
[![Tailwind](https://img.shields.io/badge/tailwindcss-v4-38bdf8.svg)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)](https://www.typescriptlang.org/)

**[Documentation](https://thekits.dev/uploaderkit)** · **[Playground](https://thekits.dev/uploaderkit/playground)** · **[Releases](https://thekits.dev/uploaderkit/releases)** · **[npm](https://www.npmjs.com/package/uploaderkit)**

**English** · [Español](./README.es.md)

</div>

---

## Table of Contents

Every section below is also a searchable page on [thekits.dev](https://thekits.dev/uploaderkit), in English and Spanish.

| Docs page                                                                     | Covers                                                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [Overview](https://thekits.dev/uploaderkit)                                   | Features                                                                                                              |
| [Getting started](https://thekits.dev/uploaderkit/docs/getting-started)       | Quick Start, Installation, Tailwind v4 Setup                                                                          |
| [Scopes — the contract](https://thekits.dev/uploaderkit/docs/scopes)          | Scopes — the contract, Defining scopes, Replace — never leave a dead file                                             |
| [Client](https://thekits.dev/uploaderkit/docs/client)                         | Client, `useUploader`, Upload trigger — `select` vs `manual`, Retry and concurrency, Renaming on the way in, and more |
| [UI components](https://thekits.dev/uploaderkit/docs/ui-components)           | UI components, `Uploader`, `SlottedUploader`, Confirmations, File preview (`FileViewer`), and more                    |
| [Theming and labels](https://thekits.dev/uploaderkit/docs/theming-and-labels) | Labels — every string is replaceable, The copy reaches further than the components, Theming                           |
| [Presets](https://thekits.dev/uploaderkit/docs/presets)                       | Presets                                                                                                               |
| [Server](https://thekits.dev/uploaderkit/docs/server)                         | Server, `createStorage`, What an upload replaced, Streaming reads, Express, and more                                  |
| [Storage providers](https://thekits.dev/uploaderkit/docs/storage-providers)   | Storage providers                                                                                                     |
| [Reference](https://thekits.dev/uploaderkit/docs/reference)                   | Developer feedback, Subpath Exports, License                                                                          |

**In this file**

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Tailwind v4 Setup](#tailwind-v4-setup)
- [Scopes — the contract](#scopes--the-contract)
  - [Defining scopes](#defining-scopes)
  - [Replace — never leave a dead file](#replace--never-leave-a-dead-file)
- [Client](#client)
  - [`useUploader`](#useuploader)
  - [Upload trigger — `select` vs `manual`](#upload-trigger--select-vs-manual)
  - [Retry and concurrency](#retry-and-concurrency)
  - [Renaming on the way in](#renaming-on-the-way-in)
  - [Safe file names](#safe-file-names)
  - [Upload strategies](#upload-strategies)
  - [Validation](#validation)
  - [Image compression](#image-compression)
  - [Named slots (`useSlottedUploader`)](#named-slots-useslotteduploader)
- [UI components](#ui-components)
  - [`Uploader`](#uploader)
  - [`SlottedUploader`](#slotteduploader)
  - [Confirmations](#confirmations)
  - [File preview (`FileViewer`)](#file-preview-fileviewer)
  - [Reading a stored file](#reading-a-stored-file)
  - [Drop to replace](#drop-to-replace)
  - [Labels — every string is replaceable](#labels--every-string-is-replaceable)
  - [Theming](#theming)
  - [Going fully headless](#going-fully-headless)
- [Presets](#presets)
- [Server](#server)
  - [`createStorage`](#createstorage)
  - [Express](#express)
  - [Next.js App Router](#nextjs-app-router)
  - [Encryption](#encryption)
- [Storage providers](#storage-providers)
- [Developer feedback](#developer-feedback)
- [Subpath Exports](#subpath-exports)
- [License](#license)

---

## Features

- **One contract, both sides** — a scope registry declares where a file lands, who may read it, what is accepted and how big it may be. The browser and the server validate against the same object, so a rejection is never a surprise at the end of a 40 MB upload.
- **Headless first** — `useUploader` owns selection, validation, compression, per-file progress, abort and error state; it renders nothing. `/ui` is an opt-in skin over it, so an app with its own design system loses no behavior by skipping it.
- **Client-side validation before the first byte** — extension, size and magic numbers, so an `.exe` renamed to `.pdf` never leaves the machine.
- **Real upload progress** — the default strategy is XHR because `fetch` still has no usable upload progress in browsers. Every in-flight upload is abortable, per file or all at once.
- **Image compression in the scope** — declare `compress` and images are downscaled and re-encoded before travelling. EXIF (GPS, camera) drops in the process.
- **Pluggable transport** — the `UploadStrategy` is a single function `(file, scope, entityId, { onProgress, signal })`. Swap the endpoint, the auth header or the whole protocol without touching hook state.
- **Server storage service** — `createStorage` re-runs the same validation, encrypts the scopes that ask for it, and answers signed expiring URLs for private objects.
- **Boot-time guards** — a private scope on a provider that cannot sign, or an encrypted scope without an injected cipher, throws at construction. Deploys fail loudly instead of 500ing on the first upload.
- **Framework adapters** — structural handlers for Express (the app owns multer) and for the Next.js App Router (native `Request`/`Response`). No framework dependency is pulled in.
- **Provider adapters** — Google Cloud Storage (two-bucket layout), any S3-compatible backend (AWS, Cloudflare R2, Backblaze B2, MinIO, Wasabi) and an in-memory provider for tests. All optional peers: choosing GCS never installs the AWS SDK.
- **Named slots** — `SlottedUploader` fills one file per named position (letterhead, ID, tax certificate); a bulk drop routes each file to its slot and renames it so re-uploads overwrite in place.
- **No cipher shipped by default** — private scopes declare `encrypt: true` and the app injects `CryptoHooks`. `createAesGcmCrypto` is available as a reference implementation.
- **You choose when the upload fires** — `uploadOn: 'select'` sends as soon as a valid file lands; `'manual'` holds files until `upload()` — the form-submit flow, reachable from the styled components through `controllerRef`. `onUploadStart` announces the moment a batch leaves.
- **Retry with backoff + concurrency cap** — opt-in resilience for flaky networks: transient strategy failures retry behind exponential backoff, and large batches queue behind a concurrency limit.
- **Confirmation dialogs built in** — `confirmRemove` / `confirmReplace` gate destructive file actions behind an accessible dialog (focus lands on cancel), and `ConfirmDialog` is exported for app-level use.
- **Paste and camera capture** — a focused dropzone accepts a pasted screenshot, and `capture` opens the mobile camera directly.
- **Translatable copy** — every user-facing string flows through a labels object, on the client AND on the server. English by default, `ES_LABELS` included, any language via a partial override.
- **Rebrandable theme** — the styled layer reads `--color-ui-*` CSS variables so one `:root` override rebrands the whole styled layer.
- **Sizes, icons and motion** — `size='sm' | 'md'` compacts every row and zone, `icon` swaps (or removes) the dropzone glyph, and the whole surface animates: rows fade in, the drag state scales the zone, overlays enter and exit with a transition, the uploading indicator pulses.
- **Touch-first by default** — on coarse pointers the zone reads as a tap target ("Toca para elegir un archivo") with press feedback instead of advertising a drag nobody can do; `capture` opens the camera directly.

---

## Quick Start

```bash
pnpm add uploaderkit react react-dom
```

```ts
// scopes.ts — imported by the client AND the server
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
// client
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
// server
import { createStorage } from 'uploaderkit/server'
import { createMemoryProvider } from 'uploaderkit/adapters/memory'

export const storage = createStorage({
	scopes,
	provider: createMemoryProvider(),
	crypto: { encrypt, decrypt },
})
```

---

## Installation

```bash
pnpm add uploaderkit
# peer, only if you use /react or /ui
pnpm add react react-dom
```

Optional peers — install only the provider you use:

```bash
pnpm add @google-cloud/storage                            # /adapters/gcs
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner # /adapters/s3
```

The server entry points depend on nothing but this package: the Express adapter
matches Express 4 and 5 structurally and the Next.js one uses the Fetch API.

---

## Tailwind v4 Setup

Only needed for `/ui`. Register the package's classes once so Tailwind
generates them:

```css
/* app/globals.css */
@import 'tailwindcss';
@import 'uploaderkit/tailwind.css';
```

The hooks in `/react` carry no styles, so a headless app skips this entirely.

---

## Scopes — the contract

A **scope** is a named destination: the single source of truth for where a file
lands, who may read it, and what is accepted there. The registry is a plain
object the client and the server both import, which is what makes the two
validations agree by construction.

### Defining scopes

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

| Field        | Meaning                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `path`       | `(entityId, file) => string` — the storage key. You own collisions and folder shape.                                                                               |
| `visibility` | `'public'` (direct URL) or `'private'` (signed expiring URL only).                                                                                                 |
| `accept`     | Extensions allowed here. Narrower than the category preset, never wider.                                                                                           |
| `maxBytes`   | Hard ceiling. `KB` / `MB` / `GB` helpers are exported.                                                                                                             |
| `category`   | `'image' \| 'pdf' \| 'document' \| 'data' \| 'video' \| 'audio' \| 'certificate' \| 'key' \| 'any'`. Picks the preset that decides whether magic numbers are read. |
| `encrypt`    | Hand the bytes to the app's cipher before they leave the server.                                                                                                   |
| `compress`   | Client-side image pipeline: `maxWidth`, `maxHeight`, `quality`, `stripExif` (default `true`).                                                                      |
| `maxFiles`   | How many files one entity may hold here. Default `1`. The uploader derives `multiple` from it.                                                                     |
| `replace`    | What an upload removes. Derived by default — see [Replace](#replace--never-leave-a-dead-file).                                                                     |
| `prefix`     | `(entityId) => string` — objects an `'entity'` replace may delete. Defaults to the folder of the resolved key.                                                     |
| `metadata`   | Free-form tags forwarded to the provider when it supports them.                                                                                                    |

### Replace — never leave a dead file

Object storage does not clean up after itself. A scope whose key carries the
file name writes a NEW object every time, so re-uploading a logo leaves the
previous one paying rent forever. `replace` is what decides that, and its
default is derived so there is no prop to forget:

| The scope                                        | Derived `replace` | Why                                                             |
| ------------------------------------------------ | ----------------- | --------------------------------------------------------------- |
| `maxFiles: 1` (default), key carries `file.name` | `'entity'`        | Every upload lands on a new key — the old object must be swept. |
| `maxFiles: 1`, key ignores `file.name`           | `'key'`           | The key is stable, so the provider overwrites in place already. |
| `maxFiles > 1`                                   | `'key'`           | A collection: siblings are the point.                           |

Declare it explicitly only to opt out — `replace: false` keeps every version.

The `'entity'` sweep runs **after** a successful put and deletes everything
under the entity's prefix that is not the new key. Two guards keep it from
reaching too far, both at `defineScopes` time:

- `replace: 'entity'` together with `maxFiles > 1` throws. A scope cannot hold
  a collection and erase it on every upload.
- Two scopes whose folders overlap throw when either sweeps, so an avatar
  upload can never delete the same user's documents. Give each its own folder,
  or narrow one with `prefix`.

```ts
defineScopes({
	// One file, swept: uploading `new.png` deletes `old.png`.
	logo: { path: (id, file) => `Companies/${id}/logo/${file.name}` /* … */ },

	// A collection: `maxFiles` alone switches the semantics.
	expediente: {
		path: (id, file) => `Companies/${id}/docs/${file.name}`,
		maxFiles: 10 /* … */,
	},

	// Keeps every version on purpose.
	audit: {
		path: (id, file) => `Companies/${id}/audit/${file.name}`,
		replace: false /* … */,
	},
})
```

`defineScopes` returns a `ScopeRegistry`: `names`, `get(name)`, `has(name)` and
`accept(name)` — the last one being the ready-made string for `<input accept>`.

---

## Client

### `useUploader`

The headless state machine: selection → validation → (compression) → upload
with progress and abort. It renders nothing; you render `files` however the
screen needs.

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
		uploadOn: 'manual', // the default — see "Upload trigger" below
		onUploadStart: files => setSending(true),
		onUploaded: stored => saveToDb(stored),
		onError: message => toast.error(message),
		retry: { attempts: 3, backoffMs: 500 },
		concurrency: 3,
	})

<input type='file' accept={accept} onChange={e => addFiles(e.target.files!)} />
```

Each entry of `files` is an `UploaderFile`:

| Field      | Meaning                                                               |
| ---------- | --------------------------------------------------------------------- |
| `id`       | Stable id for the row; also the argument to `abort` and `removeFile`. |
| `file`     | The `File` as selected.                                               |
| `status`   | `'idle' \| 'uploading' \| 'success' \| 'error'`.                      |
| `progress` | 0–100 while uploading, 100 on success.                                |
| `error`    | Human message, from validation or the strategy's failure.             |
| `preview`  | Object URL for images — a local thumbnail before uploading.           |
| `stored`   | The `StoredFile` the server confirmed.                                |

`upload()` sends every file still `idle` and resolves with the confirmed ones.
`abort(id)` cancels one upload, `abort()` cancels all — an aborted file returns
to `idle`, not `error`, so the user can retry without clearing anything.
`hasPending` is `true` while any file waits in `idle` — the flag a submit
button reads.

Omit `strategy` for local-only selection plus validation.

### Upload trigger — `select` vs `manual`

Not every screen wants the same moment. The contract makes it explicit instead
of fixing one behavior:

- **`uploadOn: 'select'`** — the file travels the moment it validates. The
  drag-and-drop / attach-and-go screens: evidence, avatars, galleries. The
  styled `Uploader` defaults to this.
- **`uploadOn: 'manual'`** (hook default) — files wait in `idle` until the app
  calls `upload()`. The form flow: every field plus the document commit as one
  action on submit.

```tsx
const uploader = useUploader({ scopes, scope, entityId, strategy }) // manual

const onSubmit = async (event: FormEvent) => {
	event.preventDefault()
	if (!form.valid || !uploader.hasPending) return
	const stored = await uploader.upload() // fires here, with the submit
	await saveRecord({ ...form.values, file: stored[0] })
}
```

`onUploadStart(files)` fires when a batch actually leaves — from either
trigger — so a form can flip into its "sending" state at the true moment, not
at selection.

At the styled-component level the choice is a three-way contract —
`uploadOn: 'select' | 'submit' | 'manual'` — one mode per kind of screen:

| Mode       | Who sends                         | Use it for                                                                       |
| ---------- | --------------------------------- | -------------------------------------------------------------------------------- |
| `'select'` | The zone, the moment a file lands | Avatars, quick replacements — the file IS the action                             |
| `'submit'` | The form, via `controllerRef`     | Any file that depends on the rest of a form to make sense (documents, catalogs)  |
| `'manual'` | The zone's own upload button      | Evidence and punctual flows with no form around them — drop now, send when ready |

Prefer `'submit'` whenever the file belongs to a form the user can abandon.
A scope with a stable key overwrites on every put, so an upload that fires on
selection has **already** changed what the entity serves — a customer's logo, a
product photo — even if the operator then hits Cancel. Deferring is what makes
"cancel" mean cancel. (`SlottedUploader` offers `'select'` and `'submit'` only:
it has no button surface, so `'manual'` staged slots could never leave.)

The `'submit'` wiring:

```tsx
const uploaderRef = useRef<UploaderController | null>(null)
const [staged, setStaged] = useState(false)

const onSubmit = async () => {
	if (uploaderRef.current?.hasPending) await uploaderRef.current.upload()
	await handleSubmit(save)() // reads the values the upload just wrote
}

<Uploader
	{...props}
	uploadOn='submit'
	controllerRef={uploaderRef}
	onPendingChange={setStaged}
/>
<button disabled={!isDirty && !staged}>Guardar</button>
```

Two details that are easy to get wrong:

- Flush **before** `handleSubmit(...)()`, not inside the submit callback. An
  upload settles into the form through `setValue`, and a callback that already
  received its `data` argument would read the values from before it.
- `onPendingChange` is what tells the form it has unsent work. A staged file
  never touches the fields, so a save button gated on `isDirty` alone stays
  disabled on a pristine form the user just dropped a file into.

Under `'submit'` the zone renders no upload button of its own: two ways to
send the same batch is one too many, and the form's is the one that knows
whether the rest of the fields are valid.

### Retry and concurrency

Both opt-in, both living entirely inside the hook:

```ts
retry: { attempts: 3, backoffMs: 500 }, // or shorthand: retry: 3
concurrency: 3,
```

- **`retry`** re-runs a failed strategy call before surfacing the error, with
  exponential backoff (`backoffMs`, then ×2 each further attempt). Aborts never
  retry, and validation failures never reach the strategy at all. The row's
  progress resets between attempts; the user only sees an error when the last
  attempt fails.
- **`concurrency`** caps how many files upload at once; the rest queue. Thirty
  photos on mobile no longer means thirty simultaneous XHRs.

### Renaming on the way in

`rename` rewrites each file's name before it enters the machine — a folio, a
client-side input, a slug. It runs **before validation** (a rename that breaks
the extension is rejected like any invalid file), and the scope's `path`
reads the new name when it builds the storage key:

```ts
useUploader({
	scopes,
	scope: 'invoice-evidence',
	entityId,
	strategy,
	rename: file => `${folio}-${file.name}`,
})
```

Named slots already rename to `{slot}.{ext}` — that contract stays theirs.

### Safe file names

`sanitizeFileName` turns a user's file name into a safe key segment — ASCII,
lower case, one extension, no path syntax. Call it **inside** your scope's
`path()`, so client and server derive the same key:

```ts
path: (id, file) => `Docs/${id}/${sanitizeFileName(file.name)}`
```

The traversal guard behind `resolveKey` judges by path segment, not by
substring: `Screenshot … 4.18.54 p.m..png` carries `..` without ever being
traversal, and a macOS screenshot is the common case, not a corner one. The
guard is the backstop; the sanitizer is the fix.

### Upload strategies

A strategy is the physical transport for one file. The hook owns state, the
strategy owns bytes:

```ts
type UploadStrategy = (
	file: File,
	scope: string,
	entityId: string,
	options: { onProgress: (percent: number) => void; signal: AbortSignal }
) => Promise<StoredFile>
```

The default one posts multipart to `POST {endpoint}/{scope}/{entityId}/upload`,
which is exactly what the framework adapters below expose:

```ts
import { createXhrUploadStrategy } from 'uploaderkit/react'

const strategy = createXhrUploadStrategy({
	endpoint: `${apiUrl}/storage`,
	// Evaluated per upload, so a rotating JWT is read at send time.
	headers: () => ({ Authorization: `Bearer ${getToken()}` }),
	fieldName: 'file',
	// Cookie sessions: the api answers on another origin, so the browser drops
	// the session cookie unless the request asks for it.
	credentials: 'include',
})
```

Writing your own is one function — direct-to-bucket signed PUT, a resumable
protocol, a queue. Aborting must reject with an error named `AbortError`; the
hook maps that to `idle` instead of `error`.

### Validation

Runs on the client for feedback and again on the server for safety. Three
checks, in order: **extension** against the scope's `accept`, **size** against
`maxBytes`, and **magic numbers** — the leading bytes of the file, so an `.exe`
renamed to `.pdf` is rejected before it travels.

Messages are Spanish and user-safe by design; the failure lands in
`files[i].error` and in `onError`.

### Image compression

When the scope declares `compress`, images are downscaled and re-encoded on a
canvas before the strategy sees them:

```ts
compress: { maxWidth: 512, maxHeight: 512, quality: 0.8, stripExif: true }
```

EXIF is dropped as an inherent side effect of the re-encode — camera photos
carry GPS coordinates, and a public bucket is the wrong place for them. The
pipeline falls back to the original file whenever it cannot help, so it never
fails an upload. `compressImage(file, options)` is exported for one-off use.

### Named slots (`useSlottedUploader`)

For forms where each position takes exactly one document. This hook wraps
`useUploader` verbatim: it only decides **which slot** a file fills and renames
it to `{slot}.{ext}`, so the scope's `path` yields a stable key and a re-upload
overwrites in place.

```tsx
const { slots, accept, addFiles, addToSlot, removeSlot, abort, isUploading } =
	useSlottedUploader({
		scopes,
		scope: 'company-identity',
		entityId: companyId,
		strategy,
		slots: [
			{ id: 'letterhead', label: 'Letterhead', extensions: ['pdf'] },
			{ id: 'logo', label: 'Logo', extensions: ['png', 'svg'] },
		],
		value: slotFiles, // SlottedFile[] — you own persistence
		onChange: setSlotFiles,
		matchBy: 'extension', // or 'name', or a custom `match` matcher
	})
```

Uploads are **controlled**: `value`/`onChange` keep persistence in the caller,
and the hook merges uploads the parent has not absorbed yet, so two quick drops
cannot race the controlled state into losing one.

`matchBy: 'extension'` (the default) prefers an empty slot, so dropping three
files fills three positions; `'name'` matches a file named after its slot
(`letterhead-a4.pdf` → slot `letterhead-a4`). `slotOfStored` recovers the slot
of a persisted file when you rehydrate from the database.

---

## UI components

Both components are skins over the hooks — same validation, compression,
progress and abort. Import `uploaderkit/tailwind.css` once (see
[Tailwind v4 Setup](#tailwind-v4-setup)).

### `Uploader`

One dropzone, one or many files in it.

```tsx
import { Uploader } from 'uploaderkit/ui'

;<Uploader
	scopes={scopes}
	scope='invoice-evidence'
	entityId={invoiceId}
	strategy={strategy}
	multiple
	maxFiles={3}
	label='Evidence'
	description='PDF or photo, up to 8 MB'
	stored={saved} // already persisted, rendered on the filesPosition side
	filesPosition='below' // keep the drop target from sliding down the page
	onRemoveStored={forget} // delete from storage here — see Removal below
	confirmRemove // gate it behind a dialog; or { title, message }
	onUploaded={persist}
	resolveViewUrl={file => api.signedUrl(file.key)}
	capture='environment' // mobile: open the rear camera directly
/>
```

It accepts every `useUploader` option plus the presentation props above, and
defaults `uploadOn` to `'select'`. `'manual'` gives the zone an upload button
for the files still waiting; `'submit'` hands the send to your form through
`controllerRef` (see [Upload trigger](#upload-trigger--select-vs-manual)). `resolveViewUrl` re-signs a
private object right before previewing it, for the case where the stored URL
has expired.

`filesPosition` decides which side of the dropzone the file lists sit on. It
defaults to `'above'`, the historical layout; `'below'` keeps the zone anchored,
which matters when files are added one at a time — otherwise every addition
pushes the target the user is aiming at further down.

`renderFiles` replaces the rows themselves. It receives the persisted files, the
staged ones with their live status, the default rows already built, and the
view/remove callbacks — so a screen can render a thumbnail grid, a single
summary line, or a count folded into its own card:

```tsx
<Uploader
	{...props}
	filesPosition='below'
	renderFiles={({ staged, stored, isEmpty, remove }) =>
		isEmpty ? null : (
			<ul className='grid grid-cols-3 gap-2'>
				{stored.map(file => (
					<li key={file.key}>{file.fileName}</li>
				))}
				{staged.map(file => (
					<li key={file.id} onClick={() => remove(file.id)}>
						{file.file.name} · {file.status}
					</li>
				))}
			</ul>
		)
	}
/>
```

It changes the rows, not their place: the result still renders on the
`filesPosition` side. For a layout the zone itself has to be part of — files
BESIDE the dropzone, everything inside your own frame — skip this skin and
compose `useUploader` with the exported `Dropzone`, `FileItem` and
`StoredFileItem`. Nothing here is unavailable there.

The dropzone also accepts a **pasted** file while focused (screenshots land as
uploads), and `capture` makes a touch device offer its camera instead of the
picker. On a coarse pointer the prompt switches to the tap-first copy
(`labels.tapPrompt`) with press feedback — a phone user never reads about
dragging.

Presentation knobs: `size='sm'` compacts the zone and every row; `icon`
replaces the dropzone glyph with any node (`icon={null}` removes it). Colors
and radii come from the theme variables — see [Theming](#theming).

`shortcut='mod+u'` binds a global key (⌘U / Ctrl+U) that opens the picker and
renders a small `kbd` hint inside the zone, so users discover it. It never
fires while typing in a field, and two zones claiming the same combo warn in
development — with several uploaders on screen, give each its own.

### `SlottedUploader`

A status row per slot plus one bulk dropzone whose matcher routes each file:

```tsx
import { SlottedUploader } from 'uploaderkit/ui'

;<SlottedUploader
	scopes={scopes}
	scope='company-identity'
	entityId={companyId}
	strategy={strategy}
	title='Company documents'
	slots={[
		{ id: 'letterhead', label: 'Letterhead', extensions: ['pdf'] },
		{
			id: 'logo',
			label: 'Logo',
			extensions: ['png', 'svg'],
			hint: 'Transparent background',
		},
	]}
	value={slotFiles}
	onChange={setSlotFiles}
	confirmRemove // dialog before forgetting a filled slot
	confirmReplace // dialog naming both files before overwriting
	hideDropzone={false}
/>
```

`confirmReplace` intercepts the picked file _after_ the pick — the dialog can
then name what is about to be lost and what replaces it. Both props take
`true` for the default copy or `{ title, message }` to override it.

**Staged rows.** Under `uploadOn: 'submit'` a pick does not travel: it rests on
its own row with a thumbnail, its name and _ready to upload_, plus Replace and
Remove, until the form calls `controllerRef.current.upload()`. The status dot
turns amber to say so. The name shown is the storage one — the file is renamed
to `{slot}.{ext}` before it enters the machine, which is what the entity will
actually serve.

**Removal deletes, history keeps.** Pass a `removeStrategy` — `createRemoveStrategy({ endpoint, headers, credentials })`, the DELETE mirror of the upload transport (`DELETE {endpoint}/{scope}/{entityId}` with `{ key }`) — and a confirmed removal deletes the object from storage **by itself**, on `Uploader` and `SlottedUploader` alike. `onRemoveStored(stored)` still fires for the app's bookkeeping (clearing the DB reference), delivered BEFORE `onChange`. The reference is forgotten even when the delete fails — a dangling pointer is worse than an orphan — and a refused delete surfaces through `onError`. The opt-out is a scope contract, not a client choice: mark the scope `keepOnRemove: true` and both the components skip the delete and the server's `storage.remove` answers `false` — history enforced where no client can bypass it.

**Language.** English is the default across the kit. A Spanish app opts in once at the root — `<UploaderProvider language='es'>` (exported from `/react` and `/ui`) — and every component and hook under it, including validation messages like `maxFilesReached`, speaks Spanish; a per-component `labels` prop still wins for one-off rewording.

### Confirmations

Destructive file actions get a second step: an accessible dialog (portal,
focus trapped, **focus lands on cancel** so a stray Enter never destroys
anything, Escape and the backdrop cancel). `ConfirmDialog` is exported for
wrapping your own actions in the same UX:

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

### File preview (`FileViewer`)

Both uploaders embed the full-screen viewer; it is exported standalone for any
screen that persists a `StoredFile`. It portals to `<body>` (no ancestor
stacking context can trap it), traps focus while open and restores it on
close, and locks the page scroll behind it. When `resolveUrl` fails — an
expired signature, a dropped connection — the viewer shows a retryable error
instead of loading forever. On narrow viewports a PDF renders as a download
card instead of an embedded frame (iOS Safari freezes embedded PDFs).

Pass `files` (the collection) alongside `file` (the one clicked) and the
viewer becomes a gallery: side arrows, `←`/`→` on the keyboard, a `2 / 5`
counter, and — on fine pointers — a footer hinting the shortcuts (`Esc`,
`←` `→`), so nobody has to guess them:

```tsx
<FileViewer file={viewing} files={storedImages} onClose={close} />
```

Keyboard: `Esc` closes, `←`/`→` walk the gallery, `D` downloads and `O` opens
the file in a tab — each hinted in the footer on fine pointers. A modifier is
never claimed, so `⌘D` still bookmarks.

`renderError` replaces the built-in "could not load" panel. It receives the
file that failed plus a `retry` that re-resolves it, so a custom panel keeps
the recovery the default one offers:

```tsx
<FileViewer
	file={viewing}
	onClose={close}
	renderError={({ file, retry }) => (
		<MyErrorState name={file.fileName} onRetry={retry} />
	)}
/>
```

`useFileViewer` owns the open/close state every screen would otherwise repeat:

```tsx
const viewer = useFileViewer({ resolveUrl })

<button onClick={() => viewer.open(stored)}>Ver</button>
<FileViewer {...viewer.viewerProps} />
```

### Reading a stored file

An `<img>` or an `<iframe>` cannot send an `Authorization` header, so a
private or encrypted object never renders from its raw url. Two helpers do
the authenticated read for you — same rule, two output shapes:

```tsx
import {
	createBlobUrlResolver,
	createBytesResolver,
} from 'uploaderkit/react'

// For the viewer: fetches with the app's headers, hands back an object URL.
const resolveViewUrl = createBlobUrlResolver({
	baseUrl: apiUrl,
	headers: () => ({ Authorization: `Bearer ${getToken()}` }),
	credentials: 'include',
})

<Uploader {...props} resolveViewUrl={resolveViewUrl} />

// For code that processes the file instead of showing it.
const readBytes = createBytesResolver({ baseUrl: apiUrl, headers })
const pdf = await PDFDocument.load(await readBytes(stored.url))
```

The rule both share is about **origin, not shape**: a url `baseUrl` serves —
app-relative, or absolute on the same origin — is yours and travels with your
headers and `credentials`; anything on a **foreign** origin is already
reachable and is fetched bare, because the token must never go to a
third-party host. Your server's `encryptedUrl` usually persists an absolute
url pointing back at your own `/view` route: that one counts as yours. Reading bytes through your own
endpoint is also what spares a public bucket its own CORS policy: an `<img>`
is exempt from CORS, a `fetch` for bytes is not.

`viewUrlFileName(url)` recovers the display name from a `/view?key=…` url.

### Drop to replace

A filled `SlottedUploader` row is itself a drop target: dragging a file over
it lights the row up with a "Drop to replace" pill, and the drop runs through
the same `confirmReplace` dialog as the button path. An empty row accepts the
drop as a direct fill — no trip through the bulk zone's matcher.

### Labels — every string is replaceable

All user-facing copy flows through one object, `UploaderLabels`. English is the
default; Spanish ships as `ES_LABELS`. Select a language once at the root:

```tsx
import { UploaderProvider } from 'uploaderkit/react'

;<UploaderProvider language='es'>
	<App />
</UploaderProvider>
```

Any partial override wins over that base, per component or per hook:

```tsx
<Uploader {...props} labels={{ dropPrompt: 'Drop your invoice here' }} />
```

#### The copy reaches further than the components

The object is not only for markup — it words the validation messages and the
server's HTTP responses too, which is what keeps one rejection from arriving in
two languages:

```ts
import { ES_LABELS, validateForScope } from 'uploaderkit'

const result = await validateForScope(scopes, 'invoices', file, ES_LABELS)
// result.message is Spanish
```

| Surface                                       | How it takes the copy              |
| --------------------------------------------- | ---------------------------------- |
| `Uploader`, `SlottedUploader`, presets        | `labels` prop, over the provider   |
| `useUploader`, `useSlottedUploader`           | `labels` option, over the provider |
| `validateFile`, `validateFiles`               | `labels` in `ValidationOptions`    |
| `validateForScope`                            | 4th argument                       |
| `createXhrUploadStrategy`, the view resolvers | `labels` option                    |
| `createStorage` — and both framework adapters | `labels` option, once              |

On the server, one option covers the whole round trip: `createStorage` resolves
the copy and republishes it as `storage.labels`, which is exactly where
`createExpressStorageHandlers` and `createNextStorageHandlers` read from, so a
route can never answer in a different language than the service behind it.

```ts
import { ES_LABELS } from 'uploaderkit'

const storage = createStorage({ scopes, provider, labels: ES_LABELS })
// 401 → "No autorizado"; a rejected upload → the same 422 text the browser showed
```

`ScopeError` is the one exception, deliberately: it flags a wiring bug, stays
English, and is never serialized to a client.

See `UploaderLabels` for the full key list.

### Theming

The styled layer reads `--color-ui-*` / `--radius-ui*` CSS variables, declared
with defaults in `tailwind.css`. An app rebrands the whole styled layer with
a single override:

```css
:root {
	--color-ui-primary: #c41e3a;
	--color-ui-primary-hover: #8b1529;
	--radius-ui: 0.25rem;
}
```

The override scopes like any CSS variable: put it on a wrapper `div` to
re-brand a single uploader instead of the whole app.

Motion ships with the components: rows animate in
(`--animate-ui-fade-in`), the viewer and the confirm dialog fade/scale on
enter and exit, the drag state lifts the zone and a press compresses it, and
the slot indicator pulses while uploading. All CSS — nothing to configure,
`prefers-reduced-motion` friendly to override from the app.

`Dropzone`, `FileItem` and `FileViewer` are exported separately for building a
different arrangement out of the same pieces.

### Going fully headless

An app with its own design system uses `/react` directly and loses nothing —
validation, compression, progress, abort and slot routing all live in the
hooks. `/ui` exists so a screen that does not need custom markup does not have
to write any.

---

## Presets

The recipes the playground kept demonstrating are components now, under `uploaderkit/presets`. Each composes `./react` and `./ui`, reads the same `--color-ui-*` tokens and the same labels, and stays optional: when one does not fit, `useUploader` + `Dropzone` + `FileItem` are still the floor.

| Preset                                    | What it is                                                                                                                                                                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useDropAnywhere` + `DropAnywhereOverlay` | The whole window as a drop target. The hook counts `dragenter`/`dragleave` depth at window level and is the **only** `drop` handler, so a file never arrives twice; the overlay is purely visual (`pointer-events-none`). `accept` uses `<input>` syntax. |
| `AvatarUploader`                          | A picture that is its own control: click or drop on it, a progress ring closes around it, `onUploaded` hands back the `StoredFile`. Uploads on select on purpose.                                                                                         |
| `GalleryUploader`                         | A thumbnail grid: persisted `stored` tiles first, in-flight files with a progress wash, hover view/remove, the add tile as the dropzone, and `FileViewer` over the whole set.                                                                             |

```tsx
const uploader = useUploader({ scopes, scope: 'attachments', entityId, strategy, multiple: true })
const { dragging } = useDropAnywhere({ onFiles: files => uploader.addFiles(files), accept: uploader.accept })

<DropAnywhereOverlay open={dragging} />
```

## Server

### `createStorage`

The server side of the contract: it re-runs the same validation the browser
ran, encrypts what the scope declares, and talks to a `StorageProvider`.

```ts
import { createStorage } from 'uploaderkit/server'
import { createGcsProvider } from 'uploaderkit/adapters/gcs'

const storage = createStorage({
	scopes,
	provider: createGcsProvider({ publicBucket, privateBucket }),
	crypto: { encrypt, decrypt }, // required when any scope declares `encrypt`
	signedUrlTtl: 300, // seconds
})
```

| Method                                           | Answers                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `upload({ scope, entityId, file, uploadedBy })`  | An `UploadResult`: the `StoredFile` to persist, plus `replaced`. |
| `read({ scope, key })`                           | Raw bytes, decrypted when the scope is encrypted.                |
| `remove({ scope, key })`                         | `true` when the object existed.                                  |
| `signedUrl({ scope, key, download, expiresIn })` | A fresh expiring URL. Throws on public scopes.                   |
| `list(prefix)`                                   | `{ key, size }[]`.                                               |

Construction is defensive: a private scope riding a provider that cannot sign,
or an encrypted scope without `crypto`, throws a `ScopeError` **before the
first request** — while a deploy can still fail loudly.

#### What an upload replaced

`upload()` answers an `UploadResult` — a `StoredFile` plus the keys the sweep
removed:

```ts
const { key, url, replaced } = await storage.upload({ scope, entityId, file })

// The bucket no longer has these. Whatever you persisted must forget them too,
// or your UI keeps rendering objects that are gone.
await db.files.deleteMany({ key: { $in: replaced } })
```

`replaced` is empty unless the scope resolves to an `'entity'` replace, and it
only lists what the provider confirmed deleted. The sweep runs **after** a
successful put — a failure between the two would otherwise leave the entity
with nothing — and a delete that fails is swallowed: the upload the caller
asked for did happen, and a stale object is not worth failing it over.

A public object's `url` carries a short `?v=` fingerprint of its content, so a
stable-key scope (an avatar) does not keep serving the previous image from a
CDN or the browser cache after an overwrite.

#### Streaming reads

`storage.readStream({ scope, key })` serves a file without holding it in
memory — through `get` a 20MB document costs its full size in RAM per
concurrent reader. The Express `view` handler pipes it. It degrades honestly:
a provider without `getStream`, or an encrypted scope whose crypto lacks
`decryptStream`, falls back to a buffered read wrapped in a one-chunk stream,
so callers always get one shape.

The trade of streaming decryption, stated where you decide: plaintext reaches
the consumer **before** the GCM tag is verified, so tampering surfaces as a
stream that breaks at the end — `read()` verifies before returning a single
byte.

### Express

Structural request/response shapes instead of Express types, so the package
stays dependency-free and any Express 4/5 app satisfies them. The app keeps
ownership of multer:

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

`authorize` returns the acting user (or `{}` for "allowed") to proceed, or
`null` to answer 401.

### Next.js App Router

Same surface over the Fetch API:

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

Omitting `authorize` leaves the router **open** — only acceptable behind an
authenticated proxy.

### Encryption

An encrypted scope needs **two** things wired, and `createStorage` throws at
boot without either: the cipher, and `encryptedUrl`.

```ts
const storage = createStorage({
	scopes,
	provider,
	crypto,
	// Where a client can READ an encrypted object. The bucket holds
	// ciphertext, so a signed URL would serve garbage — this must point at
	// your authenticated view route, which decrypts on the way out.
	encryptedUrl: ({ scope, entityId, key }) =>
		`/api/storage/${scope}/${entityId}/view?key=${encodeURIComponent(key)}`,
})
```

`StoredFile.url` for those scopes is that route, so an `<img>` or the
`FileViewer` renders the real file. Both framework adapters expose the route
as `handlers.view`, answering the decrypted bytes with
`Cache-Control: private, no-store` — decrypted content must never land in a
shared cache:

```ts
// Express
router.get('/:scope/:entityId/view', useAuth, handlers.view)

// Next App Router — app/api/storage/[scope]/[entityId]/view/route.ts
export const GET = handlers.view
```

No cipher is imposed: a scope declares `encrypt: true` and the app injects the
`CryptoHooks`. `createAesGcmCrypto` is the reference implementation
(AES-256-GCM, layout `[iv 12][tag 16][ciphertext]`) so you do not hand-roll it:

```ts
import { createAesGcmCrypto } from 'uploaderkit/server'

const crypto = createAesGcmCrypto(process.env.STORAGE_KEY!) // openssl rand -hex 32
```

The key must be exactly 64 hex characters (32 bytes) — no passphrase
derivation on purpose, since deriving would let two instances run "almost the
same" secret and silently produce mutually unreadable files.

Encrypted objects are stored as `application/octet-stream`, so nothing ever
tries to render ciphertext; `read()` decrypts on the way out.

---

## Storage providers

A provider is the thin translation to a bucket. All three implement the same
contract, so swapping one never touches the scopes or the service.

```ts
// Google Cloud Storage — two buckets: public assets, private documents
import { createGcsProvider } from 'uploaderkit/adapters/gcs'

const provider = createGcsProvider({
	publicBucket,
	privateBucket,
	publicUrl: (bucket, key) => `https://cdn.example.com/${key}`,
})
```

```ts
// S3-compatible — AWS, Cloudflare R2, Backblaze B2, MinIO, Wasabi
import { createS3Provider } from 'uploaderkit/adapters/s3'

const provider = createS3Provider({
	client, // an @aws-sdk/client-s3 S3Client; only endpoint/credentials differ per backend
	bucket: 'uploads',
	publicUrl: key => `https://cdn.example.com/${key}`,
})
```

```ts
// Tests and local development
import { createMemoryProvider } from 'uploaderkit/adapters/memory'

const provider = createMemoryProvider() // signed URLs are fake but carry the expiry
```

The S3 bucket is treated as private and `publicUrl` maps the keys a CDN or
public domain exposes — modern buckets block per-object ACLs, so the adapter
cannot invent a stable public URL on its own. Both SDKs are optional peers:
importing an adapter without its SDK installed fails only for the app that
chose that backend.

---

## Developer feedback

Two tiers, so a broken config surfaces where it can still be fixed:

- **`ScopeError` — thrown, eagerly.** Configs that can never work: a malformed
  scope, an unknown scope name, duplicate slot ids, a private scope on a
  non-signing provider, an encrypted scope without `CryptoHooks`. They fail at
  import or boot, never in front of a user. The framework adapters rethrow it
  instead of serializing it to the client.
- **Development warnings — once per issue.** Configs that run but probably are
  not what you meant: calling `upload()` without a strategy, dropping several
  files in single mode, a slot accepting extensions its scope rejects. Prefixed
  `[uploaderkit]`, silent in production, and never load-bearing for behavior.

Request-level failures are a third, separate family: `StorageRequestError`
carries an HTTP status and a Spanish user-safe message, which the framework
adapters map to JSON.

---

## Subpath Exports

| Import path                   | Contents                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uploaderkit`                 | `defineScopes`, `validateForScope`, `resolveKey`, `toAcceptAttribute`, `formatFileSize`, `KB`/`MB`/`GB`, `ScopeError`, `DEFAULT_LABELS`/`ES_LABELS`, types |
| `uploaderkit/react`           | `useUploader`, `useSlottedUploader`, `createXhrUploadStrategy`, `compressImage`, slot matchers, types                                                      |
| `uploaderkit/ui`              | `Uploader`, `SlottedUploader`, `Dropzone`, `FileItem`, `FileViewer`, `ConfirmDialog`, `cn`                                                                 |
| `uploaderkit/server`          | `createStorage`, `createAesGcmCrypto`, `StorageRequestError`, types                                                                                        |
| `uploaderkit/server/express`  | `createExpressStorageHandlers` — structural handlers for an Express app that owns multer                                                                   |
| `uploaderkit/server/next`     | `createNextStorageHandlers` — App Router handlers over the Fetch API                                                                                       |
| `uploaderkit/adapters/gcs`    | `createGcsProvider` — two-bucket Google Cloud Storage (optional peer)                                                                                      |
| `uploaderkit/adapters/s3`     | `createS3Provider` — AWS, R2, B2, MinIO, Wasabi (optional peers)                                                                                           |
| `uploaderkit/adapters/memory` | `createMemoryProvider` — tests and local development                                                                                                       |
| `uploaderkit/tailwind.css`    | Tailwind v4 source registration for the `/ui` classes                                                                                                      |

---

## License

MIT © Ricardo Tapia
