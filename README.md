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

## What you get today

|                           |                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Scope registry**        | `defineScopes` — path, visibility, extensions, size, encryption, compression, overwrite. Malformed definitions throw at import time  |
| **Isomorphic validation** | extension, size, MIME and magic-number checks that run identically in a browser and in Node                                          |
| **Magic numbers**         | 20 signatures, so an `.exe` renamed to `.pdf` is rejected before it reaches a bucket                                                 |
| **Provider contract**     | `StorageProvider` with declared `capabilities`; a private scope on a provider that cannot sign URLs fails at boot, not in production |
| **Path safety**           | keys are checked for traversal before they touch a provider                                                                          |

Everything above is **zero-dependency and isomorphic**: no React, no Node
builtins, no provider SDK.

## Roadmap

| Version | Adds                                                                    |
| ------- | ----------------------------------------------------------------------- |
| 0.2     | `uploaderkit/react` — headless `useUploader`, abort, progress, previews |
| 0.3     | `uploaderkit/server` — Fetch-API handler with Express and Next adapters |
| 0.3     | `uploaderkit/adapters/gcs` and `/s3` (covers S3, R2, B2, MinIO, Wasabi) |
| 0.4     | `uploaderkit/ui` — styled dropzone and slotted uploader, opt-in         |
| 1.1     | Client compression + EXIF stripping, checksum dedupe, resumable uploads |

## License

MIT © Ricardo Tapia
