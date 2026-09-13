# AGENTS.md — uploaderkit

> Operating guide for any AI agent or contributor. Source of truth for **how to
> work here** and the **invariants that must not break**.

## 1. What this is

One npm package, `uploaderkit`: an isomorphic core (scope registry,
validation, provider contract) plus the feature surface behind subpaths — the
headless React uploader, the server storage service, framework adapters,
storage providers, an opt-in styled layer and the presets built on it.

The core modules (`index`, `constants`, `file`, `scopes`, `types`,
`validation`, `labels`, `warn`) stay **zero-dependency and isomorphic** — no
React, no Node builtins, no provider SDK. depcruise enforces it.

Consumer docs are `packages/uploaderkit/README.md` (English) and `README.es.md`
(Spanish). The root `README.md` is the product landing plus workspace setup.

## 2. Entry points

One tsup entry per subpath. Adding one means touching **three** places —
`tsup.config.ts`, `exports` + `typesVersions` in `package.json`, and this
table — or the path resolves in the bundler and fails in Node.

| Subpath             | Contents                                                                                              | May import                   |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- |
| `.`                 | the isomorphic core + `UploaderLabels`/`EN_LABELS`/`ES_LABELS`                                        | nothing (see §1)             |
| `./react`           | `useUploader`, `useSlottedUploader`, strategy, compression, `UploaderProvider`                        | react (peer), core           |
| `./server`          | `createStorage`, `createAesGcmCrypto`, `StorageRequestError`                                          | core + `node:crypto`         |
| `./server/express`  | handlers for an Express app that owns multer (incl. `view`)                                           | `./server`                   |
| `./server/next`     | App Router handlers, Fetch API (incl. `view`)                                                         | `./server`                   |
| `./adapters/memory` | in-memory provider for tests and local dev                                                            | core only                    |
| `./adapters/gcs`    | two-bucket GCS provider (public + private, signed URLs)                                               | @google-cloud/storage (peer) |
| `./adapters/s3`     | S3-compatible provider (AWS, R2, B2, MinIO, Wasabi)                                                   | @aws-sdk/\* (peers)          |
| `./ui`              | styled uploaders, `FileViewer` + `useFileViewer`, `ConfirmDialog`                                     | react(-dom), ui-* tokens     |
| `./presets`         | recipes as components: `useDropAnywhere` + `DropAnywhereOverlay`, `AvatarUploader`, `GalleryUploader` | `./react` + `./ui`           |
| `./tailwind.css`    | Tailwind v4 `@source` registration for the /ui classes                                                | —                            |

## 3. Load-bearing patterns (file → rule)

- **The viewer is part of the kit** — `ui/FileViewer.tsx`. Images and PDFs
  preview in a full-screen modal (esc/backdrop close, scroll lock); other
  formats offer a download. `resolveViewUrl` lets private scopes re-sign an
  expired URL right before rendering. Both uploaders embed it; it is also
  exported standalone.
- **The hook owns state, the strategy owns transport** — `react/types.ts`.
  `UploadStrategy` receives `(file, scope, entityId, { onProgress, signal })`
  and must reject with an `AbortError`-named error on abort; the hook maps that
  to `idle`, not `error`. Swapping endpoint/auth/protocol never touches state.
- **Validation runs twice on purpose** — `useUploader` for feedback before any
  byte leaves; `createStorage.upload` re-runs the same `validateForScope` for
  safety. The client check is advisory, the server one is load-bearing.
