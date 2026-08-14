# uploaderkit

One upload contract for every storage provider. Declare where files go once, and
the browser and the server validate against the same definition.

```bash
npm install uploaderkit
```

## Why

Most upload libraries hand you a dropzone and stop at the network boundary. The
part that actually rots is the other side: which bucket a file lands in, who can
read it, how big it may be, and whether the client and the server still agree on
any of it six months later.

uploaderkit puts that agreement in one place.

```ts
import { defineScopes, MB } from 'uploaderkit'

export const scopes = defineScopes({
	'company-documents': {
		path: (id, file) => `Companies/${id}/documents/${file.name}`,
		visibility: 'private',
		accept: ['pdf'],
		maxBytes: 20 * MB,
		category: 'pdf',
		encrypt: true,
	},
	'user-avatar': {
		path: id => `Users/${id}/avatar`,
		visibility: 'public',
		accept: ['png', 'jpg', 'webp'],
		maxBytes: 5 * MB,
		category: 'image',
		compress: { maxWidth: 512, quality: 0.8 },
		overwrite: true,
	},
})
```

The client derives its `accept` attribute and pre-validates from it. The server
authorizes and re-validates from it. There is no second definition to forget.

```ts
import { validateForScope } from 'uploaderkit'

const result = await validateForScope(scopes, 'company-documents', file)
if (!result.valid) showError(result.message) // already in the user's language
```

## What you get

|                           |                                                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope registry**        | `defineScopes` — path, visibility, extensions, size, encryption, compression, overwrite. Malformed definitions throw at import time      |
| **Isomorphic validation** | extension, size, MIME and magic-number checks that run identically in a browser and in Node                                              |
| **`uploaderkit/react`**   | headless `useUploader` / `useSlottedUploader`: progress, abort, retry with backoff, concurrency cap, compression, manual or auto trigger |
| **`uploaderkit/server`**  | `createStorage` re-validates server-side, encrypts on demand, signs private URLs; Express and Next App Router adapters included          |
| **Adapters**              | Google Cloud Storage, any S3-compatible backend (AWS, R2, B2, MinIO, Wasabi) and an in-memory provider for tests                         |
| **`uploaderkit/ui`**      | styled `Uploader` + `SlottedUploader`, full-screen `FileViewer` with gallery navigation, `ConfirmDialog` — themeable via CSS variables   |
| **Encrypted scopes**      | the app injects the cipher; a `view` route serves decrypted bytes, and a signed URL can never leak ciphertext                            |
| **i18n**                  | every user-facing string flows through a labels object — Spanish default, `EN_LABELS` included                                           |

The core stays **zero-dependency and isomorphic** — no React, no Node
builtins, no provider SDK. React and the SDKs are optional peers behind their
own subpaths.

## Documentation

Full docs, every option and copy-paste recipes live in the package README:

**[English](./packages/uploaderkit/README.md)** · **[Español](./packages/uploaderkit/README.es.md)**

## Development

```bash
pnpm install   # workspace deps
pnpm dev       # playground on http://localhost:5173 + tsup watch
pnpm verify:ci # the full gate: lint, secretlint, build, typecheck, test,
               #   knip, depcruise, size-limit, publint, attw
```

The playground (`playground/`) has a demo per surface — basic, slotted, form
trigger, retry, avatar, gallery, drop-anywhere — each deep-linkable via
`?demo=<id>`.

## Roadmap

| Version | Adds                                                     |
| ------- | -------------------------------------------------------- |
| 1.x     | Checksum dedupe, resumable uploads, presigned direct PUT |

## License

MIT © Ricardo Tapia
