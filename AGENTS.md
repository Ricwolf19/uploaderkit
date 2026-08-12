# AGENTS.md — uploaderkit

> Operating guide for any AI agent or contributor. Source of truth for **how to
> work here** and the **invariants that must not break**. Public API behavior
> lives in the README — this file stays token-minimal.

## 1. What this is

A published npm package (`uploaderkit`, MIT) that owns the contract between an
app and its file storage: one scope registry, validation that runs identically
on both sides of the wire, a headless React layer, a server router, and one
adapter per storage provider.

Stack: TypeScript 5.9 · tsup (dual ESM/CJS) · vitest · pnpm workspaces ·
release-please. Node >= 22 to develop, >= 18 to consume.

Distribution: this repo is the **single source**. It publishes `uploaderkit` to
npmjs. The company layer (`@pibytelabs/uploaderkit`) lives in a separate repo
that **depends on this package** and only adds its own scopes and theming — it
never forks this code. See §7.

## 2. How to work in this repo

- **Read before you write.** Confirm behavior in source + tests.
- **Smallest viable change.** No new docs/dirs unless asked.
- **Every export is a public API decision.** Adding one is a minor release and a
  permanent maintenance obligation; removing one is a major. Say so in the PR.
- **Verify before claiming done**: `pnpm verify` (lint + build + typecheck +
  test). CI runs `pnpm verify:ci`, which adds secretlint, knip, dependency-
  cruiser, size-limit and publint. Never report green without running it.
- **Respect the invariants in §6** — breaking one is a major change, flag it.
- **Conventional Commits** (`feat:`, `fix(scopes):`, `chore:`). release-please
  derives the version and the CHANGELOG from them, so a sloppy message ships a
  wrong version number.

## 3. Repository layout

```
uploaderkit/
├── packages/uploaderkit/    # the published package
│   ├── src/
│   │   ├── index.ts         # core barrel — isomorphic, zero deps
│   │   ├── types.ts         # every contract type
│   │   ├── constants.ts     # magic numbers, MIME map, category presets
│   │   ├── file.ts          # extension/MIME/size helpers, FileLike adapters
│   │   ├── validation.ts    # extension · size · magic number · custom
│   │   └── scopes.ts        # defineScopes, validateForScope, capability guard
│   └── tsup.config.ts       # entry points → subpath exports
└── .github/workflows/       # ci.yml (PRs) · release-please.yml (main)
```

## 4. Entry points

One tsup entry per subpath export. Adding an entry means adding it in **three**
places — `tsup.config.ts`, `exports` in `package.json`, and this table — or
consumers get a path that resolves in the bundler and fails in Node.

| Subpath                                                       | Status      | Contents                                        | May import              |
| ------------------------------------------------------------- | ----------- | ----------------------------------------------- | ----------------------- |
| `.`                                                           | **shipped** | types, presets, validation, scope registry      | nothing                 |
| `./react`                                                     | planned 0.2 | `useUploader`, `useSlots`, abort/progress state | react (peer)            |
| `./server`                                                    | planned 0.3 | Fetch-API handler, scope authorization          | core only               |
| `./server/express` · `./server/next`                          | planned 0.3 | framework adapters                              | the handler             |
| `./adapters/gcs` · `./adapters/s3` · `./adapters/uploadthing` | planned 0.3 | `StorageProvider` implementations               | its SDK (optional peer) |
| `./ui`                                                        | planned 0.4 | styled dropzone + slotted uploader              | react, its CSS          |

## 5. Load-bearing patterns (file → rule)

- **Scope registry** — `src/scopes.ts`. `defineScopes` validates eagerly and
  throws `ScopeError` at import time. A definition mistake must never survive to
  runtime.
- **A scope narrows, never widens** — a scope's `accept` must be a subset of its
  `category`'s extensions. This is what stops a `pdf` scope from silently
  accepting executables after an edit.
- **Validation order is cheapest-first** — `validation.ts` checks size, then
  extension, then reads bytes. Reordering means a 900 MB file gets read into
  memory before being rejected. There is a test that pins this.
- **`FileLike`, not `File`** — `types.ts`. The validation surface takes the
  four members a browser `File`, a Node `File` and a multer memory file all
  have. `fromMulterFile` bridges the last one. This is what makes one validation
  function serve both sides.
- **Capabilities are declared, not discovered** — `StorageProvider.capabilities`
  plus `assertProviderSupports`. A private scope on a provider that cannot sign
  URLs fails when the server boots, not when a user opens a file.
- **Keys are checked for traversal** — `resolveKey` rejects absolute paths and
  `..` because the file name reaching `path()` came from the client.
- **The package never ships a cipher** — `CryptoHooks` is injected. Shipping an
  encryption implementation would put every consumer on our key handling and our
  upgrade schedule.

## 6. Invariants (do not break without flagging)

1. **The core entry is isomorphic.** `src/index.ts` and everything it reaches
   must not import React, a Node builtin, or a provider SDK. dependency-cruiser
   enforces this; if you need one of those, it belongs in another entry point.
2. **Client and server validate with the same function.** Any check added to one
   side goes in `validation.ts` or `scopes.ts`, never in an adapter.
3. **Provider SDKs are optional peer dependencies.** Installing this package
   must never pull `@google-cloud/storage` or `@aws-sdk/*` for someone who does
   not use them.
4. **Error messages reaching a user are Spanish and human**; messages reaching a
   developer (`ScopeError`) are English and say what to fix. Never leak a code
   or a stack trace into the first group.
5. **`exports` and `tsup.config.ts` stay in sync** with §4.
6. **No `any` in exported types.** Internal `as any` is tolerated and flagged.
7. **Types over interfaces**, arrow functions, no classes except `Error`
   subclasses.

## 7. Relationship with `@pibytelabs/uploaderkit`

The company package is a **thin layer**: it depends on this one and re-exports
it, adding only its own scopes, presets and theme. It never copies source.

Decision rule for where a change lands: **would a project outside that company
want it?** Yes → here, then bump the dependency downstream. No → the company
repo.

This split is also what keeps ownership legible: everything generic is public
and MIT; everything business-specific stays private.

## 8. Commands

`pnpm verify` (lint + build + typecheck + test) · `pnpm verify:ci` (adds
secretlint, knip, depcruise, size-limit, publint) · `pnpm test` ·
`pnpm --filter uploaderkit test:watch` · `pnpm build` · `pnpm fix` ·
`pnpm docs` (typedoc).

Release: merge to `main` → release-please opens a version PR → merging it tags,
creates the GitHub Release and publishes to npm with `--provenance` (OIDC, no
long-lived token).

## 9. Conventions

- Tabs · single quotes · no semicolons · ES5 trailing commas · width 80.
- Tests colocated (`*.test.ts`) next to the module they cover.
- Comments explain **why**, never what. A comment restating the code is deleted.
- Exported symbols carry a one-line doc comment: this is a library, and an
  undocumented export gets reinvented instead of reused.

## 10. Known pitfalls

| Date       | Severity | Pitfall                                                                                                                                                          | Reference          |
| ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 2026-08-12 | low      | `noUncheckedIndexedAccess` is on: indexing a record returns `T \| undefined`. Route lookups through `registry.get()` instead of indexing                         | `src/scopes.ts`    |
| 2026-08-12 | low      | OOXML formats (docx/xlsx) share the ZIP `PK` signature, so a magic-number check cannot tell them apart. Do not add per-format ZIP signatures expecting precision | `src/constants.ts` |