- **Replace is derived, never remembered** — `src/scopes.ts`. A scope
  whose key carries the file name writes a new object per upload, so the
  previous one leaks; one whose key is stable already overwrites in place.
  `resolveReplaceMode` reads that difference plus `maxFiles` and picks
  `'entity'` (sweep the entity's prefix after a successful put) or `'key'`.
  Two configs are refused at `defineScopes`: an entity-wide replace on a
  collection, and two scopes whose folders overlap — an avatar upload must
  never be able to delete the same user's documents.
- **Arity lives on the scope** — `maxFiles` in the registry, not `multiple` at
  the call site. The server reads it to decide whether an upload sweeps, so a
  component that disagreed would be the same drift the shared contract exists
  to remove. `useUploader` derives `multiple`/`maxFiles` from the scope and
  keeps the props only as a narrowing override.
- **Boot-time guards** — `createStorage` throws `ScopeError` at construction
  when a scope declares `encrypt` without injected `CryptoHooks`, or when a
  private scope rides a provider that cannot sign. Deploys fail loudly instead
  of 500ing on the first upload.
- **Two error families** — `StorageRequestError` carries an HTTP status and a
  Spanish user-safe message; `ScopeError` is a wiring bug, English, and the
  framework adapters rethrow it instead of serializing it to the client.
- **Encrypted objects are stored as `application/octet-stream`** so nothing
  ever tries to render ciphertext; `read()` decrypts on the way out.
- **Compression is canvas re-encode** — `react/compressImage.ts`. Downscale +
  quality per the scope's `compress`; EXIF (GPS, camera) is dropped as an
  inherent side effect. Falls back to the original file whenever it cannot
  help; never fails an upload.
- **XHR, not fetch, for uploads** — `react/strategy.ts`. `fetch` still has no
  usable upload progress in browsers.
- **One machine, two presentations** — `react/useSlottedUploader.ts` wraps
  `useUploader` verbatim: it only decides _which slot_ a file fills and renames
  it to `{slot}.{ext}` so the scope's `path` yields a stable, overwriting key.
  Validation, compression, progress and abort are never reimplemented; a fix in
  the machine reaches `Uploader` and `SlottedUploader` alike.
- **Slot uploads are controlled** — the caller owns persistence via
  `value`/`onChange`; `landedRef` merges uploads the parent has not absorbed
  yet, so two quick drops cannot race the controlled state into losing one.
- **One component per file, primitives shared** — `ui/` is `FileTypeBadge`,
  `ProgressBar`, `Dropzone`, `FileItem`, `StoredFileItem`, `SlotRow`,
  `FileViewer`, each in its own file, composed by `Uploader` and
  `SlottedUploader`. Only the two uploaders plus `Dropzone`, `FileItem` and
  `FileViewer` are exported from `ui.ts`; the rest stay internal so the public
  surface does not grow with every layout detail.
- **Callbacks the consumer passes inline go in a ref, not in a deps array** —
  `ui/FileViewer.tsx`. `resolveViewUrl`/`onClose` are new functions on every
  parent render, and re-signing a private URL is a round trip. The effects
  depend on the file being viewed and nothing else.
- **Removal is a strategy, not a callback chore** — `RemoveStrategy` +
  `createRemoveStrategy` are the DELETE half of the transport; the uploaders
  run it themselves on a confirmed removal, skip it for `keepOnRemove` scopes,
  and always forget the reference (a dangling pointer is worse than an
  orphan). `onRemoveStored` is notification, not responsibility.
- **User copy flows through `src/labels.ts`** — English `DEFAULT_LABELS`
  (globalized default), `ES_LABELS` selected once
  through `UploaderProvider language='es'`, `Partial` override per hook option
  or component prop on top. A hardcoded user-facing string in a component is a
  bug, and a new key lands in the type, `DEFAULT_LABELS` **and** `ES_LABELS`.
- **The upload trigger is a three-mode contract** — `ui/controller.ts`
  declares `UiUploadTrigger`: `'select'` (fires on pick — avatars, quick
  replacements), `'submit'` (the form sends via `controllerRef` — any file
  that depends on the rest of a form), `'manual'` (the zone's own button —
  evidence, punctual flows). The hook underneath keeps only
  `'select' | 'manual'`; `'submit'` is `'manual'` with the form owning the
  send. Default `'submit'` inside any form: a stable-key scope overwrites on
  put, so a send fired on selection has already replaced what the entity
  serves even if the user cancels. `onPendingChange` is how the form learns it
  has unsent work (a staged file never touches its fields), and `'submit'`
  without a `controllerRef` dev-warns — it has no send of its own.
  `SlottedUploader` offers `'select' | 'submit'` only: no button surface.
- **Theme via `--color-ui-*` variables** — `tailwind.css` declares every
  token as a CSS variable, so one `:root` override rebrands the whole styled
  layer. New UI classes use tokens, never raw palette colors.
- **Overlays share `ui/scrollLock.ts` + `ui/useFocusTrap.ts` +
  `ui/useOverlayTransition.ts` + `ui/overlayStack.ts`** — refcounted scroll
  lock (viewer + confirm can stack), one focus-trap contract, one enter/exit
  choreography (render on open, `entered` a frame later, keep mounted
  `OVERLAY_ANIMATION_MS` after close), and one dismiss stack. A new overlay
  reuses all four instead of hand-rolling any.
- **Only the innermost overlay answers Escape** — `ui/overlayStack.ts`. Both
  overlays claim the key on `window` in the CAPTURE phase, so they beat a host
  dialog listening in bubble (a typical Modal). But two listeners on
  the same node in the same phase both run — `stopPropagation` only stops other
  NODES — so the layer stack, not the listener, decides who answers. Ordering
  by registration would pick the OUTERMOST, which is backwards.
- **An encrypted scope is unreadable by URL** — `server/storage.ts`. The
  bucket holds ciphertext, so a signed URL would serve garbage: `createStorage`
  demands `encryptedUrl` next to `crypto` and points `StoredFile.url` at the
  app's authenticated `view` route, which runs `read()` and decrypts. Both
  framework adapters expose that route with `Cache-Control: private, no-store`
  — decrypted bytes must never reach a shared cache.
- **Drag state is a depth counter, never a boolean** — `ui/Dropzone.tsx`,
  `ui/SlotRow.tsx`. Moving onto a child fires `dragleave` on the wrapper, so a
  boolean drops the state mid-drag and the zone flickers. Every new drop target
  counts `dragenter`/`dragleave` (the playground's drop-anywhere demo does the
  same at window level).
- **Touch reads tap, not drag** — `ui/useCoarsePointer.ts`. On
  `pointer: coarse` the dropzones switch to `tapPrompt`/`bulkTapPrompt` and
  rely on press feedback (`active:scale`); drag copy is desktop-only. A new
  zone-like surface must handle both pointers.

- **Read helpers come in a pair** — `src/react/viewResolver.ts`.
  `createBlobUrlResolver` ends in an object URL (for an `<img>`/`<iframe>`),
  `createBytesResolver` in a `Uint8Array` (for a pdf-lib render, a canvas, a
  parser). Both route through one `fetchStored`, which owns the only rule that
  matters: a url `baseUrl` serves — app-relative, or absolute on the same
  origin — is ours and travels with the app's headers and `credentials`;
  anything on a foreign origin is already reachable and is fetched bare, since
  sending the JWT to a third-party host would leak it. Origin, not shape: what
  the server's `encryptedUrl` persists is usually absolute and points back at
  the app's own authenticated endpoint. Add a third output format there, never
  by re-deriving the rule. Reading bytes through the app's own endpoint is also
  what spares a public bucket its own CORS policy: an `<img>` is exempt from
  CORS, a `fetch` for bytes is not.

## 3.1 Developer feedback

Two tiers:

- **`ScopeError` (throw, eager)** — configs that can never work: malformed
  scope, unknown scope name, duplicate slot ids, private scope on a
  non-signing provider, encrypted scope without CryptoHooks, a sweeping scope
  behind more than one slot (filling one would delete the rest). They fail at
  import/boot, never in front of a user.
- **`warnDev(key, message)` (`src/warn.ts`)** — configs that run but not as
  meant: upload without a strategy, multi-file drop in single mode, slot
  extensions outside the scope. Dev-only, once per key, prefixed
  `[uploaderkit]`. Never gate behavior on it.

Adding a validation? Decide the tier first; a throw in a render path or a
warn for an impossible config are both wrong.

## 4. Invariants (do not break without flagging)

1. **The core stays isomorphic.** Registry/validation modules import no React,
   no Node builtins, no SDK — the browser and the server must run the same
   validation from the same file. depcruise fails the build otherwise.
2. **`react` and provider SDKs stay `external`** in `tsup.config.ts` —
   inlining breaks `instanceof` across the boundary and forces every consumer
   to carry every provider.
3. **Provider SDKs are optional peers** (devDeps only so the repo typechecks).
   Installing this package must never pull `@google-cloud/storage` for an app
   that does not use GCS.
4. **Crypto is offered, never forced.** `/server` ships `createAesGcmCrypto`
   (AES-256-GCM, key strictly 64 hex chars — no passphrase derivation, so two
   instances can never run "almost the same" secret). Apps may inject their own
   `CryptoHooks` instead; the key always belongs to the app. An encrypted scope
   additionally requires `encryptedUrl`, or `createStorage` throws: without the
   view route its `StoredFile.url` would hand ciphertext to an `<img>`.
5. **User-facing copy flows through labels — English default, Spanish via
   `UploaderProvider language='es'`. Dev-facing messages English and
   actionable.** `StorageRequestError` messages are today Spanish and
   user-safe; the framework adapters map them to JSON, and rethrow
   `ScopeError` instead of serializing it.
6. **The package ships no scopes.** Every destination is declared by the
   consuming app in its own `defineScopes` call.
7. **The scroll lock is shared by value, not by import.** Every copy of this
   module — a duplicated install, or a design system's own lock — keeps its
   counter under `Symbol.for('uploaderkit.bodyScrollLock')` on `globalThis`, so
   they all converge on one. Two independent counters writing
   `document.body.style.overflow` leave the page permanently unscrollable: the
   second lock records the first one's `hidden` as the value to restore. The
   key and the shape are the contract; never make one package import the
   other.

## 5. Commands

`pnpm dev` (playground on :5173 + tsup watch; Vite aliases the package to
`src`, so edits hot-reload without a build) · `pnpm verify` (lint + build +
typecheck + test) · `pnpm verify:ci` (adds secretlint, knip, depcruise over
package AND playground, size-limit, publint, attw; pre-push and CI run exactly
this) · `pnpm --filter uploaderkit test:watch`.

size-limit budgets live in `packages/uploaderkit/package.json` (client entries
only — `/server` imports `node:crypto` and has no browser bundle to budget).
attw excludes `./tailwind.css` (CSS resolves as CSS, not as types).

Every surface needs a playground demo — `playground/src/examples/` plus an
entry in `shell/registry.ts`. A feature nobody can click is a feature nobody
reviews. The playground must import `packages/uploaderkit/tailwind.css` from
its own CSS entry, or none of the `ui-*` utilities are generated and every
component renders bare.

Release: merge to `main` → release-please PR → merge publishes to npm
through the trusted publisher (no token in CI).

## 6. Known pitfalls

| Date       | Severity | Pitfall                                                                                                                                                                                                                                             | Reference                    |
| ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 2026-08-14 | med      | `StorageProvider.get/delete/signedUrl` receive only the key, so the GCS adapter probes the private bucket first and falls back to public. Fix is to add visibility to the read ops of `StorageProvider`, a breaking change to the provider contract | `src/adapters/gcs.ts`        |
| 2026-08-14 | low      | `compressImage` cannot honour `stripExif: false` — canvas re-encode always drops metadata. Flag it if a scope ever needs EXIF preserved                                                                                                             | `src/react/compressImage.ts` |
| 2026-08-14 | low      | react/@google-cloud/storage are devDeps only for typechecking; depcruise exempts `npm-peer` from the dev-dep rule to allow this                                                                                                                     | `.dependency-cruiser.cjs`    |
| 2026-08-14 | med      | `dragleave` fires on a wrapper when the pointer enters its own child, so a boolean drag flag flickers. Count depth instead — `Dropzone`, `SlotRow` and the playground's drop-anywhere all do                                                        | `src/ui/Dropzone.tsx`        |
| 2026-08-14 | med      | A hidden `<input>` inside a clickable wrapper recurses: `input.click()` bubbles back to the wrapper, which calls it again. Browsers cut it short, happy-dom blows the stack. Keep the `stopPropagation` guard                                       | `src/ui/Dropzone.tsx`        |
| 2026-09-13 | med      | `StorageRequestError` messages are hardcoded Spanish while `DEFAULT_LABELS` is English, so an app that never touches labels still serves Spanish HTTP errors. They bypass the label system entirely — deciding where they belong is open            | `src/server/storage.ts`      |
