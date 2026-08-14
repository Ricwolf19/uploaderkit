# AGENTS.md — uploaderkit

> Operating guide for any AI agent or contributor. Source of truth for **how to
> work here** and the **invariants that must not break**.

## 1. What this is

One npm package, `uploaderkit`: an isomorphic core (scope registry,
validation, provider contract) plus the feature surface behind subpaths — the
headless React uploader, the server storage service, framework adapters,
storage providers and an opt-in styled layer.

The core modules (`index`, `constants`, `file`, `scopes`, `types`,
`validation`, `labels`, `warn`) stay **zero-dependency and isomorphic** — no
React, no Node builtins, no provider SDK. depcruise enforces it.

Consumer docs are `packages/uploaderkit/README.md` (English) and `README.es.md`
(Spanish). The root `README.md` is the product landing plus monorepo setup.

## 2. Entry points

One tsup entry per subpath. Adding one means touching **three** places —
`tsup.config.ts`, `exports` + `typesVersions` in `package.json`, and this
table — or the path resolves in the bundler and fails in Node.

| Subpath             | Contents                                                          | May import                   |
| ------------------- | ----------------------------------------------------------------- | ---------------------------- |
| `.`                 | the isomorphic core + `UploaderLabels`/`EN_LABELS`                | nothing (see §1)             |
| `./react`           | `useUploader`, `useSlottedUploader`, strategy, compression        | react (peer), core           |
| `./server`          | `createStorage`, `createAesGcmCrypto`, `StorageRequestError`      | core + `node:crypto`         |
| `./server/express`  | handlers for an Express app that owns multer (incl. `view`)       | `./server`                   |
| `./server/next`     | App Router handlers, Fetch API (incl. `view`)                     | `./server`                   |
| `./adapters/memory` | in-memory provider for tests and local dev                        | core only                    |
| `./adapters/gcs`    | two-bucket GCS provider (public + private, signed URLs)           | @google-cloud/storage (peer) |
| `./adapters/s3`     | S3-compatible provider (AWS, R2, B2, MinIO, Wasabi)               | @aws-sdk/\* (peers)          |
| `./ui`              | styled uploaders, `FileViewer` + `useFileViewer`, `ConfirmDialog` | react(-dom), ui-* tokens     |
| `./tailwind.css`    | Tailwind v4 `@source` registration for the /ui classes            | —                            |

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
- **User copy flows through `src/labels.ts`** — Spanish `DEFAULT_LABELS`
  (invariant §4.5), `EN_LABELS` opt-in, `Partial` override per hook option or
  component prop. A hardcoded user-facing string in a component is a bug.
- **The upload trigger is the app's choice** — `uploadOn: 'select' | 'manual'`
  in `react/useUploader.ts`. The hook defaults to `'manual'` (form flows), the
  styled `Uploader` flips to `'select'`. `onUploadStart` marks the real send
  moment; never hardcode one behavior into a new surface.
- **Theme via `--color-ui-*` variables** — `tailwind.css` declares defaults;
  a `:root` (or wrapper) override rebrands the styled layer. New UI classes
  use tokens, never raw palette colors.
- **Overlays share `ui/scrollLock.ts` + `ui/useFocusTrap.ts` +
  `ui/useOverlayTransition.ts`** — refcounted scroll lock (viewer + confirm can
  stack), one focus-trap contract, and one enter/exit choreography (render on
  open, `entered` a frame later, keep mounted `OVERLAY_ANIMATION_MS` after
  close). A new overlay reuses all three instead of hand-rolling any.
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

## 3.1 Developer feedback

Two tiers:

- **`ScopeError` (throw, eager)** — configs that can never work: malformed
  scope, unknown scope name, duplicate slot ids, private scope on a
  non-signing provider, encrypted scope without CryptoHooks. They fail at
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
   inlining breaks `instanceof` across the boundary.
3. **Provider SDKs are optional peers** (devDeps only so the repo typechecks).
   Installing this package must never pull `@google-cloud/storage` for an app
   that does not use GCS.
4. **Crypto is offered, never forced.** `/server` ships `createAesGcmCrypto`
   (AES-256-GCM, key strictly 64 hex chars — no passphrase derivation, so two
   instances can never run "almost the same" secret). Apps may inject their own
   `CryptoHooks` instead; the key always belongs to the app. An encrypted scope
   additionally requires `encryptedUrl`, or `createStorage` throws: without the
   view route its `StoredFile.url` would hand ciphertext to an `<img>`.
5. **User-facing messages Spanish and human; dev-facing English and
   actionable.** Framework adapters map the first family to JSON, rethrow the
   second.
6. **No app-specific scopes ship here.** Destinations belong in each app's own
   `defineScopes` call; the package only ships the contract.

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

Release: merge to `main` → release-please PR → merge publishes to npm.

## 6. Known pitfalls

| Date       | Severity | Pitfall                                                                                                                                                                                                             | Reference                    |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 2026-08-14 | med      | `StorageProvider.get/delete/signedUrl` receive only the key, so the GCS adapter probes the private bucket first and falls back to public. Fix belongs upstream (add visibility to read ops) when the core unfreezes | `src/adapters/gcs.ts`        |
| 2026-08-14 | low      | `compressImage` cannot honour `stripExif: false` — canvas re-encode always drops metadata. Flag it if a scope ever needs EXIF preserved                                                                             | `src/react/compressImage.ts` |
| 2026-08-14 | low      | react/@google-cloud/storage are devDeps only for typechecking; depcruise exempts `npm-peer` from the dev-dep rule to allow this                                                                                     | `.dependency-cruiser.cjs`    |
| 2026-08-14 | med      | `dragleave` fires on a wrapper when the pointer enters its own child, so a boolean drag flag flickers. Count depth instead — `Dropzone`, `SlotRow` and the playground's drop-anywhere all do                        | `src/ui/Dropzone.tsx`        |
| 2026-08-14 | med      | A hidden `<input>` inside a clickable wrapper recurses: `input.click()` bubbles back to the wrapper, which calls it again. Browsers cut it short, happy-dom blows the stack. Keep the `stopPropagation` guard       | `src/ui/Dropzone.tsx`        |
